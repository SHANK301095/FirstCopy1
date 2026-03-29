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

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return jsonRes({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);

    const body = await req.json().catch(() => ({}));
    const { cycle_id, strategy_ids, symbols, timeframes } = body;

    if (!cycle_id || typeof cycle_id !== 'string') {
      return jsonRes({ ok: false, error: { code: 'INVALID_INPUT', message: 'cycle_id (string) is required' } }, 400);
    }

    // Verify cycle ownership
    const { data: cycle } = await supabase
      .from('rotation_cycles')
      .select('*')
      .eq('id', cycle_id)
      .eq('user_id', user.id)
      .single();

    if (!cycle) return jsonRes({ ok: false, error: { code: 'NOT_FOUND', message: 'Cycle not found' } }, 404);
    if (cycle.status !== 'running') return jsonRes({ ok: false, error: { code: 'INVALID_STATE', message: 'Cycle must be in running state to enqueue jobs' } }, 400);

    // Get latest strategy versions
    let svQuery = supabase
      .from('strategy_versions')
      .select('id, strategy_id, version_number')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (Array.isArray(strategy_ids) && strategy_ids.length) {
      svQuery = svQuery.in('strategy_id', strategy_ids);
    }

    const { data: versions } = await svQuery;
    if (!versions?.length) return jsonRes({ ok: false, error: { code: 'NO_DATA', message: 'No active strategy versions found' } }, 400);

    // Get backtest configs
    let cfgQuery = supabase.from('backtest_configs').select('*').eq('user_id', user.id);
    if (Array.isArray(symbols) && symbols.length) cfgQuery = cfgQuery.in('symbol', symbols);
    if (Array.isArray(timeframes) && timeframes.length) cfgQuery = cfgQuery.in('timeframe', timeframes);

    const { data: configs } = await cfgQuery;
    if (!configs?.length) return jsonRes({ ok: false, error: { code: 'NO_DATA', message: 'No backtest configs found' } }, 400);

    // Idempotency: check for existing queued jobs in this cycle
    const { count: existingCount } = await supabase
      .from('backtest_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('cycle_id', cycle_id)
      .eq('user_id', user.id)
      .eq('status', 'queued');

    if (existingCount && existingCount > 0) {
      return jsonRes({ ok: false, error: { code: 'DUPLICATE', message: `${existingCount} queued jobs already exist for this cycle. Cancel them first or wait.` } }, 409);
    }

    // Create jobs: cartesian product of versions × configs
    const jobs = [];
    for (const sv of versions) {
      for (const cfg of configs) {
        jobs.push({
          user_id: user.id,
          cycle_id,
          strategy_version_id: sv.id,
          backtest_config_id: cfg.id,
          priority: 50,
          status: 'queued',
          scheduled_for: new Date().toISOString(),
        });
      }
    }

    // Batch insert (100 at a time)
    let created = 0;
    for (let i = 0; i < jobs.length; i += 100) {
      const batch = jobs.slice(i, i + 100);
      const { data, error } = await supabase.from('backtest_jobs').insert(batch).select('id');
      if (error) throw error;
      created += data?.length || 0;
    }

    // Emit system event
    await supabase.from('factory_system_events').insert({
      user_id: user.id,
      kind: 'enqueue',
      entity_type: 'cycle',
      entity_id: cycle_id,
      message: `Enqueued ${created} backtest jobs`,
      payload: { job_count: created, versions: versions.length, configs: configs.length },
    });

    return jsonRes({ ok: true, data: { jobs_created: created } });
  } catch (err) {
    return jsonRes({ ok: false, error: { code: 'INTERNAL', message: err.message } }, 500);
  }
});
