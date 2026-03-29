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

    const { trade, historicalStats } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `You are a professional trade grading AI for a trading journal. Grade this trade on a scale of A/B/C/D/F based on the following 5 dimensions:

1. **Risk:Reward Adherence**: Did the trade have a proper stop loss and take profit? Was the R:R ratio >= 1.5?
2. **Strategy Match**: Does the strategy_tag and setup_type align with the trader's profitable patterns?
3. **Session Alignment**: Was the trade taken during the trader's historically best session?
4. **Entry Quality**: Was the entry timing good relative to the move captured?
5. **Emotional Discipline**: Based on mindset_rating and emotions, was the trader disciplined?

TRADE DATA:
${JSON.stringify(trade, null, 2)}

HISTORICAL STATS (trader's overall performance):
${JSON.stringify(historicalStats, null, 2)}

Grade the trade and provide brief reasoning for each dimension.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a trade quality grading AI. Use the grade_trade tool to return structured output." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "grade_trade",
              description: "Return a structured trade grade with dimensional scores",
              parameters: {
                type: "object",
                properties: {
                  overall_grade: { type: "string", enum: ["A", "B", "C", "D", "F"] },
                  dimensions: {
                    type: "object",
                    properties: {
                      risk_reward: { type: "object", properties: { score: { type: "string", enum: ["A", "B", "C", "D", "F"] }, reason: { type: "string" } }, required: ["score", "reason"] },
                      strategy_match: { type: "object", properties: { score: { type: "string", enum: ["A", "B", "C", "D", "F"] }, reason: { type: "string" } }, required: ["score", "reason"] },
                      session_alignment: { type: "object", properties: { score: { type: "string", enum: ["A", "B", "C", "D", "F"] }, reason: { type: "string" } }, required: ["score", "reason"] },
                      entry_quality: { type: "object", properties: { score: { type: "string", enum: ["A", "B", "C", "D", "F"] }, reason: { type: "string" } }, required: ["score", "reason"] },
                      emotional_discipline: { type: "object", properties: { score: { type: "string", enum: ["A", "B", "C", "D", "F"] }, reason: { type: "string" } }, required: ["score", "reason"] },
                    },
                    required: ["risk_reward", "strategy_match", "session_alignment", "entry_quality", "emotional_discipline"],
                  },
                  summary: { type: "string" },
                },
                required: ["overall_grade", "dimensions", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "grade_trade" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const gradeResult = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(gradeResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("grade-trade error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
