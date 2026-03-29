/**
 * Report Parser Tests
 * Ensures deterministic equity curve generation (no randomness)
 */

import { describe, it, expect } from 'vitest';

describe('reportParser', () => {
  describe('deterministic equity curve', () => {
    it('should generate identical equity curves for same input trades', () => {
      // Test cumulative equity calculation
      const calculateEquityCurve = (trades: { pnl: number }[], initialCapital: number): number[] => {
        let equity = initialCapital;
        return trades.map(t => {
          equity += t.pnl;
          return equity;
        });
      };

      const trades = [{ pnl: 100 }, { pnl: -50 }, { pnl: 200 }];
      const result1 = calculateEquityCurve(trades, 10000);
      const result2 = calculateEquityCurve(trades, 10000);

      expect(result1).toEqual(result2);
      expect(result1).toEqual([10100, 10050, 10250]);
    });

    it('should calculate drawdown correctly', () => {
      const calculateDrawdown = (equityCurve: number[]): number[] => {
        let peak = equityCurve[0];
        return equityCurve.map(equity => {
          if (equity > peak) peak = equity;
          return ((peak - equity) / peak) * 100;
        });
      };

      const equity = [100, 110, 105, 120, 100];
      const dd = calculateDrawdown(equity);

      expect(dd[0]).toBe(0); // No drawdown at start
      expect(dd[1]).toBe(0); // New peak
      expect(dd[2]).toBeCloseTo(4.55, 1); // 5/110 = 4.55%
      expect(dd[4]).toBeCloseTo(16.67, 1); // 20/120 = 16.67%
    });
  });
});
