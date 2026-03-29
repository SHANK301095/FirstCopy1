/**
 * Phase 12: Unit tests for constants module
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RISK_FREE_RATE,
  DEFAULT_GA_POPULATION,
  DEFAULT_MONTE_CARLO_SIMS,
  AI_MAX_TOKEN_CAP,
  SYNC_MAX_RETRY_ATTEMPTS,
  WORKER_TIMEOUT_MS,
  BACKTEST_CHUNK_SIZE,
  MIN_SAMPLE_SIZE,
  ANNUALIZE_DAILY,
} from '../constants';

describe('constants', () => {
  it('trading defaults are valid', () => {
    expect(DEFAULT_RISK_FREE_RATE).toBe(0);
    expect(MIN_SAMPLE_SIZE).toBeGreaterThanOrEqual(1);
    expect(ANNUALIZE_DAILY).toBe(252);
  });

  it('optimization defaults are positive', () => {
    expect(DEFAULT_GA_POPULATION).toBeGreaterThan(0);
    expect(DEFAULT_MONTE_CARLO_SIMS).toBeGreaterThanOrEqual(100);
  });

  it('AI limits are sane', () => {
    expect(AI_MAX_TOKEN_CAP).toBeLessThanOrEqual(200_000);
    expect(AI_MAX_TOKEN_CAP).toBeGreaterThan(0);
  });

  it('sync/worker limits are valid', () => {
    expect(SYNC_MAX_RETRY_ATTEMPTS).toBeGreaterThanOrEqual(1);
    expect(WORKER_TIMEOUT_MS).toBeGreaterThan(0);
    expect(BACKTEST_CHUNK_SIZE).toBeGreaterThan(0);
  });
});
