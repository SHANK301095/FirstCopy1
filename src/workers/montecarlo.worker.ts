/**
 * Monte Carlo Simulation Worker
 * Phase 3A: Risk & Robustness Lab
 * Runs 1000-10000 iterations to compute confidence intervals and ruin probability
 */

interface MonteCarloRequest {
  type: 'run';
  runId: string;
  trades: TradeInput[];
  iterations: number;
  initialCapital: number;
  ruinThreshold: number; // e.g., 0.5 = 50% of capital lost
}

interface TradeInput {
  pnl: number;
  pnlPct: number;
}

interface MonteCarloProgress {
  type: 'progress';
  runId: string;
  pct: number;
  currentIteration: number;
}

interface MonteCarloResult {
  type: 'complete';
  runId: string;
  results: {
    // Confidence intervals
    p5: number;
    p25: number;
    p50: number; // median
    p75: number;
    p95: number;
    mean: number;
    stdDev: number;
    
    // Ruin probability
    ruinProbability: number;
    ruinCount: number;
    
    // Drawdown stats
    maxDrawdownP5: number;
    maxDrawdownP50: number;
    maxDrawdownP95: number;
    avgMaxDrawdown: number;
    
    // Distribution data for charts
    finalEquityDistribution: number[];
    maxDrawdownDistribution: number[];
    
    // Percentile equity curves (5 curves: p5, p25, p50, p75, p95)
    percentileCurves: {
      p5: number[];
      p25: number[];
      p50: number[];
      p75: number[];
      p95: number[];
    };
  };
}

interface MonteCarloError {
  type: 'error';
  runId: string;
  error: string;
}

type WorkerMessage = MonteCarloProgress | MonteCarloResult | MonteCarloError;

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Calculate percentile from sorted array
function percentile(sortedArray: number[], p: number): number {
  const index = (p / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) {
    return sortedArray[lower];
  }
  
  const fraction = index - lower;
  return sortedArray[lower] * (1 - fraction) + sortedArray[upper] * fraction;
}

