/**
 * Advanced Risk Metrics Calculator
 * Phase 3D: VaR, CVaR, Omega Ratio, Calmar, Ulcer Index, etc.
 * All calculations are pure functions for use in UI and workers
 */

export interface RiskMetricsInput {
  returns: number[]; // Array of periodic returns (daily/trade)
  equity: number[]; // Equity curve
  initialCapital: number;
  riskFreeRate?: number; // Annual risk-free rate (default 0)
  confidenceLevel?: number; // For VaR (default 0.95)
  threshold?: number; // For Omega ratio (default 0)
}

export interface RiskMetrics {
  // Value at Risk
  var95: number;
  var99: number;
  cvar95: number; // Conditional VaR (Expected Shortfall)
  cvar99: number;
  
  // Risk-adjusted returns
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  omegaRatio: number;
  treynorRatio: number; // Requires benchmark
  
  // Drawdown metrics
  maxDrawdown: number;
  maxDrawdownPercent: number;
  avgDrawdown: number;
  ulcerIndex: number;
  painIndex: number;
  recoveryFactor: number;
  
  // Volatility metrics
  annualizedVolatility: number;
  downsideDeviation: number;
  upsideDeviation: number;
  skewness: number;
  kurtosis: number;
  
  // Trading metrics
  winRate: number;
  avgWin: number;
  avgLoss: number;
  payoffRatio: number;
  expectancy: number;
  kellyFraction: number;
  
  // Tail risk
  tailRatio: number; // Ratio of gains in top 5% to losses in bottom 5%
  gainToPainRatio: number;
}

// Calculate percentile from sorted array
function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0;
  const index = (p / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) return sortedArray[lower];
  return sortedArray[lower] * (1 - (index - lower)) + sortedArray[upper] * (index - lower);
}

// Calculate mean
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Calculate standard deviation
function stdDev(arr: number[], avg?: number): number {
  if (arr.length < 2) return 0;
  const m = avg ?? mean(arr);
  return Math.sqrt(arr.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / arr.length);
}

// Calculate downside deviation (only negative returns)
function downsideDev(returns: number[], threshold = 0): number {
  const downside = returns.filter(r => r < threshold).map(r => r - threshold);
  if (downside.length === 0) return 0;
  return Math.sqrt(downside.reduce((sum, r) => sum + r * r, 0) / returns.length);
}

// Calculate upside deviation
function upsideDev(returns: number[], threshold = 0): number {
  const upside = returns.filter(r => r > threshold).map(r => r - threshold);
  if (upside.length === 0) return 0;
  return Math.sqrt(upside.reduce((sum, r) => sum + r * r, 0) / returns.length);
}

// Calculate skewness
function skewness(arr: number[]): number {
  if (arr.length < 3) return 0;
  const m = mean(arr);
  const s = stdDev(arr, m);
  if (s === 0) return 0;
  
  const n = arr.length;
  const sum = arr.reduce((acc, v) => acc + Math.pow((v - m) / s, 3), 0);
  return (n / ((n - 1) * (n - 2))) * sum;
}

