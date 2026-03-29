/**
 * Technical Indicator Calculations
 * Pure functions for calculating trading indicators on OHLCV data
 */

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorResult {
  values: number[];
  name: string;
}

/**
 * Exponential Moving Average
 */
export function calculateEMA(data: number[], period: number): number[] {
  if (data.length < period) return new Array(data.length).fill(NaN);
  
  const multiplier = 2 / (period + 1);
  const ema: number[] = new Array(data.length).fill(NaN);
  
  // First EMA is SMA of first 'period' values
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  ema[period - 1] = sum / period;
  
  // Calculate subsequent EMAs
  for (let i = period; i < data.length; i++) {
    ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }
  
  return ema;
}

/**
 * Simple Moving Average
 */
export function calculateSMA(data: number[], period: number): number[] {
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

/**
 * Relative Strength Index
 */
export function calculateRSI(data: number[], period: number = 14): number[] {
  if (data.length < period + 1) return new Array(data.length).fill(NaN);
  
  const rsi: number[] = new Array(data.length).fill(NaN);
  const gains: number[] = [];
  const losses: number[] = [];
  
  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  // Initial average gain/loss
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  // Calculate RSI
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

/**
 * Average True Range
 */
export function calculateATR(bars: OHLCV[], period: number = 14): number[] {
  if (bars.length < period) return new Array(bars.length).fill(NaN);
  
  const tr: number[] = [bars[0].high - bars[0].low];
  
  // Calculate True Range
  for (let i = 1; i < bars.length; i++) {
    const high = bars[i].high;
    const low = bars[i].low;
    const prevClose = bars[i - 1].close;
    tr.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  
  // Calculate ATR using EMA
  return calculateEMA(tr, period);
}

/**
 * MACD - Moving Average Convergence Divergence
 * Fixed: Signal line computed on full-length MACD array to maintain index alignment.
 * Previous bug: NaN-filter-then-realign caused off-by-N misalignment.
 */
export function calculateMACD(data: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): {
  macd: number[];
  signal: number[];
  histogram: number[];
} {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  const macdLine: number[] = fastEMA.map((fast, i) => 
    isNaN(fast) || isNaN(slowEMA[i]) ? NaN : fast - slowEMA[i]
  );
  
  // Compute signal as EMA of macdLine directly (NaN values propagate naturally through EMA)
  // Find first valid MACD index, then compute EMA from there
  const firstValid = macdLine.findIndex(v => !isNaN(v));
  const signalLine: number[] = new Array(macdLine.length).fill(NaN);
  
  if (firstValid >= 0) {
    const validSlice = macdLine.slice(firstValid);
    const multiplier = 2 / (signalPeriod + 1);
    
    // SMA seed over first signalPeriod valid MACD values
    let validCount = 0;
    let sum = 0;
    let seedIdx = -1;
    for (let i = 0; i < validSlice.length; i++) {
      if (!isNaN(validSlice[i])) {
        sum += validSlice[i];
        validCount++;
        if (validCount === signalPeriod) {
          seedIdx = i;
          break;
        }
      }
    }
    
    if (seedIdx >= 0) {
      signalLine[firstValid + seedIdx] = sum / signalPeriod;
      let prevSignal = signalLine[firstValid + seedIdx];
      
      for (let i = seedIdx + 1; i < validSlice.length; i++) {
        const globalIdx = firstValid + i;
        if (!isNaN(validSlice[i])) {
          prevSignal = (validSlice[i] - prevSignal) * multiplier + prevSignal;
          signalLine[globalIdx] = prevSignal;
        } else {
          signalLine[globalIdx] = NaN;
        }
      }
    }
  }
  
  const histogram: number[] = macdLine.map((m, i) => 
    isNaN(m) || isNaN(signalLine[i]) ? NaN : m - signalLine[i]
  );
  
  return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * Bollinger Bands
 */
export function calculateBollingerBands(data: number[], period: number = 20, stdDev: number = 2): {
  upper: number[];
  middle: number[];
  lower: number[];
} {
  const middle = calculateSMA(data, period);
  const upper: number[] = new Array(data.length).fill(NaN);
  const lower: number[] = new Array(data.length).fill(NaN);
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    upper[i] = middle[i] + stdDev * std;
    lower[i] = middle[i] - stdDev * std;
  }
  
  return { upper, middle, lower };
}

/**
 * Stochastic Oscillator
 * Fixed: %D line computed via rolling SMA on full-length %K array to maintain index alignment.
 * Previous bug: NaN-filter-then-realign caused off-by-N misalignment.
 */
export function calculateStochastic(bars: OHLCV[], kPeriod: number = 14, dPeriod: number = 3): {
  k: number[];
  d: number[];
} {
  const k: number[] = new Array(bars.length).fill(NaN);
  
  for (let i = kPeriod - 1; i < bars.length; i++) {
    const slice = bars.slice(i - kPeriod + 1, i + 1);
    const highestHigh = Math.max(...slice.map(b => b.high));
    const lowestLow = Math.min(...slice.map(b => b.low));
    const close = bars[i].close;
    
    if (highestHigh !== lowestLow) {
      k[i] = ((close - lowestLow) / (highestHigh - lowestLow)) * 100;
    } else {
      k[i] = 50;
    }
  }
  
  // Compute %D as SMA of %K directly on full-length array (rolling window over valid K values)
  const dLine: number[] = new Array(bars.length).fill(NaN);
  const firstValidK = kPeriod - 1;
  
  for (let i = firstValidK + dPeriod - 1; i < bars.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = i - dPeriod + 1; j <= i; j++) {
      if (!isNaN(k[j])) {
        sum += k[j];
        count++;
      }
    }
    if (count === dPeriod) {
      dLine[i] = sum / dPeriod;
    }
  }
  
  return { k, d: dLine };
}

/**
 * ADX - Average Directional Index
 */
export function calculateADX(bars: OHLCV[], period: number = 14): {
  adx: number[];
  plusDI: number[];
  minusDI: number[];
} {
  if (bars.length < period * 2) {
    return {
      adx: new Array(bars.length).fill(NaN),
      plusDI: new Array(bars.length).fill(NaN),
      minusDI: new Array(bars.length).fill(NaN)
    };
  }
  
  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  
  for (let i = 1; i < bars.length; i++) {
    const high = bars[i].high;
    const low = bars[i].low;
    const prevHigh = bars[i - 1].high;
    const prevLow = bars[i - 1].low;
    const prevClose = bars[i - 1].close;
    
    tr.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
    
    const upMove = high - prevHigh;
    const downMove = prevLow - low;
    
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }
  
  const smoothedTR = calculateEMA(tr, period);
  const smoothedPlusDM = calculateEMA(plusDM, period);
  const smoothedMinusDM = calculateEMA(minusDM, period);
  
  const plusDI: number[] = smoothedPlusDM.map((dm, i) => 
    smoothedTR[i] > 0 ? (dm / smoothedTR[i]) * 100 : 0
  );
  const minusDI: number[] = smoothedMinusDM.map((dm, i) => 
    smoothedTR[i] > 0 ? (dm / smoothedTR[i]) * 100 : 0
  );
  
  const dx: number[] = plusDI.map((plus, i) => {
    const sum = plus + minusDI[i];
    return sum > 0 ? (Math.abs(plus - minusDI[i]) / sum) * 100 : 0;
  });
  
  const adx = calculateEMA(dx, period);
  
  // Shift arrays to align with bars (first bar has no data)
  return {
    adx: [NaN, ...adx],
    plusDI: [NaN, ...plusDI],
    minusDI: [NaN, ...minusDI]
  };
}

/**
 * CCI - Commodity Channel Index
 */
export function calculateCCI(bars: OHLCV[], period: number = 20): number[] {
  const cci: number[] = new Array(bars.length).fill(NaN);
  
  // Calculate typical price
  const tp = bars.map(b => (b.high + b.low + b.close) / 3);
  const sma = calculateSMA(tp, period);
  
  for (let i = period - 1; i < bars.length; i++) {
    const slice = tp.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const meanDev = slice.reduce((sum, val) => sum + Math.abs(val - mean), 0) / period;
    
    if (meanDev !== 0) {
      cci[i] = (tp[i] - mean) / (0.015 * meanDev);
    }
  }
  
  return cci;
}

/**
 * Get price data by source type
 */
export function getPriceBySource(bars: OHLCV[], source: string): number[] {
  switch (source) {
    case 'open': return bars.map(b => b.open);
    case 'high': return bars.map(b => b.high);
    case 'low': return bars.map(b => b.low);
    case 'close': return bars.map(b => b.close);
    case 'volume': return bars.map(b => b.volume);
    case 'hl2': return bars.map(b => (b.high + b.low) / 2);
    case 'hlc3': return bars.map(b => (b.high + b.low + b.close) / 3);
    case 'ohlc4': return bars.map(b => (b.open + b.high + b.low + b.close) / 4);
    default: return bars.map(b => b.close);
  }
}

// ═══════════════════════════════════════════════════════════
// Phase 1: New Indicators (U001-U035)
// ═══════════════════════════════════════════════════════════

/**
 * Weighted Moving Average
 */
export function calculateWMA(data: number[], period: number): number[] {
  if (data.length < period) return new Array(data.length).fill(NaN);
  const wma: number[] = new Array(data.length).fill(NaN);
  const divisor = (period * (period + 1)) / 2;
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - period + 1 + j] * (j + 1);
    }
    wma[i] = sum / divisor;
  }
  return wma;
}

