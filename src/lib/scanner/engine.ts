/**
 * Scanner Engine
 * Chunk-based scanning for memory efficiency
 */

import { db, Dataset, DatasetChunk } from '@/db/index';
import {
  calculateEMA,
  calculateSMA,
  calculateRSI,
  calculateATR,
  calculateMACD,
  calculateBollingerBands,
  calculateStochastic,
  calculateADX,
  calculateCCI,
  type OHLCV,
} from '@/lib/indicators';
import type {
  ScannerConfig,
  ScannerResult,
  ScannerSignal,
  ScannerProgress,
  ScannerRule,
  IndicatorCondition,
  PriceCondition,
} from './types';
import { secureLogger } from '@/lib/secureLogger';

const MAX_SIGNALS = 10000; // Cap signals to prevent memory issues

/**
 * Run scanner on a dataset
 * Uses chunk-based processing for memory efficiency
 */
export async function runScanner(
  config: ScannerConfig,
  onProgress?: (progress: ScannerProgress) => void
): Promise<ScannerResult> {
  const startTime = Date.now();
  secureLogger.info('scanner', 'Starting scanner run', { configId: config.id, datasetId: config.datasetId });

  onProgress?.({ phase: 'loading', progress: 0, message: 'Loading dataset...', signalsFound: 0 });

  // Load dataset
  const dataset = await db.datasets.get(config.datasetId);
  if (!dataset) {
    throw new Error(`Dataset not found: ${config.datasetId}`);
  }

  // Load all chunks (we need full data for indicators)
  const chunks = await db.datasetChunks
    .where('datasetId')
    .equals(config.datasetId)
    .sortBy('index');

  if (chunks.length === 0) {
    throw new Error('Dataset has no data chunks');
  }

  onProgress?.({ phase: 'loading', progress: 20, message: 'Preparing bars...', signalsFound: 0 });

  // Flatten bars into OHLCV format
  const bars: OHLCV[] = [];
  for (const chunk of chunks) {
    for (const row of chunk.rows) {
      const [ts, o, h, l, c, v] = row;
      
      // Apply date range filter if specified
      if (config.dateRange) {
        if (ts < config.dateRange.start || ts > config.dateRange.end) continue;
      }
      
      bars.push({
        timestamp: ts,
        open: o,
        high: h,
        low: l,
        close: c,
        volume: v,
      });
    }
  }

  if (bars.length === 0) {
    return {
      configId: config.id,
      datasetId: config.datasetId,
      scannedAt: Date.now(),
      totalBarsScanned: 0,
      signals: [],
      stats: {
        totalSignals: 0,
        avgSpacing: 0,
        longestGap: 0,
      },
    };
  }

  onProgress?.({ phase: 'computing_indicators', progress: 30, message: 'Computing indicators...', signalsFound: 0 });

  // Pre-compute all needed indicators
  const indicatorCache = await computeIndicators(bars, config.rules, onProgress);

  onProgress?.({ phase: 'scanning', progress: 60, message: 'Scanning for signals...', signalsFound: 0 });

  // Scan for signals
  const signals: ScannerSignal[] = [];
  const signalIndices: number[] = [];

  for (let i = 1; i < bars.length && signals.length < MAX_SIGNALS; i++) {
    const bar = bars[i];
    const prevBar = bars[i - 1];
    
    // Evaluate all rules
    const matchedRules: string[] = [];
    
    for (let ruleIdx = 0; ruleIdx < config.rules.length; ruleIdx++) {
      const rule = config.rules[ruleIdx];
      const ruleMatches = evaluateRule(rule, i, bars, indicatorCache, prevBar);
      
      if (ruleMatches) {
        matchedRules.push(getRuleName(rule, ruleIdx));
      }
    }

    // Check if conditions are met based on combinator
    let signalTriggered = false;
    if (config.combinator === 'AND') {
      signalTriggered = matchedRules.length === config.rules.length;
    } else {
      signalTriggered = matchedRules.length > 0;
    }

    if (signalTriggered) {
      signals.push({
        timestamp: bar.timestamp,
        barIndex: i,
        price: {
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume,
        },
        matchedRules,
        context: buildContext(i, indicatorCache),
      });
      signalIndices.push(i);

      if (signals.length % 100 === 0) {
        onProgress?.({ phase: 'scanning', progress: 60 + Math.min(30, (i / bars.length) * 30), message: `Found ${signals.length} signals...`, signalsFound: signals.length });
      }
    }
  }

  onProgress?.({ phase: 'complete', progress: 100, message: 'Scan complete', signalsFound: signals.length });

  // Calculate stats
  let avgSpacing = 0;
  let longestGap = 0;
  
  if (signalIndices.length > 1) {
    const gaps = signalIndices.slice(1).map((idx, i) => idx - signalIndices[i]);
    avgSpacing = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    longestGap = Math.max(...gaps);
  }

  const result: ScannerResult = {
    configId: config.id,
    datasetId: config.datasetId,
    scannedAt: Date.now(),
    totalBarsScanned: bars.length,
    signals,
    stats: {
      totalSignals: signals.length,
      avgSpacing,
      longestGap,
    },
  };

  secureLogger.info('scanner', 'Scanner run complete', { 
    configId: config.id, 
    signals: signals.length, 
    duration: Date.now() - startTime 
  });

  return result;
}

