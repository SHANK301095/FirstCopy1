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

interface InvestorProfile {
  capital: number;
  horizon_days: number;
  risk_level: string;
  max_drawdown_pct: number;
  preferred_assets: string[];
  experience: string;
  goal_text?: string;
}

interface StrategyRow {
  id: string;
  name: string;
  description: string | null;
  asset_classes: string[] | null;
  compatible_timeframes: string[] | null;
  style: string | null;
  risk_profile: string | null;
  expected_trade_frequency: string | null;
  typical_hold_time: string | null;
  min_capital: number | null;
  max_recommended_dd_pct: number | null;
  tags: string[] | null;
  status: string | null;
}

interface ScoredStrategy {
  strategy_id: string;
  name: string;
  description: string;
  score: number;
  reasons: string[];
  risks: string[];
  ideal_for: string;
  recommended_settings: {
    mode: string;
    risk_rules: Record<string, unknown>;
  };
}

function scoreStrategy(strategy: StrategyRow, profile: InvestorProfile): ScoredStrategy | null {
  if (strategy.status === 'disabled') return null;

  let score = 0;
  const reasons: string[] = [];
  const risks: string[] = [];

  const stratAssets = (strategy.asset_classes || []).map(a => a.toLowerCase());
  const profAssets = profile.preferred_assets.map(a => a.toLowerCase());
  const assetOverlap = profAssets.filter(a => stratAssets.includes(a));
  if (assetOverlap.length > 0) {
    const assetScore = Math.min(25, (assetOverlap.length / profAssets.length) * 25);
    score += assetScore;
    reasons.push(`Aapke preferred assets (${assetOverlap.join(', ')}) ke liye designed hai`);
  } else if (stratAssets.length === 0) {
    score += 10;
  }

  const riskMap: Record<string, number> = { conservative: 1, moderate: 2, aggressive: 3 };
  const profileRisk = riskMap[profile.risk_level] || 2;
  const stratRisk = riskMap[strategy.risk_profile || 'moderate'] || 2;
  const riskDiff = Math.abs(profileRisk - stratRisk);
  if (riskDiff === 0) {
    score += 20;
    reasons.push(`Risk profile exactly match karta hai — ${profile.risk_level}`);
  } else if (riskDiff === 1) {
    score += 10;
  } else {
    risks.push(`Ye strategy aapke risk level se zyada ${stratRisk > profileRisk ? 'aggressive' : 'conservative'} hai`);
  }

  const style = (strategy.style || '').toLowerCase();
  if (profile.horizon_days <= 7 && ['scalp', 'intraday'].includes(style)) {
    score += 15;
    reasons.push('Short-term horizon ke liye perfect fit');
  } else if (profile.horizon_days <= 30 && ['intraday', 'swing'].includes(style)) {
    score += 15;
  } else if (profile.horizon_days <= 90 && ['swing', 'positional'].includes(style)) {
    score += 15;
  } else if (profile.horizon_days > 90 && ['positional', 'swing'].includes(style)) {
    score += 15;
  } else if (style) {
    score += 5;
    risks.push(`Strategy style (${style}) aapke time horizon se thoda different hai`);
  }

  const stratMaxDD = strategy.max_recommended_dd_pct || 20;
  if (stratMaxDD <= profile.max_drawdown_pct) {
    score += 20;
  } else if (stratMaxDD <= profile.max_drawdown_pct * 1.5) {
    score += 10;
    risks.push(`Expected drawdown (${stratMaxDD}%) aapke limit (${profile.max_drawdown_pct}%) se thoda zyada ho sakta hai`);
  } else {
    risks.push(`Drawdown risk HIGH — expected ${stratMaxDD}% vs aapka limit ${profile.max_drawdown_pct}%`);
  }

  const freq = (strategy.expected_trade_frequency || 'medium').toLowerCase();
  if (profile.experience === 'beginner' && freq === 'low') {
    score += 10;
    reasons.push('Low frequency — beginners ke liye ideal');
  } else if (profile.experience === 'intermediate' && freq === 'medium') {
    score += 10;
  } else if (profile.experience === 'advanced' && freq === 'high') {
    score += 10;
  } else {
    score += 5;
  }

  const minCap = strategy.min_capital || 0;
  if (profile.capital >= minCap) {
    score += 10;
    if (minCap > 0) reasons.push(`Aapka capital sufficient hai`);
  } else {
    score -= 5;
    risks.push(`Minimum capital ₹${minCap.toLocaleString()} chahiye`);
  }

  if (reasons.length === 0) reasons.push('General purpose strategy');
  while (reasons.length < 3) reasons.push(
    reasons.length === 1 ? 'Automated execution support available' : 'Risk guardrails default ON'
  );
  while (risks.length < 3) risks.push(
    risks.length === 0 ? 'Past performance future results guarantee nahi karta' :
    risks.length === 1 ? 'Market conditions se performance vary kar sakti hai' :
    'Slippage aur fees actual returns kam kar sakte hain'
  );

  const idealFor = profile.experience === 'beginner'
    ? 'Jo trader market me naya hai aur safe start chahta hai'
    : profile.risk_level === 'aggressive'
    ? 'Jo aggressive returns ke liye thoda risk le sakta hai'
    : 'Jo stable, consistent returns prefer karta hai';

  return {
    strategy_id: strategy.id,
    name: strategy.name,
    description: strategy.description || 'No description available',
    score: Math.min(100, Math.max(0, Math.round(score))),
    reasons: reasons.slice(0, 3),
    risks: risks.slice(0, 3),
    ideal_for: idealFor,
    recommended_settings: {
      mode: 'paper',
      risk_rules: {
        maxDailyLossPct: Math.min(profile.max_drawdown_pct / 3, 5),
        maxOpenTrades: profile.experience === 'beginner' ? 2 : 5,
        cooldownAfterLossMin: 30,
        killSwitch: false,
      },
    },
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    if (req.method === 'POST') {
      const body = await req.json();
      const { profile, goal_text } = body as { profile: InvestorProfile; goal_text?: string };

      if (!profile) {
        return new Response(JSON.stringify({ error: 'Profile required' }), { status: 400, headers: corsHeaders });
      }

      const { data: strategies, error: stratErr } = await supabase
        .from('strategies')
        .select('id, name, description, asset_classes, compatible_timeframes, style, risk_profile, expected_trade_frequency, typical_hold_time, min_capital, max_recommended_dd_pct, tags, status')
        .eq('status', 'active')
        .limit(500);

      if (stratErr) {
        return new Response(JSON.stringify({ error: stratErr.message }), { status: 500, headers: corsHeaders });
      }

      const serviceSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const stratIds = (strategies || []).map(s => s.id);
      const { data: healthScores } = await serviceSupabase
        .from('strategy_health_scores')
        .select('strategy_id, score, grade')
        .in('strategy_id', stratIds)
        .eq('scope', 'global');

      const healthMap: Record<string, { score: number; grade: string }> = {};
      (healthScores || []).forEach((h: any) => {
        healthMap[h.strategy_id] = { score: h.score, grade: h.grade };
      });

      const scored = (strategies || [])
        .map(s => {
          const result = scoreStrategy(s as StrategyRow, profile);
          if (!result) return null;
          const health = healthMap[s.id];
          if (health) {
            let multiplier = 1.0;
            if (health.grade === 'healthy') multiplier = 1.10;
            else if (health.grade === 'medium') multiplier = 1.00;
            else if (health.grade === 'risky') multiplier = 0.75;
            result.score = Math.min(100, Math.max(0, Math.round(result.score * multiplier)));
            if (health.grade === 'risky') {
              result.risks.unshift('⚠ Strategy Health Score low — Paper mode strongly recommended');
              result.recommended_settings.mode = 'paper';
            }
          }
          return result;
        })
        .filter((s): s is ScoredStrategy => s !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, 7);

      await supabase.from('recommendation_runs').insert({
        user_id: userId,
        profile_snapshot: profile,
        goal_text: goal_text || null,
        top_matches: scored,
      });

      return new Response(JSON.stringify({
        recommendations: scored,
        disclaimer: 'Ye recommendations historical data aur profile matching pe based hain. Returns guaranteed nahi hain.',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
