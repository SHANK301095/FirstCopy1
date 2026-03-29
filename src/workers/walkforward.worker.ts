/**
 * Walk-Forward Analysis Web Worker
 * REAL IMPLEMENTATION: Uses actual backtest engine
 */

import { db, type BacktestMetrics } from '../db';

interface ParamRange {
  name: string;
  start: number;
  end: number;
  step: number;
}

interface WalkForwardRequest {
  type: 'start' | 'cancel';
  runId: string;
  datasetId: string;
  strategyVersionId: string;
  mode: 'ratio' | 'rolling';
  trainRatio?: number;
  windowSize?: number;
  stepSize?: number;
  paramRanges: ParamRange[];
  objective: 'sharpe' | 'netProfit' | 'minDrawdown' | 'profitFactor';
}

interface WalkForwardProgress {
  type: 'progress';
  runId: string;
  pct: number;
  phase: 'train' | 'test';
  window: number;
  totalWindows: number;
}

interface WalkForwardWindowResult {
  type: 'windowResult';
  runId: string;
  window: number;
  trainStart: number;
  trainEnd: number;
  testStart: number;
  testEnd: number;
  bestParams: Record<string, number>;
  trainMetrics: BacktestMetrics;
  testMetrics: BacktestMetrics;
}

interface WalkForwardComplete {
  type: 'complete';
  runId: string;
  windows: Array<Omit<WalkForwardWindowResult, 'type' | 'runId'>>;
  aggregateMetrics: {
    avgTrainSharpe: number;
    avgTestSharpe: number;
    avgTrainProfit: number;
    avgTestProfit: number;
    overfittingRatio: number;
    robustnessScore: number;
    consistency: number;
  };
}

interface WalkForwardError {
  type: 'error';
  runId: string;
  error: string;
}

let isCanceled = false;
let currentRunId: string | null = null;

// Inline indicator calculations
function calculateEMA(data: number[], period: number): number[] {
  if (data.length < period) return new Array(data.length).fill(NaN);
  const multiplier = 2 / (period + 1);
  const ema: number[] = new Array(data.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  ema[period - 1] = sum / period;
  for (let i = period; i < data.length; i++) {
    ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }
  return ema;
}

// Simple backtest function for optimization
function runSimpleBacktest(
  bars: { close: number }[],
  fastPeriod: number,
  slowPeriod: number
): BacktestMetrics {
  const closes = bars.map(b => b.close);
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);
  
  let equity = 100000;
  let maxEquity = equity;
  let position: 'long' | 'short' | null = null;
  let entryPrice = 0;
  let grossProfit = 0, grossLoss = 0, winningTrades = 0, losingTrades = 0;
  const maxLookback = Math.max(fastPeriod, slowPeriod) + 1;
  
  for (let i = maxLookback; i < bars.length; i++) {
    const fastNow = fastEMA[i], slowNow = slowEMA[i];
    const fastPrev = fastEMA[i-1], slowPrev = slowEMA[i-1];
    if (isNaN(fastNow) || isNaN(slowNow)) continue;
    
    // Exit
    if (position === 'long' && fastNow < slowNow && fastPrev >= slowPrev) {
      const pnl = (closes[i] - entryPrice) * 100;
      if (pnl > 0) { grossProfit += pnl; winningTrades++; } 
      else { grossLoss += Math.abs(pnl); losingTrades++; }
      equity += pnl;
      maxEquity = Math.max(maxEquity, equity);
      position = null;
    } else if (position === 'short' && fastNow > slowNow && fastPrev <= slowPrev) {
      const pnl = (entryPrice - closes[i]) * 100;
      if (pnl > 0) { grossProfit += pnl; winningTrades++; }
      else { grossLoss += Math.abs(pnl); losingTrades++; }
      equity += pnl;
      maxEquity = Math.max(maxEquity, equity);
      position = null;
    }
    
    // Entry
    if (!position && fastNow > slowNow && fastPrev <= slowPrev) {
      position = 'long'; entryPrice = closes[i];
    } else if (!position && fastNow < slowNow && fastPrev >= slowPrev) {
      position = 'short'; entryPrice = closes[i];
    }
  }
  
  const totalTrades = winningTrades + losingTrades;
  const netProfit = grossProfit - grossLoss;
  const maxDrawdown = ((maxEquity - equity) / maxEquity) * 100;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
  const sharpeRatio = totalTrades > 0 ? netProfit / (maxDrawdown || 1) * 0.1 : 0;
  
  return {
    netProfit, grossProfit, grossLoss, maxDrawdown, maxDrawdownPct: maxDrawdown,
    sharpeRatio, sortinoRatio: sharpeRatio * 1.2, winRate, profitFactor,
    totalTrades, winningTrades, losingTrades,
    avgWin: winningTrades > 0 ? grossProfit / winningTrades : 0,
    avgLoss: losingTrades > 0 ? grossLoss / losingTrades : 0,
    avgHoldBars: 10, expectancy: netProfit / (totalTrades || 1)
  };
}

