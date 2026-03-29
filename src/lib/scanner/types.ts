/**
 * Scanner / Screener Types
 * Rule-based scanning on imported datasets
 */

export type IndicatorType = 'RSI' | 'EMA' | 'SMA' | 'ATR' | 'MACD' | 'BB' | 'STOCH' | 'ADX' | 'CCI' | 'VOLUME';

export type PriceConditionType = 
  | 'close_above_prev_high'
  | 'close_below_prev_low'
  | 'gap_up'
  | 'gap_down'
  | 'candle_pct_change'
  | 'bullish_engulfing'
  | 'bearish_engulfing'
  | 'doji'
  | 'hammer'
  | 'shooting_star';

export type ComparisonOperator = '>' | '<' | '>=' | '<=' | '==' | 'crosses_above' | 'crosses_below';

export interface IndicatorCondition {
  type: 'indicator';
  indicator: IndicatorType;
  params: Record<string, number>;
  operator: ComparisonOperator;
  value: number | 'signal' | 'upper' | 'lower' | 'middle'; // For MACD signal, BB bands
  source?: 'close' | 'open' | 'high' | 'low' | 'hl2' | 'hlc3';
}

export interface PriceCondition {
  type: 'price';
  condition: PriceConditionType;
  value?: number; // For candle_pct_change threshold
}

export type ScannerRule = IndicatorCondition | PriceCondition;

export interface ScannerConfig {
  id: string;
  name: string;
  description?: string;
  datasetId: string;
  dateRange?: { start: number; end: number };
  rules: ScannerRule[];
  combinator: 'AND' | 'OR';
  createdAt: number;
  updatedAt: number;
}

export interface ScannerSignal {
  timestamp: number;
  barIndex: number;
  price: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  };
  matchedRules: string[];
  context: {
    rsi?: number;
    ema?: number;
    sma?: number;
    atr?: number;
    macd?: { macd: number; signal: number; histogram: number };
    bb?: { upper: number; middle: number; lower: number };
    adx?: number;
    pctChange?: number;
  };
}

export interface ScannerResult {
  configId: string;
  datasetId: string;
  scannedAt: number;
  totalBarsScanned: number;
  signals: ScannerSignal[];
  stats: {
    totalSignals: number;
    avgSpacing: number; // Average bars between signals
    longestGap: number;
    signalsPerDay?: number;
  };
}

export interface ScannerProgress {
  phase: 'loading' | 'computing_indicators' | 'scanning' | 'complete';
  progress: number;
  message: string;
  signalsFound: number;
}

// Default indicator params
export const DEFAULT_INDICATOR_PARAMS: Record<IndicatorType, Record<string, number>> = {
  RSI: { period: 14 },
  EMA: { period: 20 },
  SMA: { period: 20 },
  ATR: { period: 14 },
  MACD: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  BB: { period: 20, stdDev: 2 },
  STOCH: { kPeriod: 14, dPeriod: 3 },
  ADX: { period: 14 },
  CCI: { period: 20 },
  VOLUME: { period: 20 },
};

// Human-readable indicator names
export const INDICATOR_LABELS: Record<IndicatorType, string> = {
  RSI: 'RSI (Relative Strength Index)',
  EMA: 'EMA (Exponential Moving Average)',
  SMA: 'SMA (Simple Moving Average)',
  ATR: 'ATR (Average True Range)',
  MACD: 'MACD',
  BB: 'Bollinger Bands',
  STOCH: 'Stochastic Oscillator',
  ADX: 'ADX (Average Directional Index)',
  CCI: 'CCI (Commodity Channel Index)',
  VOLUME: 'Volume (vs. Average)',
};

// Price condition labels
export const PRICE_CONDITION_LABELS: Record<PriceConditionType, string> = {
  close_above_prev_high: 'Close > Previous High',
  close_below_prev_low: 'Close < Previous Low',
  gap_up: 'Gap Up (Open > Previous High)',
  gap_down: 'Gap Down (Open < Previous Low)',
  candle_pct_change: 'Candle % Change',
  bullish_engulfing: 'Bullish Engulfing Pattern',
  bearish_engulfing: 'Bearish Engulfing Pattern',
  doji: 'Doji Candle',
  hammer: 'Hammer Pattern',
  shooting_star: 'Shooting Star Pattern',
};
