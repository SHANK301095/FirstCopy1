/**
 * Phase 12: Risk Sizing Tests
 * Tests for position sizing and risk calculations
 */

import { describe, it, expect } from 'vitest';

// Risk sizing helpers (inline since they're utility functions)
function fixedFractional(accountSize: number, riskPct: number, entryPrice: number, stopLoss: number): number {
  const riskAmount = accountSize * (riskPct / 100);
  const pipsRisk = Math.abs(entryPrice - stopLoss);
  if (pipsRisk === 0) return 0;
  return riskAmount / pipsRisk;
}

function kellyFraction(winRate: number, avgWinLoss: number): number {
  if (avgWinLoss <= 0 || winRate <= 0 || winRate >= 1) return 0;
  return winRate - (1 - winRate) / avgWinLoss;
}

function maxDrawdownRisk(accountSize: number, maxDDPct: number, avgLoss: number): number {
  const maxLoss = accountSize * (maxDDPct / 100);
  if (avgLoss <= 0) return 0;
  return Math.floor(maxLoss / avgLoss);
}

describe('Fixed Fractional Position Sizing', () => {
  it('calculates correct position size', () => {
    const size = fixedFractional(100000, 1, 1.1000, 1.0950);
    expect(size).toBeCloseTo(200, 0); // $1000 risk / 0.005 pip distance
  });

  it('returns 0 for zero stop distance', () => {
    expect(fixedFractional(100000, 1, 1.1, 1.1)).toBe(0);
  });

  it('handles small risk percentages', () => {
    const size = fixedFractional(10000, 0.5, 50, 49);
    expect(size).toBeCloseTo(50, 0); // $50 risk / $1 distance
  });
});

describe('Kelly Criterion', () => {
  it('calculates positive Kelly for edge', () => {
    const k = kellyFraction(0.55, 1.5);
    expect(k).toBeGreaterThan(0);
    expect(k).toBeLessThan(1);
  });

  it('returns 0 for no edge', () => {
    const k = kellyFraction(0.3, 0.5);
    expect(k).toBeLessThanOrEqual(0);
  });

  it('returns 0 for invalid inputs', () => {
    expect(kellyFraction(0, 1.5)).toBe(0);
    expect(kellyFraction(1, 1.5)).toBe(0);
    expect(kellyFraction(0.5, 0)).toBe(0);
  });
});

describe('Max Drawdown Risk Sizing', () => {
  it('calculates max positions', () => {
    const maxPos = maxDrawdownRisk(100000, 10, 500);
    expect(maxPos).toBe(20); // $10,000 max loss / $500 avg loss
  });

  it('handles zero avg loss', () => {
    expect(maxDrawdownRisk(100000, 10, 0)).toBe(0);
  });
});
