/**
 * Phase 12: Unit tests for workerSafety module
 */

import { describe, it, expect } from 'vitest';
import { CancellationToken, withTimeout, createSeededRandom } from '../workerSafety';

describe('CancellationToken', () => {
  it('starts not cancelled', () => {
    const ct = new CancellationToken();
    expect(ct.isCancelled).toBe(false);
  });

  it('cancel sets flag', () => {
    const ct = new CancellationToken();
    ct.cancel();
    expect(ct.isCancelled).toBe(true);
  });

  it('throwIfCancelled throws after cancel', () => {
    const ct = new CancellationToken();
    ct.cancel();
    expect(() => ct.throwIfCancelled()).toThrow();
  });
});

describe('withTimeout', () => {
  it('resolves if task finishes in time', async () => {
    const result = await withTimeout(Promise.resolve(42), 1000);
    expect(result).toBe(42);
  });

  it('rejects if task exceeds timeout', async () => {
    const slow = new Promise(r => setTimeout(() => r('late'), 2000));
    await expect(withTimeout(slow, 50)).rejects.toThrow();
  });
});

describe('createSeededRandom', () => {
  it('produces deterministic sequence', () => {
    const r1 = createSeededRandom(12345);
    const r2 = createSeededRandom(12345);
    const seq1 = Array.from({ length: 10 }, () => r1());
    const seq2 = Array.from({ length: 10 }, () => r2());
    expect(seq1).toEqual(seq2);
  });

  it('values are in [0, 1)', () => {
    const r = createSeededRandom(99);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
