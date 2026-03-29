import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

/** Canonical robust score computation (0..100) */
function computeRobustScore(r: {
  trades: number; profit_factor: number; max_dd_pct: number; net_profit: number;
  consistency_score: number; worst_month: number | null;
}): { score: number; notes: string } {
  if (r.trades < 80) return { score: 0, notes: 'Rejected: low sample (<80 trades)' };
  if (r.max_dd_pct > 25) return { score: 0, notes: 'Rejected: DD cap (>25%)' };

  let notes = '';

  // ReturnQuality 0..40
  const returnRaw = Math.min(r.net_profit / 1000, 40);
  const returnQ = Math.max(0, returnRaw);

  // PF penalty
  let pfPenalty = 0;
  if (r.profit_factor < 1.15) { pfPenalty = 10; notes += 'PF penalty (<1.15). '; }

  // RiskControl 0..25
  const riskControl = Math.max(0, 25 - r.max_dd_pct);

  // Stability 0..20
  let stability = r.consistency_score * 15;
  if (r.worst_month !== null && r.worst_month < -15) {
    stability -= 5;
    notes += 'Worst month penalty. ';
  }
  stability = Math.max(0, Math.min(20, stability));

  // ExecutionRobustness 0..15 (placeholder)
  const execRobust = 10;

  const score = Math.max(0, Math.min(100, returnQ + riskControl + stability + execRobust - pfPenalty));
  return { score: Math.round(score * 100) / 100, notes: notes.trim() || 'OK' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonRes({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);

    const body = await req.json().catch(() => ({}));
    const { cycle_id } = body;

    if (!cycle_id || typeof cycle_id !== 'string') {
      return jsonRes({ ok: false, error: { code: 'INVALID_INPUT', message: 'cycle_id is required' } }, 400);
    }

    // Get cycle
    const { data: cycle } = await supabase
      .from('rotation_cycles')
      .select('*')
      .eq('id', cycle_id)
      .eq('user_id', user.id)
      .single();

    if (!cycle) return jsonRes({ ok: false, error: { code: 'NOT_FOUND', message: 'Cycle not found' } }, 404);
    if (cycle.status !== 'running') return jsonRes({ ok: false, error: { code: 'INVALID_STATE', message: 'Cycle must be in running state to score' } }, 400);

    // Get succeeded jobs + results
    const { data: jobs } = await supabase
      .from('backtest_jobs')
      .select('*, factory_backtest_results(*), backtest_configs(symbol, timeframe), strategy_versions(id, strategy_id)')
      .eq('cycle_id', cycle_id)
      .eq('status', 'succeeded')
      .eq('user_id', user.id);

    if (!jobs?.length) return jsonRes({ ok: false, error: { code: 'NO_DATA', message: 'No succeeded jobs found' } }, 400);

    // Compute scores
    const scoreEntries: any[] = [];
    for (const job of jobs) {
      const r = job.factory_backtest_results;
      if (!r) continue;

      const { score, notes } = computeRobustScore(r);

      // Update the result's robust_score
      await supabase.from('factory_backtest_results').update({ robust_score: score }).eq('id', r.id);

      scoreEntries.push({
        user_id: user.id,
        cycle_id,
        strategy_version_id: job.strategy_version_id,
        symbol: job.backtest_configs?.symbol || 'UNKNOWN',
        timeframe: job.backtest_configs?.timeframe || 'UNKNOWN',
        robust_score: score,
        rank: 0,
        notes,
      });
    }

    // Rank by robust_score descending
    scoreEntries.sort((a, b) => b.robust_score - a.robust_score);
    scoreEntries.forEach((s, i) => { s.rank = i + 1; });

    // Delete old scores for this cycle, insert new
    await supabase.from('strategy_scores').delete().eq('cycle_id', cycle_id).eq('user_id', user.id);

    for (let i = 0; i < scoreEntries.length; i += 100) {
      await supabase.from('strategy_scores').insert(scoreEntries.slice(i, i + 100));
    }

    // Lock cycle
    await supabase.from('rotation_cycles').update({ status: 'locked' }).eq('id', cycle_id);

    // Emit event
    await supabase.from('factory_system_events').insert({
      user_id: user.id,
      kind: 'score',
      entity_type: 'cycle',
      entity_id: cycle_id,
      message: `Scored ${scoreEntries.length} entries. Top score: ${scoreEntries[0]?.robust_score || 0}`,
      payload: { count: scoreEntries.length },
    });

    return jsonRes({ ok: true, data: { scores: scoreEntries.length, top_score: scoreEntries[0]?.robust_score } });
  } catch (err) {
    return jsonRes({ ok: false, error: { code: 'INTERNAL', message: err.message } }, 500);
  }
});
