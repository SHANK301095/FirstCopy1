/**
 * Pull to Refresh Hook - Enhanced Mobile Experience
 */

import { useState, useCallback, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
  resistance?: number;
}

interface UsePullToRefreshReturn {
  containerProps: {
    ref: (element: HTMLElement | null) => void;
    style: React.CSSProperties;
  };
  indicatorProps: {
    isPulling: boolean;
    isRefreshing: boolean;
    progress: number;
    pullDistance: number;
  };
  isRefreshing: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
  resistance = 0.4,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const elementRef = useRef<HTMLElement | null>(null);
  const isAtTop = useRef(true);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const element = elementRef.current;
    if (!element) return;
    
    // Check if we're at the top of the scroll container
    isAtTop.current = element.scrollTop <= 0;
    if (!isAtTop.current) return;
    
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || disabled || isRefreshing || !isAtTop.current) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      // Apply resistance for natural feel
      const resistedDistance = diff * resistance;
      setPullDistance(Math.min(resistedDistance, threshold * 1.5));
      
      // Prevent scroll while pulling
      if (resistedDistance > 10) {
        e.preventDefault();
      }
    }
  }, [isPulling, disabled, isRefreshing, resistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
      try {
        await onRefresh();
      } catch (error) {
        // Use secure logger instead of console
        import('@/lib/secureLogger').then(({ secureLogger }) => {
          secureLogger.error('ui', 'Pull-to-refresh failed', { error: String(error) });
        });
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
  }, [isPulling, pullDistance, threshold, onRefresh, disabled]);

  const bindRef = useCallback((element: HTMLElement | null) => {
    // Cleanup old listeners
    if (elementRef.current) {
      elementRef.current.removeEventListener('touchstart', handleTouchStart);
      elementRef.current.removeEventListener('touchmove', handleTouchMove as EventListener);
      elementRef.current.removeEventListener('touchend', handleTouchEnd);
    }
    
    elementRef.current = element;
    
    // Add new listeners
    if (element) {
      element.addEventListener('touchstart', handleTouchStart, { passive: true });
      element.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
      element.addEventListener('touchend', handleTouchEnd);
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);

  return {
    containerProps: {
      ref: bindRef,
      style: {
        transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
        transition: isPulling ? 'none' : 'transform 0.2s ease-out',
      },
    },
    indicatorProps: {
      isPulling,
      isRefreshing,
      progress,
      pullDistance,
    },
    isRefreshing,
  };
}
