/**
 * Phase 12: Unit tests for AI cache module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { aiCache, truncateContext } from '../aiCache';

describe('aiCache', () => {
  beforeEach(() => {
    aiCache.clear();
  });

  it('get returns undefined for miss', () => {
    expect(aiCache.get('nonexistent')).toBeUndefined();
  });

  it('set and get returns cached value', () => {
    aiCache.set('key1', 'value1');
    expect(aiCache.get('key1')).toBe('value1');
  });

  it('clear removes all entries', () => {
    aiCache.set('x', 'y');
    aiCache.clear();
    expect(aiCache.get('x')).toBeUndefined();
  });
});

describe('truncateContext', () => {
  it('returns input if under limit', () => {
    expect(truncateContext('hello', 100)).toBe('hello');
  });

  it('truncates long text with ellipsis marker', () => {
    const long = 'a'.repeat(2000);
    const result = truncateContext(long, 50);
    expect(result.length).toBeLessThan(long.length);
    expect(result).toContain('...[truncated]...');
  });
});
