/**
 * Phase 12: Performance Benchmark Tests
 * Ensures core operations complete within time limits
 */

import { describe, it, expect } from 'vitest';

// Simulate indicator computation
function computeRSI(prices: number[], period = 14): number[] {
  const rsi: number[] = [];
  if (prices.length < period + 1) return rsi;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }

  avgGain /= period;
  avgLoss /= period;

  rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }

  return rsi;
}

// Generate random price data
function generateBars(count: number): number[] {
  const bars: number[] = [100];
  for (let i = 1; i < count; i++) {
    bars.push(bars[i - 1] * (1 + (Math.random() - 0.5) * 0.02));
  }
  return bars;
}

// Max drawdown O(n)
function maxDrawdown(equity: number[]): number {
  let peak = -Infinity;
  let maxDD = 0;
  for (const val of equity) {
    if (val > peak) peak = val;
    const dd = (peak - val) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

// LTTB downsample
function downsampleLTTB(data: number[], target: number): number[] {
  if (data.length <= target) return data;
  const result: number[] = [data[0]];
  const bucketSize = (data.length - 2) / (target - 2);
  let a = 0;
  for (let i = 1; i < target - 1; i++) {
    const rangeStart = Math.floor((i - 1) * bucketSize) + 1;
    const rangeEnd = Math.min(Math.floor(i * bucketSize) + 1, data.length);
    const nextStart = Math.floor(i * bucketSize) + 1;
    const nextEnd = Math.min(Math.floor((i + 1) * bucketSize) + 1, data.length);
    let avgY = 0;
    for (let j = nextStart; j < nextEnd; j++) avgY += data[j];
    avgY /= (nextEnd - nextStart) || 1;
    let maxArea = -1;
    let maxIdx = rangeStart;
    for (let j = rangeStart; j < rangeEnd; j++) {
      const area = Math.abs((j - a) * (avgY - data[a]) - (0) * (data[j] - data[a]));
      if (area > maxArea) { maxArea = area; maxIdx = j; }
    }
    result.push(data[maxIdx]);
    a = maxIdx;
  }
  result.push(data[data.length - 1]);
  return result;
}

describe('Performance Benchmarks', () => {
  it('RSI on 100k bars < 100ms', () => {
    const bars = generateBars(100_000);
    const start = performance.now();
    const result = computeRSI(bars, 14);
    const elapsed = performance.now() - start;
    
    expect(result.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(100);
  });

  it('Max drawdown on 100k bars < 50ms', () => {
    const equity = generateBars(100_000);
    const start = performance.now();
    const dd = maxDrawdown(equity);
    const elapsed = performance.now() - start;
    
    expect(dd).toBeGreaterThanOrEqual(0);
    expect(dd).toBeLessThanOrEqual(1);
    expect(elapsed).toBeLessThan(50);
  });

  it('LTTB downsample 1M → 1000 points < 500ms', () => {
    const data = generateBars(1_000_000);
    const start = performance.now();
    const result = downsampleLTTB(data, 1000);
    const elapsed = performance.now() - start;
    
    expect(result.length).toBe(1000);
    expect(elapsed).toBeLessThan(500);
  });

  it('Array sort 100k trades < 200ms', () => {
    const trades = Array.from({ length: 100_000 }, (_, i) => ({
      id: `t-${i}`,
      pnl: (Math.random() - 0.5) * 1000,
      date: Date.now() - Math.random() * 86400000 * 365,
    }));

    const start = performance.now();
    trades.sort((a, b) => b.date - a.date);
    const elapsed = performance.now() - start;
    
    expect(elapsed).toBeLessThan(200);
  });

  it('Equity curve generation 100k bars < 100ms', () => {
    const bars = generateBars(100_000);
    const start = performance.now();
    const equity: number[] = [10000];
    for (let i = 1; i < bars.length; i++) {
      const change = (bars[i] - bars[i - 1]) / bars[i - 1];
      equity.push(equity[i - 1] * (1 + change * 0.1)); // 10% position
    }
    const elapsed = performance.now() - start;
    
    expect(equity.length).toBe(100_000);
    expect(elapsed).toBeLessThan(100);
  });

  it('Pattern matching 10k strings < 50ms', () => {
    const patterns = Array.from({ length: 10_000 }, (_, i) => `TRADE_${i}_BUY_EURUSD_1.1${i}`);
    const regex = /BUY|SELL/;
    
    const start = performance.now();
    const matches = patterns.filter(p => regex.test(p));
    const elapsed = performance.now() - start;
    
    expect(matches.length).toBe(10_000);
    expect(elapsed).toBeLessThan(50);
  });
});
