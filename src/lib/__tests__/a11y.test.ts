/**
 * Phase 12: Unit tests for a11y utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { announceToScreenReader, generateAriaId, prefersReducedMotion } from '../a11y';

describe('generateAriaId', () => {
  it('generates unique ids', () => {
    const id1 = generateAriaId();
    const id2 = generateAriaId();
    expect(id1).not.toBe(id2);
  });

  it('uses custom prefix', () => {
    const id = generateAriaId('custom');
    expect(id).toMatch(/^custom-\d+$/);
  });
});

describe('announceToScreenReader', () => {
  it('creates and removes live region element', async () => {
    vi.useFakeTimers();
    announceToScreenReader('Test message');
    const el = document.querySelector('[aria-live]');
    expect(el).toBeTruthy();
    expect(el?.textContent).toBe('Test message');
    vi.advanceTimersByTime(1100);
    expect(document.querySelector('[aria-live]')).toBeNull();
    vi.useRealTimers();
  });
});
