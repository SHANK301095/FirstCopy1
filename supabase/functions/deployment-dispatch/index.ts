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
    const { portfolio_id, account_id, terminal_id } = body;

    if (!portfolio_id || !account_id || !terminal_id) {
      return jsonRes({ ok: false, error: { code: 'INVALID_INPUT', message: 'portfolio_id, account_id, and terminal_id are all required' } }, 400);
    }

    // Verify ownership of all entities
    const { data: portfolio } = await supabase
      .from('factory_portfolios').select('*').eq('id', portfolio_id).eq('user_id', user.id).single();
    if (!portfolio) return jsonRes({ ok: false, error: { code: 'NOT_FOUND', message: 'Portfolio not found' } }, 404);

    const { data: account } = await supabase
      .from('factory_accounts').select('*').eq('id', account_id).eq('user_id', user.id).single();
    if (!account) return jsonRes({ ok: false, error: { code: 'NOT_FOUND', message: 'Account not found' } }, 404);

    const { data: terminal } = await supabase
      .from('factory_terminals').select('*').eq('id', terminal_id).eq('user_id', user.id).single();
    if (!terminal) return jsonRes({ ok: false, error: { code: 'NOT_FOUND', message: 'Terminal not found' } }, 404);

    // Get champions + challengers
    const { data: members } = await supabase
      .from('factory_portfolio_members')
      .select('*')
      .eq('portfolio_id', portfolio_id)
      .eq('user_id', user.id)
      .in('role', ['champion', 'challenger']);

    if (!members?.length) return jsonRes({ ok: false, error: { code: 'NO_DATA', message: 'No deployable members in portfolio' } }, 400);

    // Create deployments
    const deployments = members.map(m => ({
      user_id: user.id,
      portfolio_member_id: m.id,
      account_id,
      terminal_id,
      status: 'running',
      deployed_at: new Date().toISOString(),
    }));

    const { data: created } = await supabase.from('factory_deployments').insert(deployments).select('id');

    // Emit events
    for (const d of (created || [])) {
      await supabase.from('factory_system_events').insert({
        user_id: user.id,
        kind: 'deploy',
        entity_type: 'deployment',
        entity_id: d.id,
        message: `Deployment created (stub mode)`,
        payload: { account: account.label, terminal: terminal.name },
      });
    }

    return jsonRes({ ok: true, data: { deployments: created?.length || 0 } });
  } catch (err) {
    return jsonRes({ ok: false, error: { code: 'INTERNAL', message: err.message } }, 500);
  }
});
