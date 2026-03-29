import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

const weights = {
  robustness: 0.30,
  risk: 0.30,
  consistency: 0.20,
  execution: 0.20,
};

function scoreToGrade(score: number): string {
  if (score >= 80) return 'healthy';
  if (score >= 60) return 'medium';
  return 'risky';
}

function computeRobustness(pnls: number[]): number {
  const n = pnls.length;
  if (n < 10) return 0;
  const half = Math.floor(n / 2);
  const firstSum = pnls.slice(0, half).reduce((a, b) => a + b, 0);
  const secondSum = pnls.slice(half).reduce((a, b) => a + b, 0);
  let subPeriodScore = firstSum > 0 && secondSum > 0 ? 40 : (firstSum > 0 || secondSum > 0) ? 20 : 0;
  const totalPnl = pnls.reduce((a, b) => a + b, 0);
  const maxSingle = Math.max(...pnls.map(Math.abs));
  const depRatio = totalPnl !== 0 ? maxSingle / Math.abs(totalPnl) : 1;
  const depScore = depRatio > 0.5 ? 0 : depRatio > 0.3 ? 15 : 30;
  const third = Math.floor(n / 3);
  const thirds = [pnls.slice(0, third), pnls.slice(third, 2 * third), pnls.slice(2 * third)];
  const profThirds = thirds.filter(t => t.reduce((a, b) => a + b, 0) > 0).length;
  const thirdsScore = profThirds === 3 ? 30 : profThirds === 2 ? 20 : profThirds === 1 ? 10 : 0;
  return Math.min(100, subPeriodScore + depScore + thirdsScore);
}

function computeRiskQuality(pnls: number[]): number {
  if (pnls.length === 0) return 0;
  let peak = 0, maxDD = 0, cum = 0;
  for (const p of pnls) { cum += p; if (cum > peak) peak = cum; const dd = peak - cum; if (dd > maxDD) maxDD = dd; }
  const ddRatio = cum > 0 ? maxDD / cum : 2;
  const ddScore = ddRatio < 0.3 ? 40 : ddRatio < 0.5 ? 30 : ddRatio < 1.0 ? 20 : ddRatio < 1.5 ? 10 : 0;
  let worstStreak = 0, curStr = 0;
  for (const p of pnls) { if (p < 0) { curStr++; worstStreak = Math.max(worstStreak, curStr); } else curStr = 0; }
  const streakScore = worstStreak <= 3 ? 30 : worstStreak <= 5 ? 20 : worstStreak <= 8 ? 10 : 0;
  const losses = pnls.filter(p => p < 0);
  if (losses.length === 0) return Math.min(100, ddScore + streakScore + 30);
  const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
  const worstLoss = Math.min(...losses);
  const lossRatio = avgLoss !== 0 ? worstLoss / avgLoss : 1;
  const lossScore = lossRatio > 0.3 ? 30 : lossRatio > 0.15 ? 20 : 10;
  return Math.min(100, ddScore + streakScore + lossScore);
}

function computeConsistency(entries: { entry_time: string }[], pnls: number[]): number {
  if (entries.length < 10) return 0;
  const monthlyPnl = new Map<string, number>();
  entries.forEach((t, i) => {
    const d = new Date(t.entry_time);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyPnl.set(key, (monthlyPnl.get(key) || 0) + pnls[i]);
  });
  const months = Array.from(monthlyPnl.values());
  if (months.length < 2) { const wins = pnls.filter(p => p > 0).length; return Math.round((wins / pnls.length) * 60); }
  const profRate = months.filter(m => m > 0).length / months.length;
  const profScore = Math.round(profRate * 50);
  const mean = months.reduce((a, b) => a + b, 0) / months.length;
  const variance = months.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / months.length;
  const cv = mean !== 0 ? Math.sqrt(variance) / Math.abs(mean) : 5;
  const varScore = cv < 0.5 ? 50 : cv < 1.0 ? 35 : cv < 2.0 ? 20 : 10;
  return Math.min(100, profScore + varScore);
}

function computeExecutionReality(entries: { entry_time: string; fees?: number }[]): number {
  const n = entries.length;
  if (n < 2) return 50;
  const sorted = [...entries].sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
  const spanDays = Math.max(1, (new Date(sorted[n - 1].entry_time).getTime() - new Date(sorted[0].entry_time).getTime()) / 86400000);
  const tpd = n / spanDays;
  const freqScore = tpd <= 5 ? 50 : tpd <= 15 ? 35 : tpd <= 50 ? 20 : 5;
  const hasFees = entries.some(t => (t.fees ?? 0) > 0);
  const feesScore = hasFees ? 30 : 15;
  const spanScore = spanDays >= 180 ? 20 : spanDays >= 90 ? 15 : spanDays >= 30 ? 10 : 5;
  return Math.min(100, freqScore + feesScore + spanScore);
}

