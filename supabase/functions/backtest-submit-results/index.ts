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
    const { job_id, status: jobStatus, result, error: jobError } = body;

    if (!job_id || typeof job_id !== 'string') {
      return jsonRes({ ok: false, error: { code: 'INVALID_INPUT', message: 'job_id is required' } }, 400);
    }

    // Verify job ownership
    const { data: job } = await supabase
      .from('backtest_jobs')
      .select('*')
      .eq('id', job_id)
      .eq('user_id', user.id)
      .single();

    if (!job) return jsonRes({ ok: false, error: { code: 'NOT_FOUND', message: 'Job not found' } }, 404);

    // Idempotency: don't re-submit completed jobs
    if (job.status === 'succeeded' || job.status === 'failed') {
      return jsonRes({ ok: false, error: { code: 'DUPLICATE', message: `Job already ${job.status}` } }, 409);
    }

    const finalStatus = jobStatus || (result ? 'succeeded' : 'failed');

    // Update job
    await supabase.from('backtest_jobs').update({
      status: finalStatus,
      finished_at: new Date().toISOString(),
      error: jobError || null,
    }).eq('id', job_id);

    // Insert results if succeeded
    let resultId = null;
    if (finalStatus === 'succeeded' && result) {
      const { data: inserted } = await supabase.from('factory_backtest_results').upsert({
        user_id: user.id,
        job_id,
        net_profit: typeof result.net_profit === 'number' ? result.net_profit : 0,
        cagr: typeof result.cagr === 'number' ? result.cagr : null,
        max_dd_pct: typeof result.max_dd_pct === 'number' ? result.max_dd_pct : 0,
        profit_factor: typeof result.profit_factor === 'number' ? result.profit_factor : 0,
        sharpe: typeof result.sharpe === 'number' ? result.sharpe : null,
        sortino: typeof result.sortino === 'number' ? result.sortino : null,
        win_rate: typeof result.win_rate === 'number' ? result.win_rate : 0,
        avg_trade: typeof result.avg_trade === 'number' ? result.avg_trade : 0,
        trades: typeof result.trades === 'number' ? Math.round(result.trades) : 0,
        worst_month: typeof result.worst_month === 'number' ? result.worst_month : null,
        consistency_score: typeof result.consistency_score === 'number' ? result.consistency_score : 0,
        robust_score: 0,
      }, { onConflict: 'job_id' }).select('id').single();
      resultId = inserted?.id;
    }

    // Emit event
    await supabase.from('factory_system_events').insert({
      user_id: user.id,
      kind: 'worker',
      entity_type: 'job',
      entity_id: job_id,
      message: `Job ${finalStatus}${jobError ? ': ' + jobError : ''}`,
      payload: { result_id: resultId, status: finalStatus },
    });

    return jsonRes({ ok: true, data: { result_id: resultId } });
  } catch (err) {
    return jsonRes({ ok: false, error: { code: 'INTERNAL', message: err.message } }, 500);
  }
});
