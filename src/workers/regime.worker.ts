/**
 * Regime Detection Worker
 * Phase 3B: Identifies market regimes using volatility clustering
 * Segments performance by regime for analysis
 */

interface RegimeRequest {
  type: 'analyze';
  runId: string;
  bars: BarData[];
  trades: TradeData[];
  windowSize?: number; // Default 20 for volatility calculation
}

interface BarData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradeData {
  entryTs: number;
  exitTs: number;
  pnl: number;
  pnlPct: number;
  direction: 'long' | 'short';
}

interface RegimeResult {
  type: 'complete';
  runId: string;
  results: {
    regimes: RegimeSegment[];
    regimeStats: RegimeStats[];
    volatilityData: { timestamp: number; volatility: number; regime: string }[];
    transitionMatrix: number[][]; // Probability of regime transitions
  };
}

interface RegimeSegment {
  startTs: number;
  endTs: number;
  regime: 'low_volatility' | 'normal' | 'high_volatility' | 'trending_up' | 'trending_down';
  avgVolatility: number;
  barCount: number;
}

interface RegimeStats {
  regime: string;
  tradeCount: number;
  winRate: number;
  avgPnl: number;
  totalPnl: number;
  profitFactor: number;
  avgHoldingPeriod: number;
  performanceScore: number; // Normalized -1 to 1
}

interface RegimeError {
  type: 'error';
  runId: string;
  error: string;
}

type RegimeType = 'low_volatility' | 'normal' | 'high_volatility' | 'trending_up' | 'trending_down';

// Calculate ATR (Average True Range) for volatility
function calculateATR(bars: BarData[], period: number): number[] {
  const atr: number[] = [];
  const trueRanges: number[] = [];
  
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const prevClose = i > 0 ? bars[i - 1].close : bar.open;
    
    const tr = Math.max(
      bar.high - bar.low,
      Math.abs(bar.high - prevClose),
      Math.abs(bar.low - prevClose)
    );
    
    trueRanges.push(tr);
    
    if (i >= period - 1) {
      const avgTR = trueRanges.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      atr.push(avgTR);
    } else {
      atr.push(0);
    }
  }
  
  return atr;
}

// Calculate simple moving average
function calculateSMA(values: number[], period: number): number[] {
  const sma: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i >= period - 1) {
      const avg = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      sma.push(avg);
    } else {
      sma.push(values[i]);
    }
  }
  
  return sma;
}

// Classify regime based on volatility and trend
function classifyRegime(
  volatility: number,
  avgVolatility: number,
  stdVolatility: number,
  priceChange: number,
  avgPriceChange: number
): RegimeType {
  const volZ = (volatility - avgVolatility) / stdVolatility;
  
  // Trend detection
  if (Math.abs(priceChange) > avgPriceChange * 1.5) {
    return priceChange > 0 ? 'trending_up' : 'trending_down';
  }
  
  // Volatility regimes
  if (volZ < -0.5) return 'low_volatility';
  if (volZ > 1.0) return 'high_volatility';
  return 'normal';
}