// Pre-compute all needed indicators
async function computeIndicators(
  bars: OHLCV[],
  rules: ScannerRule[],
  onProgress?: (progress: ScannerProgress) => void
): Promise<IndicatorCache> {
  const cache: IndicatorCache = {};
  const closes = bars.map(b => b.close);
  const volumes = bars.map(b => b.volume);

  for (const rule of rules) {
    if (rule.type !== 'indicator') continue;

    const key = `${rule.indicator}_${JSON.stringify(rule.params)}`;
    if (cache[key]) continue;

    switch (rule.indicator) {
      case 'RSI':
        cache[key] = { values: calculateRSI(closes, rule.params.period || 14) };
        break;
      case 'EMA':
        cache[key] = { values: calculateEMA(closes, rule.params.period || 20) };
        break;
      case 'SMA':
        cache[key] = { values: calculateSMA(closes, rule.params.period || 20) };
        break;
      case 'ATR':
        cache[key] = { values: calculateATR(bars, rule.params.period || 14) };
        break;
      case 'MACD':
        cache[key] = { 
          macd: calculateMACD(closes, rule.params.fastPeriod || 12, rule.params.slowPeriod || 26, rule.params.signalPeriod || 9)
        };
        break;
      case 'BB':
        cache[key] = { 
          bb: calculateBollingerBands(closes, rule.params.period || 20, rule.params.stdDev || 2)
        };
        break;
      case 'STOCH':
        cache[key] = { 
          stoch: calculateStochastic(bars, rule.params.kPeriod || 14, rule.params.dPeriod || 3)
        };
        break;
      case 'ADX':
        cache[key] = { 
          adx: calculateADX(bars, rule.params.period || 14)
        };
        break;
      case 'CCI':
        cache[key] = { values: calculateCCI(bars, rule.params.period || 20) };
        break;
      case 'VOLUME':
        cache[key] = { values: calculateSMA(volumes, rule.params.period || 20) };
        break;
    }
  }

  return cache;
}

interface IndicatorCache {
  [key: string]: {
    values?: number[];
    macd?: { macd: number[]; signal: number[]; histogram: number[] };
    bb?: { upper: number[]; middle: number[]; lower: number[] };
    stoch?: { k: number[]; d: number[] };
    adx?: { adx: number[]; plusDI: number[]; minusDI: number[] };
  };
}

