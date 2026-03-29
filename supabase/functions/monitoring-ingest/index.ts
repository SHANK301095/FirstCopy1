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
    const { deployment_id, date, daily_pnl, dd_pct, trade_count, expectancy, drift_score } = body;

    if (!deployment_id || typeof deployment_id !== 'string') {
      return jsonRes({ ok: false, error: { code: 'INVALID_INPUT', message: 'deployment_id is required' } }, 400);
    }

    const safeDate = (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) ? date : new Date().toISOString().slice(0, 10);
    const safePnl = typeof daily_pnl === 'number' ? daily_pnl : 0;
    const safeDd = typeof dd_pct === 'number' ? Math.max(0, dd_pct) : 0;
    const safeTrades = typeof trade_count === 'number' ? Math.max(0, Math.round(trade_count)) : 0;
    const safeExp = typeof expectancy === 'number' ? expectancy : 0;
    const safeDrift = typeof drift_score === 'number' ? Math.max(0, drift_score) : 0;

    // Verify deployment ownership
    const { data: deployment } = await supabase
      .from('factory_deployments')
      .select('*, factory_portfolio_members(kill_dd_pct, kill_loss_streak, portfolio_id)')
      .eq('id', deployment_id)
      .eq('user_id', user.id)
      .single();

    if (!deployment) return jsonRes({ ok: false, error: { code: 'NOT_FOUND', message: 'Deployment not found' } }, 404);
    if (deployment.status === 'killed') return jsonRes({ ok: false, error: { code: 'INVALID_STATE', message: 'Deployment already killed' } }, 400);

    // Upsert metrics
    await supabase.from('factory_live_metrics').upsert({
      user_id: user.id,
      deployment_id,
      date: safeDate,
      daily_pnl: safePnl,
      dd_pct: safeDd,
      trade_count: safeTrades,
      expectancy: safeExp,
      drift_score: safeDrift,
    }, { onConflict: 'deployment_id,date' });

    // Update heartbeat
    await supabase.from('factory_deployments').update({
      last_heartbeat: new Date().toISOString(),
      last_trade_at: safeTrades > 0 ? new Date().toISOString() : deployment.last_trade_at,
    }).eq('id', deployment_id);

    // Kill-switch check
    const member = deployment.factory_portfolio_members as any;
    let killed = false;
    let replaced = false;

    if (member && safeDd >= member.kill_dd_pct && deployment.status === 'running') {
      await supabase.from('factory_deployments').update({
        status: 'killed',
        error: `Kill-switch: DD ${safeDd}% >= limit ${member.kill_dd_pct}%`,
      }).eq('id', deployment_id);

      killed = true;

      // Auto-activate next reserve
      const { data: reserveMembers } = await supabase
        .from('factory_portfolio_members')
        .select('*')
        .eq('portfolio_id', member.portfolio_id)
        .eq('role', 'reserve')
        .eq('user_id', user.id)
        .limit(1);

      if (reserveMembers?.length) {
        const reserve = reserveMembers[0];
        await supabase.from('factory_portfolio_members').update({ role: 'champion' }).eq('id', reserve.id);

        await supabase.from('factory_deployments').insert({
          user_id: user.id,
          portfolio_member_id: reserve.id,
          account_id: deployment.account_id,
          terminal_id: deployment.terminal_id,
          status: 'running',
          deployed_at: new Date().toISOString(),
        });

        replaced = true;

        await supabase.from('factory_system_events').insert({
          user_id: user.id,
          kind: 'rollback',
          entity_type: 'deployment',
          entity_id: deployment_id,
          message: `Auto-replaced killed deployment with reserve strategy`,
          payload: { killed_id: deployment_id, replacement_member: reserve.id },
        });
      }

      await supabase.from('factory_system_events').insert({
        user_id: user.id,
        kind: 'kill',
        entity_type: 'deployment',
        entity_id: deployment_id,
        message: `Kill-switch triggered: DD ${safeDd}%`,
        payload: { dd_pct: safeDd, limit: member.kill_dd_pct },
      });
    }

    return jsonRes({ ok: true, data: { killed, replaced } });
  } catch (err) {
    return jsonRes({ ok: false, error: { code: 'INTERNAL', message: err.message } }, 500);
  }
});
