/**
 * Pull Down to Open Sidebar Hook - Mobile gesture
 */

import { useCallback, useRef, useState, useEffect } from 'react';

interface UsePullToOpenSidebarOptions {
  threshold?: number;
  disabled?: boolean;
  onOpen: () => void;
}

export function usePullToOpenSidebar({
  threshold = 80,
  disabled = false,
  onOpen,
}: UsePullToOpenSidebarOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const startX = useRef(0);
  const isValidPull = useRef(false);
  const startTime = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return;
    
    const touch = e.touches[0];
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    
    // Only trigger when at the top of the page
    if (scrollTop > 10) return;
    
    // Don't trigger if starting from very edge (that's for swipe back)
    if (touch.clientX < 30) return;
    
    startY.current = touch.clientY;
    startX.current = touch.clientX;
    startTime.current = Date.now();
    isValidPull.current = true;
  }, [disabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isValidPull.current || disabled) return;
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - startY.current;
    const deltaX = Math.abs(touch.clientX - startX.current);
    
    // Cancel if horizontal swipe is dominant (user is swiping, not pulling)
    if (deltaX > Math.abs(deltaY) && deltaX > 30) {
      isValidPull.current = false;
      setIsPulling(false);
      setPullDistance(0);
      return;
    }
    
    // Only track downward pulls
    if (deltaY > 10) {
      setIsPulling(true);
      // Apply resistance for natural feel
      const resistedDistance = deltaY * 0.5;
      setPullDistance(Math.min(resistedDistance, threshold * 1.5));
      
      // Prevent scroll while pulling
      if (resistedDistance > 20) {
        e.preventDefault();
      }
    }
  }, [disabled, threshold]);

  const handleTouchEnd = useCallback(() => {
    if (!isValidPull.current || disabled) return;
    
    const elapsed = Date.now() - startTime.current;
    
    // Open sidebar if pulled past threshold or quick flick gesture
    if (pullDistance >= threshold || (pullDistance > 40 && elapsed < 300)) {
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
      onOpen();
    }
    
    setPullDistance(0);
    setIsPulling(false);
    isValidPull.current = false;
  }, [disabled, pullDistance, threshold, onOpen]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);

  return {
    pullDistance,
    isPulling,
    progress,
  };
}
