import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const MAX_ATTEMPTS = 3;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));
    const { worker_id } = body;
    if (!worker_id || typeof worker_id !== 'string') {
      return jsonRes({ ok: false, error: { code: 'INVALID_INPUT', message: 'worker_id is required' } }, 400);
    }

    // Atomically claim next queued job using service role
    const { data: jobs } = await serviceClient
      .from('backtest_jobs')
      .select('*')
      .eq('status', 'queued')
      .lt('attempts', MAX_ATTEMPTS)
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1);

    if (!jobs?.length) {
      return jsonRes({ ok: true, data: { job: null } });
    }

    const job = jobs[0];

    // Claim the job with optimistic lock
    const { data: claimed, error: claimErr } = await serviceClient
      .from('backtest_jobs')
      .update({
        status: 'running',
        worker_id,
        started_at: new Date().toISOString(),
        attempts: job.attempts + 1,
      })
      .eq('id', job.id)
      .eq('status', 'queued')
      .select('*')
      .single();

    if (claimErr || !claimed) {
      return jsonRes({ ok: true, data: { job: null, reason: 'already_claimed' } });
    }

    // Get strategy version artifact info
    const { data: sv } = await serviceClient
      .from('strategy_versions')
      .select('*, strategies(name, category)')
      .eq('id', claimed.strategy_version_id)
      .single();

    // Get config
    const { data: cfg } = await serviceClient
      .from('backtest_configs')
      .select('*')
      .eq('id', claimed.backtest_config_id)
      .single();

    return jsonRes({
      ok: true,
      data: {
        job: claimed,
        strategy_version: sv,
        config: cfg,
      },
    });
  } catch (err) {
    return jsonRes({ ok: false, error: { code: 'INTERNAL', message: err.message } }, 500);
  }
});
