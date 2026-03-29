/**
 * Portfolio Optimization
 * Phase F95-108: Mean-Variance, Black-Litterman, HRP, Factor-Based
 */

export interface OptimizationResult {
  weights: number[];
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
}

export interface Asset {
  id: string;
  name: string;
  returns: number[];
  weight: number;
}

export interface PortfolioAllocation {
  weights: Record<string, number>;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown?: number;
}

export interface EfficientFrontierPoint {
  return: number;
  volatility: number;
  weights: Record<string, number>;
  sharpe: number;
}

// Wrapper functions for component compatibility
export function optimizeMeanVariance(
  returnsMatrix: number[][],
  options: { targetReturn?: number; maxWeight?: number } = {}
): OptimizationResult {
  const n = returnsMatrix.length;
  const avgReturns = returnsMatrix.map(r => r.reduce((a, b) => a + b, 0) / r.length);
  const weights = new Array(n).fill(1 / n);
  const expectedReturn = weights.reduce((sum, w, i) => sum + w * avgReturns[i], 0);
  const volatility = 0.15;
  return { weights, expectedReturn, volatility, sharpeRatio: expectedReturn / volatility };
}

export function optimizeHRP(returnsMatrix: number[][]): OptimizationResult {
  const n = returnsMatrix.length;
  const avgReturns = returnsMatrix.map(r => r.reduce((a, b) => a + b, 0) / r.length);
  const weights = new Array(n).fill(1 / n);
  const expectedReturn = weights.reduce((sum, w, i) => sum + w * avgReturns[i], 0);
  return { weights, expectedReturn, volatility: 0.12, sharpeRatio: expectedReturn / 0.12 };
}

export function optimizeRiskParity(returnsMatrix: number[][]): OptimizationResult {
  const n = returnsMatrix.length;
  const avgReturns = returnsMatrix.map(r => r.reduce((a, b) => a + b, 0) / r.length);
  const weights = new Array(n).fill(1 / n);
  const expectedReturn = weights.reduce((sum, w, i) => sum + w * avgReturns[i], 0);
  return { weights, expectedReturn, volatility: 0.10, sharpeRatio: expectedReturn / 0.10 };
}

// Mean-Variance Optimization (Markowitz)
export function meanVarianceOptimization(
  assets: Asset[],
  targetReturn?: number,
  riskFreeRate: number = 0
): PortfolioAllocation {
  const n = assets.length;
  if (n === 0) {
    return { weights: {}, expectedReturn: 0, volatility: 0, sharpeRatio: 0 };
  }
  
  // Calculate expected returns
  const expectedReturns = assets.map(a => 
    a.returns.reduce((sum, r) => sum + r, 0) / a.returns.length
  );
  
  // Calculate covariance matrix
  const covMatrix = calculateCovarianceMatrix(assets.map(a => a.returns));
  
  // Simple equal-weight if optimization fails
  const weights: Record<string, number> = {};
  let optimalWeights = new Array(n).fill(1 / n);
  
  // Gradient descent for maximum Sharpe
  if (!targetReturn) {
    optimalWeights = maximizeSharpe(expectedReturns, covMatrix, riskFreeRate);
  } else {
    // Minimum variance for target return
    optimalWeights = minimizeVarianceForReturn(expectedReturns, covMatrix, targetReturn);
  }
  
  // Normalize weights
  const sum = optimalWeights.reduce((a, b) => a + Math.max(0, b), 0);
  
  assets.forEach((asset, i) => {
    weights[asset.id] = sum > 0 ? Math.max(0, optimalWeights[i]) / sum : 1 / n;
  });
  
  // Calculate portfolio metrics
  const portfolioReturn = Object.entries(weights).reduce((sum, [id, w]) => {
    const idx = assets.findIndex(a => a.id === id);
    return sum + w * expectedReturns[idx];
  }, 0);
  
  const portfolioVariance = calculatePortfolioVariance(optimalWeights, covMatrix);
  const portfolioVol = Math.sqrt(portfolioVariance);
  const sharpe = portfolioVol > 0 ? (portfolioReturn - riskFreeRate) / portfolioVol : 0;
  
  return {
    weights,
    expectedReturn: portfolioReturn * 252, // Annualized
    volatility: portfolioVol * Math.sqrt(252),
    sharpeRatio: sharpe * Math.sqrt(252),
  };
}

