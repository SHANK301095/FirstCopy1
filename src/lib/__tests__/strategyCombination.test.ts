/**
 * Phase 12: Strategy Combination Tester Tests
 */

import { describe, it, expect } from 'vitest';
import { combineStrategies, buildCorrelationMatrix, autoCleanCorrelated, type StrategyResult } from '../strategyCombinationTester';

const mockStrategy = (id: string, equity: number[], sharpe: number): StrategyResult => ({
  strategyId: id,
  strategyName: id,
  equityCurve: equity,
  trades: [],
  winRate: 0.55,
  sharpeRatio: sharpe,
  maxDrawdownPct: 5,
});

describe('buildCorrelationMatrix', () => {
  it('diagonal is 1', () => {
    const results = [
      mockStrategy('A', [100, 110, 105, 115], 1.5),
      mockStrategy('B', [100, 95, 105, 110], 1.0),
    ];
    const matrix = buildCorrelationMatrix(results);
    expect(matrix[0][0]).toBe(1);
    expect(matrix[1][1]).toBe(1);
  });

  it('perfectly correlated series has correlation near 1', () => {
    const eq = [100, 110, 120, 130];
    const results = [
      mockStrategy('A', eq, 1),
      mockStrategy('B', eq, 1),
    ];
    const matrix = buildCorrelationMatrix(results);
    expect(matrix[0][1]).toBeCloseTo(1, 5);
  });
});

describe('combineStrategies', () => {
  it('equal weight produces averaged equity', () => {
    const results = [
      mockStrategy('A', [100, 120, 140], 1.5),
      mockStrategy('B', [100, 80, 100], 0.5),
    ];
    const combo = combineStrategies(results);
    expect(combo.combinedEquity[0]).toBeCloseTo(100, 0);
    expect(combo.combinedEquity[1]).toBeCloseTo(100, 0); // (120+80)/2
  });

  it('returns valid metrics', () => {
    const results = [
      mockStrategy('A', [100, 110, 120, 130], 2),
      mockStrategy('B', [100, 105, 115, 125], 1.5),
    ];
    const combo = combineStrategies(results);
    expect(combo.combinedSharpe).toBeGreaterThan(0);
    expect(combo.diversificationRatio).toBeGreaterThan(0);
  });
});

describe('autoCleanCorrelated', () => {
  it('removes highly correlated strategy with lower Sharpe', () => {
    const eq = [100, 110, 120, 130, 140];
    const results = [
      mockStrategy('A', eq, 2.0),
      mockStrategy('B', eq, 1.0), // identical = corr 1.0
    ];
    const cleaned = autoCleanCorrelated(results, 0.85);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].strategyId).toBe('A');
  });

  it('keeps uncorrelated strategies', () => {
    const results = [
      mockStrategy('A', [100, 110, 105, 115, 120], 1.5),
      mockStrategy('B', [100, 95, 105, 90, 110], 1.0),
    ];
    const cleaned = autoCleanCorrelated(results, 0.85);
    expect(cleaned.length).toBeGreaterThanOrEqual(1);
  });
});