/**
 * Hull Moving Average (HMA)
 * HMA = WMA(2*WMA(n/2) - WMA(n), sqrt(n))
 */
export function calculateHMA(data: number[], period: number): number[] {
  const halfPeriod = Math.floor(period / 2);
  const sqrtPeriod = Math.round(Math.sqrt(period));
  const wmaHalf = calculateWMA(data, halfPeriod);
  const wmaFull = calculateWMA(data, period);
  const diff: number[] = wmaHalf.map((v, i) =>
    isNaN(v) || isNaN(wmaFull[i]) ? NaN : 2 * v - wmaFull[i]
  );
  return calculateWMA(diff, sqrtPeriod);
}

/**
 * Donchian Channel
 */
export function calculateDonchian(bars: OHLCV[], period: number = 20): {
  upper: number[];
  middle: number[];
  lower: number[];
} {
  const upper: number[] = new Array(bars.length).fill(NaN);
  const lower: number[] = new Array(bars.length).fill(NaN);
  const middle: number[] = new Array(bars.length).fill(NaN);
  for (let i = period - 1; i < bars.length; i++) {
    let hh = -Infinity, ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (bars[j].high > hh) hh = bars[j].high;
      if (bars[j].low < ll) ll = bars[j].low;
    }
    upper[i] = hh;
    lower[i] = ll;
    middle[i] = (hh + ll) / 2;
  }
  return { upper, middle, lower };
}

