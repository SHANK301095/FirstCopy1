/**
 * Phase 12: Unit tests for syncRetryQueue
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { enqueueSyncRetry, clearRetryQueue, getRetryQueueStatus } from '../syncRetryQueue';

describe('syncRetryQueue', () => {
  beforeEach(() => {
    clearRetryQueue();
  });

  it('starts with empty queue', () => {
    const status = getRetryQueueStatus();
    expect(status.count).toBe(0);
  });

  it('enqueue adds items', () => {
    enqueueSyncRetry('test-op', { data: 1 }, 'network error');
    const status = getRetryQueueStatus();
    expect(status.count).toBe(1);
  });

  it('clear empties the queue', () => {
    enqueueSyncRetry('op1', {});
    enqueueSyncRetry('op2', {});
    clearRetryQueue();
    expect(getRetryQueueStatus().count).toBe(0);
  });
});
