/**
 * Mobile Gesture Provider - Unified gesture handling for mobile navigation
 * Features: Swipe back, edge swipe to open sidebar, haptic feedback
 */

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { SwipeBackIndicator } from './SwipeBackIndicator';
import { useIsMobile } from '@/hooks/use-mobile';
import { triggerHaptic } from '@/hooks/useTouchGestures';

interface MobileGestureContextValue {
  isSwipingBack: boolean;
  swipeProgress: number;
}

const MobileGestureContext = createContext<MobileGestureContextValue>({
  isSwipingBack: false,
  swipeProgress: 0,
});

export const useMobileGestures = () => useContext(MobileGestureContext);

interface MobileGestureProviderProps {
  children: ReactNode;
  disableSwipeBack?: boolean;
}

export function MobileGestureProvider({ 
  children, 
  disableSwipeBack = false 
}: MobileGestureProviderProps) {
  const isMobile = useIsMobile();
  
  const { 
    swipeDistance, 
    isSwipingBack, 
    progress, 
    canGoBack 
  } = useSwipeNavigation({
    threshold: 100,
    edgeWidth: 25,
    disabled: disableSwipeBack || !isMobile,
  });

  // Haptic feedback when threshold is reached
  useEffect(() => {
    if (progress >= 1 && isSwipingBack) {
      triggerHaptic('medium');
    }
  }, [progress >= 1, isSwipingBack]);

  // Don't render gesture UI on desktop
  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <MobileGestureContext.Provider value={{ isSwipingBack, swipeProgress: progress }}>
      {children}
      
      {/* Swipe back indicator */}
      {canGoBack && (
        <SwipeBackIndicator 
          isActive={isSwipingBack} 
          progress={progress} 
          distance={swipeDistance}
        />
      )}
      
      {/* Screen overlay during swipe */}
      {isSwipingBack && swipeDistance > 20 && (
        <div 
          className="fixed inset-0 z-[99] pointer-events-none bg-black/5"
          style={{
            opacity: Math.min(progress * 0.5, 0.3),
            transition: isSwipingBack ? 'none' : 'opacity 0.2s ease-out',
          }}
        />
      )}
    </MobileGestureContext.Provider>
  );
}
