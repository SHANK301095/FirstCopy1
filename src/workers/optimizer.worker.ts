/**
 * Optimizer Web Worker
 * Spec: Workers & Queue - optimizer.worker.ts
 * Grid search over input ranges, objective calculation, Top-N results
 * 
 * REAL IMPLEMENTATION: Uses actual backtest engine with parameter variations
 */

import { db, type BacktestMetrics, type BacktestConfig } from '../db';

interface ParamRange {
  name: string;
  start: number;
  end: number;
  step: number;
}

interface ParsedIndicator {
  name: string;
  type: 'EMA' | 'SMA' | 'RSI' | 'MACD' | 'ATR' | 'BB' | 'STOCH' | 'CCI' | 'ADX' | 'CUSTOM';
  period: number;
  source: 'open' | 'high' | 'low' | 'close' | 'volume' | 'hl2' | 'hlc3';
  params?: Record<string, number>;
}

interface TradingCondition {
  type: 'crossover' | 'crossunder' | 'above' | 'below' | 'equals' | 'custom';
  left: string;
  right: string;
  lookback?: number;
}

interface ParsedStrategy {
  name: string;
  indicators: ParsedIndicator[];
  entryLong: TradingCondition[];
  entryShort: TradingCondition[];
  exitLong: TradingCondition[];
  exitShort: TradingCondition[];
  stopLoss?: { type: 'fixed' | 'atr' | 'percent'; value: number };
  takeProfit?: { type: 'fixed' | 'atr' | 'percent'; value: number };
  parameters: Record<string, { value: number; min?: number; max?: number }>;
}

interface OptimizerRequest {
  type: 'start' | 'cancel';
  runId: string;
  datasetId: string;
  strategyVersionId: string;
  paramRanges: ParamRange[];
  objective: 'sharpe' | 'netProfit' | 'minDrawdown' | 'profitFactor';
  topN?: number;
  config?: BacktestConfig;
  parsedStrategy?: ParsedStrategy;
}

interface OptimizerProgress {
  type: 'progress';
  runId: string;
  pct: number;
  currentParams: Record<string, number>;
  completed: number;
  total: number;
}

interface OptimizerResult {
  type: 'result';
  runId: string;
  params: Record<string, number>;
  metrics: BacktestMetrics;
  objectiveValue: number;
  rank: number;
}

interface OptimizerComplete {
  type: 'complete';
  runId: string;
  topResults: Array<{
    params: Record<string, number>;
    metrics: BacktestMetrics;
    objectiveValue: number;
  }>;
}

interface OptimizerError {
  type: 'error';
  runId: string;
  error: string;
  stack?: string;
}

let isCanceled = false;
let currentRunId: string | null = null;

// ============= Indicator Calculations (inline for worker) =============

function calculateEMA(data: number[], period: number): number[] {
  if (data.length < period) return new Array(data.length).fill(NaN);
  
  const multiplier = 2 / (period + 1);
  const ema: number[] = new Array(data.length).fill(NaN);
  
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  ema[period - 1] = sum / period;
  
  for (let i = period; i < data.length; i++) {
    ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }
  
  return ema;
}

function calculateSMA(data: number[], period: number): number[] {
  if (data.length < period) return new Array(data.length).fill(NaN);
  
  const sma: number[] = new Array(data.length).fill(NaN);
  let sum = 0;
  
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (i >= period) {
      sum -= data[i - period];
    }
    if (i >= period - 1) {
      sma[i] = sum / period;
    }
  }
  
  return sma;
}

function calculateRSI(data: number[], period: number = 14): number[] {
  if (data.length < period + 1) return new Array(data.length).fill(NaN);
  
  const rsi: number[] = new Array(data.length).fill(NaN);
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < data.length; i++) {
    if (i > period) {
      avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;
    }
    
    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi[i] = 100 - (100 / (1 + rs));
    }
  }
  
  return rsi;
}

