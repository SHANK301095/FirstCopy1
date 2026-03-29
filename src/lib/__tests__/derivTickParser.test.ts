/**
 * Phase 12: Deriv Tick Parser Tests
 */

import { describe, it, expect } from 'vitest';
import { parseDerivTicks, aggregateTicksToOHLCV } from '../derivTickParser';

describe('parseDerivTicks', () => {
  it('parses epoch,bid,ask format', () => {
    const csv = 'Epoch,Bid,Ask\n1700000000,1.1050,1.1052\n1700000001,1.1051,1.1053';
    const { ticks, errors } = parseDerivTicks(csv);
    expect(ticks).toHaveLength(2);
    expect(errors).toHaveLength(0);
    expect(ticks[0].quote).toBeCloseTo(1.1051, 4); // mid price
  });

  it('handles empty file', () => {
    const { ticks, errors } = parseDerivTicks('');
    expect(ticks).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it('reports parse errors for invalid rows', () => {
    const csv = 'Epoch,Bid,Ask\ninvalid,bad,data';
    const { ticks, errors } = parseDerivTicks(csv);
    expect(ticks).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('aggregateTicksToOHLCV', () => {
  it('aggregates ticks into bars', () => {
    const ticks = [
      { epoch: 1700000000, quote: 1.10, symbol: 'X' },
      { epoch: 1700000010, quote: 1.12, symbol: 'X' },
      { epoch: 1700000020, quote: 1.09, symbol: 'X' },
      { epoch: 1700000050, quote: 1.11, symbol: 'X' },
      { epoch: 1700000070, quote: 1.13, symbol: 'X' }, // 2nd bar
    ];
    const bars = aggregateTicksToOHLCV(ticks, 60);
    expect(bars.length).toBeGreaterThanOrEqual(1);
    expect(bars[0].open).toBe(1.10);
    expect(bars[0].high).toBe(1.12);
    expect(bars[0].low).toBe(1.09);
  });

  it('returns empty for no ticks', () => {
    expect(aggregateTicksToOHLCV([], 60)).toHaveLength(0);
  });
});
