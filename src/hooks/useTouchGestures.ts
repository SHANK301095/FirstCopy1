import { useRef, useCallback, useEffect } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
}

export function useSwipeGesture(
  handlers: SwipeHandlers,
  options: { threshold?: number; velocityThreshold?: number } = {}
) {
  const { threshold = 50, velocityThreshold = 0.3 } = options;
  const touchRef = useRef<TouchState | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchRef.current.startX;
    const deltaY = touch.clientY - touchRef.current.startY;
    const deltaTime = Date.now() - touchRef.current.startTime;
    const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (velocity >= velocityThreshold || absX > threshold || absY > threshold) {
      if (absX > absY) {
        // Horizontal swipe
        if (deltaX > 0 && handlers.onSwipeRight) {
          handlers.onSwipeRight();
        } else if (deltaX < 0 && handlers.onSwipeLeft) {
          handlers.onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && handlers.onSwipeDown) {
          handlers.onSwipeDown();
        } else if (deltaY < 0 && handlers.onSwipeUp) {
          handlers.onSwipeUp();
        }
      }
    }

    touchRef.current = null;
  }, [handlers, threshold, velocityThreshold]);

  return { handleTouchStart, handleTouchEnd };
}

export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  options: { threshold?: number; resistance?: number } = {}
) {
  const { threshold = 80, resistance = 2.5 } = options;
  const pullRef = useRef<{
    startY: number;
    pulling: boolean;
    distance: number;
  }>({ startY: 0, pulling: false, distance: 0 });
  const refreshingRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0 && !refreshingRef.current) {
      pullRef.current = {
        startY: e.touches[0].clientY,
        pulling: true,
        distance: 0,
      };
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pullRef.current.pulling) return;

    const deltaY = e.touches[0].clientY - pullRef.current.startY;
    if (deltaY > 0) {
      pullRef.current.distance = deltaY / resistance;
    }
  }, [resistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!pullRef.current.pulling) return;

    if (pullRef.current.distance >= threshold && !refreshingRef.current) {
      refreshingRef.current = true;
      try {
        await onRefresh();
      } finally {
        refreshingRef.current = false;
      }
    }

    pullRef.current = { startY: 0, pulling: false, distance: 0 };
  }, [onRefresh, threshold]);

  return { handleTouchStart, handleTouchMove, handleTouchEnd, pullRef };
}

// Haptic feedback utility (uses Vibration API when available)
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
    };
    navigator.vibrate(patterns[type]);
  }
}

// Touch ripple effect hook
export function useTouchRipple() {
  const createRipple = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const ripple = document.createElement('span');
    ripple.className = 'touch-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    target.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  }, []);

  return { createRipple };
}

// Reduced motion preference hook
export function useReducedMotion() {
  const mediaQuery = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)') 
    : null;
  
  return mediaQuery?.matches ?? false;
}
