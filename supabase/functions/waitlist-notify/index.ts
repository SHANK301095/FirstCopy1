const ALLOWED_ORIGINS = [
  Deno.env.get("SUPABASE_URL") || '',
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

interface WaitlistNotification {
  phone: string;
  spotsLeft: number;
  timestamp: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, spotsLeft, webhookUrl }: WaitlistNotification & { webhookUrl: string } = await req.json();

    console.log(`New waitlist signup: ${phone}, spots left: ${spotsLeft}`);

    if (!webhookUrl) {
      return new Response(JSON.stringify({ success: true, message: 'No webhook configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const webhookPayload = {
      phone,
      spotsLeft,
      timestamp: new Date().toISOString(),
      message: `🎉 New Sentinel Waitlist Signup!\n\nPhone: ${phone}\nSpots Left: ${spotsLeft}\nTime: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const corsHeaders = getCorsHeaders(req);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});