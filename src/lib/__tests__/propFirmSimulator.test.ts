/**
 * Phase 12: Prop Firm Simulator Tests
 */

import { describe, it, expect } from 'vitest';
import { simulateChallenge, PROP_FIRM_PRESETS } from '../propFirmSimulator';

describe('Prop Firm Simulator', () => {
  it('passes when profit target met with no DD breach', () => {
    const rules = PROP_FIRM_PRESETS['FTMO Phase 1'];
    // 10 winning days at $1,100 each = 11% profit > 10% target
    const dailyPnls = Array(10).fill(1100);
    const result = simulateChallenge(rules, dailyPnls);
    expect(result.passed).toBe(true);
    expect(result.profitPct).toBeGreaterThan(rules.profitTargetPct);
  });

  it('fails on daily DD breach', () => {
    const rules = PROP_FIRM_PRESETS['FTMO Phase 1'];
    // One day with -6% loss on 100k = -$6,000 > 5% daily DD
    const dailyPnls = [-6000, 500, 500, 500, 500];
    const result = simulateChallenge(rules, dailyPnls);
    expect(result.passed).toBe(false);
    expect(result.failReason).toContain('Daily DD');
  });

  it('fails when profit target not reached', () => {
    const rules = PROP_FIRM_PRESETS['FTMO Phase 1'];
    const dailyPnls = Array(10).fill(100); // Only $1,000 profit = 1%
    const result = simulateChallenge(rules, dailyPnls);
    expect(result.passed).toBe(false);
    expect(result.failReason).toContain('Profit target');
  });

  it('fails on min trading days not met', () => {
    const rules = PROP_FIRM_PRESETS['FTMO Phase 1'];
    // Only 2 days but meets profit target
    const dailyPnls = [5500, 5500];
    const result = simulateChallenge(rules, dailyPnls);
    expect(result.passed).toBe(false);
    expect(result.failReason).toContain('Minimum trading days');
  });

  it('dayByDay array has correct length', () => {
    const rules = PROP_FIRM_PRESETS['FTMO Phase 2'];
    const dailyPnls = [200, -100, 300, 150, -50, 400, 250];
    const result = simulateChallenge(rules, dailyPnls);
    expect(result.dayByDay).toHaveLength(7);
    expect(result.dayByDay[0].day).toBe(1);
  });
});
