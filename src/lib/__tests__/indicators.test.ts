import { describe, it, expect } from 'vitest';
import {
  calculateRSI,
  calculateMACD,
  calculateStochastic,
  calculateEMA,
  calculateSMA,
  calculateATR,
  calculateBollingerBands,
  OHLCV,
} from '@/lib/indicators';

// Helper: generate simple price data
function generatePrices(count: number, start: number = 100, step: number = 1): number[] {
  return Array.from({ length: count }, (_, i) => start + Math.sin(i * 0.3) * step * 10 + i * 0.1);
}

function generateBars(count: number): OHLCV[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: Date.now() + i * 60000,
    open: 100 + Math.sin(i * 0.3) * 5,
    high: 105 + Math.sin(i * 0.3) * 5,
    low: 95 + Math.sin(i * 0.3) * 5,
    close: 100 + Math.sin(i * 0.3) * 5 + (i % 3 === 0 ? 2 : -1),
    volume: 1000 + i * 10,
  }));
}

describe('Indicators', () => {
  describe('RSI', () => {
    it('returns array of same length as input', () => {
      const data = generatePrices(50);
      const rsi = calculateRSI(data, 14);
      expect(rsi.length).toBe(data.length);
    });

    it('returns NaN for warmup period', () => {
      const data = generatePrices(50);
      const rsi = calculateRSI(data, 14);
      // First 14 values should be NaN
      for (let i = 0; i < 14; i++) {
        expect(isNaN(rsi[i])).toBe(true);
      }
    });

    it('RSI values are between 0 and 100', () => {
      const data = generatePrices(100);
      const rsi = calculateRSI(data, 14);
      const valid = rsi.filter(v => !isNaN(v));
      expect(valid.length).toBeGreaterThan(0);
      valid.forEach(v => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      });
    });

    it('all-up data produces RSI = 100', () => {
      const data = Array.from({ length: 30 }, (_, i) => 100 + i);
      const rsi = calculateRSI(data, 14);
      const lastValid = rsi.filter(v => !isNaN(v));
      expect(lastValid[lastValid.length - 1]).toBe(100);
    });
  });

  describe('MACD - Index Alignment Fix', () => {
    it('returns arrays of same length as input', () => {
      const data = generatePrices(100);
      const { macd, signal, histogram } = calculateMACD(data);
      expect(macd.length).toBe(data.length);
      expect(signal.length).toBe(data.length);
      expect(histogram.length).toBe(data.length);
    });

    it('signal line first valid index is after MACD first valid + signalPeriod - 1', () => {
      const data = generatePrices(100);
      const { macd, signal } = calculateMACD(data, 12, 26, 9);
      
      const firstValidMACD = macd.findIndex(v => !isNaN(v));
      const firstValidSignal = signal.findIndex(v => !isNaN(v));
      
      // Signal should start at firstValidMACD + signalPeriod - 1
      expect(firstValidSignal).toBe(firstValidMACD + 9 - 1);
    });

    it('histogram = MACD - Signal at every valid point', () => {
      const data = generatePrices(100);
      const { macd, signal, histogram } = calculateMACD(data);
      
      for (let i = 0; i < data.length; i++) {
        if (!isNaN(macd[i]) && !isNaN(signal[i])) {
          expect(Math.abs(histogram[i] - (macd[i] - signal[i]))).toBeLessThan(1e-10);
        }
      }
    });

    it('no valid values shifted to wrong positions (regression test)', () => {
      // With 50 data points, slow EMA = 26, fast = 12
      // MACD first valid at index 25 (slow EMA warmup)
      // Signal first valid at 25 + 8 = 33
      const data = generatePrices(50);
      const { signal } = calculateMACD(data, 12, 26, 9);
      
      // Before index 33, signal should be NaN
      for (let i = 0; i < 33; i++) {
        expect(isNaN(signal[i])).toBe(true);
      }
      // At index 33, signal should be valid
      expect(isNaN(signal[33])).toBe(false);
    });
  });

  describe('Stochastic - Index Alignment Fix', () => {
    it('returns arrays of same length as bars', () => {
      const bars = generateBars(50);
      const { k, d } = calculateStochastic(bars, 14, 3);
      expect(k.length).toBe(bars.length);
      expect(d.length).toBe(bars.length);
    });

    it('%K first valid at kPeriod - 1', () => {
      const bars = generateBars(50);
      const { k } = calculateStochastic(bars, 14, 3);
      
      for (let i = 0; i < 13; i++) {
        expect(isNaN(k[i])).toBe(true);
      }
      expect(isNaN(k[13])).toBe(false);
    });

    it('%D first valid at kPeriod + dPeriod - 2', () => {
      const bars = generateBars(50);
      const { d } = calculateStochastic(bars, 14, 3);
      
      // %D = SMA(%K, 3), first valid %K at 13, so first valid %D at 13 + 2 = 15
      for (let i = 0; i < 15; i++) {
        expect(isNaN(d[i])).toBe(true);
      }
      expect(isNaN(d[15])).toBe(false);
    });

    it('%K values are between 0 and 100', () => {
      const bars = generateBars(100);
      const { k } = calculateStochastic(bars, 14, 3);
      const valid = k.filter(v => !isNaN(v));
      valid.forEach(v => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      });
    });

    it('%D is smooth moving average of %K (not shifted)', () => {
      const bars = generateBars(50);
      const { k, d } = calculateStochastic(bars, 14, 3);
      
      // At each valid %D point, it should be average of k[i-2], k[i-1], k[i]
      for (let i = 15; i < bars.length; i++) {
        if (!isNaN(d[i]) && !isNaN(k[i]) && !isNaN(k[i-1]) && !isNaN(k[i-2])) {
          const expected = (k[i] + k[i-1] + k[i-2]) / 3;
          expect(Math.abs(d[i] - expected)).toBeLessThan(1e-10);
        }
      }
    });
  });

  describe('EMA', () => {
    it('returns array of same length', () => {
      const data = generatePrices(30);
      const ema = calculateEMA(data, 10);
      expect(ema.length).toBe(data.length);
    });

    it('first valid value is SMA of first N values', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const ema = calculateEMA(data, 5);
      // SMA of first 5: (1+2+3+4+5)/5 = 3
      expect(ema[4]).toBe(3);
    });
  });

  describe('Bollinger Bands', () => {
    it('middle band equals SMA', () => {
      const data = generatePrices(50);
      const { middle } = calculateBollingerBands(data, 20, 2);
      const sma = calculateSMA(data, 20);
      
      for (let i = 19; i < data.length; i++) {
        expect(Math.abs(middle[i] - sma[i])).toBeLessThan(1e-10);
      }
    });

    it('upper > middle > lower at all valid points', () => {
      const data = generatePrices(50);
      const { upper, middle, lower } = calculateBollingerBands(data, 20, 2);
      
      for (let i = 19; i < data.length; i++) {
        expect(upper[i]).toBeGreaterThanOrEqual(middle[i]);
        expect(middle[i]).toBeGreaterThanOrEqual(lower[i]);
      }
    });
  });
});