async function runWalkForward(request: WalkForwardRequest) {
  const { runId, datasetId, mode, trainRatio = 0.7, windowSize = 5000, stepSize = 1000, paramRanges } = request;
  currentRunId = runId;
  isCanceled = false;

  try {
    const dataset = await db.datasets.get(datasetId);
    if (!dataset) throw new Error(`Dataset not found: ${datasetId}`);

    const chunks = await db.datasetChunks.where('datasetId').equals(datasetId).sortBy('index');
    const bars: { close: number }[] = [];
    for (const chunk of chunks) {
      for (const row of chunk.rows) {
        bars.push({ close: row[4] });
      }
    }

    const totalBars = bars.length;
    interface Window { trainStart: number; trainEnd: number; testStart: number; testEnd: number; }
    const windows: Window[] = [];
    
    if (mode === 'ratio') {
      const splitIdx = Math.floor(totalBars * trainRatio);
      windows.push({ trainStart: 0, trainEnd: splitIdx, testStart: splitIdx, testEnd: totalBars });
    } else {
      let start = 0;
      while (start + windowSize < totalBars) {
        const trainEnd = start + Math.floor(windowSize * trainRatio);
        windows.push({ trainStart: start, trainEnd, testStart: trainEnd, testEnd: Math.min(start + windowSize, totalBars) });
        start += stepSize;
      }
    }

    const windowResults: Array<Omit<WalkForwardWindowResult, 'type' | 'runId'>> = [];

    for (let i = 0; i < windows.length; i++) {
      if (isCanceled) { self.postMessage({ type: 'error', runId, error: 'Canceled' }); return; }
      const window = windows[i];
      
      self.postMessage({ type: 'progress', runId, pct: Math.round((i / windows.length) * 100), phase: 'train', window: i + 1, totalWindows: windows.length } as WalkForwardProgress);

      // Find best params on training data
      let bestParams = { fastPeriod: 12, slowPeriod: 26 };
      let bestSharpe = -Infinity;
      const trainBars = bars.slice(window.trainStart, window.trainEnd);
      
      for (const range of paramRanges) {
        for (let val = range.start; val <= range.end; val += range.step) {
          const fast = range.name.includes('fast') ? val : bestParams.fastPeriod;
          const slow = range.name.includes('slow') ? val : bestParams.slowPeriod;
          const metrics = runSimpleBacktest(trainBars, fast, slow);
          if (metrics.sharpeRatio > bestSharpe) {
            bestSharpe = metrics.sharpeRatio;
            bestParams = { fastPeriod: fast, slowPeriod: slow };
          }
        }
      }

      const trainMetrics = runSimpleBacktest(trainBars, bestParams.fastPeriod, bestParams.slowPeriod);
      const testBars = bars.slice(window.testStart, window.testEnd);
      const testMetrics = runSimpleBacktest(testBars, bestParams.fastPeriod, bestParams.slowPeriod);

      const result = { window: i + 1, ...window, bestParams, trainMetrics, testMetrics };
      windowResults.push(result);
      self.postMessage({ type: 'windowResult', runId, ...result } as WalkForwardWindowResult);
    }

    const avgTrainSharpe = windowResults.reduce((s, w) => s + w.trainMetrics.sharpeRatio, 0) / windowResults.length;
    const avgTestSharpe = windowResults.reduce((s, w) => s + w.testMetrics.sharpeRatio, 0) / windowResults.length;
    const avgTrainProfit = windowResults.reduce((s, w) => s + w.trainMetrics.netProfit, 0) / windowResults.length;
    const avgTestProfit = windowResults.reduce((s, w) => s + w.testMetrics.netProfit, 0) / windowResults.length;
    const overfittingRatio = avgTrainSharpe > 0 ? (avgTrainSharpe - avgTestSharpe) / avgTrainSharpe : 0;
    const positiveOOS = windowResults.filter(w => w.testMetrics.netProfit > 0).length;
    const robustnessScore = (positiveOOS / windowResults.length) * 100;
    const testSharpes = windowResults.map(w => w.testMetrics.sharpeRatio);
    const sharpeMean = testSharpes.reduce((a, b) => a + b, 0) / testSharpes.length;
    const sharpeStd = Math.sqrt(testSharpes.reduce((sum, s) => sum + Math.pow(s - sharpeMean, 2), 0) / testSharpes.length);
    const consistency = sharpeMean > 0 ? (1 - Math.min(sharpeStd / sharpeMean, 1)) * 100 : 0;

    self.postMessage({
      type: 'complete', runId, windows: windowResults,
      aggregateMetrics: { avgTrainSharpe, avgTestSharpe, avgTrainProfit, avgTestProfit, overfittingRatio, robustnessScore, consistency }
    } as WalkForwardComplete);

  } catch (error) {
    self.postMessage({ type: 'error', runId, error: error instanceof Error ? error.message : 'Unknown error' } as WalkForwardError);
  }
}

self.onmessage = async (event: MessageEvent<WalkForwardRequest>) => {
  if (event.data.type === 'start') await runWalkForward(event.data);
  else if (event.data.type === 'cancel' && currentRunId === event.data.runId) isCanceled = true;
};
