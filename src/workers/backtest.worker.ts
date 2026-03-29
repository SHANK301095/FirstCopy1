/**
 * Backtest Web Worker
 * Spec: Workers & Queue - backtest.worker.ts
 * Receives {runId, datasetId, strategyVersionId, config}
 * Streams bar processing, posts progress, returns metrics + equity + trades
 * 
 * REAL IMPLEMENTATION: Uses actual OHLCV data with parsed strategy logic
 */

import { db, type Trade, type BacktestMetrics, type BacktestConfig } from '../db';

// ============= Type Definitions =============

export interface ParsedIndicator {
  name: string;
  type: 'EMA' | 'SMA' | 'RSI' | 'MACD' | 'ATR' | 'BB' | 'STOCH' | 'CCI' | 'ADX' | 'CUSTOM';
  period: number;
  source: 'open' | 'high' | 'low' | 'close' | 'volume' | 'hl2' | 'hlc3';
  params?: Record<string, number>;
}

export interface TradingCondition {
  type: 'crossover' | 'crossunder' | 'above' | 'below' | 'equals' | 'custom';
  left: string;
  right: string;
  lookback?: number;
}

export interface ParsedStrategy {
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

// Worker message types
interface BacktestRequest {
  type: 'start' | 'pause' | 'resume' | 'cancel';
  runId: string;
  datasetId?: string;
  strategyVersionId?: string;
  config?: BacktestConfig;
  resumeFrom?: number;
  strategyCode?: string;
  parsedStrategy?: ParsedStrategy;
  params?: Record<string, number>;
  debugMode?: boolean; // Enable debug logging
}

interface BacktestProgress {
  type: 'progress';
  runId: string;
  pct: number;
  step: string;
  lastTs?: number;
  barsProcessed: number;
  totalBars: number;
}

interface BacktestCheckpoint {
  type: 'checkpoint';
  runId: string;
  idx: number;
  ts: number;
  state: unknown;
}

interface BacktestComplete {
  type: 'complete';
  runId: string;
  metrics: BacktestMetrics;
  equity: number[];
  drawdown: number[];
  trades: Trade[];
  debugInfo?: {
    firstCandleTs: number;
    lastCandleTs: number;
    totalCandlesProcessed: number;
    signalsEvaluated: number;
    dataSource: 'IndexedDB';
  };
}

interface BacktestError {
  type: 'error';
  runId: string;
  error: string;
  stack?: string;
}

type WorkerMessage = BacktestProgress | BacktestCheckpoint | BacktestComplete | BacktestError;

// Worker state
let isPaused = false;
let isCanceled = false;
let currentRunId: string | null = null;

// Checkpoint interval (spec: every 5000 bars)
const CHECKPOINT_INTERVAL = 5000;

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

// ============= Strategy Execution Engine =============

interface IndicatorValues {
  [name: string]: number[];
}

interface Position {
  direction: 'long' | 'short';
  entryPrice: number;
  entryTs: number;
  size: number;
  entryIdx: number;
  stopLoss?: number;
  takeProfit?: number;
}

function computeIndicators(
  bars: { ts: number; open: number; high: number; low: number; close: number; volume: number }[],
  indicators: ParsedIndicator[]
): IndicatorValues {
  const values: IndicatorValues = {};
  
  // Extract price arrays
  const closes = bars.map(b => b.close);
  const opens = bars.map(b => b.open);
  const highs = bars.map(b => b.high);
  const lows = bars.map(b => b.low);
  const volumes = bars.map(b => b.volume);
  const hl2 = bars.map(b => (b.high + b.low) / 2);
  const hlc3 = bars.map(b => (b.high + b.low + b.close) / 3);
  
  // Make price sources available
  values['close'] = closes;
  values['open'] = opens;
  values['high'] = highs;
  values['low'] = lows;
  values['volume'] = volumes;
  values['hl2'] = hl2;
  values['hlc3'] = hlc3;
  
  for (const ind of indicators) {
    const source = ind.source === 'open' ? opens :
                   ind.source === 'high' ? highs :
                   ind.source === 'low' ? lows :
                   ind.source === 'volume' ? volumes :
                   ind.source === 'hl2' ? hl2 :
                   ind.source === 'hlc3' ? hlc3 : closes;
    
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
        // Default to EMA for unknown types
        values[ind.name] = calculateEMA(source, ind.period);
    }
  }
  
  return values;
}

