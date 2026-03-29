/**
 * Swipe Navigation Hook - Mobile back gesture
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface UseSwipeNavigationOptions {
  threshold?: number;
  edgeWidth?: number;
  disabled?: boolean;
}

export function useSwipeNavigation({
  threshold = 100,
  edgeWidth = 30,
  disabled = false,
}: UseSwipeNavigationOptions = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isSwipingBack, setIsSwipingBack] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isValidSwipe = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return;
    
    const touch = e.touches[0];
    // Only trigger from left edge
    if (touch.clientX > edgeWidth) return;
    
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    isValidSwipe.current = true;
    setIsSwipingBack(true);
  }, [disabled, edgeWidth]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isValidSwipe.current || disabled) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX.current;
    const deltaY = Math.abs(touch.clientY - startY.current);
    
    // Cancel if vertical swipe is dominant
    if (deltaY > Math.abs(deltaX) && deltaY > 20) {
      isValidSwipe.current = false;
      setIsSwipingBack(false);
      setSwipeDistance(0);
      return;
    }
    
    // Only track rightward swipes
    if (deltaX > 0) {
      setSwipeDistance(Math.min(deltaX, threshold * 1.5));
      
      // Prevent scroll while swiping
      if (deltaX > 20) {
        e.preventDefault();
      }
    }
  }, [disabled, threshold]);

  const handleTouchEnd = useCallback(() => {
    if (!isValidSwipe.current || disabled) return;
    
    if (swipeDistance >= threshold) {
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
      // Navigate back
      navigate(-1);
    }
    
    setSwipeDistance(0);
    setIsSwipingBack(false);
    isValidSwipe.current = false;
  }, [disabled, swipeDistance, threshold, navigate]);

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

  // Reset on route change
  useEffect(() => {
    setSwipeDistance(0);
    setIsSwipingBack(false);
  }, [location.pathname]);

  const progress = Math.min(swipeDistance / threshold, 1);
  const canGoBack = window.history.length > 1;

  return {
    swipeDistance,
    isSwipingBack: isSwipingBack && canGoBack,
    progress,
    canGoBack,
  };
}