// Evaluate a single rule
function evaluateRule(
  rule: ScannerRule,
  barIdx: number,
  bars: OHLCV[],
  cache: IndicatorCache,
  prevBar: OHLCV
): boolean {
  if (rule.type === 'price') {
    return evaluatePriceRule(rule, bars[barIdx], prevBar);
  }

  const key = `${rule.indicator}_${JSON.stringify(rule.params)}`;
  const cached = cache[key];
  if (!cached) return false;

  const bar = bars[barIdx];
  
  // Get indicator value
  let indicatorValue: number | undefined;
  let compareValue: number;

  switch (rule.indicator) {
    case 'RSI':
    case 'EMA':
    case 'SMA':
    case 'ATR':
    case 'CCI':
      indicatorValue = cached.values?.[barIdx];
      compareValue = typeof rule.value === 'number' ? rule.value : 0;
      break;
    case 'MACD':
      if (rule.value === 'signal') {
        indicatorValue = cached.macd?.macd[barIdx];
        compareValue = cached.macd?.signal[barIdx] ?? 0;
      } else {
        indicatorValue = cached.macd?.histogram[barIdx];
        compareValue = typeof rule.value === 'number' ? rule.value : 0;
      }
      break;
    case 'BB':
      indicatorValue = bar.close;
      if (rule.value === 'upper') {
        compareValue = cached.bb?.upper[barIdx] ?? 0;
      } else if (rule.value === 'lower') {
        compareValue = cached.bb?.lower[barIdx] ?? 0;
      } else {
        compareValue = cached.bb?.middle[barIdx] ?? 0;
      }
      break;
    case 'STOCH':
      indicatorValue = cached.stoch?.k[barIdx];
      if (rule.value === 'signal') {
        compareValue = cached.stoch?.d[barIdx] ?? 0;
      } else {
        compareValue = typeof rule.value === 'number' ? rule.value : 0;
      }
      break;
    case 'ADX':
      indicatorValue = cached.adx?.adx[barIdx];
      compareValue = typeof rule.value === 'number' ? rule.value : 0;
      break;
    case 'VOLUME':
      indicatorValue = bar.volume;
      compareValue = (cached.values?.[barIdx] ?? 0) * (typeof rule.value === 'number' ? rule.value / 100 : 1);
      break;
    default:
      return false;
  }

  if (indicatorValue === undefined || isNaN(indicatorValue)) return false;

  // Handle cross conditions
  if (rule.operator === 'crosses_above' || rule.operator === 'crosses_below') {
    const prevValue = getPreviousValue(rule, barIdx - 1, cache);
    const prevCompare = getPreviousCompareValue(rule, barIdx - 1, bars, cache);
    if (prevValue === undefined || prevCompare === undefined) return false;

    if (rule.operator === 'crosses_above') {
      return prevValue <= prevCompare && indicatorValue > compareValue;
    } else {
      return prevValue >= prevCompare && indicatorValue < compareValue;
    }
  }

  // Standard comparisons
  switch (rule.operator) {
    case '>': return indicatorValue > compareValue;
    case '<': return indicatorValue < compareValue;
    case '>=': return indicatorValue >= compareValue;
    case '<=': return indicatorValue <= compareValue;
    case '==': return Math.abs(indicatorValue - compareValue) < 0.001;
    default: return false;
  }
}

function getPreviousValue(rule: IndicatorCondition, idx: number, cache: IndicatorCache): number | undefined {
  const key = `${rule.indicator}_${JSON.stringify(rule.params)}`;
  const cached = cache[key];
  if (!cached || idx < 0) return undefined;

  switch (rule.indicator) {
    case 'RSI':
    case 'EMA':
    case 'SMA':
    case 'ATR':
    case 'CCI':
    case 'VOLUME':
      return cached.values?.[idx];
    case 'MACD':
      return cached.macd?.macd[idx];
    case 'STOCH':
      return cached.stoch?.k[idx];
    case 'ADX':
      return cached.adx?.adx[idx];
    default:
      return undefined;
  }
}

function getPreviousCompareValue(
  rule: IndicatorCondition, 
  idx: number, 
  bars: OHLCV[], 
  cache: IndicatorCache
): number | undefined {
  if (idx < 0) return undefined;
  const key = `${rule.indicator}_${JSON.stringify(rule.params)}`;
  const cached = cache[key];

  if (typeof rule.value === 'number') return rule.value;

  switch (rule.value) {
    case 'signal':
      if (rule.indicator === 'MACD') return cached?.macd?.signal[idx];
      if (rule.indicator === 'STOCH') return cached?.stoch?.d[idx];
      return undefined;
    case 'upper':
      return cached?.bb?.upper[idx];
    case 'lower':
      return cached?.bb?.lower[idx];
    case 'middle':
      return cached?.bb?.middle[idx];
    default:
      return undefined;
  }
}

