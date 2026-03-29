/**
 * Regime Detection Service — Data-driven regime classification
 * Computes regime from OHLCV features (ATR, ADX, volatility, trend slope, choppiness)
 * Persists snapshots and transitions to DB
 */
import { supabase } from '@/integrations/supabase/client';
import {
  calculateATR,
  calculateADX,
  calculateSMA,
  calculateEMA,
  OHLCV,
} from '@/lib/indicators';
import type { RegimeLabel, RegimeFeatures, RegimeSnapshot, RegimeTransition } from '@/types/quant';

/** Classify regime from computed features */
export function classifyRegime(features: RegimeFeatures): { regime: RegimeLabel; confidence: number } {
  const { adx, atr_percentile, realized_volatility, trend_slope, range_compression, choppiness } = features;

  // High ADX + strong slope => trending
  if (adx > 30 && Math.abs(trend_slope) > 0.3) {
    return { regime: 'trending', confidence: Math.min(0.95, 0.5 + adx / 100) };
  }

  // Very high vol + high ATR percentile => volatile
  if (atr_percentile > 80 && realized_volatility > 0.02) {
    return { regime: 'volatile', confidence: Math.min(0.9, 0.5 + atr_percentile / 200) };
  }

  // Low ATR + low vol => low_volatility
  if (atr_percentile < 25 && realized_volatility < 0.008) {
    return { regime: 'low_volatility', confidence: Math.min(0.85, 0.6 + (25 - atr_percentile) / 100) };
  }

  // Range compression + moderate ADX => breakout-prone
  if (range_compression > 0.7 && adx < 20) {
    return { regime: 'breakout', confidence: Math.min(0.8, 0.4 + range_compression) };
  }

  // High choppiness + low ADX => choppy
  if (choppiness > 60 && adx < 25) {
    return { regime: 'choppy', confidence: Math.min(0.85, 0.4 + choppiness / 100) };
  }

  // Default: ranging
  return { regime: 'ranging', confidence: 0.6 };
}

/** Compute regime features from OHLCV data */
export function computeRegimeFeatures(bars: OHLCV[], lookback: number = 50): RegimeFeatures {
  if (bars.length < lookback + 20) {
    return {
      atr_percentile: 50,
      realized_volatility: 0.01,
      trend_slope: 0,
      adx: 20,
      range_compression: 0.5,
      choppiness: 50,
    };
  }

  const recentBars = bars.slice(-lookback - 20);
  const closes = recentBars.map(b => b.close);
  const highs = recentBars.map(b => b.high);
  const lows = recentBars.map(b => b.low);

  // ATR & percentile
  const atr = calculateATR(recentBars, 14);
  const recentATR = atr[atr.length - 1] || 0;
  const validATR = atr.filter(v => !isNaN(v) && v > 0);
  const sortedATR = [...validATR].sort((a, b) => a - b);
  const atr_percentile = sortedATR.length > 0
    ? (sortedATR.findIndex(v => v >= recentATR) / sortedATR.length) * 100
    : 50;

  // Realized volatility (std of log returns)
  const logReturns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > 0 && closes[i - 1] > 0) {
      logReturns.push(Math.log(closes[i] / closes[i - 1]));
    }
  }
  const meanRet = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance = logReturns.reduce((a, b) => a + (b - meanRet) ** 2, 0) / logReturns.length;
  const realized_volatility = Math.sqrt(variance);

  // Trend slope (normalized SMA slope)
  const sma = calculateSMA(closes, 20);
  const validSMA = sma.filter(v => !isNaN(v) && v > 0);
  let trend_slope = 0;
  if (validSMA.length >= 10) {
    const smaRecent = validSMA.slice(-10);
    const smaSlope = (smaRecent[smaRecent.length - 1] - smaRecent[0]) / smaRecent[0];
    trend_slope = smaSlope * 100; // normalized
  }

  // ADX
  const adxResult = calculateADX(recentBars, 14);
  const adxArr = adxResult.adx || [];
  const adx = adxArr[adxArr.length - 1] || 20;

  // Range compression (recent range / lookback range)
  const recentRange = Math.max(...highs.slice(-10)) - Math.min(...lows.slice(-10));
  const fullRange = Math.max(...highs) - Math.min(...lows);
  const range_compression = fullRange > 0 ? 1 - (recentRange / fullRange) : 0.5;

  // Choppiness Index approximation
  const n = 14;
  const atrSum = atr.slice(-n).reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
  const periodHigh = Math.max(...highs.slice(-n));
  const periodLow = Math.min(...lows.slice(-n));
  const hl = periodHigh - periodLow;
  const choppiness = hl > 0 ? (100 * Math.log10(atrSum / hl) / Math.log10(n)) : 50;

  return {
    atr_percentile: Math.round(atr_percentile),
    realized_volatility: +realized_volatility.toFixed(6),
    trend_slope: +trend_slope.toFixed(4),
    adx: +adx.toFixed(2),
    range_compression: +range_compression.toFixed(4),
    choppiness: +Math.max(0, Math.min(100, choppiness)).toFixed(2),
  };
}

/** Compute and persist regime snapshot */
export async function computeAndPersistRegime(
  userId: string,
  symbol: string,
  timeframe: string,
  bars: OHLCV[]
): Promise<{ regime: RegimeLabel; confidence: number; features: RegimeFeatures } | null> {
  const features = computeRegimeFeatures(bars);
  const { regime, confidence } = classifyRegime(features);

  // Get last snapshot to detect transition
  const { data: lastSnap } = await supabase
    .from('regime_snapshots')
    .select('regime')
    .eq('user_id', userId)
    .eq('symbol', symbol)
    .eq('timeframe', timeframe)
    .order('computed_at', { ascending: false })
    .limit(1)
    .single();

  // Persist snapshot
  await supabase.from('regime_snapshots').insert({
    user_id: userId,
    symbol,
    timeframe,
    regime,
    confidence,
    features: features as any,
  });

  // Record transition if regime changed
  if (lastSnap && lastSnap.regime !== regime) {
    await supabase.from('regime_transitions').insert({
      user_id: userId,
      symbol,
      timeframe,
      from_regime: lastSnap.regime,
      to_regime: regime,
      confidence,
    });
  }

  return { regime, confidence, features };
}

/** Fetch latest regime for a symbol */
export async function fetchLatestRegime(userId: string, symbol: string, timeframe: string = 'H1') {
  const { data } = await supabase
    .from('regime_snapshots')
    .select('*')
    .eq('user_id', userId)
    .eq('symbol', symbol)
    .eq('timeframe', timeframe)
    .order('computed_at', { ascending: false })
    .limit(1)
    .single();
  return data;
}

/** Fetch regime history */
export async function fetchRegimeHistory(userId: string, symbol: string, timeframe: string = 'H1', limit = 100) {
  const { data } = await supabase
    .from('regime_snapshots')
    .select('*')
    .eq('user_id', userId)
    .eq('symbol', symbol)
    .eq('timeframe', timeframe)
    .order('computed_at', { ascending: false })
    .limit(limit);
  return data || [];
}

/** Fetch transitions */
export async function fetchRegimeTransitions(userId: string, symbol: string, timeframe: string = 'H1', limit = 50) {
  const { data } = await supabase
    .from('regime_transitions')
    .select('*')
    .eq('user_id', userId)
    .eq('symbol', symbol)
    .eq('timeframe', timeframe)
    .order('transitioned_at', { ascending: false })
    .limit(limit);
  return data || [];
}