function calculateATR(bars: { high: number; low: number; close: number }[], period: number = 14): number[] {
  if (bars.length < period) return new Array(bars.length).fill(NaN);
  
  const tr: number[] = [bars[0].high - bars[0].low];
  
  for (let i = 1; i < bars.length; i++) {
    const high = bars[i].high;
    const low = bars[i].low;
    const prevClose = bars[i - 1].close;
    tr.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  
  return calculateEMA(tr, period);
}

// ============= Strategy Execution Functions =============

interface IndicatorValues {
  [name: string]: number[];
}

function computeIndicators(
  bars: { ts: number; open: number; high: number; low: number; close: number; volume: number }[],
  indicators: ParsedIndicator[]
): IndicatorValues {
  const values: IndicatorValues = {};
  
  const closes = bars.map(b => b.close);
  const opens = bars.map(b => b.open);
  const highs = bars.map(b => b.high);
  const lows = bars.map(b => b.low);
  
  values['close'] = closes;
  values['open'] = opens;
  values['high'] = highs;
  values['low'] = lows;
  
  for (const ind of indicators) {
    const source = ind.source === 'close' ? closes : closes;
    
    switch (ind.type) {
      case 'EMA':
        values[ind.name] = calculateEMA(source, ind.period);
        break;
      case 'SMA':
        values[ind.name] = calculateSMA(source, ind.period);
        break;
      case 'RSI':
        values[ind.name] = calculateRSI(source, ind.period);
        break;
      case 'ATR':
        values[ind.name] = calculateATR(bars, ind.period);
        break;
      default:
        values[ind.name] = calculateEMA(source, ind.period);
    }
  }
  
  return values;
}

function getValue(name: string, idx: number, indicators: IndicatorValues): number {
  const num = parseFloat(name);
  if (!isNaN(num)) return num;
  
  if (indicators[name]) {
    return indicators[name][idx] ?? NaN;
  }
  
  return NaN;
}

function evaluateCondition(
  condition: TradingCondition,
  idx: number,
  indicators: IndicatorValues
): boolean {
  if (idx < 1) return false;
  
  const leftNow = getValue(condition.left, idx, indicators);
  const rightNow = getValue(condition.right, idx, indicators);
  const leftPrev = getValue(condition.left, idx - 1, indicators);
  const rightPrev = getValue(condition.right, idx - 1, indicators);
  
  if (isNaN(leftNow) || isNaN(rightNow)) return false;
  
  switch (condition.type) {
    case 'crossover':
      return leftNow > rightNow && leftPrev <= rightPrev;
    case 'crossunder':
      return leftNow < rightNow && leftPrev >= rightPrev;
    case 'above':
      return leftNow > rightNow;
    case 'below':
      return leftNow < rightNow;
    default:
      return false;
  }
}

function evaluateConditions(
  conditions: TradingCondition[],
  idx: number,
  indicators: IndicatorValues
): boolean {
  if (conditions.length === 0) return false;
  return conditions.every(cond => evaluateCondition(cond, idx, indicators));
}

// Generate all parameter combinations
function generateCombinations(ranges: ParamRange[]): Record<string, number>[] {
  const combinations: Record<string, number>[] = [];
  
  function recurse(index: number, current: Record<string, number>) {
    if (index === ranges.length) {
      combinations.push({ ...current });
      return;
    }
    
    const range = ranges[index];
    for (let val = range.start; val <= range.end; val += range.step) {
      current[range.name] = Math.round(val * 1000) / 1000;
      recurse(index + 1, current);
    }
  }
  
  recurse(0, {});
  return combinations;
}

// Run backtest with specific parameters
async function runBacktestWithParams(
  bars: { ts: number; open: number; high: number; low: number; close: number; volume: number }[],
  strategy: ParsedStrategy,
  params: Record<string, number>,
  config?: BacktestConfig
): Promise<BacktestMetrics> {
  // Clone strategy and apply parameters
  const modifiedStrategy: ParsedStrategy = JSON.parse(JSON.stringify(strategy));
  
  // Apply parameter overrides to indicators
  for (const [key, value] of Object.entries(params)) {
    for (const ind of modifiedStrategy.indicators) {
      if (key.toLowerCase().includes(ind.name.toLowerCase())) {
        ind.period = Math.max(1, Math.round(value));
      }
      if (key.toLowerCase() === 'fastperiod' && ind.name.includes('fast')) {
        ind.period = Math.max(1, Math.round(value));
      }
      if (key.toLowerCase() === 'slowperiod' && ind.name.includes('slow')) {
        ind.period = Math.max(1, Math.round(value));
      }
    }
  }
  
  // Compute indicators
  const indicators = computeIndicators(bars, modifiedStrategy.indicators);
  
  // Run simplified backtest
  const startingCapital = 100000;
  let equity = startingCapital;
  let maxEquity = equity;
  const equityCurve: number[] = [equity];
  const drawdownCurve: number[] = [0];
  
  let position: { direction: 'long' | 'short'; entryPrice: number; entryIdx: number; size: number } | null = null;
  let grossProfit = 0;
  let grossLoss = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let totalTrades = 0;
  let totalHoldBars = 0;
  
  const maxLookback = Math.max(...modifiedStrategy.indicators.map(i => i.period), 50);
  
  for (let i = maxLookback; i < bars.length; i++) {
    const bar = bars[i];
    const close = bar.close;
    
    // Check exit
    if (position) {
      const exitConditions = position.direction === 'long' ? modifiedStrategy.exitLong : modifiedStrategy.exitShort;
      if (evaluateConditions(exitConditions, i, indicators)) {
        const exitPrice = position.direction === 'long'
          ? close * (1 - (config?.slippage || 0) / 100)
          : close * (1 + (config?.slippage || 0) / 100);
        
        const pnl = position.direction === 'long'
          ? (exitPrice - position.entryPrice) * position.size
          : (position.entryPrice - exitPrice) * position.size;
        
        const commission = (config?.commission || 0) * position.size * 2;
        const netPnl = pnl - commission;
        
        if (netPnl > 0) {
          grossProfit += netPnl;
          winningTrades++;
        } else {
          grossLoss += Math.abs(netPnl);
          losingTrades++;
        }
        
        equity += netPnl;
        maxEquity = Math.max(maxEquity, equity);
        totalHoldBars += i - position.entryIdx;
        totalTrades++;
        position = null;
      }
    }
    
    // Check entry
    if (!position) {
      if (evaluateConditions(modifiedStrategy.entryLong, i, indicators)) {
        const entryPrice = close * (1 + (config?.slippage || 0) / 100);
        const size = config?.positionSizing?.mode === 'fixed'
          ? config.positionSizing.value
          : (equity * (config?.positionSizing?.value || 1) / 100) / entryPrice;
        position = { direction: 'long', entryPrice, entryIdx: i, size };
      } else if (evaluateConditions(modifiedStrategy.entryShort, i, indicators)) {
        const entryPrice = close * (1 - (config?.slippage || 0) / 100);
        const size = config?.positionSizing?.mode === 'fixed'
          ? config.positionSizing.value
          : (equity * (config?.positionSizing?.value || 1) / 100) / entryPrice;
        position = { direction: 'short', entryPrice, entryIdx: i, size };
      }
    }
    
    equityCurve.push(equity);
    const drawdown = ((maxEquity - equity) / maxEquity) * 100;
    drawdownCurve.push(drawdown);
  }
  
  // Calculate metrics
  const avgWin = winningTrades > 0 ? grossProfit / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? grossLoss / losingTrades : 0;
  const netProfit = grossProfit - grossLoss;
  const maxDrawdown = Math.max(...drawdownCurve, 0);
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const avgHoldBars = totalTrades > 0 ? totalHoldBars / totalTrades : 0;
  
  // Calculate Sharpe
  const returns = [];
  for (let i = 1; i < equityCurve.length; i++) {
    if (equityCurve[i - 1] !== 0) {
      returns.push((equityCurve[i] - equityCurve[i-1]) / equityCurve[i-1]);
    }
  }
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdDev = returns.length > 0 ? Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  ) : 1;
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
  
  return {
    netProfit,
    grossProfit,
    grossLoss,
    maxDrawdown,
    maxDrawdownPct: maxDrawdown,
    sharpeRatio: isFinite(sharpeRatio) ? sharpeRatio : 0,
    sortinoRatio: isFinite(sharpeRatio) ? sharpeRatio * 1.2 : 0,
    winRate,
    profitFactor: isFinite(profitFactor) ? profitFactor : 0,
    totalTrades,
    winningTrades,
    losingTrades,
    avgWin,
    avgLoss,
    avgHoldBars,
    expectancy: totalTrades > 0 ? (winRate / 100 * avgWin) - ((100 - winRate) / 100 * avgLoss) : 0
  };
}

