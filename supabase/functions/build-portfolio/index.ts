import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
    const { cycle_id, max_eas = 15 } = body;

    if (!cycle_id || typeof cycle_id !== 'string') {
      return jsonRes({ ok: false, error: { code: 'INVALID_INPUT', message: 'cycle_id is required' } }, 400);
    }

    // Verify cycle locked
    const { data: cycle } = await supabase
      .from('rotation_cycles').select('*').eq('id', cycle_id).eq('user_id', user.id).single();
    if (!cycle || cycle.status !== 'locked') {
      return jsonRes({ ok: false, error: { code: 'INVALID_STATE', message: 'Cycle must be locked first (run score-cycle)' } }, 400);
    }

    // Idempotency: check existing portfolio
    const { data: existingPortfolio } = await supabase
      .from('factory_portfolios')
      .select('id')
      .eq('cycle_id', cycle_id)
      .eq('user_id', user.id)
      .limit(1);

    if (existingPortfolio?.length) {
      return jsonRes({ ok: false, error: { code: 'DUPLICATE', message: 'Portfolio already exists for this cycle' } }, 409);
    }

    // Get scores with strategy info
    const { data: scores } = await supabase
      .from('strategy_scores')
      .select('*, strategy_versions(id, strategy_id, strategies(name, category))')
      .eq('cycle_id', cycle_id)
      .eq('user_id', user.id)
      .gt('robust_score', 0)
      .order('rank', { ascending: true });

    if (!scores?.length) return jsonRes({ ok: false, error: { code: 'NO_DATA', message: 'No eligible strategies' } }, 400);

    // Diversification gates
    const symbolCount: Record<string, number> = {};
    const categoryCount: Record<string, number> = {};
    const symTfCatCount: Record<string, number> = {};

    const champions: typeof scores = [];
    const challengers: typeof scores = [];
    const reserves: typeof scores = [];

    for (const s of scores) {
      const cat = (s.strategy_versions as any)?.strategies?.category || 'unknown';
      const key = `${s.symbol}|${s.timeframe}|${cat}`;

      const symC = symbolCount[s.symbol] || 0;
      const catC = categoryCount[cat] || 0;
      const corrC = symTfCatCount[key] || 0;

      if (symC >= 3 || catC >= 4 || corrC >= 2) {
        reserves.push(s);
        continue;
      }

      if (champions.length < 10) {
        champions.push(s);
        symbolCount[s.symbol] = symC + 1;
        categoryCount[cat] = catC + 1;
        symTfCatCount[key] = corrC + 1;
      } else if (challengers.length < 5) {
        challengers.push(s);
      } else {
        reserves.push(s);
      }
    }

    // Create portfolio
    const { data: portfolio } = await supabase.from('factory_portfolios').insert({
      user_id: user.id,
      cycle_id,
      name: `Auto-Portfolio ${cycle.cycle_type} ${cycle.as_of}`,
      max_eas: Math.min(max_eas, 25),
      risk_budget_pct: 3.0,
    }).select('id').single();

    if (!portfolio) throw new Error('Failed to create portfolio');

    // Inverse score allocation for champions
    const ddValues = champions.map(c => ({
      score: c,
      invDD: 1 / Math.max(1, (100 - c.robust_score) / 4),
    }));
    const totalInvDD = ddValues.reduce((sum, d) => sum + d.invDD, 0);

    const members: any[] = [];
    for (const { score, invDD } of ddValues) {
      const rawAlloc = (invDD / totalInvDD) * 100;
      members.push({
        user_id: user.id,
        portfolio_id: portfolio.id,
        strategy_version_id: score.strategy_version_id,
        symbol: score.symbol,
        timeframe: score.timeframe,
        allocation_pct: Math.min(12, Math.round(rawAlloc * 100) / 100),
        role: 'champion',
        kill_dd_pct: 10,
        kill_loss_streak: 6,
      });
    }

    // Renormalize champion allocations to 100
    const champMembers = members.filter(m => m.role === 'champion');
    const totalAlloc = champMembers.reduce((s, m) => s + m.allocation_pct, 0);
    if (totalAlloc > 0) {
      champMembers.forEach(m => { m.allocation_pct = Math.round((m.allocation_pct / totalAlloc) * 10000) / 100; });
    }

    // Add challengers (0% allocation)
    for (const c of challengers) {
      members.push({
        user_id: user.id,
        portfolio_id: portfolio.id,
        strategy_version_id: c.strategy_version_id,
        symbol: c.symbol,
        timeframe: c.timeframe,
        allocation_pct: 0,
        role: 'challenger',
        kill_dd_pct: 10,
        kill_loss_streak: 6,
      });
    }

    // Add reserves (0% allocation, up to 10)
    for (const r of reserves.slice(0, 10)) {
      members.push({
        user_id: user.id,
        portfolio_id: portfolio.id,
        strategy_version_id: r.strategy_version_id,
        symbol: r.symbol,
        timeframe: r.timeframe,
        allocation_pct: 0,
        role: 'reserve',
        kill_dd_pct: 10,
        kill_loss_streak: 6,
      });
    }

    await supabase.from('factory_portfolio_members').insert(members);

    // Emit event
    await supabase.from('factory_system_events').insert({
      user_id: user.id,
      kind: 'publish',
      entity_type: 'portfolio',
      entity_id: portfolio.id,
      message: `Built portfolio: ${champions.length} champs, ${challengers.length} challengers, ${Math.min(reserves.length, 10)} reserves`,
      payload: { champions: champions.length, challengers: challengers.length, reserves: Math.min(reserves.length, 10) },
    });

    return jsonRes({
      ok: true,
      data: {
        portfolio_id: portfolio.id,
        champions: champions.length,
        challengers: challengers.length,
        reserves: Math.min(reserves.length, 10),
      },
    });
  } catch (err) {
    return jsonRes({ ok: false, error: { code: 'INTERNAL', message: err.message } }, 500);
  }
});
