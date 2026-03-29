/**
 * Unit tests for Strategy Health Scoring Engine
 */
import { describe, it, expect } from 'vitest';
import { computeHealthScore, scoreToGrade } from '@/lib/strategyHealthScoring';

describe('scoreToGrade', () => {
  it('returns healthy for 80+', () => expect(scoreToGrade(80)).toBe('healthy'));
  it('returns medium for 60-79', () => expect(scoreToGrade(65)).toBe('medium'));
  it('returns risky for <60', () => expect(scoreToGrade(40)).toBe('risky'));
});

describe('computeHealthScore', () => {
  it('returns risky for insufficient sample', () => {
    const result = computeHealthScore([{ pnl: 10, net_pnl: 10, entry_time: '2025-01-01' }]);
    expect(result.score).toBe(0);
    expect(result.grade).toBe('risky');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('scores a consistently profitable strategy well', () => {
    const trades = Array.from({ length: 50 }, (_, i) => ({
      pnl: 10 + Math.random() * 5,
      net_pnl: 9 + Math.random() * 5,
      entry_time: new Date(2025, 0, 1 + i).toISOString(),
      exit_time: new Date(2025, 0, 1 + i, 8).toISOString(),
      fees: 1,
    }));
    const result = computeHealthScore(trades);
    expect(result.score).toBeGreaterThan(60);
    expect(result.grade).not.toBe('risky');
    expect(result.components.robustness).toBeGreaterThan(0);
    expect(result.reasons.length).toBeGreaterThanOrEqual(1);
  });

  it('penalizes one-trade-dependent strategy', () => {
    const trades = [
      ...Array.from({ length: 19 }, () => ({ pnl: 1, net_pnl: 1, entry_time: '2025-01-01', fees: 0 })),
      { pnl: 100, net_pnl: 100, entry_time: '2025-02-01', fees: 0 },
    ];
    const result = computeHealthScore(trades);
    expect(result.components.robustness).toBeLessThan(70);
  });

  it('penalizes high drawdown strategy', () => {
    const trades = Array.from({ length: 20 }, (_, i) => ({
      pnl: i < 10 ? -20 : 5,
      net_pnl: i < 10 ? -20 : 5,
      entry_time: new Date(2025, 0, 1 + i).toISOString(),
      fees: 0,
    }));
    const result = computeHealthScore(trades);
    expect(result.components.risk_quality).toBeLessThan(50);
  });

  it('returns 4 component scores', () => {
    const trades = Array.from({ length: 30 }, (_, i) => ({
      pnl: 5, net_pnl: 4, entry_time: new Date(2025, 0, 1 + i).toISOString(), fees: 1,
    }));
    const result = computeHealthScore(trades);
    expect(result.components).toHaveProperty('robustness');
    expect(result.components).toHaveProperty('risk_quality');
    expect(result.components).toHaveProperty('consistency');
    expect(result.components).toHaveProperty('execution_reality');
  });
});