function evaluatePriceRule(rule: PriceCondition, bar: OHLCV, prevBar: OHLCV): boolean {
  const pctChange = ((bar.close - prevBar.close) / prevBar.close) * 100;
  const bodySize = Math.abs(bar.close - bar.open);
  const totalRange = bar.high - bar.low;

  switch (rule.condition) {
    case 'close_above_prev_high':
      return bar.close > prevBar.high;
    case 'close_below_prev_low':
      return bar.close < prevBar.low;
    case 'gap_up':
      return bar.open > prevBar.high;
    case 'gap_down':
      return bar.open < prevBar.low;
    case 'candle_pct_change':
      return Math.abs(pctChange) >= (rule.value || 1);
    case 'bullish_engulfing':
      return bar.close > bar.open && prevBar.close < prevBar.open &&
             bar.open < prevBar.close && bar.close > prevBar.open;
    case 'bearish_engulfing':
      return bar.close < bar.open && prevBar.close > prevBar.open &&
             bar.open > prevBar.close && bar.close < prevBar.open;
    case 'doji':
      return totalRange > 0 && (bodySize / totalRange) < 0.1;
    case 'hammer':
      if (totalRange === 0) return false;
      const lowerShadow = Math.min(bar.open, bar.close) - bar.low;
      const upperShadow = bar.high - Math.max(bar.open, bar.close);
      return lowerShadow >= bodySize * 2 && upperShadow < bodySize * 0.5;
    case 'shooting_star':
      if (totalRange === 0) return false;
      const ls = Math.min(bar.open, bar.close) - bar.low;
      const us = bar.high - Math.max(bar.open, bar.close);
      return us >= bodySize * 2 && ls < bodySize * 0.5;
    default:
      return false;
  }
}

function getRuleName(rule: ScannerRule, idx: number): string {
  if (rule.type === 'price') {
    return rule.condition.replace(/_/g, ' ');
  }
  return `${rule.indicator} ${rule.operator} ${rule.value}`;
}

function buildContext(barIdx: number, cache: IndicatorCache): ScannerSignal['context'] {
  const context: ScannerSignal['context'] = {};
  
  for (const [key, value] of Object.entries(cache)) {
    const indicator = key.split('_')[0];
    
    if (value.values && !isNaN(value.values[barIdx])) {
      if (indicator === 'RSI') context.rsi = Math.round(value.values[barIdx] * 100) / 100;
      if (indicator === 'EMA') context.ema = Math.round(value.values[barIdx] * 100) / 100;
      if (indicator === 'SMA') context.sma = Math.round(value.values[barIdx] * 100) / 100;
      if (indicator === 'ATR') context.atr = Math.round(value.values[barIdx] * 100) / 100;
    }
    
    if (value.macd) {
      context.macd = {
        macd: Math.round(value.macd.macd[barIdx] * 100) / 100,
        signal: Math.round(value.macd.signal[barIdx] * 100) / 100,
        histogram: Math.round(value.macd.histogram[barIdx] * 100) / 100,
      };
    }
    
    if (value.bb) {
      context.bb = {
        upper: Math.round(value.bb.upper[barIdx] * 100) / 100,
        middle: Math.round(value.bb.middle[barIdx] * 100) / 100,
        lower: Math.round(value.bb.lower[barIdx] * 100) / 100,
      };
    }
    
    if (value.adx) {
      context.adx = Math.round(value.adx.adx[barIdx] * 100) / 100;
    }
  }
  
  return context;
}

// Export signals as CSV
export function exportSignalsCSV(result: ScannerResult): string {
  const lines: string[] = [];
  
  lines.push('Timestamp,Date/Time,Open,High,Low,Close,Volume,Matched Rules,RSI,EMA,SMA,ATR');
  
  for (const signal of result.signals) {
    lines.push([
      signal.timestamp,
      new Date(signal.timestamp).toISOString(),
      signal.price.open.toFixed(4),
      signal.price.high.toFixed(4),
      signal.price.low.toFixed(4),
      signal.price.close.toFixed(4),
      signal.price.volume.toFixed(0),
      `"${signal.matchedRules.join('; ')}"`,
      signal.context.rsi?.toFixed(2) || '',
      signal.context.ema?.toFixed(4) || '',
      signal.context.sma?.toFixed(4) || '',
      signal.context.atr?.toFixed(4) || '',
    ].join(','));
  }
  
  return lines.join('\n');
}