/**
 * On Balance Volume (OBV)
 */
export function calculateOBV(bars: OHLCV[]): number[] {
  const obv: number[] = [0];
  for (let i = 1; i < bars.length; i++) {
    if (bars[i].close > bars[i - 1].close) {
      obv.push(obv[i - 1] + bars[i].volume);
    } else if (bars[i].close < bars[i - 1].close) {
      obv.push(obv[i - 1] - bars[i].volume);
    } else {
      obv.push(obv[i - 1]);
    }
  }
  return obv;
}

/**
 * Money Flow Index (MFI)
 */
export function calculateMFI(bars: OHLCV[], period: number = 14): number[] {
  if (bars.length < period + 1) return new Array(bars.length).fill(NaN);
  const mfi: number[] = new Array(bars.length).fill(NaN);
  const tp = bars.map(b => (b.high + b.low + b.close) / 3);
  const mf = tp.map((t, i) => t * bars[i].volume);

  for (let i = period; i < bars.length; i++) {
    let posMF = 0, negMF = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (tp[j] > tp[j - 1]) posMF += mf[j];
      else if (tp[j] < tp[j - 1]) negMF += mf[j];
    }
    mfi[i] = negMF === 0 ? 100 : 100 - 100 / (1 + posMF / negMF);
  }
  return mfi;
}

/**
 * Supertrend Indicator
 */
export function calculateSupertrend(bars: OHLCV[], period: number = 10, multiplier: number = 3): {
  supertrend: number[];
  direction: number[]; // 1 = bullish, -1 = bearish
} {
  const atr = calculateATR(bars, period);
  const st: number[] = new Array(bars.length).fill(NaN);
  const dir: number[] = new Array(bars.length).fill(0);

  const upperBand: number[] = new Array(bars.length).fill(NaN);
  const lowerBand: number[] = new Array(bars.length).fill(NaN);

  for (let i = 0; i < bars.length; i++) {
    if (isNaN(atr[i])) continue;
    const hl2 = (bars[i].high + bars[i].low) / 2;
    upperBand[i] = hl2 + multiplier * atr[i];
    lowerBand[i] = hl2 - multiplier * atr[i];
  }

  // Initialize first valid
  const firstValid = atr.findIndex(v => !isNaN(v));
  if (firstValid < 0) return { supertrend: st, direction: dir };

  dir[firstValid] = 1;
  st[firstValid] = lowerBand[firstValid];

  for (let i = firstValid + 1; i < bars.length; i++) {
    if (isNaN(upperBand[i])) continue;

    // Adjust bands
    if (lowerBand[i] > lowerBand[i - 1] || bars[i - 1].close < lowerBand[i - 1]) {
      // keep
    } else {
      lowerBand[i] = lowerBand[i - 1];
    }
    if (upperBand[i] < upperBand[i - 1] || bars[i - 1].close > upperBand[i - 1]) {
      // keep
    } else {
      upperBand[i] = upperBand[i - 1];
    }

    if (dir[i - 1] === 1) {
      dir[i] = bars[i].close < lowerBand[i] ? -1 : 1;
    } else {
      dir[i] = bars[i].close > upperBand[i] ? 1 : -1;
    }
    st[i] = dir[i] === 1 ? lowerBand[i] : upperBand[i];
  }
  return { supertrend: st, direction: dir };
}

/**
 * VWAP (Volume Weighted Average Price) — intraday, resets daily
 */
