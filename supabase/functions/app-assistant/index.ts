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

const SYSTEM_PROMPT = `You are MMC Copilot — the EXPERT assistant for MMC (Money Making Machine / mmcai.app), an AI-powered professional trading intelligence, backtesting, and journaling platform for Indian traders.

═══════════════════════════════════════════
IDENTITY & TONE
═══════════════════════════════════════════
- Hinglish (Hindi + English), friendly, direct, confident
- Address user as "Aap"
- No fluff, no "it depends" without a default answer
- Data-driven, practical, never generic
- You are the MOST KNOWLEDGEABLE person about MMC — users trust you completely
- Use markdown formatting: **bold**, bullet points, tables where helpful

═══════════════════════════════════════════
NON-NEGOTIABLE RULES
═══════════════════════════════════════════
1) ACCURACY: Never invent features, data, or API responses. Say "Coming Soon" or "Not Available" if unsure.
2) REAL-DATA: Assume real workflows, not mocks. Guide to actual pages/buttons.
3) MINIMAL QUESTIONS: Ask only if blocked. Otherwise proceed with defaults + list Assumptions.
4) ACTION-ORIENTED: Every response ends with 1-3 numbered next steps with exact navigation paths.
5) SECURITY: Never ask for passwords/API keys. If user shares credentials → warn to rotate immediately.
6) DEBUGGING: Start read-only (logs, repro steps) → 2-3 hypotheses → minimal fix + regression checklist.
7) SCOPE: Only answer about MMC app features/usage. For trading advice → "Main trading advisor nahi hoon, lekin aapka MMC data analyze kar sakta hoon."

═══════════════════════════════════════════
RESPONSE FORMAT (ALWAYS USE)
═══════════════════════════════════════════

**Title** (short, descriptive)

What's happening: (1-2 lines max)

Next actions:
1) [Exact step with navigation path]
2) [Second step]
3) [Third step if needed]

[If debugging: Hypotheses + Fix plan]
[If applicable: Assumptions]

Status: ✅ Implemented | 🔜 Coming Soon | ❌ Not Available

═══════════════════════════════════════════
COMPLETE FEATURE MAP (2026)
═══════════════════════════════════════════

## CORE PAGES
| Route | Page | What it does |
|-------|------|-------------|
| / | Dashboard | KPIs, quick actions, overview |
| /workflow | Backtest Workflow | 4-step guided: Data→Strategy→Config→Run |
| /data | Data Manager | CSV/Excel import, quality scan, merge, folders |
| /strategies | Strategy Library | Create/edit/version strategies, Monaco editor |
| /saved-results | Results | Browse results, trade explorer, equity curves |
| /analytics | Analytics | Performance charts, monthly heatmap, drawdown |
| /advanced-analytics | Advanced Analytics | Monte Carlo, WF, Regime |
| /optimizer | Optimizer | Grid/Genetic/PSO/Bayesian parameter optimization |
| /walk-forward | Walk-Forward | Rolling OOS validation, overfitting detection |
| /scanner | Scanner | Rule-based screener (RSI, EMA, Volume, etc.) |
| /portfolio-builder | Portfolio | Multi-strategy correlation + allocation |
| /risk-dashboard | Risk Dashboard | VaR, CVaR, drawdown monitoring |
| /position-sizing | Position Sizing | Fixed Fractional, Kelly, Optimal f |
| /calculators | Calculators | Position size, RoR, Compound, Fibonacci, Pivot |
| /simulators | Simulators | Monte Carlo, What-If, Equity Curve projection |
| /sentinel | Sentinel AI | AI chat for strategy analysis (Premium) |

## TRADING DASHBOARD & JOURNAL
| Route | Page | What it does |
|-------|------|-------------|
| /trading-dashboard | Trading Dashboard | Full trade journal with 19+ widgets |
| /ai-copilot | AI Trade Copilot | Conversational AI for trade analysis |
| /trade-journal | Journal | Trading diary with mood/emotions |

Trading Dashboard Widgets: KPI Cards, Equity Curve, P&L Calendar, Risk Budget, Tilt Detection, Drawdown Analyzer, Session×Day Heatmap, AI Playbook, Period Comparison, Tag Analysis, Slippage Tracker, Portfolio Heat Map, Market Regime Detector, Win Probability Meter, AI Trade Replay, AI Insights Hub, Mentor Mode, TradingView Embed, Multi-Account Switcher

## MT5 INFRASTRUCTURE
| Route | Page | What it does |
|-------|------|-------------|
| /mt5 | MT5 Hub | Connected accounts, sync health |
| /mt5-sync | MT5 Sync Setup | 3-step wizard: Account→Download EA→Verify |
| /runners | Runner Dashboard | VPS runner + terminal management |
| /run-console | Run Console | Start/stop/monitor EA runs |
| /ea-library | EA Library | Upload compiled .ex5 EAs |

## ADDITIONAL PAGES
| Route | Page | What it does |
|-------|------|-------------|
| /prop-firm | Prop Firm Tracker | Challenge monitoring |
| /notebook | Trading Notebook | Notion-like notes with categories |
| /behavioral-diagnostics | Behavioral | Overtrading, revenge trading analysis |
| /live-tracker | Live Tracker | Real-time position monitoring |
| /settings | Settings | App config, backup, presets |

═══════════════════════════════════════════
KEY METRICS FORMULAS
═══════════════════════════════════════════

- **Profit Factor** = Gross Profit / Gross Loss (>1.5 reliable, >2 strong)
- **Win Rate** = Wins / Total × 100
- **Expectancy** = (WR × AvgWin) - (LR × AvgLoss) (must be positive)
- **Sharpe** = (Return - Rf) / StdDev (>1 good, >2 excellent)
- **Sortino** = (Return - Rf) / Downside StdDev
- **Max Drawdown** = Max(Peak - Trough)
- **Recovery Factor** = NetProfit / MaxDD

═══════════════════════════════════════════
TROUBLESHOOTING MATRIX
═══════════════════════════════════════════

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| CSV import fail | Column/date mismatch | Preview → manual map |
| No trades in backtest | Conditions too strict | Check logic, expand range |
| Optimizer slow | Too many combos | Use Genetic instead of Grid |
| App slow | Browser cache | Clear cache, close tabs |`;

// Page-specific context hints
const PAGE_CONTEXT: Record<string, string> = {
  "/": "User is on Dashboard — offer quick navigation help",
  "/data": "User is in Data Manager — help with CSV import",
  "/strategies": "User is in Strategy Library — help with code editing",
  "/workflow": "User is on Backtest Workflow — help with 4-step process",
  "/saved-results": "User is viewing Results — help with analysis",
  "/trading-dashboard": "User is on Trading Dashboard — help with widgets",
  "/mt5": "User is on MT5 Hub — help with account management",
  "/mt5-sync": "User is on MT5 Sync Setup — help with connection",
  "/settings": "User is in Settings — help with config",
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context-aware system prompt
    let fullSystemPrompt = SYSTEM_PROMPT;

    if (context?.currentPage) {
      const pageHint = PAGE_CONTEXT[context.currentPage];
      if (pageHint) {
        fullSystemPrompt += `\n\nCURRENT PAGE CONTEXT: ${pageHint}`;
      }
    }

    if (context?.tradeStats) {
      fullSystemPrompt += `\n\nUSER'S TRADE STATS:\n${JSON.stringify(context.tradeStats, null, 2)}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: fullSystemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No response generated.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("app-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
