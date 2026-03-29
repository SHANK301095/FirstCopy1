/**
 * Phase 1 — Unit tests for new indicators
 * Tests: WMA, HMA, OBV, MFI, Supertrend, VWAP, Donchian, Ichimoku, PivotPoints
 */
import { describe, it, expect } from 'vitest';
import {
  calculateWMA,
  calculateHMA,
  calculateOBV,
  calculateMFI,
  calculateSupertrend,
  calculateVWAP,
  calculateDonchian,
  calculateIchimoku,
  calculatePivotPoints,
  getAnnualizationFactor,
  OHLCV,
} from '../indicators';

function makeBars(count: number, basePrice = 100): OHLCV[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: Date.now() + i * 60000,
    open: basePrice + i * 0.1,
    high: basePrice + i * 0.1 + 2,
    low: basePrice + i * 0.1 - 1,
    close: basePrice + i * 0.1 + 1,
    volume: 1000 + i * 10,
  }));
}

describe('WMA', () => {
  it('returns array length = data.length', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = calculateWMA(data, 3);
    expect(result.length).toBe(data.length);
  });

  it('first period-1 values are NaN', () => {
    const data = [1, 2, 3, 4, 5];
    const result = calculateWMA(data, 3);
    expect(isNaN(result[0])).toBe(true);
    expect(isNaN(result[1])).toBe(true);
    expect(isNaN(result[2])).toBe(false);
  });

  it('WMA(3) of [1,2,3] = (1*1 + 2*2 + 3*3) / 6 = 14/6', () => {
    const data = [1, 2, 3];
    const result = calculateWMA(data, 3);
    expect(result[2]).toBeCloseTo(14 / 6, 5);
  });
});

describe('HMA', () => {
  it('returns array length = data.length', () => {
    const data = Array.from({ length: 30 }, (_, i) => 100 + i);
    const result = calculateHMA(data, 9);
    expect(result.length).toBe(data.length);
  });
});

describe('OBV', () => {
  it('returns array length = bars.length', () => {
    const bars = makeBars(20);
    const result = calculateOBV(bars);
    expect(result.length).toBe(bars.length);
  });

  it('starts at 0', () => {
    const bars = makeBars(5);
    expect(calculateOBV(bars)[0]).toBe(0);
  });
});

describe('MFI', () => {
  it('returns array length = bars.length', () => {
    const bars = makeBars(30);
    const result = calculateMFI(bars, 14);
    expect(result.length).toBe(bars.length);
  });

  it('values between 0-100 where valid', () => {
    const bars = makeBars(30);
    const result = calculateMFI(bars, 14);
    result.forEach(v => {
      if (!isNaN(v)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    });
  });
});

describe('Supertrend', () => {
  it('returns arrays of length = bars.length', () => {
    const bars = makeBars(50);
    const { supertrend, direction } = calculateSupertrend(bars, 10, 3);
    expect(supertrend.length).toBe(bars.length);
    expect(direction.length).toBe(bars.length);
  });

  it('direction is 1 or -1 where valid', () => {
    const bars = makeBars(50);
    const { direction } = calculateSupertrend(bars, 10, 3);
    direction.forEach(d => {
      if (d !== 0) {
        expect([1, -1]).toContain(d);
      }
    });
  });
});

describe('VWAP', () => {
  it('returns array length = bars.length', () => {
    const bars = makeBars(20);
    const result = calculateVWAP(bars);
    expect(result.length).toBe(bars.length);
  });
});

describe('Donchian', () => {
  it('upper >= lower where valid', () => {
    const bars = makeBars(30);
    const { upper, lower } = calculateDonchian(bars, 10);
    for (let i = 0; i < bars.length; i++) {
      if (!isNaN(upper[i]) && !isNaN(lower[i])) {
        expect(upper[i]).toBeGreaterThanOrEqual(lower[i]);
      }
    }
  });
});

describe('Ichimoku', () => {
  it('returns all 5 lines of bars.length', () => {
    const bars = makeBars(60);
    const result = calculateIchimoku(bars);
    expect(result.tenkanSen.length).toBe(60);
    expect(result.kijunSen.length).toBe(60);
    expect(result.senkouA.length).toBe(60);
    expect(result.senkouB.length).toBe(60);
    expect(result.chikouSpan.length).toBe(60);
  });
});

describe('PivotPoints', () => {
  it('first bar is NaN (no previous bar)', () => {
    const bars = makeBars(10);
    const { pivot } = calculatePivotPoints(bars);
    expect(isNaN(pivot[0])).toBe(true);
    expect(isNaN(pivot[1])).toBe(false);
  });
});

describe('getAnnualizationFactor', () => {
  it('returns 252 for daily', () => {
    expect(getAnnualizationFactor('1d')).toBe(252);
    expect(getAnnualizationFactor('daily')).toBe(252);
  });
  it('returns 52 for weekly', () => {
    expect(getAnnualizationFactor('1w')).toBe(52);
  });
  it('returns 12 for monthly', () => {
    expect(getAnnualizationFactor('1mo')).toBe(12);
  });
  it('returns higher factor for intraday', () => {
    expect(getAnnualizationFactor('1m')).toBeGreaterThan(252);
    expect(getAnnualizationFactor('5m')).toBeGreaterThan(252);
  });
});
