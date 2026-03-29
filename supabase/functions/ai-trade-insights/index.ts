import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const ALLOWED_ORIGINS = [
  supabaseUrl,
  'https://mmc3010.lovable.app',
  'https://id-preview--9585abe7-4b28-4e9d-87d4-d095da7c3d10.lovable.app',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[1];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // JWT verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { tradeContext, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompts: Record<string, string> = {
      weekly_report: `You are an expert trading analyst. Generate a comprehensive weekly trading report in Hinglish. Include:
1. Weekly P&L summary with comparison to previous week
2. Best and worst trades with lessons
3. Pattern analysis (which setups worked, which didn't)
4. Risk management score (1-10)
5. Top 3 actionable improvements for next week
6. Emotional discipline assessment
Format with headers and bullet points.`,
      
      position_sizing: `You are a risk management expert. Based on the trader's performance data, recommend optimal position sizes. Include:
1. Kelly Criterion calculation based on their win rate and R-multiple
2. Recommended position size as % of capital
3. Maximum positions to hold simultaneously
4. Per-trade risk budget in INR
5. Scaling recommendations based on recent performance
Be specific with numbers.`,

      risk_alert: `You are a trading risk monitor. Analyze the trader's recent activity and flag any risk concerns:
1. Drawdown status and severity
2. Overtrading detection (too many trades per day)
3. Revenge trading patterns (losses followed by immediate entries)
4. Position concentration risk
5. Streak analysis and tilt probability
Rate overall risk as LOW/MEDIUM/HIGH/CRITICAL with specific reasons.`,

      exit_advisor: `You are an exit strategy advisor. Based on the trader's open positions and historical data:
1. Evaluate current open positions
2. Suggest exit points based on historical win distribution
3. Identify trades that should be cut early
4. Recommend trailing stop adjustments
5. Time-based exit suggestions (how long they typically hold winners vs losers)
Be data-driven and specific.`,

      pattern_discovery: `You are an AI pattern discovery engine. Analyze the trader's complete history and find hidden patterns:
1. Time-of-day patterns (when they trade best/worst)
2. Day-of-week patterns
3. Symbol correlation patterns
4. Setup type effectiveness ranking
5. Emotional state impact on performance
6. Session-specific edges
7. Entry timing quality assessment
Present as actionable trading rules they can follow.`,
    };

    const systemPrompt = prompts[type] || prompts.weekly_report;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `TRADER DATA:\n${JSON.stringify(tradeContext, null, 2)}` },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No response";

    return new Response(JSON.stringify({ reply, type }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-trade-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
