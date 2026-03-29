/**
 * Phase 9: Mobile UX Utilities
 * Pull threshold, iOS swipe fix, offline debounce, swipe velocity, haptics
 */

/** Haptic feedback via Vibration API */
export function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  if (!('vibrate' in navigator)) return;
  const durations = { light: 10, medium: 25, heavy: 50 };
  try { navigator.vibrate(durations[style]); } catch { /* unsupported */ }
}

/** Disable iOS back-swipe on specific element */
export function disableIOSSwipeBack(el: HTMLElement | null): () => void {
  if (!el) return () => {};
  const handler = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (touch && touch.clientX < 30) {
      e.preventDefault();
    }
  };
  el.addEventListener('touchstart', handler, { passive: false });
  return () => el.removeEventListener('touchstart', handler);
}

/** Configurable pull-to-refresh threshold */
export interface PullToRefreshConfig {
  threshold: number;    // px to trigger (default 80)
  resistance: number;   // drag resistance (0-1, default 0.4)
  onRefresh: () => Promise<void>;
}

export function setupPullToRefresh(el: HTMLElement, config: PullToRefreshConfig): () => void {
  const { threshold = 80, resistance = 0.4, onRefresh } = config;
  let startY = 0;
  let pulling = false;
  
  const onTouchStart = (e: TouchEvent) => {
    if (el.scrollTop <= 0) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  };
  
  const onTouchMove = (e: TouchEvent) => {
    if (!pulling) return;
    const dy = (e.touches[0].clientY - startY) * resistance;
    if (dy > 0 && dy < threshold * 2) {
      el.style.transform = `translateY(${dy}px)`;
    }
  };
  
  const onTouchEnd = async () => {
    if (!pulling) return;
    pulling = false;
    const current = parseFloat(el.style.transform.replace(/[^\d.-]/g, '') || '0');
    el.style.transition = 'transform 0.3s ease';
    el.style.transform = 'translateY(0)';
    setTimeout(() => { el.style.transition = ''; }, 300);
    
    if (current >= threshold) {
      await onRefresh();
    }
  };

  el.addEventListener('touchstart', onTouchStart, { passive: true });
  el.addEventListener('touchmove', onTouchMove, { passive: true });
  el.addEventListener('touchend', onTouchEnd);
  
  return () => {
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchmove', onTouchMove);
    el.removeEventListener('touchend', onTouchEnd);
  };
}

/** Swipe velocity detector */
export interface SwipeEvent {
  direction: 'left' | 'right' | 'up' | 'down';
  velocity: number; // px/ms
  distance: number;
}

export function detectSwipe(
  el: HTMLElement,
  callback: (e: SwipeEvent) => void,
  options: { minDistance?: number; minVelocity?: number } = {}
): () => void {
  const { minDistance = 50, minVelocity = 0.3 } = options;
  let startX = 0, startY = 0, startTime = 0;

  const onStart = (e: TouchEvent) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTime = Date.now();
  };

  const onEnd = (e: TouchEvent) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    const dt = Date.now() - startTime;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const distance = Math.max(absDx, absDy);
    const velocity = distance / dt;

    if (distance < minDistance || velocity < minVelocity) return;

    const direction: SwipeEvent['direction'] = 
      absDx > absDy 
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up');

    callback({ direction, velocity, distance });
  };

  el.addEventListener('touchstart', onStart, { passive: true });
  el.addEventListener('touchend', onEnd, { passive: true });
  return () => {
    el.removeEventListener('touchstart', onStart);
    el.removeEventListener('touchend', onEnd);
  };
}

/** Offline-aware debounce — skips network calls when offline */
export function offlineDebounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
  requireOnline = true
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (requireOnline && !navigator.onLine) return;
      fn(...args);
    }, delay);
  };
}
