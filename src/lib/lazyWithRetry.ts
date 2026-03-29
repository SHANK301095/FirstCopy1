/**
 * Lazy import wrapper with chunk-load error recovery.
 * On failure: retry once with cache-bust, then force full page reload.
 */
import { lazy, type ComponentType } from 'react';

const RETRY_KEY = 'chunk_retry';

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch((error: Error) => {
      const hasRetried = sessionStorage.getItem(RETRY_KEY);

      if (!hasRetried) {
        // First failure: mark retry, bust cache, reload
        sessionStorage.setItem(RETRY_KEY, '1');
        console.warn('[lazyWithRetry] Chunk load failed, reloading...', error.message);
        window.location.reload();
        // Return a never-resolving promise so React doesn't render stale
        return new Promise<{ default: T }>(() => {});
      }

      // Already retried once — clear flag and re-throw so ErrorBoundary catches it
      sessionStorage.removeItem(RETRY_KEY);
      throw error;
    })
  );
}

// Clear retry flag on successful page loads
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    sessionStorage.removeItem(RETRY_KEY);
  });
}