async function analyzeRegimes(request: RegimeRequest) {
  const { runId, bars, trades, windowSize = 20 } = request;
  
  try {
    if (bars.length < windowSize * 2) {
      throw new Error('Insufficient data for regime detection');
    }
    
    // Calculate ATR for volatility
    const atr = calculateATR(bars, windowSize);
    
    // Normalize ATR as percentage of price
    const normalizedVol = bars.map((bar, i) => (atr[i] / bar.close) * 100);
    
    // Calculate statistics for classification
    const validVol = normalizedVol.filter(v => v > 0);
    const avgVolatility = validVol.reduce((a, b) => a + b, 0) / validVol.length;
    const stdVolatility = Math.sqrt(
      validVol.reduce((sum, v) => sum + Math.pow(v - avgVolatility, 2), 0) / validVol.length
    );
    
    // Calculate price changes
    const priceChanges = bars.map((bar, i) => 
      i > 0 ? ((bar.close - bars[i - 1].close) / bars[i - 1].close) * 100 : 0
    );
    const smaPriceChange = calculateSMA(priceChanges.map(Math.abs), windowSize);
    
    // Classify each bar
    const barRegimes: { timestamp: number; volatility: number; regime: RegimeType }[] = [];
    
    for (let i = windowSize; i < bars.length; i++) {
      const regime = classifyRegime(
        normalizedVol[i],
        avgVolatility,
        stdVolatility,
        priceChanges[i],
        smaPriceChange[i] || 0.5
      );
      
      barRegimes.push({
        timestamp: bars[i].timestamp,
        volatility: normalizedVol[i],
        regime
      });
    }
    
    // Segment into continuous regime periods
    const segments: RegimeSegment[] = [];
    let currentSegment: RegimeSegment | null = null;
    
    for (const bar of barRegimes) {
      if (!currentSegment || currentSegment.regime !== bar.regime) {
        if (currentSegment) {
          segments.push(currentSegment);
        }
        currentSegment = {
          startTs: bar.timestamp,
          endTs: bar.timestamp,
          regime: bar.regime,
          avgVolatility: bar.volatility,
          barCount: 1
        };
      } else {
        currentSegment.endTs = bar.timestamp;
        currentSegment.avgVolatility = 
          (currentSegment.avgVolatility * currentSegment.barCount + bar.volatility) / 
          (currentSegment.barCount + 1);
        currentSegment.barCount++;
      }
    }
    
    if (currentSegment) {
      segments.push(currentSegment);
    }
    
    // Map trades to regimes
    const tradesByRegime: Record<string, TradeData[]> = {
      low_volatility: [],
      normal: [],
      high_volatility: [],
      trending_up: [],
      trending_down: []
    };
    
    for (const trade of trades) {
      // Find regime at trade entry
      const regimeAtEntry = barRegimes.find(
        b => b.timestamp <= trade.entryTs
      );
      const regime = regimeAtEntry?.regime || 'normal';
      tradesByRegime[regime].push(trade);
    }
    
    // Calculate stats per regime
    const regimeStats: RegimeStats[] = Object.entries(tradesByRegime).map(([regime, regimeTrades]) => {
      if (regimeTrades.length === 0) {
        return {
          regime,
          tradeCount: 0,
          winRate: 0,
          avgPnl: 0,
          totalPnl: 0,
          profitFactor: 0,
          avgHoldingPeriod: 0,
          performanceScore: 0
        };
      }
      
      const wins = regimeTrades.filter(t => t.pnl > 0);
      const losses = regimeTrades.filter(t => t.pnl <= 0);
      const totalProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
      const totalLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
      const totalPnl = regimeTrades.reduce((sum, t) => sum + t.pnl, 0);
      const avgHold = regimeTrades.reduce((sum, t) => sum + (t.exitTs - t.entryTs), 0) / regimeTrades.length;
      
      const winRate = (wins.length / regimeTrades.length) * 100;
      const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
      
      // Performance score: normalized combination of metrics
      const score = (
        (winRate - 50) / 50 * 0.3 +
        Math.min(Math.max((profitFactor - 1) / 2, -1), 1) * 0.4 +
        (totalPnl > 0 ? 1 : -1) * 0.3
      );
      
      return {
        regime,
        tradeCount: regimeTrades.length,
        winRate,
        avgPnl: totalPnl / regimeTrades.length,
        totalPnl,
        profitFactor: isFinite(profitFactor) ? profitFactor : 0,
        avgHoldingPeriod: avgHold,
        performanceScore: Math.max(-1, Math.min(1, score))
      };
    });
    
    // Calculate transition matrix
    const regimeTypes = ['low_volatility', 'normal', 'high_volatility', 'trending_up', 'trending_down'];
    const transitionCounts: number[][] = regimeTypes.map(() => regimeTypes.map(() => 0));
    
    for (let i = 1; i < segments.length; i++) {
      const fromIdx = regimeTypes.indexOf(segments[i - 1].regime);
      const toIdx = regimeTypes.indexOf(segments[i].regime);
      transitionCounts[fromIdx][toIdx]++;
    }
    
    // Normalize to probabilities
    const transitionMatrix = transitionCounts.map(row => {
      const sum = row.reduce((a, b) => a + b, 0);
      return sum > 0 ? row.map(v => v / sum) : row;
    });
    
    self.postMessage({
      type: 'complete',
      runId,
      results: {
        regimes: segments,
        regimeStats,
        volatilityData: barRegimes,
        transitionMatrix
      }
    } as RegimeResult);
    
  } catch (error) {
    self.postMessage({
      type: 'error',
      runId,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as RegimeError);
  }
}

// Message handler
self.onmessage = async (event: MessageEvent<RegimeRequest>) => {
  const request = event.data;
  
  if (request.type === 'analyze') {
    await analyzeRegimes(request);
  }
};