// Calculate excess kurtosis
function kurtosis(arr: number[]): number {
  if (arr.length < 4) return 0;
  const m = mean(arr);
  const s = stdDev(arr, m);
  if (s === 0) return 0;
  
  const n = arr.length;
  const sum = arr.reduce((acc, v) => acc + Math.pow((v - m) / s, 4), 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
}

// Calculate Omega ratio
function omegaRatio(returns: number[], threshold = 0): number {
  const gains = returns.filter(r => r > threshold).reduce((sum, r) => sum + (r - threshold), 0);
  const losses = returns.filter(r => r < threshold).reduce((sum, r) => sum + (threshold - r), 0);
  return losses > 0 ? gains / losses : gains > 0 ? Infinity : 1;
}

// Calculate Ulcer Index (RMS of percentage drawdowns)
function ulcerIndex(drawdownPcts: number[]): number {
  if (drawdownPcts.length === 0) return 0;
  const sumSquares = drawdownPcts.reduce((sum, dd) => sum + dd * dd, 0);
  return Math.sqrt(sumSquares / drawdownPcts.length);
}

// Calculate Pain Index (mean of absolute drawdowns)
function painIndex(drawdownPcts: number[]): number {
  if (drawdownPcts.length === 0) return 0;
  return mean(drawdownPcts.map(Math.abs));
}

// Calculate Kelly Criterion fraction
function kellyFraction(winRate: number, avgWin: number, avgLoss: number): number {
  if (avgLoss === 0 || avgWin === 0) return 0;
  const p = winRate / 100;
  const b = avgWin / avgLoss;
  return p - ((1 - p) / b);
}

// Calculate drawdown series from equity
function calculateDrawdowns(equity: number[]): { drawdown: number[]; drawdownPct: number[] } {
  const drawdown: number[] = [];
  const drawdownPct: number[] = [];
  let peak = equity[0];
  
  for (const value of equity) {
    if (value > peak) peak = value;
    const dd = peak - value;
    drawdown.push(dd);
    drawdownPct.push(peak > 0 ? (dd / peak) * 100 : 0);
  }
  
  return { drawdown, drawdownPct };
}

// Main calculation function
export function calculateRiskMetrics(input: RiskMetricsInput): RiskMetrics {
  const { 
    returns, 
    equity, 
    initialCapital,
    riskFreeRate = 0,
    confidenceLevel = 0.95
  } = input;
  
  const n = returns.length;
  if (n === 0) {
    return getEmptyMetrics();
  }
  
  // Sort returns for VaR calculations
  const sortedReturns = [...returns].sort((a, b) => a - b);
  
  // VaR calculations (as positive values representing potential loss)
  const var95 = -percentile(sortedReturns, 5);
  const var99 = -percentile(sortedReturns, 1);
  
  // CVaR (Expected Shortfall) - average of returns below VaR
  const cutoff95 = Math.floor(sortedReturns.length * 0.05);
  const cutoff99 = Math.floor(sortedReturns.length * 0.01);
  const cvar95 = cutoff95 > 0 ? -mean(sortedReturns.slice(0, cutoff95)) : var95;
  const cvar99 = cutoff99 > 0 ? -mean(sortedReturns.slice(0, cutoff99)) : var99;
  
  // Basic stats
  const avgReturn = mean(returns);
  const volatility = stdDev(returns, avgReturn);
  const annualizedVol = volatility * Math.sqrt(252);
  const downDev = downsideDev(returns);
  const upDev = upsideDev(returns);
  
  // Daily risk-free rate
  const dailyRf = riskFreeRate / 252;
  
  // Sharpe Ratio (annualized)
  const excessReturn = avgReturn - dailyRf;
  const sharpeRatio = volatility > 0 ? (excessReturn / volatility) * Math.sqrt(252) : 0;
  
  // Sortino Ratio (annualized)
  const sortinoRatio = downDev > 0 ? (excessReturn / downDev) * Math.sqrt(252) : 0;
  
  // Drawdown analysis
  const { drawdown, drawdownPct } = calculateDrawdowns(equity);
  const maxDrawdown = Math.max(...drawdown);
  const maxDrawdownPercent = Math.max(...drawdownPct);
  const avgDrawdown = mean(drawdownPct);
  
  // Ulcer and Pain Index
  const ulcer = ulcerIndex(drawdownPct);
  const pain = painIndex(drawdownPct);
  
  // Net profit and Calmar
  const netProfit = equity[equity.length - 1] - initialCapital;
  const calmarRatio = maxDrawdownPercent > 0 ? (netProfit / initialCapital * 100) / maxDrawdownPercent : 0;
  const recoveryFactor = maxDrawdown > 0 ? netProfit / maxDrawdown : 0;
  
  // Omega ratio
  const omega = omegaRatio(returns);
  
  // Win/Loss analysis
  const wins = returns.filter(r => r > 0);
  const losses = returns.filter(r => r < 0);
  const winRate = (wins.length / n) * 100;
  const avgWin = mean(wins);
  const avgLoss = Math.abs(mean(losses));
  const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
  
  // Expectancy (average R-multiple equivalent)
  const expectancy = avgReturn;
  
  // Kelly
  const kelly = kellyFraction(winRate, avgWin, avgLoss);
  
  // Tail ratio
  const top5 = percentile(sortedReturns.slice().reverse(), 5);
  const bottom5 = -percentile(sortedReturns, 5);
  const tailRatio = bottom5 !== 0 ? top5 / bottom5 : top5 > 0 ? Infinity : 0;
  
  // Gain to Pain ratio
  const totalGains = wins.reduce((sum, r) => sum + r, 0);
  const totalPain = drawdownPct.reduce((sum, dd) => sum + dd, 0);
  const gainToPainRatio = totalPain > 0 ? (totalGains / totalPain) : totalGains > 0 ? Infinity : 0;
  
  return {
    var95,
    var99,
    cvar95,
    cvar99,
    sharpeRatio: isFinite(sharpeRatio) ? sharpeRatio : 0,
    sortinoRatio: isFinite(sortinoRatio) ? sortinoRatio : 0,
    calmarRatio: isFinite(calmarRatio) ? calmarRatio : 0,
    omegaRatio: isFinite(omega) ? omega : 1,
    treynorRatio: 0, // Requires benchmark
    maxDrawdown,
    maxDrawdownPercent,
    avgDrawdown,
    ulcerIndex: ulcer,
    painIndex: pain,
    recoveryFactor: isFinite(recoveryFactor) ? recoveryFactor : 0,
    annualizedVolatility: annualizedVol,
    downsideDeviation: downDev,
    upsideDeviation: upDev,
    skewness: skewness(returns),
    kurtosis: kurtosis(returns),
    winRate,
    avgWin,
    avgLoss,
    payoffRatio: isFinite(payoffRatio) ? payoffRatio : 0,
    expectancy,
    kellyFraction: isFinite(kelly) ? kelly : 0,
    tailRatio: isFinite(tailRatio) ? tailRatio : 0,
    gainToPainRatio: isFinite(gainToPainRatio) ? gainToPainRatio : 0
  };
}

function getEmptyMetrics(): RiskMetrics {
  return {
    var95: 0,
    var99: 0,
    cvar95: 0,
    cvar99: 0,
    sharpeRatio: 0,
    sortinoRatio: 0,
    calmarRatio: 0,
    omegaRatio: 1,
    treynorRatio: 0,
    maxDrawdown: 0,
    maxDrawdownPercent: 0,
    avgDrawdown: 0,
    ulcerIndex: 0,
    painIndex: 0,
    recoveryFactor: 0,
    annualizedVolatility: 0,
    downsideDeviation: 0,
    upsideDeviation: 0,
    skewness: 0,
    kurtosis: 0,
    winRate: 0,
    avgWin: 0,
    avgLoss: 0,
    payoffRatio: 0,
    expectancy: 0,
    kellyFraction: 0,
    tailRatio: 0,
    gainToPainRatio: 0
  };
}

// Format metrics for display
export function formatRiskMetric(value: number, type: 'percent' | 'ratio' | 'currency' | 'number'): string {
  switch (type) {
    case 'percent':
      return `${value.toFixed(2)}%`;
    case 'ratio':
      return value.toFixed(2);
    case 'currency':
      return `₹${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    case 'number':
    default:
      return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
}
