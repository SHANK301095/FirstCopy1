/**
 * Correlation Analysis Worker
 * Phase 3C: Computes correlation matrices and rolling correlations
 * Supports multi-strategy/multi-symbol correlation for portfolio analysis
 */

interface CorrelationRequest {
  type: 'analyze';
  runId: string;
  series: EquitySeries[];
  windowSize?: number; // Rolling window size for rolling correlations
}

interface EquitySeries {
  id: string;
  name: string;
  type: 'strategy' | 'symbol' | 'benchmark';
  returns: number[]; // Daily/periodic returns
  timestamps?: number[];
}

interface CorrelationResult {
  type: 'complete';
  runId: string;
  results: {
    // Correlation matrix
    correlationMatrix: {
      labels: string[];
      matrix: number[][];
    };
    
    // Rolling correlations (for each pair)
    rollingCorrelations: RollingCorrelation[];
    
    // Diversification metrics
    diversificationScore: number;
    avgCorrelation: number;
    maxCorrelation: { pair: [string, string]; value: number };
    minCorrelation: { pair: [string, string]; value: number };
    
    // Clustering info
    clusters: { id: number; members: string[] }[];
    
    // Eigenvalue decomposition for risk concentration
    eigenvalues: number[];
    varianceExplained: number[];
  };
}

interface RollingCorrelation {
  series1: string;
  series2: string;
  values: { timestamp: number; correlation: number }[];
}

interface CorrelationError {
  type: 'error';
  runId: string;
  error: string;
}

// Pearson correlation coefficient
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return 0;
  return numerator / denominator;
}

// Calculate rolling correlation
function rollingCorrelation(
  x: number[], 
  y: number[], 
  windowSize: number,
  timestamps?: number[]
): { timestamp: number; correlation: number }[] {
  const results: { timestamp: number; correlation: number }[] = [];
  
  for (let i = windowSize - 1; i < Math.min(x.length, y.length); i++) {
    const windowX = x.slice(i - windowSize + 1, i + 1);
    const windowY = y.slice(i - windowSize + 1, i + 1);
    const corr = pearsonCorrelation(windowX, windowY);
    
    results.push({
      timestamp: timestamps?.[i] || i,
      correlation: corr
    });
  }
  
  return results;
}

// Simple hierarchical clustering based on correlation distance
function hierarchicalClustering(correlationMatrix: number[][], labels: string[], threshold = 0.7): { id: number; members: string[] }[] {
  const n = labels.length;
  const clusters: number[] = labels.map((_, i) => i);
  const clusterMembers: Set<number>[] = labels.map((_, i) => new Set([i]));
  
  // Find highly correlated pairs and merge clusters
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (correlationMatrix[i][j] > threshold) {
        const clusterI = clusters[i];
        const clusterJ = clusters[j];
        
        if (clusterI !== clusterJ) {
          // Merge clusters
          const membersJ = clusterMembers[clusterJ];
          membersJ.forEach(m => {
            clusters[m] = clusterI;
            clusterMembers[clusterI].add(m);
          });
          clusterMembers[clusterJ].clear();
        }
      }
    }
  }
  
  // Convert to output format
  const uniqueClusters = new Map<number, Set<number>>();
  clusters.forEach((c, i) => {
    if (!uniqueClusters.has(c)) {
      uniqueClusters.set(c, new Set());
    }
    uniqueClusters.get(c)!.add(i);
  });
  
  let clusterId = 0;
  const result: { id: number; members: string[] }[] = [];
  
  uniqueClusters.forEach((members) => {
    if (members.size > 0) {
      result.push({
        id: clusterId++,
        members: Array.from(members).map(i => labels[i])
      });
    }
  });
  
  return result;
}