function generateReasons(score: number, c: any, n: number): string[] {
  const r: string[] = [];
  if (c.robustness >= 70) r.push('Strategy multiple time periods mein consistent hai');
  if (c.risk_quality >= 70) r.push('Drawdown control strong hai — risk management solid');
  if (c.consistency >= 70) r.push('Monthly returns smooth aur predictable hain');
  if (c.execution_reality >= 70) r.push('Realistic execution assumptions — fees included');
  if (n >= 100) r.push(`${n} trades ka strong sample size hai`);
  if (score >= 80) r.push('Overall health score excellent — production ready');
  return r.length > 0 ? r.slice(0, 3) : ['Score average hai — improvement possible hai'];
}

function generateWarnings(score: number, c: any, pnls: number[]): string[] {
  const w: string[] = [];
  if (c.robustness < 50) w.push('Strategy ek period mein achhi thi, doosre mein nahi — overfit risk');
  if (c.risk_quality < 50) w.push('Drawdown bahut zyada hai — capital risk high');
  if (c.consistency < 50) w.push('Monthly returns mein bahut variation hai — unreliable');
  if (c.execution_reality < 50) w.push('Execution assumptions unrealistic ho sakte hain');
  const total = pnls.reduce((a, b) => a + b, 0);
  const maxT = Math.max(...pnls);
  if (total > 0 && maxT / total > 0.4) w.push('Total profit ek hi trade pe depend karta hai');
  if (pnls.length < 30) w.push('Sample size kam hai — aur trades karein');
  if (score < 40) w.push('Score critically low — live trading recommended nahi');
  return w.slice(0, 3);
}

const W_ROBUSTNESS = 0.30;
const W_RISK = 0.30;
const W_CONSISTENCY = 0.20;
const W_EXECUTION = 0.20;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'recompute';

    if (action === 'get' && req.method === 'GET') {
      const strategyId = url.searchParams.get('strategy_id');
      if (!strategyId) {
        return new Response(JSON.stringify({ error: 'strategy_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data, error } = await supabase.from('strategy_health_scores').select('*').eq('strategy_id', strategyId).eq('scope', 'global').maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const runId = crypto.randomUUID();
    await supabase.from('strategy_health_runs').insert({ id: runId, status: 'running', strategies_processed: 0 });

    const { data: strategies, error: sErr } = await supabase.from('strategies').select('id').eq('status', 'active');
    if (sErr) throw sErr;

    let processed = 0;
    const errors: string[] = [];

    for (const strat of (strategies || [])) {
      try {
        const { data: results } = await supabase.from('results').select('summary_json').eq('strategy_id', strat.id).order('created_at', { ascending: false }).limit(5);
        const { data: trades } = await supabase.from('trades').select('pnl, net_pnl, fees, entry_time, exit_time, timeframe').eq('strategy_tag', strat.id).order('entry_time', { ascending: true });

        const tradeData = (trades || []).filter(t => t.pnl != null);
        if (tradeData.length < 10) continue;

        const pnls = tradeData.map(t => (t.net_pnl ?? t.pnl) as number);
        const entries = tradeData.map(t => ({ entry_time: t.entry_time, fees: t.fees }));

        const robustness = computeRobustness(pnls);
        const risk_quality = computeRiskQuality(pnls);
        const consistency = computeConsistency(entries, pnls);
        const execution_reality = computeExecutionReality(entries);

        const score = Math.round(robustness * W_ROBUSTNESS + risk_quality * W_RISK + consistency * W_CONSISTENCY + execution_reality * W_EXECUTION);
        const grade = scoreToGrade(score);
        const components = { robustness, risk_quality, consistency, execution_reality };
        const reasons = generateReasons(score, components, tradeData.length);
        const warnings = generateWarnings(score, components, pnls);

        let computed_from = 'backtest';
        if (results && results.length > 0) computed_from = 'mixed';

        await supabase.from('strategy_health_scores').upsert({
          strategy_id: strat.id, scope: 'global', symbol: '', timeframe: '',
          score, grade, components, reasons, warnings, computed_from,
          sample_size: tradeData.length, last_computed_at: new Date().toISOString(),
        }, { onConflict: 'strategy_id,scope,symbol,timeframe' });

        processed++;
      } catch (e) {
        errors.push(`${strat.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    await supabase.from('strategy_health_runs').update({
      finished_at: new Date().toISOString(), strategies_processed: processed,
      status: errors.length > 0 ? 'error' : 'success',
      error: errors.length > 0 ? errors.join('; ') : null,
    }).eq('id', runId);

    return new Response(JSON.stringify({ run_id: runId, strategies_processed: processed, errors: errors.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const corsHeaders = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
