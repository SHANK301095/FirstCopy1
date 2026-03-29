/**
 * Phase 5: Accessibility utilities
 * Keyboard navigation, focus trapping, ARIA helpers
 */

/**
 * Announce a message to screen readers via live region
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', priority);
  el.setAttribute('aria-atomic', 'true');
  el.className = 'sr-only';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

/**
 * Trap focus within a container (for modals, drawers)
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];
  return Array.from(container.querySelectorAll<HTMLElement>(selectors.join(',')));
}

/**
 * Generate a unique id for ARIA associations
 */
let idCounter = 0;
export function generateAriaId(prefix = 'mmc'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Reduce motion check — respects prefers-reduced-motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
