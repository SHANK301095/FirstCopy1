/**
 * Walk-Forward Diagnostics — Real computed diagnostics from actual window results
 * Replaces any synthetic/random diagnostics
 */

export interface WalkForwardWindowResult {
  windowIndex: number;
  trainMetrics?: { netProfit: number; sharpeRatio: number; maxDrawdown: number };
  testMetrics?: { netProfit: number; sharpeRatio: number; maxDrawdown: number };
  bestParams?: Record<string, number>;
}

export interface WalkForwardDiagnosticsResult {
  trainTestCorrelation: number;
  degradationRatio: number;
  consistencyScore: number;
  oosSharpeMean: number;
  oosMaxDrawdown: number;
  parameterDriftScore: number;
  overfitRiskScore: number;
  recommendation: 'robust' | 'acceptable' | 'overfitting' | 'insufficient_data';
  windowPassRate: number;
  deploymentSuitability: 'suitable' | 'conditional' | 'unsuitable';
  reasons: string[];
}

/**
 * Compute real diagnostics from actual walk-forward window results
 */
export function computeWalkForwardDiagnostics(
  windows: WalkForwardWindowResult[]
): WalkForwardDiagnosticsResult {
  const reasons: string[] = [];
  const completed = windows.filter(w => w.trainMetrics && w.testMetrics);

  if (completed.length < 2) {
    return {
      trainTestCorrelation: 0,
      degradationRatio: 0,
      consistencyScore: 0,
      oosSharpeMean: 0,
      oosMaxDrawdown: 0,
      parameterDriftScore: 0,
      overfitRiskScore: 100,
      recommendation: 'insufficient_data',
      windowPassRate: 0,
      deploymentSuitability: 'unsuitable',
      reasons: ['Not enough completed windows for diagnostics (need ≥2)'],
    };
  }

  // Train/test metrics
  const trainProfits = completed.map(w => w.trainMetrics!.netProfit);
  const testProfits = completed.map(w => w.testMetrics!.netProfit);
  const trainSharpes = completed.map(w => w.trainMetrics!.sharpeRatio);
  const testSharpes = completed.map(w => w.testMetrics!.sharpeRatio);

  // Degradation ratio
  const avgTrainProfit = mean(trainProfits);
  const avgTestProfit = mean(testProfits);
  const degradationRatio = avgTrainProfit > 0 ? Math.max(0, avgTestProfit / avgTrainProfit) : 0;

  // Consistency: % of OOS windows profitable
  const profitableOOS = completed.filter(w => w.testMetrics!.netProfit > 0).length;
  const consistencyScore = profitableOOS / completed.length;

  // OOS Sharpe mean
  const oosSharpeMean = mean(testSharpes);

  // OOS max drawdown (worst across windows)
  const oosMaxDrawdown = Math.max(...completed.map(w => w.testMetrics!.maxDrawdown));

  // Train-test correlation (Pearson)
  const trainTestCorrelation = pearsonCorrelation(trainProfits, testProfits);

  // Parameter drift: measure how much bestParams change across windows
  const parameterDriftScore = computeParameterDrift(completed);

  // Overfit risk score (0-100, higher = more overfit risk)
  let overfitRiskScore = 0;
  if (degradationRatio < 0.3) overfitRiskScore += 40;
  else if (degradationRatio < 0.5) overfitRiskScore += 25;
  else if (degradationRatio < 0.7) overfitRiskScore += 10;

  if (consistencyScore < 0.4) overfitRiskScore += 30;
  else if (consistencyScore < 0.6) overfitRiskScore += 15;

  if (parameterDriftScore > 0.7) overfitRiskScore += 20;
  else if (parameterDriftScore > 0.4) overfitRiskScore += 10;

  if (trainTestCorrelation < 0.2) overfitRiskScore += 10;

  overfitRiskScore = Math.min(100, overfitRiskScore);

  // Window pass rate (OOS profitable + positive Sharpe)
  const passedWindows = completed.filter(w =>
    w.testMetrics!.netProfit > 0 && w.testMetrics!.sharpeRatio > 0
  ).length;
  const windowPassRate = passedWindows / completed.length;

  // Recommendation
  let recommendation: WalkForwardDiagnosticsResult['recommendation'] = 'acceptable';
  if (degradationRatio > 0.65 && consistencyScore > 0.7 && overfitRiskScore < 30) {
    recommendation = 'robust';
    reasons.push('Strong OOS performance with low overfit risk');
  } else if (degradationRatio < 0.3 || consistencyScore < 0.4 || overfitRiskScore > 60) {
    recommendation = 'overfitting';
    if (degradationRatio < 0.3) reasons.push('Severe train→test degradation');
    if (consistencyScore < 0.4) reasons.push('Low OOS consistency');
    if (overfitRiskScore > 60) reasons.push('High overfit risk score');
  } else {
    if (degradationRatio < 0.5) reasons.push('Moderate train→test degradation');
    if (consistencyScore < 0.6) reasons.push('Below-average OOS consistency');
    reasons.push('Acceptable but not fully robust — review before deployment');
  }

  // Deployment suitability
  let deploymentSuitability: WalkForwardDiagnosticsResult['deploymentSuitability'] = 'conditional';
  if (recommendation === 'robust' && windowPassRate > 0.6) {
    deploymentSuitability = 'suitable';
    reasons.push('Strategy suitable for paper trading deployment');
  } else if (recommendation === 'overfitting') {
    deploymentSuitability = 'unsuitable';
    reasons.push('Strategy not ready for deployment — needs parameter review');
  }

  return {
    trainTestCorrelation,
    degradationRatio,
    consistencyScore,
    oosSharpeMean,
    oosMaxDrawdown,
    parameterDriftScore,
    overfitRiskScore,
    recommendation,
    windowPassRate,
    deploymentSuitability,
    reasons,
  };
}

// --- Helpers ---

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i] - mx;
    const yi = y[i] - my;
    num += xi * yi;
    dx += xi * xi;
    dy += yi * yi;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : Math.max(-1, Math.min(1, num / denom));
}

function computeParameterDrift(windows: WalkForwardWindowResult[]): number {
  const withParams = windows.filter(w => w.bestParams && Object.keys(w.bestParams).length > 0);
  if (withParams.length < 2) return 0;

  const paramKeys = Object.keys(withParams[0].bestParams!);
  if (paramKeys.length === 0) return 0;

  let totalDrift = 0;
  for (const key of paramKeys) {
    const values = withParams.map(w => w.bestParams![key] || 0);
    const avg = mean(values);
    if (avg === 0) continue;
    const cv = Math.sqrt(mean(values.map(v => (v - avg) ** 2))) / Math.abs(avg);
    totalDrift += Math.min(1, cv);
  }

  return Math.min(1, totalDrift / paramKeys.length);
}
