import { describe, it, expect } from 'vitest';
import { computeTradeStats, computeExtendedMetrics, safeNetPnl } from '@/lib/tradeMetrics';

// Minimal Trade mock matching the Trade interface
function makeTrade(overrides: Partial<any> = {}): any {
  return {
    id: 'test-1',
    user_id: 'u1',
    symbol: 'NIFTY',
    direction: 'long' as const,
    entry_price: 100,
    exit_price: 110,
    quantity: 1,
    pnl: 10,
    net_pnl: 10,
    fees: 0,
    status: 'closed' as const,
    entry_time: '2024-01-01T10:00:00Z',
    exit_time: '2024-01-01T11:00:00Z',
    r_multiple: 1.5,
    ...overrides,
  };
}

describe('tradeMetrics', () => {
  describe('safeNetPnl', () => {
    it('uses net_pnl when available', () => {
      expect(safeNetPnl({ net_pnl: 50, pnl: 100, fees: 50 })).toBe(50);
    });

    it('computes pnl - fees when net_pnl is null', () => {
      expect(safeNetPnl({ net_pnl: null, pnl: 100, fees: 20 } as any)).toBe(80);
    });

    it('handles null fees', () => {
      expect(safeNetPnl({ net_pnl: null, pnl: 100, fees: null } as any)).toBe(100);
    });
  });

  describe('computeTradeStats', () => {
    it('returns null for empty array', () => {
      expect(computeTradeStats([])).toBeNull();
    });

    it('computes correct win rate excluding breakeven', () => {
      const trades = [
        makeTrade({ net_pnl: 100 }),  // win
        makeTrade({ net_pnl: -50 }),   // loss
        makeTrade({ net_pnl: 0 }),     // breakeven - excluded from WR
      ];
      const stats = computeTradeStats(trades)!;
      // WR = 1 win / (1 win + 1 loss) = 50%
      expect(stats.winRate).toBe(50);
    });

    it('computes profit factor correctly', () => {
      const trades = [
        makeTrade({ net_pnl: 200 }),
        makeTrade({ net_pnl: -100 }),
      ];
      const stats = computeTradeStats(trades)!;
      expect(stats.profitFactor).toBe(2);
    });

    it('handles all-winning trades', () => {
      const trades = [
        makeTrade({ net_pnl: 100 }),
        makeTrade({ net_pnl: 50 }),
      ];
      const stats = computeTradeStats(trades)!;
      expect(stats.winRate).toBe(100);
      expect(stats.profitFactor).toBe(Infinity);
    });

    it('computes max drawdown correctly', () => {
      const trades = [
        makeTrade({ net_pnl: 100, entry_time: '2024-01-01T10:00:00Z' }),
        makeTrade({ net_pnl: -50, entry_time: '2024-01-02T10:00:00Z' }),
        makeTrade({ net_pnl: -30, entry_time: '2024-01-03T10:00:00Z' }),
        makeTrade({ net_pnl: 200, entry_time: '2024-01-04T10:00:00Z' }),
      ];
      const stats = computeTradeStats(trades)!;
      // Peak at 100, trough at 100-50-30 = 20, DD = 80
      expect(stats.maxDrawdown).toBe(80);
    });
  });

  describe('computeExtendedMetrics', () => {
    it('computes Sharpe ratio', () => {
      const trades = [
        makeTrade({ net_pnl: 100 }),
        makeTrade({ net_pnl: -20 }),
        makeTrade({ net_pnl: 80 }),
        makeTrade({ net_pnl: -10 }),
        makeTrade({ net_pnl: 50 }),
      ];
      const metrics = computeExtendedMetrics(trades)!;
      expect(metrics.sharpeRatio).toBeGreaterThan(0);
      expect(typeof metrics.sortinoRatio).toBe('number');
    });

    it('computes long/short win rates', () => {
      const trades = [
        makeTrade({ direction: 'long', net_pnl: 100 }),
        makeTrade({ direction: 'long', net_pnl: -50 }),
        makeTrade({ direction: 'short', net_pnl: 80 }),
        makeTrade({ direction: 'short', net_pnl: 60 }),
      ];
      const metrics = computeExtendedMetrics(trades)!;
      expect(metrics.longWinRate).toBe(50);   // 1/2
      expect(metrics.shortWinRate).toBe(100);  // 2/2
    });
  });
});