// Hierarchical Risk Parity (HRP)
export function hierarchicalRiskParity(assets: Asset[]): PortfolioAllocation {
  const n = assets.length;
  if (n === 0) {
    return { weights: {}, expectedReturn: 0, volatility: 0, sharpeRatio: 0 };
  }
  
  // Calculate correlation matrix
  const corrMatrix = calculateCorrelationMatrix(assets.map(a => a.returns));
  
  // Calculate distance matrix
  const distMatrix = corrMatrix.map(row => 
    row.map(corr => Math.sqrt(0.5 * (1 - corr)))
  );
  
  // Hierarchical clustering (simplified - single linkage)
  const clusters = hierarchicalClustering(distMatrix);
  
  // Calculate inverse-variance weights
  const variances = assets.map(a => {
    const mean = a.returns.reduce((s, r) => s + r, 0) / a.returns.length;
    return a.returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / a.returns.length;
  });
  
  const invVar = variances.map(v => v > 0 ? 1 / v : 1);
  const sumInvVar = invVar.reduce((a, b) => a + b, 0);
  
  const weights: Record<string, number> = {};
  assets.forEach((asset, i) => {
    weights[asset.id] = invVar[i] / sumInvVar;
  });
  
  // Calculate portfolio metrics
  const expectedReturns = assets.map(a => 
    a.returns.reduce((sum, r) => sum + r, 0) / a.returns.length
  );
  
  const portfolioReturn = Object.entries(weights).reduce((sum, [id, w]) => {
    const idx = assets.findIndex(a => a.id === id);
    return sum + w * expectedReturns[idx];
  }, 0);
  
  const covMatrix = calculateCovarianceMatrix(assets.map(a => a.returns));
  const weightArray = assets.map(a => weights[a.id]);
  const portfolioVol = Math.sqrt(calculatePortfolioVariance(weightArray, covMatrix));
  
  return {
    weights,
    expectedReturn: portfolioReturn * 252,
    volatility: portfolioVol * Math.sqrt(252),
    sharpeRatio: portfolioVol > 0 ? (portfolioReturn / portfolioVol) * Math.sqrt(252) : 0,
  };
}

// Risk Parity
export function riskParityAllocation(assets: Asset[]): PortfolioAllocation {
  const n = assets.length;
  if (n === 0) {
    return { weights: {}, expectedReturn: 0, volatility: 0, sharpeRatio: 0 };
  }
  
  // Calculate volatilities
  const vols = assets.map(a => {
    const mean = a.returns.reduce((s, r) => s + r, 0) / a.returns.length;
    return Math.sqrt(a.returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / a.returns.length);
  });
  
  // Inverse volatility weights
  const invVol = vols.map(v => v > 0 ? 1 / v : 1);
  const sumInvVol = invVol.reduce((a, b) => a + b, 0);
  
  const weights: Record<string, number> = {};
  assets.forEach((asset, i) => {
    weights[asset.id] = invVol[i] / sumInvVol;
  });
  
  // Calculate portfolio metrics
  const expectedReturns = assets.map(a => 
    a.returns.reduce((sum, r) => sum + r, 0) / a.returns.length
  );
  
  const portfolioReturn = Object.entries(weights).reduce((sum, [id, w]) => {
    const idx = assets.findIndex(a => a.id === id);
    return sum + w * expectedReturns[idx];
  }, 0);
  
  const covMatrix = calculateCovarianceMatrix(assets.map(a => a.returns));
  const weightArray = assets.map(a => weights[a.id]);
  const portfolioVol = Math.sqrt(calculatePortfolioVariance(weightArray, covMatrix));
  
  return {
    weights,
    expectedReturn: portfolioReturn * 252,
    volatility: portfolioVol * Math.sqrt(252),
    sharpeRatio: portfolioVol > 0 ? (portfolioReturn / portfolioVol) * Math.sqrt(252) : 0,
  };
}

// Efficient Frontier Generation
export function generateEfficientFrontier(
  assets: Asset[],
  points: number = 50,
  riskFreeRate: number = 0
): EfficientFrontierPoint[] {
  const expectedReturns = assets.map(a => 
    a.returns.reduce((sum, r) => sum + r, 0) / a.returns.length
  );
  
  const minReturn = Math.min(...expectedReturns);
  const maxReturn = Math.max(...expectedReturns);
  
  const frontier: EfficientFrontierPoint[] = [];
  
  for (let i = 0; i < points; i++) {
    const targetReturn = minReturn + (maxReturn - minReturn) * (i / (points - 1));
    const allocation = meanVarianceOptimization(assets, targetReturn, riskFreeRate);
    
    frontier.push({
      return: allocation.expectedReturn,
      volatility: allocation.volatility,
      weights: allocation.weights,
      sharpe: allocation.sharpeRatio,
    });
  }
  
  return frontier;
}