async function runMonteCarlo(request: MonteCarloRequest) {
  const { runId, trades, iterations, initialCapital, ruinThreshold } = request;
  
  try {
    if (trades.length === 0) {
      throw new Error('No trades provided for Monte Carlo simulation');
    }
    
    const finalEquities: number[] = [];
    const maxDrawdowns: number[] = [];
    let ruinCount = 0;
    
    // Store all equity curves for percentile calculation
    const allEquityCurves: number[][] = [];
    const tradeCount = trades.length;
    
    // Run iterations
    for (let i = 0; i < iterations; i++) {
      // Shuffle trade order (random walk)
      const shuffledTrades = shuffleArray(trades);
      
      // Simulate equity curve
      let equity = initialCapital;
      let maxEquity = initialCapital;
      let maxDrawdown = 0;
      const equityCurve: number[] = [equity];
      
      for (const trade of shuffledTrades) {
        equity += trade.pnl;
        equityCurve.push(equity);
        
        // Track max equity and drawdown
        if (equity > maxEquity) {
          maxEquity = equity;
        }
        const drawdown = (maxEquity - equity) / maxEquity;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
        
        // Check for ruin
        if (equity <= initialCapital * (1 - ruinThreshold)) {
          ruinCount++;
          break; // Stop this iteration at ruin
        }
      }
      
      finalEquities.push(equity);
      maxDrawdowns.push(maxDrawdown * 100); // Convert to percentage
      allEquityCurves.push(equityCurve);
      
      // Post progress every 100 iterations
      if (i % 100 === 0 || i === iterations - 1) {
        self.postMessage({
          type: 'progress',
          runId,
          pct: Math.round((i / iterations) * 100),
          currentIteration: i
        } as MonteCarloProgress);
      }
    }
    
    // Sort for percentile calculations
    const sortedEquities = [...finalEquities].sort((a, b) => a - b);
    const sortedDrawdowns = [...maxDrawdowns].sort((a, b) => a - b);
    
    // Calculate statistics
    const mean = finalEquities.reduce((a, b) => a + b, 0) / finalEquities.length;
    const variance = finalEquities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / finalEquities.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate percentile curves
    // Normalize all equity curves to same length
    const curveLength = tradeCount + 1;
    const normalizedCurves: number[][] = allEquityCurves.map(curve => {
      // Pad or truncate to curveLength
      if (curve.length >= curveLength) {
        return curve.slice(0, curveLength);
      }
      // Pad with last value (ruin case)
      const padded = [...curve];
      while (padded.length < curveLength) {
        padded.push(padded[padded.length - 1]);
      }
      return padded;
    });
    
    // For each bar position, get percentile values
    const p5Curve: number[] = [];
    const p25Curve: number[] = [];
    const p50Curve: number[] = [];
    const p75Curve: number[] = [];
    const p95Curve: number[] = [];
    
    for (let barIdx = 0; barIdx < curveLength; barIdx++) {
      const valuesAtBar = normalizedCurves.map(c => c[barIdx]).sort((a, b) => a - b);
      p5Curve.push(percentile(valuesAtBar, 5));
      p25Curve.push(percentile(valuesAtBar, 25));
      p50Curve.push(percentile(valuesAtBar, 50));
      p75Curve.push(percentile(valuesAtBar, 75));
      p95Curve.push(percentile(valuesAtBar, 95));
    }
    
    // Create histogram data for distribution charts (50 bins)
    const histogramBins = 50;
    const minEquity = Math.min(...finalEquities);
    const maxEquity = Math.max(...finalEquities);
    const binWidth = (maxEquity - minEquity) / histogramBins;
    
    const equityHistogram: number[] = new Array(histogramBins).fill(0);
    for (const equity of finalEquities) {
      const binIndex = Math.min(
        Math.floor((equity - minEquity) / binWidth),
        histogramBins - 1
      );
      equityHistogram[binIndex]++;
    }
    
    // Drawdown histogram
    const ddHistogram: number[] = new Array(histogramBins).fill(0);
    const maxDD = Math.max(...maxDrawdowns);
    const ddBinWidth = maxDD / histogramBins;
    for (const dd of maxDrawdowns) {
      const binIndex = Math.min(
        Math.floor(dd / ddBinWidth),
        histogramBins - 1
      );
      ddHistogram[binIndex]++;
    }
    
    self.postMessage({
      type: 'complete',
      runId,
      results: {
        p5: percentile(sortedEquities, 5),
        p25: percentile(sortedEquities, 25),
        p50: percentile(sortedEquities, 50),
        p75: percentile(sortedEquities, 75),
        p95: percentile(sortedEquities, 95),
        mean,
        stdDev,
        ruinProbability: (ruinCount / iterations) * 100,
        ruinCount,
        maxDrawdownP5: percentile(sortedDrawdowns, 5),
        maxDrawdownP50: percentile(sortedDrawdowns, 50),
        maxDrawdownP95: percentile(sortedDrawdowns, 95),
        avgMaxDrawdown: maxDrawdowns.reduce((a, b) => a + b, 0) / maxDrawdowns.length,
        finalEquityDistribution: equityHistogram,
        maxDrawdownDistribution: ddHistogram,
        percentileCurves: {
          p5: p5Curve,
          p25: p25Curve,
          p50: p50Curve,
          p75: p75Curve,
          p95: p95Curve
        }
      }
    } as MonteCarloResult);
    
  } catch (error) {
    self.postMessage({
      type: 'error',
      runId,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as MonteCarloError);
  }
}

// Message handler
self.onmessage = async (event: MessageEvent<MonteCarloRequest>) => {
  const request = event.data;
  
  if (request.type === 'run') {
    await runMonteCarlo(request);
  }
};