function getValue(name: string, idx: number, indicators: IndicatorValues): number {
  // Check if it's a number constant
  const num = parseFloat(name);
  if (!isNaN(num)) return num;
  
  // Check if it's an indicator
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
  if (idx < 1) return false; // Need at least 2 bars for crossover
  
  const leftNow = getValue(condition.left, idx, indicators);
  const rightNow = getValue(condition.right, idx, indicators);
  const leftPrev = getValue(condition.left, idx - 1, indicators);
  const rightPrev = getValue(condition.right, idx - 1, indicators);
  
  if (isNaN(leftNow) || isNaN(rightNow)) return false;
  
  switch (condition.type) {
    case 'crossover':
      // left crosses above right
      return leftNow > rightNow && leftPrev <= rightPrev;
    case 'crossunder':
      // left crosses below right
      return leftNow < rightNow && leftPrev >= rightPrev;
    case 'above':
      return leftNow > rightNow;
    case 'below':
      return leftNow < rightNow;
    case 'equals':
      return Math.abs(leftNow - rightNow) < 0.0001;
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
  
  // All conditions must be true (AND logic)
  return conditions.every(cond => evaluateCondition(cond, idx, indicators));
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

// ============= Main Backtest Runner =============

async function runBacktest(request: BacktestRequest) {
  const { runId, datasetId, config, resumeFrom = 0, parsedStrategy, params, debugMode = false } = request;
  currentRunId = runId;
  isPaused = false;
  isCanceled = false;
  let signalsEvaluated = 0; // Track for debug

  try {
    // Load dataset info
    const dataset = await db.datasets.get(datasetId!);
    if (!dataset) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    // Get parsed strategy or use default
    let strategy = parsedStrategy || getDefaultStrategy();
    
    // Apply parameter overrides if provided
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (strategy.parameters[key]) {
          strategy.parameters[key].value = value;
        }
        // Also update indicator periods if they match
        for (const ind of strategy.indicators) {
          if (key.toLowerCase().includes(ind.name.toLowerCase()) || 
              key.toLowerCase().includes('period')) {
            // Try to match parameter to indicator
            if (key.toLowerCase().includes('fast') && ind.name.includes('fast')) {
              ind.period = value;
            } else if (key.toLowerCase().includes('slow') && ind.name.includes('slow')) {
              ind.period = value;
            }
          }
        }
      }
    }

    // Load dataset chunks and convert to OHLCV bars
    const chunks = await db.datasetChunks
      .where('datasetId')
      .equals(datasetId!)
      .sortBy('index');

    // Process chunks incrementally to avoid memory issues
    // First, calculate total bars for progress
    let totalBars = 0;
    for (const chunk of chunks) {
      totalBars += chunk.rows.length;
    }

    const startIdx = resumeFrom;

    // Initialize backtest state
    const startingCapital = 100000;
    let equity = startingCapital;
    const equityCurve: number[] = resumeFrom > 0 ? [] : [equity];
    const drawdownCurve: number[] = resumeFrom > 0 ? [] : [0];
    const trades: Trade[] = [];
    let maxEquity = equity;
    let position: Position | null = null;
    
    // Track stats
    let grossProfit = 0;
    let grossLoss = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let totalHoldBars = 0;

    // Build bars array from chunks for indicator calculation
    // We need enough lookback for indicators
    const maxLookback = Math.max(...strategy.indicators.map(i => i.period), 50);
    
    // Collect all bars (we need them for indicator calculation)
    const allBars: { ts: number; open: number; high: number; low: number; close: number; volume: number }[] = [];
    
    for (const chunk of chunks) {
      for (const row of chunk.rows) {
        const [ts, open, high, low, close, volume] = row;
        allBars.push({ ts, open, high, low, close, volume: volume || 0 });
      }
    }

    // Pre-compute all indicators
    self.postMessage({
      type: 'progress',
      runId,
      pct: 0,
      step: 'Computing indicators',
      barsProcessed: 0,
      totalBars
    } as BacktestProgress);

    const indicators = computeIndicators(allBars, strategy.indicators);

    // Process bars
    for (let i = Math.max(startIdx, maxLookback); i < totalBars; i++) {
      // Check for pause/cancel
      if (isCanceled) {
        self.postMessage({
          type: 'error',
          runId,
          error: 'Backtest canceled by user'
        } as BacktestError);
        return;
      }

      while (isPaused) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (isCanceled) {
          self.postMessage({
            type: 'error',
            runId,
            error: 'Backtest canceled while paused'
          } as BacktestError);
          return;
        }
      }

      const bar = allBars[i];
      const { ts, open, high, low, close } = bar;

      // Check exit conditions first
      if (position) {
        let shouldExit = false;
        let exitReason = '';
        let exitPrice = close;

        // Check stop loss
        if (position.stopLoss) {
          if (position.direction === 'long' && low <= position.stopLoss) {
            shouldExit = true;
            exitReason = 'Stop Loss';
            exitPrice = position.stopLoss;
          } else if (position.direction === 'short' && high >= position.stopLoss) {
            shouldExit = true;
            exitReason = 'Stop Loss';
            exitPrice = position.stopLoss;
          }
        }

        // Check take profit
        if (!shouldExit && position.takeProfit) {
          if (position.direction === 'long' && high >= position.takeProfit) {
            shouldExit = true;
            exitReason = 'Take Profit';
            exitPrice = position.takeProfit;
          } else if (position.direction === 'short' && low <= position.takeProfit) {
            shouldExit = true;
            exitReason = 'Take Profit';
            exitPrice = position.takeProfit;
          }
        }

        // Check strategy exit conditions
        if (!shouldExit) {
          const exitConditions = position.direction === 'long' ? strategy.exitLong : strategy.exitShort;
          if (evaluateConditions(exitConditions, i, indicators)) {
            shouldExit = true;
            exitReason = 'Signal';
          }
        }

        if (shouldExit) {
          // Apply slippage
          exitPrice = position.direction === 'long'
            ? exitPrice * (1 - (config?.slippage || 0) / 100)
            : exitPrice * (1 + (config?.slippage || 0) / 100);
          
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
          const holdBars = i - position.entryIdx;
          totalHoldBars += holdBars;

          // Calculate MAE/MFE
          let mae = 0;
          let mfe = 0;
          for (let j = position.entryIdx; j <= i; j++) {
            const priceMove = position.direction === 'long' 
              ? (allBars[j].close - position.entryPrice) / position.entryPrice * 100
              : (position.entryPrice - allBars[j].close) / position.entryPrice * 100;
            mae = Math.min(mae, priceMove);
            mfe = Math.max(mfe, priceMove);
          }

          trades.push({
            id: `trade-${trades.length}`,
            entryTs: position.entryTs,
            exitTs: ts,
            direction: position.direction,
            entryPrice: position.entryPrice,
            exitPrice,
            size: position.size,
            pnl: netPnl,
            pnlPct: (netPnl / (position.entryPrice * position.size)) * 100,
            commission,
            slippage: config?.slippage || 0,
            mae,
            mfe,
            holdBars,
            exitReason
          });

          position = null;
        }
      }

      // Check entry conditions (only if no position)
      if (!position) {
        signalsEvaluated++; // Count signal evaluations
        let entrySignal: 'long' | 'short' | null = null;
        
        if (evaluateConditions(strategy.entryLong, i, indicators)) {
          entrySignal = 'long';
        } else if (evaluateConditions(strategy.entryShort, i, indicators)) {
          entrySignal = 'short';
        }

        if (entrySignal) {
          const entryPrice = entrySignal === 'long'
            ? close * (1 + (config?.slippage || 0) / 100)
            : close * (1 - (config?.slippage || 0) / 100);
          
          const size = config?.positionSizing?.mode === 'fixed' 
            ? config.positionSizing.value 
            : (equity * (config?.positionSizing?.value || 1) / 100) / entryPrice;
          
          // Calculate stop loss and take profit
          let stopLoss: number | undefined;
          let takeProfit: number | undefined;
          
          if (strategy.stopLoss) {
            const atrValue = indicators['atr'] ? indicators['atr'][i] : entryPrice * 0.02;
            if (strategy.stopLoss.type === 'fixed') {
              stopLoss = entrySignal === 'long' 
                ? entryPrice - strategy.stopLoss.value
                : entryPrice + strategy.stopLoss.value;
            } else if (strategy.stopLoss.type === 'atr' && !isNaN(atrValue)) {
              stopLoss = entrySignal === 'long'
                ? entryPrice - atrValue * strategy.stopLoss.value
                : entryPrice + atrValue * strategy.stopLoss.value;
            } else if (strategy.stopLoss.type === 'percent') {
              stopLoss = entrySignal === 'long'
                ? entryPrice * (1 - strategy.stopLoss.value / 100)
                : entryPrice * (1 + strategy.stopLoss.value / 100);
            }
          }
          
          if (strategy.takeProfit) {
            const atrValue = indicators['atr'] ? indicators['atr'][i] : entryPrice * 0.02;
            if (strategy.takeProfit.type === 'fixed') {
              takeProfit = entrySignal === 'long'
                ? entryPrice + strategy.takeProfit.value
                : entryPrice - strategy.takeProfit.value;
            } else if (strategy.takeProfit.type === 'atr' && !isNaN(atrValue)) {
              takeProfit = entrySignal === 'long'
                ? entryPrice + atrValue * strategy.takeProfit.value
                : entryPrice - atrValue * strategy.takeProfit.value;
            } else if (strategy.takeProfit.type === 'percent') {
              takeProfit = entrySignal === 'long'
                ? entryPrice * (1 + strategy.takeProfit.value / 100)
                : entryPrice * (1 - strategy.takeProfit.value / 100);
            }
          }
          
          position = {
            direction: entrySignal,
            entryPrice,
            entryTs: ts,
            size,
            entryIdx: i,
            stopLoss,
            takeProfit
          };
        }
      }

      // Update equity curve
      equityCurve.push(equity);
      const drawdown = ((maxEquity - equity) / maxEquity) * 100;
      drawdownCurve.push(drawdown);

      // Post progress
      if (i % 100 === 0 || i === totalBars - 1) {
        self.postMessage({
          type: 'progress',
          runId,
          pct: Math.round((i / totalBars) * 100),
          step: 'Processing bars',
          lastTs: ts,
          barsProcessed: i,
          totalBars
        } as BacktestProgress);
      }

      // Checkpoint every CHECKPOINT_INTERVAL bars
      if (i > 0 && i % CHECKPOINT_INTERVAL === 0) {
        self.postMessage({
          type: 'checkpoint',
          runId,
          idx: i,
          ts,
          state: { equity, maxEquity, trades: trades.length }
        } as BacktestCheckpoint);
      }
    }

    // Close any open position at end
    if (position) {
      const lastBar = allBars[allBars.length - 1];
      const exitPrice = position.direction === 'long'
        ? lastBar.close * (1 - (config?.slippage || 0) / 100)
        : lastBar.close * (1 + (config?.slippage || 0) / 100);
      
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
      const holdBars = totalBars - 1 - position.entryIdx;
      totalHoldBars += holdBars;

      trades.push({
        id: `trade-${trades.length}`,
        entryTs: position.entryTs,
        exitTs: lastBar.ts,
        direction: position.direction,
        entryPrice: position.entryPrice,
        exitPrice,
        size: position.size,
        pnl: netPnl,
        pnlPct: (netPnl / (position.entryPrice * position.size)) * 100,
        commission: (config?.commission || 0) * position.size * 2,
        slippage: config?.slippage || 0,
        mae: 0,
        mfe: 0,
        holdBars,
        exitReason: 'End of Data'
      });
    }

    // Calculate final metrics
    const totalTrades = trades.length;
    const avgWin = winningTrades > 0 ? grossProfit / winningTrades : 0;
    const avgLoss = losingTrades > 0 ? grossLoss / losingTrades : 0;
    const netProfit = grossProfit - grossLoss;
    const maxDrawdown = Math.max(...drawdownCurve, 0);
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const avgHoldBars = totalTrades > 0 ? totalHoldBars / totalTrades : 0;
    const expectancy = totalTrades > 0 
      ? (winRate / 100 * avgWin) - ((100 - winRate) / 100 * avgLoss)
      : 0;

    // Calculate Sharpe ratio
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

    // Sortino ratio (downside deviation only)
    const downsideReturns = returns.filter(r => r < 0);
    const downsideDev = downsideReturns.length > 0 ? Math.sqrt(
      downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length
    ) : 1;
    const sortinoRatio = downsideDev > 0 ? (avgReturn / downsideDev) * Math.sqrt(252) : 0;

    const metrics: BacktestMetrics = {
      netProfit,
      grossProfit,
      grossLoss,
      maxDrawdown,
      maxDrawdownPct: maxDrawdown,
      sharpeRatio: isFinite(sharpeRatio) ? sharpeRatio : 0,
      sortinoRatio: isFinite(sortinoRatio) ? sortinoRatio : 0,
      winRate,
      profitFactor: isFinite(profitFactor) ? profitFactor : 0,
      totalTrades,
      winningTrades,
      losingTrades,
      avgWin,
      avgLoss,
      avgHoldBars,
      expectancy,
      recoveryFactor: maxDrawdown > 0 ? netProfit / (startingCapital * maxDrawdown / 100) : 0
    };

    // Build debug info if enabled
    const debugInfo = debugMode ? {
      firstCandleTs: allBars[0]?.ts || 0,
      lastCandleTs: allBars[allBars.length - 1]?.ts || 0,
      totalCandlesProcessed: totalBars,
      signalsEvaluated,
      dataSource: 'IndexedDB' as const
    } : undefined;

    self.postMessage({
      type: 'complete',
      runId,
      metrics,
      equity: equityCurve,
      drawdown: drawdownCurve,
      trades,
      debugInfo
    } as BacktestComplete);

  } catch (error) {
    self.postMessage({
      type: 'error',
      runId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    } as BacktestError);
  }
}

// Message handler
self.onmessage = async (event: MessageEvent<BacktestRequest>) => {
  const request = event.data;

  switch (request.type) {
    case 'start':
      await runBacktest(request);
      break;
    case 'pause':
      if (currentRunId === request.runId) {
        isPaused = true;
      }
      break;
    case 'resume':
      if (currentRunId === request.runId) {
        isPaused = false;
      }
      break;
    case 'cancel':
      if (currentRunId === request.runId) {
        isCanceled = true;
      }
      break;
  }
};

// Export for use by optimizer/walkforward workers
export { runBacktest, computeIndicators, evaluateConditions, getDefaultStrategy };
export type { BacktestRequest };
