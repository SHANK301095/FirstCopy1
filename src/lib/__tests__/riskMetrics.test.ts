import { describe, it, expect } from 'vitest';
import { calculateRiskMetrics, type RiskMetricsInput } from '../riskMetrics';

function makeInput(returns: number[], initialCapital = 10000): RiskMetricsInput {
  let cum = initialCapital;
  const equity = [initialCapital];
  for (const r of returns) {
    cum += r;
    equity.push(cum);
  }
  return { returns, equity, initialCapital };
}

describe('calculateRiskMetrics', () => {
  it('returns empty metrics for empty input', () => {
    const result = calculateRiskMetrics({ returns: [], equity: [], initialCapital: 10000 });
    expect(result.winRate).toBe(0);
    expect(result.sharpeRatio).toBe(0);
    expect(result.maxDrawdown).toBe(0);
  });

  it('calculates win rate correctly', () => {
    const input = makeInput([100, -50, 200, -30, 150]);
    const result = calculateRiskMetrics(input);
    // 3 wins, 2 losses → 60%
    expect(result.winRate).toBe(60);
  });

  it('calculates max drawdown', () => {
    // 10000 → 10100 → 10050 → 10250 → 10220 → 10370
    // Peak at 10250, then drops to 10220, DD = 30
    // But biggest DD: from 10100 to 10050 = 50? No, 10250 to 10220 = 30
    // Actually peak tracking: 10100(peak) → 10050 (DD=50), then 10250(new peak) → 10220 (DD=30)
    const input = makeInput([100, -50, 200, -30, 150]);
    const result = calculateRiskMetrics(input);
    expect(result.maxDrawdown).toBe(50);
  });

  it('calculates profit factor via payoff ratio', () => {
    const input = makeInput([100, -50, 100, -50]);
    const result = calculateRiskMetrics(input);
    expect(result.avgWin).toBe(100);
    expect(result.avgLoss).toBe(50);
    expect(result.payoffRatio).toBe(2);
  });

  it('handles all-winning trades', () => {
    const input = makeInput([10, 20, 30]);
    const result = calculateRiskMetrics(input);
    expect(result.winRate).toBe(100);
    expect(result.maxDrawdown).toBe(0);
    expect(result.avgLoss).toBe(0);
  });

  it('handles all-losing trades', () => {
    const input = makeInput([-10, -20, -30]);
    const result = calculateRiskMetrics(input);
    expect(result.winRate).toBe(0);
    expect(result.avgWin).toBe(0);
    expect(result.maxDrawdown).toBe(60);
  });

  it('calculates sharpe ratio with sign', () => {
    const input = makeInput([10, 20, 30, 40, 50]);
    const result = calculateRiskMetrics(input);
    expect(result.sharpeRatio).toBeGreaterThan(0);
  });

  it('calculates sortino ratio', () => {
    const input = makeInput([10, -5, 20, -3, 15]);
    const result = calculateRiskMetrics(input);
    expect(result.sortinoRatio).toBeGreaterThan(0);
  });

  it('VaR is positive for mixed returns', () => {
    const input = makeInput([10, -50, 20, -30, 5, -10, 15, -40, 25, -20,
      10, -50, 20, -30, 5, -10, 15, -40, 25, -20]);
    const result = calculateRiskMetrics(input);
    expect(result.var95).toBeGreaterThan(0);
  });

  it('kelly fraction is reasonable', () => {
    // 60% WR, avg win 100, avg loss 50 → kelly = 0.6 - 0.4/2 = 0.4
    const input = makeInput([100, -50, 100, -50, 100]);
    const result = calculateRiskMetrics(input);
    expect(result.kellyFraction).toBeGreaterThan(0);
    expect(result.kellyFraction).toBeLessThan(1);
  });
});
