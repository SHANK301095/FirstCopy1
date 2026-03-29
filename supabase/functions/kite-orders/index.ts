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
  if (error) { console.error('[kite-orders] Token retrieval error:', error); return null; }
  return data;
}

async function kiteRequest(endpoint: string, accessToken: string, method = 'GET', body?: Record<string, string>) {
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

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'place' && req.method === 'POST') {
      const body = await req.json();
      const required = ['tradingsymbol', 'exchange', 'transaction_type', 'order_type', 'quantity', 'product'];
      for (const field of required) {
        if (!body[field]) {
          return new Response(JSON.stringify({ error: `Missing required field: ${field}` }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      const orderParams: Record<string, string> = {
        tradingsymbol: body.tradingsymbol, exchange: body.exchange,
        transaction_type: body.transaction_type, order_type: body.order_type,
        quantity: String(body.quantity), product: body.product, validity: body.validity || 'DAY',
      };
      if (body.price) orderParams.price = String(body.price);
      if (body.trigger_price) orderParams.trigger_price = String(body.trigger_price);
      if (body.disclosed_quantity) orderParams.disclosed_quantity = String(body.disclosed_quantity);
      if (body.tag) orderParams.tag = body.tag;
      const variety = body.variety || 'regular';
      const result = await kiteRequest(`/orders/${variety}`, accessToken, 'POST', orderParams);
      if (result.status === 'error') {
        return new Response(JSON.stringify({ error: result.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, order_id: result.data?.order_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'modify' && req.method === 'PUT') {
      const body = await req.json();
      if (!body.order_id) {
        return new Response(JSON.stringify({ error: 'Missing order_id' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const modifyParams: Record<string, string> = {};
      if (body.quantity) modifyParams.quantity = String(body.quantity);
      if (body.price) modifyParams.price = String(body.price);
      if (body.trigger_price) modifyParams.trigger_price = String(body.trigger_price);
      if (body.order_type) modifyParams.order_type = body.order_type;
      if (body.validity) modifyParams.validity = body.validity;
      const variety = body.variety || 'regular';
      const result = await kiteRequest(`/orders/${variety}/${body.order_id}`, accessToken, 'PUT', modifyParams);
      if (result.status === 'error') {
        return new Response(JSON.stringify({ error: result.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, order_id: result.data?.order_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'cancel' && req.method === 'DELETE') {
      const orderId = url.searchParams.get('order_id');
      const variety = url.searchParams.get('variety') || 'regular';
      if (!orderId) {
        return new Response(JSON.stringify({ error: 'Missing order_id' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const result = await kiteRequest(`/orders/${variety}/${orderId}`, accessToken, 'DELETE');
      if (result.status === 'error') {
        return new Response(JSON.stringify({ error: result.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, order_id: result.data?.order_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'history') {
      const orderId = url.searchParams.get('order_id');
      if (!orderId) {
        return new Response(JSON.stringify({ error: 'Missing order_id' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const result = await kiteRequest(`/orders/${orderId}`, accessToken);
      if (result.status === 'error') {
        return new Response(JSON.stringify({ error: result.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ history: result.data || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'order-trades') {
      const orderId = url.searchParams.get('order_id');
      if (!orderId) {
        return new Response(JSON.stringify({ error: 'Missing order_id' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const result = await kiteRequest(`/orders/${orderId}/trades`, accessToken);
      if (result.status === 'error') {
        return new Response(JSON.stringify({ error: result.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ trades: result.data || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'exit-position' && req.method === 'POST') {
      const body = await req.json();
      if (!body.tradingsymbol || !body.exchange || !body.quantity || !body.product) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const orderParams: Record<string, string> = {
        tradingsymbol: body.tradingsymbol, exchange: body.exchange,
        transaction_type: body.position_type === 'long' ? 'SELL' : 'BUY',
        order_type: 'MARKET', quantity: String(body.quantity), product: body.product, validity: 'DAY',
      };
      const result = await kiteRequest('/orders/regular', accessToken, 'POST', orderParams);
      if (result.status === 'error') {
        return new Response(JSON.stringify({ error: result.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, order_id: result.data?.order_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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