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
    const { cycle_id } = body;

    if (!cycle_id || typeof cycle_id !== 'string') {
      return jsonRes({ ok: false, error: { code: 'INVALID_INPUT', message: 'cycle_id is required' } }, 400);
    }

    const { data: cycle } = await supabase
      .from('rotation_cycles').select('*').eq('id', cycle_id).eq('user_id', user.id).single();

    if (!cycle) return jsonRes({ ok: false, error: { code: 'NOT_FOUND', message: 'Cycle not found' } }, 404);
    if (cycle.status !== 'locked') return jsonRes({ ok: false, error: { code: 'INVALID_STATE', message: 'Cycle must be locked before publishing' } }, 400);

    await supabase.from('rotation_cycles').update({ status: 'published' }).eq('id', cycle_id);

    await supabase.from('factory_system_events').insert({
      user_id: user.id,
      kind: 'publish',
      entity_type: 'cycle',
      entity_id: cycle_id,
      message: `Cycle ${cycle.cycle_type} ${cycle.as_of} published`,
      payload: {},
    });

    return jsonRes({ ok: true });
  } catch (err) {
    return jsonRes({ ok: false, error: { code: 'INTERNAL', message: err.message } }, 500);
  }
});