export function calculateVWAP(bars: OHLCV[]): number[] {
  const vwap: number[] = new Array(bars.length).fill(NaN);
  let cumTPV = 0, cumVol = 0;
  let lastDay = -1;

  for (let i = 0; i < bars.length; i++) {
    const d = new Date(bars[i].timestamp);
    const day = d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
    if (day !== lastDay) { cumTPV = 0; cumVol = 0; lastDay = day; }
    const tp = (bars[i].high + bars[i].low + bars[i].close) / 3;
    cumTPV += tp * bars[i].volume;
    cumVol += bars[i].volume;
    vwap[i] = cumVol > 0 ? cumTPV / cumVol : tp;
  }
  return vwap;
}

/**
 * Ichimoku Cloud
 */
export function calculateIchimoku(bars: OHLCV[], tenkan: number = 9, kijun: number = 26, senkou: number = 52): {
  tenkanSen: number[];
  kijunSen: number[];
  senkouA: number[];
  senkouB: number[];
  chikouSpan: number[];
} {
  const len = bars.length;
  const tenkanSen: number[] = new Array(len).fill(NaN);
  const kijunSen: number[] = new Array(len).fill(NaN);
  const senkouA: number[] = new Array(len).fill(NaN);
  const senkouB: number[] = new Array(len).fill(NaN);
  const chikouSpan: number[] = new Array(len).fill(NaN);

  const midline = (start: number, end: number) => {
    let hh = -Infinity, ll = Infinity;
    for (let j = start; j <= end; j++) {
      if (bars[j].high > hh) hh = bars[j].high;
      if (bars[j].low < ll) ll = bars[j].low;
    }
    return (hh + ll) / 2;
  };

  for (let i = 0; i < len; i++) {
    if (i >= tenkan - 1) tenkanSen[i] = midline(i - tenkan + 1, i);
    if (i >= kijun - 1) kijunSen[i] = midline(i - kijun + 1, i);
    if (i >= kijun - 1 && i + kijun < len) {
      senkouA[i + kijun] = (!isNaN(tenkanSen[i]) && !isNaN(kijunSen[i]))
        ? (tenkanSen[i] + kijunSen[i]) / 2 : NaN;
    }
    if (i >= senkou - 1 && i + kijun < len) {
      senkouB[i + kijun] = midline(i - senkou + 1, i);
    }
    if (i >= kijun) {
      chikouSpan[i - kijun] = bars[i].close;
    }
  }
  return { tenkanSen, kijunSen, senkouA, senkouB, chikouSpan };
}

/**
 * Pivot Points (Standard / Floor)
 */
export function calculatePivotPoints(bars: OHLCV[]): {
  pivot: number[];
  r1: number[];
  r2: number[];
  r3: number[];
  s1: number[];
  s2: number[];
  s3: number[];
} {
  const len = bars.length;
  const pivot: number[] = new Array(len).fill(NaN);
  const r1: number[] = new Array(len).fill(NaN);
  const r2: number[] = new Array(len).fill(NaN);
  const r3: number[] = new Array(len).fill(NaN);
  const s1: number[] = new Array(len).fill(NaN);
  const s2: number[] = new Array(len).fill(NaN);
  const s3: number[] = new Array(len).fill(NaN);

  // Use previous bar's HLC as "previous session"
  for (let i = 1; i < len; i++) {
    const h = bars[i - 1].high;
    const l = bars[i - 1].low;
    const c = bars[i - 1].close;
    const pp = (h + l + c) / 3;
    pivot[i] = pp;
    r1[i] = 2 * pp - l;
    s1[i] = 2 * pp - h;
    r2[i] = pp + (h - l);
    s2[i] = pp - (h - l);
    r3[i] = h + 2 * (pp - l);
    s3[i] = l - 2 * (h - pp);
  }
  return { pivot, r1, r2, r3, s1, s2, s3 };
}

/**
 * Annualization factor based on timeframe string
 */
export function getAnnualizationFactor(timeframe?: string): number {
  if (!timeframe) return 252;
  const tf = timeframe.toLowerCase();
  if (tf === '1m' || tf === '1min') return 252 * 390; // ~98280
  if (tf === '5m' || tf === '5min') return 252 * 78;
  if (tf === '15m' || tf === '15min') return 252 * 26;
  if (tf === '30m' || tf === '30min') return 252 * 13;
  if (tf === '1h' || tf === '60m' || tf === '60min') return 252 * 6.5;
  if (tf === '4h' || tf === '240m') return 252 * 1.625;
  if (tf === '1d' || tf === 'daily' || tf === 'd') return 252;
  if (tf === '1w' || tf === 'weekly' || tf === 'w') return 52;
  if (tf === '1mo' || tf === 'monthly' || tf === 'mo') return 12;
  return 252;
}
