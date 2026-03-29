import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const KITE_API_KEY = Deno.env.get('KITE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ALLOWED_ORIGINS = [
  SUPABASE_URL,
  'https://mmc3010.lovable.app',
  'https://id-preview--9585abe7-4b28-4e9d-87d4-d095da7c3d10.lovable.app',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[1];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

async function getDecryptedAccessToken(supabase: any, userId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_broker_access_token_secure', {
    p_user_id: userId, p_broker_type: 'zerodha'
  });
  if (error) { console.error('[kite-portfolio] Token retrieval error:', error); return null; }
  return data;
}

async function kiteRequest(endpoint: string, accessToken: string, method = 'GET', body?: any) {
  const url = `https://api.kite.trade${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'X-Kite-Version': '3',
      'Authorization': `token ${KITE_API_KEY}:${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };
  if (body && method !== 'GET') { options.body = new URLSearchParams(body); }
  const response = await fetch(url, options);
  return response.json();
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getDecryptedAccessToken(supabase, user.id);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Zerodha not connected or token expired' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: connection } = await supabase
      .from('broker_connections_safe').select('account_id')
      .eq('user_id', user.id).eq('broker_type', 'zerodha').eq('status', 'connected').maybeSingle();

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'holdings') {
      const result = await kiteRequest('/portfolio/holdings', accessToken);
      if (result.status === 'error') return new Response(JSON.stringify({ error: result.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ holdings: result.data || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'positions') {
      const result = await kiteRequest('/portfolio/positions', accessToken);
      if (result.status === 'error') return new Response(JSON.stringify({ error: result.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ net: result.data?.net || [], day: result.data?.day || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'orders') {
      const result = await kiteRequest('/orders', accessToken);
      if (result.status === 'error') return new Response(JSON.stringify({ error: result.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ orders: result.data || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'trades') {
      const result = await kiteRequest('/trades', accessToken);
      if (result.status === 'error') return new Response(JSON.stringify({ error: result.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ trades: result.data || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'margins') {
      const result = await kiteRequest('/user/margins', accessToken);
      if (result.status === 'error') return new Response(JSON.stringify({ error: result.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ margins: result.data || {} }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'profile') {
      const result = await kiteRequest('/user/profile', accessToken);
      if (result.status === 'error') return new Response(JSON.stringify({ error: result.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ profile: result.data || {} }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'summary') {
      const [holdingsRes, positionsRes, marginsRes, ordersRes] = await Promise.all([
        kiteRequest('/portfolio/holdings', accessToken),
        kiteRequest('/portfolio/positions', accessToken),
        kiteRequest('/user/margins', accessToken),
        kiteRequest('/orders', accessToken),
      ]);
      const holdings = holdingsRes.data || [];
      const positions = positionsRes.data?.net || [];
      const holdingsValue = holdings.reduce((sum: number, h: any) => sum + (h.last_price * h.quantity), 0);
      const holdingsPnl = holdings.reduce((sum: number, h: any) => sum + h.pnl, 0);
      const positionsPnl = positions.reduce((sum: number, p: any) => sum + p.pnl, 0);
      const margins = marginsRes.data || {};
      const equityMargin = margins.equity || {};
      const commodityMargin = margins.commodity || {};
      const availableMargin = (equityMargin.available?.cash || 0) + (commodityMargin.available?.cash || 0);
      const usedMargin = (equityMargin.utilised?.debits || 0) + (commodityMargin.utilised?.debits || 0);

      await supabase.from('broker_connections').update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', user.id).eq('broker_type', 'zerodha');

      return new Response(JSON.stringify({
        holdings: { count: holdings.length, value: holdingsValue, pnl: holdingsPnl, items: holdings },
        positions: { count: positions.length, pnl: positionsPnl, net: positions, day: positionsRes.data?.day || [] },
        margins: { available: availableMargin, used: usedMargin, equity: equityMargin, commodity: commodityMargin },
        orders: { count: (ordersRes.data || []).length, items: ordersRes.data || [] },
        account_id: connection?.account_id,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const corsHeaders = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});