// Power iteration for dominant eigenvalue
function powerIteration(matrix: number[][], iterations = 100): number[] {
  const n = matrix.length;
  const eigenvalues: number[] = [];
  const workingMatrix = matrix.map(row => [...row]);
  
  // Find top 3 eigenvalues using deflation
  for (let ev = 0; ev < Math.min(3, n); ev++) {
    let vector = Array(n).fill(1 / Math.sqrt(n));
    
    for (let iter = 0; iter < iterations; iter++) {
      // Multiply
      const newVector = Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          newVector[i] += workingMatrix[i][j] * vector[j];
        }
      }
      
      // Normalize
      const norm = Math.sqrt(newVector.reduce((sum, v) => sum + v * v, 0));
      if (norm > 0) {
        vector = newVector.map(v => v / norm);
      }
    }
    
    // Compute eigenvalue (Rayleigh quotient)
    let numerator = 0, denominator = 0;
    for (let i = 0; i < n; i++) {
      let Av = 0;
      for (let j = 0; j < n; j++) {
        Av += workingMatrix[i][j] * vector[j];
      }
      numerator += vector[i] * Av;
      denominator += vector[i] * vector[i];
    }
    const eigenvalue = denominator > 0 ? numerator / denominator : 0;
    eigenvalues.push(eigenvalue);
    
    // Deflate matrix
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        workingMatrix[i][j] -= eigenvalue * vector[i] * vector[j];
      }
    }
  }
  
  return eigenvalues;
}

async function analyzeCorrelations(request: CorrelationRequest) {
  const { runId, series, windowSize = 30 } = request;
  
  try {
    if (series.length < 2) {
      throw new Error('At least 2 series required for correlation analysis');
    }
    
    const n = series.length;
    const labels = series.map(s => s.name);
    
    // Build correlation matrix
    const correlationMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      correlationMatrix[i][i] = 1; // Diagonal
      for (let j = i + 1; j < n; j++) {
        const corr = pearsonCorrelation(series[i].returns, series[j].returns);
        correlationMatrix[i][j] = corr;
        correlationMatrix[j][i] = corr;
      }
    }
    
    // Calculate rolling correlations for all pairs
    const rollingCorrelations: RollingCorrelation[] = [];
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const rolling = rollingCorrelation(
          series[i].returns,
          series[j].returns,
          windowSize,
          series[i].timestamps
        );
        
        rollingCorrelations.push({
          series1: series[i].name,
          series2: series[j].name,
          values: rolling
        });
      }
    }
    
    // Calculate average correlation (upper triangle only)
    let sumCorr = 0;
    let countCorr = 0;
    let maxCorr = { pair: ['', ''] as [string, string], value: -1 };
    let minCorr = { pair: ['', ''] as [string, string], value: 1 };
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const corr = correlationMatrix[i][j];
        sumCorr += Math.abs(corr);
        countCorr++;
        
        if (corr > maxCorr.value) {
          maxCorr = { pair: [labels[i], labels[j]], value: corr };
        }
        if (corr < minCorr.value) {
          minCorr = { pair: [labels[i], labels[j]], value: corr };
        }
      }
    }
    
    const avgCorrelation = countCorr > 0 ? sumCorr / countCorr : 0;
    
    // Diversification score (1 - avg absolute correlation)
    const diversificationScore = 1 - avgCorrelation;
    
    // Clustering
    const clusters = hierarchicalClustering(correlationMatrix, labels);
    
    // Eigenvalue analysis
    const eigenvalues = powerIteration(correlationMatrix);
    const totalEigenvalue = eigenvalues.reduce((a, b) => a + Math.abs(b), 0);
    const varianceExplained = eigenvalues.map(ev => 
      totalEigenvalue > 0 ? (Math.abs(ev) / totalEigenvalue) * 100 : 0
    );
    
    self.postMessage({
      type: 'complete',
      runId,
      results: {
        correlationMatrix: { labels, matrix: correlationMatrix },
        rollingCorrelations,
        diversificationScore,
        avgCorrelation,
        maxCorrelation: maxCorr,
        minCorrelation: minCorr,
        clusters,
        eigenvalues,
        varianceExplained
      }
    } as CorrelationResult);
    
  } catch (error) {
    self.postMessage({
      type: 'error',
      runId,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as CorrelationError);
  }
}

// Message handler
self.onmessage = async (event: MessageEvent<CorrelationRequest>) => {
  const request = event.data;
  
  if (request.type === 'analyze') {
    await analyzeCorrelations(request);
  }
};
