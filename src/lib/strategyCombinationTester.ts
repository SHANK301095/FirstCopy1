/**
 * Phase 6: Strategy Combination Tester
 * Tests portfolio of strategies together with correlation-aware allocation
 */

export interface StrategyResult {
  strategyId: string;
  strategyName: string;
  equityCurve: number[];
  trades: { entryTime: number; exitTime: number; pnl: number }[];
  winRate: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
}

export interface CombinationResult {
  strategies: string[];
  weights: number[];
  combinedEquity: number[];
  combinedSharpe: number;
  combinedMaxDD: number;
  correlationMatrix: number[][];
  diversificationRatio: number;
}

/** Calculate Pearson correlation between two return series */
function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  
  let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i]; sumB += b[i];
    sumAB += a[i] * b[i];
    sumA2 += a[i] * a[i];
    sumB2 += b[i] * b[i];
  }
  
  const denom = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
  return denom === 0 ? 0 : (n * sumAB - sumA * sumB) / denom;
}

/** Convert equity curve to returns */
function equityToReturns(equity: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    returns.push(equity[i - 1] !== 0 ? (equity[i] - equity[i - 1]) / equity[i - 1] : 0);
  }
  return returns;
}

/** Build correlation matrix for N strategies */
export function buildCorrelationMatrix(results: StrategyResult[]): number[][] {
  const returns = results.map(r => equityToReturns(r.equityCurve));
  const n = results.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const corr = pearsonCorrelation(returns[i], returns[j]);
      matrix[i][j] = corr;
      matrix[j][i] = corr;
    }
  }
  return matrix;
}

/** Equal-weight combination of strategies */
export function combineStrategies(
  results: StrategyResult[],
  weights?: number[]
): CombinationResult {
  const n = results.length;
  const w = weights || new Array(n).fill(1 / n);
  
  // Normalize weights
  const wSum = w.reduce((s, v) => s + v, 0);
  const normW = w.map(v => v / wSum);
  
  // Find common length
  const minLen = Math.min(...results.map(r => r.equityCurve.length));
  
  // Combine equity curves
  const combinedEquity: number[] = [];
  for (let i = 0; i < minLen; i++) {
    let val = 0;
    for (let j = 0; j < n; j++) {
      val += normW[j] * results[j].equityCurve[i];
    }
    combinedEquity.push(val);
  }
  
  // Combined returns for Sharpe
  const combinedReturns = equityToReturns(combinedEquity);
  const avgRet = combinedReturns.reduce((s, r) => s + r, 0) / combinedReturns.length;
  const stdDev = Math.sqrt(combinedReturns.reduce((s, r) => s + (r - avgRet) ** 2, 0) / combinedReturns.length);
  const combinedSharpe = stdDev > 0 ? (avgRet / stdDev) * Math.sqrt(252) : 0;
  
  // Max drawdown
  let peak = combinedEquity[0];
  let maxDD = 0;
  for (const val of combinedEquity) {
    peak = Math.max(peak, val);
    const dd = peak > 0 ? (peak - val) / peak : 0;
    maxDD = Math.max(maxDD, dd);
  }
  
  const correlationMatrix = buildCorrelationMatrix(results);
  
  // Diversification ratio
  const individualVols = results.map(r => {
    const ret = equityToReturns(r.equityCurve);
    const avg = ret.reduce((s, v) => s + v, 0) / ret.length;
    return Math.sqrt(ret.reduce((s, v) => s + (v - avg) ** 2, 0) / ret.length);
  });
  const weightedAvgVol = normW.reduce((s, w, i) => s + w * individualVols[i], 0);
  const diversificationRatio = stdDev > 0 ? weightedAvgVol / stdDev : 1;
  
  return {
    strategies: results.map(r => r.strategyId),
    weights: normW,
    combinedEquity,
    combinedSharpe: isFinite(combinedSharpe) ? combinedSharpe : 0,
    combinedMaxDD: maxDD * 100,
    correlationMatrix,
    diversificationRatio: isFinite(diversificationRatio) ? diversificationRatio : 1,
  };
}

/** Auto-clean correlated strategies (remove if corr > threshold) */
export function autoCleanCorrelated(
  results: StrategyResult[],
  threshold: number = 0.85
): StrategyResult[] {
  const matrix = buildCorrelationMatrix(results);
  const removed = new Set<number>();
  
  for (let i = 0; i < results.length; i++) {
    if (removed.has(i)) continue;
    for (let j = i + 1; j < results.length; j++) {
      if (removed.has(j)) continue;
      if (Math.abs(matrix[i][j]) > threshold) {
        // Remove the one with lower Sharpe
        const removeIdx = results[i].sharpeRatio >= results[j].sharpeRatio ? j : i;
        removed.add(removeIdx);
      }
    }
  }
  
  return results.filter((_, i) => !removed.has(i));
}