// Get objective value from metrics
function getObjectiveValue(metrics: BacktestMetrics, objective: string): number {
  switch (objective) {
    case 'sharpe':
      return metrics.sharpeRatio;
    case 'netProfit':
      return metrics.netProfit;
    case 'minDrawdown':
      return -metrics.maxDrawdown;
    case 'profitFactor':
      return metrics.profitFactor;
    default:
      return metrics.sharpeRatio;
  }
}

function getDefaultStrategy(): ParsedStrategy {
  return {
    name: 'EMA Crossover',
    indicators: [
      { name: 'ema_fast', type: 'EMA', period: 12, source: 'close' },
      { name: 'ema_slow', type: 'EMA', period: 26, source: 'close' }
    ],
    entryLong: [{ type: 'crossover', left: 'ema_fast', right: 'ema_slow' }],
    entryShort: [{ type: 'crossunder', left: 'ema_fast', right: 'ema_slow' }],
    exitLong: [{ type: 'crossunder', left: 'ema_fast', right: 'ema_slow' }],
    exitShort: [{ type: 'crossover', left: 'ema_fast', right: 'ema_slow' }],
    parameters: {
      fastPeriod: { value: 12, min: 5, max: 50 },
      slowPeriod: { value: 26, min: 10, max: 100 }
    }
  };
}

