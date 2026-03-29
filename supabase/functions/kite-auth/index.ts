import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const KITE_API_KEY = Deno.env.get('KITE_API_KEY')!;
const KITE_API_SECRET = Deno.env.get('KITE_API_SECRET')!;
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

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'login-url') {
      const redirectUrl = url.searchParams.get('redirect_url') || 'https://127.0.0.1:8788';
      const loginUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${KITE_API_KEY}&redirect_url=${encodeURIComponent(redirectUrl)}`;
      return new Response(JSON.stringify({ login_url: loginUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'callback') {
      const requestToken = url.searchParams.get('request_token');
      if (!requestToken) {
        return new Response(JSON.stringify({ error: 'Missing request_token' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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

      const checksumInput = KITE_API_KEY + requestToken + KITE_API_SECRET;
      const encoder = new TextEncoder();
      const data = encoder.encode(checksumInput);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const tokenResponse = await fetch('https://api.kite.trade/session/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Kite-Version': '3' },
        body: new URLSearchParams({ api_key: KITE_API_KEY, request_token: requestToken, checksum }),
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) {
        return new Response(JSON.stringify({ error: tokenData.message || 'Token exchange failed' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: connectionData, error: dbError } = await supabase
        .from('broker_connections')
        .upsert({
          user_id: user.id, broker_type: 'zerodha',
          display_name: `Zerodha - ${tokenData.data.user_id}`,
          account_id: tokenData.data.user_id,
          token_expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: 'connected', last_sync_at: new Date().toISOString(),
          metadata: {
            user_name: tokenData.data.user_name, user_shortname: tokenData.data.user_shortname,
            broker: tokenData.data.broker, exchanges: tokenData.data.exchanges,
            products: tokenData.data.products, order_types: tokenData.data.order_types,
          },
        }, { onConflict: 'user_id,broker_type' }).select('id').single();

      if (dbError) {
        return new Response(JSON.stringify({ error: 'Failed to save connection' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: vaultError } = await supabase.rpc('store_broker_credentials', {
        p_broker_connection_id: connectionData.id,
        p_access_token: tokenData.data.access_token,
        p_refresh_token: tokenData.data.refresh_token || null,
        p_api_key: null,
      });

      if (vaultError) {
        await supabase.from('broker_connections').delete().eq('id', connectionData.id);
        return new Response(JSON.stringify({ error: 'Failed to securely store credentials' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, user_id: tokenData.data.user_id, user_name: tokenData.data.user_name }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'disconnect') {
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

      const { data: connection } = await supabase
        .from('broker_connections').select('id')
        .eq('user_id', user.id).eq('broker_type', 'zerodha').maybeSingle();

      if (connection) {
        const { data: accessToken } = await supabase.rpc('get_broker_access_token_secure', {
          p_user_id: user.id, p_broker_type: 'zerodha'
        });
        if (accessToken) {
          try {
            await fetch(`https://api.kite.trade/session/token?api_key=${KITE_API_KEY}&access_token=${accessToken}`, {
              method: 'DELETE', headers: { 'X-Kite-Version': '3' },
            });
          } catch (e) { console.warn('[kite-auth] Failed to invalidate Kite session:', e); }
        }
        await supabase.rpc('revoke_broker_credentials', { p_broker_connection_id: connection.id });
      }

      await supabase.from('broker_connections').update({ status: 'disconnected' })
        .eq('user_id', user.id).eq('broker_type', 'zerodha');

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'status') {
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

      const { data: connection } = await supabase
        .from('broker_connections_safe')
        .select('id, broker_type, display_name, account_id, status, last_sync_at, metadata, token_expiry')
        .eq('user_id', user.id).eq('broker_type', 'zerodha').maybeSingle();

      return new Response(JSON.stringify({ connection }), {
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