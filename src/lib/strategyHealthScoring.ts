/**
 * Strategy Health Scoring Engine
 * Deterministic, explainable scoring (0–100) with 4 components:
 *   Robustness (30%), Risk Quality (30%), Consistency (20%), Execution Reality (20%)
 */

export interface HealthComponents {
  robustness: number;    // 0-100
  risk_quality: number;  // 0-100
  consistency: number;   // 0-100
  execution_reality: number; // 0-100
}

export interface HealthResult {
  score: number;
  grade: 'healthy' | 'medium' | 'risky';
  components: HealthComponents;
  reasons: string[];
  warnings: string[];
  sample_size: number;
}

export interface TradeInput {
  pnl: number;
  net_pnl: number;
  entry_time: string;
  exit_time?: string;
  fees?: number;
  timeframe?: string;
}

// Weights
const W_ROBUSTNESS = 0.30;
const W_RISK = 0.30;
const W_CONSISTENCY = 0.20;
const W_EXECUTION = 0.20;

const MIN_TRADES = 10;

/** Grade from score */
export function scoreToGrade(score: number): 'healthy' | 'medium' | 'risky' {
  if (score >= 80) return 'healthy';
  if (score >= 60) return 'medium';
  return 'risky';
}

/** Compute full health result from trades */
export function computeHealthScore(trades: TradeInput[]): HealthResult {
  const n = trades.length;

  if (n < MIN_TRADES) {
    return {
      score: 0,
      grade: 'risky',
      components: { robustness: 0, risk_quality: 0, consistency: 0, execution_reality: 0 },
      reasons: ['Sample size bahut kam hai — minimum 10 trades chahiye'],
      warnings: ['Itne kam trades se koi reliable score nahi banta'],
      sample_size: n,
    };
  }

  const sorted = [...trades].sort(
    (a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime()
  );
  const pnls = sorted.map(t => t.net_pnl ?? t.pnl);

  const robustness = computeRobustness(pnls);
  const risk_quality = computeRiskQuality(pnls);
  const consistency = computeConsistency(sorted, pnls);
  const execution_reality = computeExecutionReality(sorted);

  const score = Math.round(
    robustness * W_ROBUSTNESS +
    risk_quality * W_RISK +
    consistency * W_CONSISTENCY +
    execution_reality * W_EXECUTION
  );

  const grade = scoreToGrade(score);
  const reasons = generateReasons(score, { robustness, risk_quality, consistency, execution_reality }, n);
  const warnings = generateWarnings(score, { robustness, risk_quality, consistency, execution_reality }, pnls);

  return {
    score,
    grade,
    components: { robustness, risk_quality, consistency, execution_reality },
    reasons: reasons.slice(0, 3),
    warnings: warnings.slice(0, 3),
    sample_size: n,
  };
}

// ─── COMPONENT CALCULATORS ────────────────────────────────────

function computeRobustness(pnls: number[]): number {
  const n = pnls.length;
  if (n < 10) return 0;

  // Split into halves: check if both halves are profitable
  const half = Math.floor(n / 2);
  const firstHalf = pnls.slice(0, half);
  const secondHalf = pnls.slice(half);

  const firstSum = firstHalf.reduce((a, b) => a + b, 0);
  const secondSum = secondHalf.reduce((a, b) => a + b, 0);

  // Sub-period profitability (40 pts)
  let subPeriodScore = 0;
  if (firstSum > 0 && secondSum > 0) subPeriodScore = 40;
  else if (firstSum > 0 || secondSum > 0) subPeriodScore = 20;

  // One-trade dependence penalty (30 pts)
  const totalPnl = pnls.reduce((a, b) => a + b, 0);
  const maxSingleTrade = Math.max(...pnls.map(Math.abs));
  const dependenceRatio = totalPnl !== 0 ? maxSingleTrade / Math.abs(totalPnl) : 1;
  const dependenceScore = dependenceRatio > 0.5 ? 0 : dependenceRatio > 0.3 ? 15 : 30;

  // Win consistency across thirds (30 pts)
  const third = Math.floor(n / 3);
  const thirds = [
    pnls.slice(0, third),
    pnls.slice(third, 2 * third),
    pnls.slice(2 * third),
  ];
  const profitableThirds = thirds.filter(t => t.reduce((a, b) => a + b, 0) > 0).length;
  const thirdsScore = profitableThirds === 3 ? 30 : profitableThirds === 2 ? 20 : profitableThirds === 1 ? 10 : 0;

  return Math.min(100, subPeriodScore + dependenceScore + thirdsScore);
}

function computeRiskQuality(pnls: number[]): number {
  if (pnls.length === 0) return 0;

  // Max drawdown (40 pts)
  let peak = 0, maxDD = 0, cumulative = 0;
  for (const p of pnls) {
    cumulative += p;
    if (cumulative > peak) peak = cumulative;
    const dd = peak - cumulative;
    if (dd > maxDD) maxDD = dd;
  }
  const totalReturn = cumulative;
  const ddRatio = totalReturn > 0 ? maxDD / totalReturn : 2;
  const ddScore = ddRatio < 0.3 ? 40 : ddRatio < 0.5 ? 30 : ddRatio < 1.0 ? 20 : ddRatio < 1.5 ? 10 : 0;

  // Worst streak (30 pts)
  let worstStreak = 0, curStreak = 0;
  for (const p of pnls) {
    if (p < 0) { curStreak++; worstStreak = Math.max(worstStreak, curStreak); }
    else { curStreak = 0; }
  }
  const streakScore = worstStreak <= 3 ? 30 : worstStreak <= 5 ? 20 : worstStreak <= 8 ? 10 : 0;

  // Loss size distribution (30 pts)
  const losses = pnls.filter(p => p < 0);
  if (losses.length === 0) return Math.min(100, ddScore + streakScore + 30);
  const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
  const worstLoss = Math.min(...losses);
  const lossRatio = avgLoss !== 0 ? worstLoss / avgLoss : 1;
  const lossScore = lossRatio > 0.3 ? 30 : lossRatio > 0.15 ? 20 : 10;

  return Math.min(100, ddScore + streakScore + lossScore);
}

function computeConsistency(trades: TradeInput[], pnls: number[]): number {
  if (trades.length < 10) return 0;

  // Group by month
  const monthlyPnl = new Map<string, number>();
  trades.forEach((t, i) => {
    const d = new Date(t.entry_time);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyPnl.set(key, (monthlyPnl.get(key) || 0) + pnls[i]);
  });

  const months = Array.from(monthlyPnl.values());
  if (months.length < 2) {
    // Single month — give partial score based on win rate
    const wins = pnls.filter(p => p > 0).length;
    return Math.round((wins / pnls.length) * 60);
  }

  // Monthly profitability rate (50 pts)
  const profitableMonths = months.filter(m => m > 0).length;
  const profitRate = profitableMonths / months.length;
  const profitScore = Math.round(profitRate * 50);

  // Monthly variance (50 pts) — lower is better
  const mean = months.reduce((a, b) => a + b, 0) / months.length;
  const variance = months.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / months.length;
  const cv = mean !== 0 ? Math.sqrt(variance) / Math.abs(mean) : 5;
  const varianceScore = cv < 0.5 ? 50 : cv < 1.0 ? 35 : cv < 2.0 ? 20 : 10;

  return Math.min(100, profitScore + varianceScore);
}

function computeExecutionReality(trades: TradeInput[]): number {
  // Without real slippage data, apply conservative scoring based on frequency
  const n = trades.length;
  if (n < 2) return 50;

  const sorted = [...trades].sort(
    (a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime()
  );

  const firstTime = new Date(sorted[0].entry_time).getTime();
  const lastTime = new Date(sorted[n - 1].entry_time).getTime();
  const spanDays = Math.max(1, (lastTime - firstTime) / (1000 * 60 * 60 * 24));
  const tradesPerDay = n / spanDays;

  // Frequency penalty (50 pts) — very high frequency = likely unrealistic
  let freqScore: number;
  if (tradesPerDay <= 5) freqScore = 50;
  else if (tradesPerDay <= 15) freqScore = 35;
  else if (tradesPerDay <= 50) freqScore = 20;
  else freqScore = 5;

  // Fees present? (30 pts)
  const hasFees = trades.some(t => (t.fees ?? 0) > 0);
  const feesScore = hasFees ? 30 : 15;

  // Sample span bonus (20 pts) — longer data = more realistic
  const spanScore = spanDays >= 180 ? 20 : spanDays >= 90 ? 15 : spanDays >= 30 ? 10 : 5;

  return Math.min(100, freqScore + feesScore + spanScore);
}

// ─── REASON/WARNING GENERATORS ─────────────────────────────

function generateReasons(
  score: number,
  c: HealthComponents,
  sampleSize: number
): string[] {
  const reasons: string[] = [];

  if (c.robustness >= 70) reasons.push('Strategy multiple time periods mein consistent hai');
  if (c.risk_quality >= 70) reasons.push('Drawdown control strong hai — risk management solid');
  if (c.consistency >= 70) reasons.push('Monthly returns smooth aur predictable hain');
  if (c.execution_reality >= 70) reasons.push('Realistic execution assumptions — fees included');
  if (sampleSize >= 100) reasons.push(`${sampleSize} trades ka strong sample size hai`);
  if (score >= 80) reasons.push('Overall health score excellent — production ready');

  return reasons.length > 0 ? reasons : ['Score average hai — improvement possible hai'];
}

function generateWarnings(
  score: number,
  c: HealthComponents,
  pnls: number[]
): string[] {
  const warnings: string[] = [];

  if (c.robustness < 50) warnings.push('Strategy ek period mein achhi thi, doosre mein nahi — overfit risk');
  if (c.risk_quality < 50) warnings.push('Drawdown bahut zyada hai — capital risk high');
  if (c.consistency < 50) warnings.push('Monthly returns mein bahut variation hai — unreliable');
  if (c.execution_reality < 50) warnings.push('Execution assumptions unrealistic ho sakte hain');

  const totalPnl = pnls.reduce((a, b) => a + b, 0);
  const maxTrade = Math.max(...pnls);
  if (totalPnl > 0 && maxTrade / totalPnl > 0.4) {
    warnings.push('Total profit ek hi trade pe depend karta hai — fragile strategy');
  }

  if (pnls.length < 30) {
    warnings.push('Sample size kam hai — aur backtests/paper trades karein');
  }

  if (score < 40) {
    warnings.push('Score critically low — live trading recommended nahi');
  }

  return warnings;
}