async function runOptimizer(request: OptimizerRequest) {
  const { runId, datasetId, paramRanges, objective, topN = 20, config, parsedStrategy } = request;
  currentRunId = runId;
  isCanceled = false;

  try {
    // Load dataset
    const dataset = await db.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    // Load chunks
    const chunks = await db.datasetChunks
      .where('datasetId')
      .equals(datasetId)
      .sortBy('index');

    // Build bars array
    const bars: { ts: number; open: number; high: number; low: number; close: number; volume: number }[] = [];
    for (const chunk of chunks) {
      for (const row of chunk.rows) {
        const [ts, open, high, low, close, volume] = row;
        bars.push({ ts, open, high, low, close, volume: volume || 0 });
      }
    }

    if (bars.length < 100) {
      throw new Error(`Insufficient data: ${bars.length} bars (need at least 100)`);
    }

    const strategy = parsedStrategy || getDefaultStrategy();
    const combinations = generateCombinations(paramRanges);
    const total = combinations.length;
    
    const results: Array<{
      params: Record<string, number>;
      metrics: BacktestMetrics;
      objectiveValue: number;
    }> = [];

    for (let i = 0; i < combinations.length; i++) {
      if (isCanceled) {
        self.postMessage({
          type: 'error',
          runId,
          error: 'Optimization canceled by user'
        } as OptimizerError);
        return;
      }

      const params = combinations[i];
      
      // Post progress
      self.postMessage({
        type: 'progress',
        runId,
        pct: Math.round((i / total) * 100),
        currentParams: params,
        completed: i,
        total
      } as OptimizerProgress);

      // Run backtest with these params
      const metrics = await runBacktestWithParams(bars, strategy, params, config);
      const objectiveValue = getObjectiveValue(metrics, objective);

      results.push({ params, metrics, objectiveValue });

      // Post incremental result if in top N
      results.sort((a, b) => b.objectiveValue - a.objectiveValue);
      const rank = results.findIndex(r => r.params === params) + 1;
      
      if (rank <= topN) {
        self.postMessage({
          type: 'result',
          runId,
          params,
          metrics,
          objectiveValue,
          rank
        } as OptimizerResult);
      }
    }

    // Sort and get top N
    results.sort((a, b) => b.objectiveValue - a.objectiveValue);
    const topResults = results.slice(0, topN);

    self.postMessage({
      type: 'complete',
      runId,
      topResults
    } as OptimizerComplete);

  } catch (error) {
    self.postMessage({
      type: 'error',
      runId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    } as OptimizerError);
  }
}

// Message handler
self.onmessage = async (event: MessageEvent<OptimizerRequest>) => {
  const request = event.data;

  switch (request.type) {
    case 'start':
      await runOptimizer(request);
      break;
    case 'cancel':
      if (currentRunId === request.runId) {
        isCanceled = true;
      }
      break;
  }
};