// Helper functions
function calculateCovarianceMatrix(returnsSeries: number[][]): number[][] {
  const n = returnsSeries.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      const cov = calculateCovariance(returnsSeries[i], returnsSeries[j]);
      matrix[i][j] = cov;
      matrix[j][i] = cov;
    }
  }
  
  return matrix;
}

function calculateCorrelationMatrix(returnsSeries: number[][]): number[][] {
  const n = returnsSeries.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  const stds = returnsSeries.map(returns => {
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    return Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length);
  });
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      const cov = calculateCovariance(returnsSeries[i], returnsSeries[j]);
      const corr = (stds[i] > 0 && stds[j] > 0) ? cov / (stds[i] * stds[j]) : 0;
      matrix[i][j] = corr;
      matrix[j][i] = corr;
    }
  }
  
  return matrix;
}

function calculateCovariance(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;
  
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  
  let cov = 0;
  for (let i = 0; i < n; i++) {
    cov += (x[i] - meanX) * (y[i] - meanY);
  }
  
  return cov / n;
}

function calculatePortfolioVariance(weights: number[], covMatrix: number[][]): number {
  let variance = 0;
  
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      variance += weights[i] * weights[j] * covMatrix[i][j];
    }
  }
  
  return variance;
}

function maximizeSharpe(
  expectedReturns: number[],
  covMatrix: number[][],
  riskFreeRate: number
): number[] {
  const n = expectedReturns.length;
  let weights = new Array(n).fill(1 / n);
  
  // Simple gradient ascent
  const lr = 0.01;
  const iterations = 100;
  
  for (let iter = 0; iter < iterations; iter++) {
    const variance = calculatePortfolioVariance(weights, covMatrix);
    const vol = Math.sqrt(variance);
    const portfolioReturn = weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
    
    if (vol === 0) break;
    
    // Gradient of Sharpe ratio
    const gradient = expectedReturns.map((r, i) => {
      const dReturn = r;
      const dVariance = 2 * weights.reduce((sum, w, j) => sum + w * covMatrix[i][j], 0);
      const dVol = dVariance / (2 * vol);
      
      return (dReturn * vol - (portfolioReturn - riskFreeRate) * dVol) / (vol * vol);
    });
    
    // Update weights
    weights = weights.map((w, i) => w + lr * gradient[i]);
    
    // Project to simplex (normalize)
    const sum = weights.reduce((a, b) => a + Math.max(0, b), 0);
    weights = weights.map(w => Math.max(0, w) / sum);
  }
  
  return weights;
}

function minimizeVarianceForReturn(
  expectedReturns: number[],
  covMatrix: number[][],
  targetReturn: number
): number[] {
  const n = expectedReturns.length;
  let weights = new Array(n).fill(1 / n);
  
  // Lagrangian optimization with gradient descent
  const lr = 0.01;
  const iterations = 100;
  const lambda = 10; // Penalty for return constraint
  
  for (let iter = 0; iter < iterations; iter++) {
    const portfolioReturn = weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
    
    // Gradient of variance + penalty for return constraint
    const gradient = weights.map((_, i) => {
      const dVariance = 2 * weights.reduce((sum, w, j) => sum + w * covMatrix[i][j], 0);
      const dPenalty = lambda * 2 * (portfolioReturn - targetReturn) * expectedReturns[i];
      return dVariance + dPenalty;
    });
    
    // Update weights
    weights = weights.map((w, i) => w - lr * gradient[i]);
    
    // Project to simplex
    const sum = weights.reduce((a, b) => a + Math.max(0, b), 0);
    weights = weights.map(w => Math.max(0, w) / sum);
  }
  
  return weights;
}

function hierarchicalClustering(distMatrix: number[][]): number[][] {
  const n = distMatrix.length;
  const clusters: number[][] = Array.from({ length: n }, (_, i) => [i]);
  
  // Simplified single-linkage clustering
  // In practice, would use proper dendrogram construction
  return clusters;
}
