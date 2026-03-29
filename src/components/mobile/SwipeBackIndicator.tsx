/**
 * Swipe Back Indicator - Premium visual feedback during back swipe gesture
 */

import { ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SwipeBackIndicatorProps {
  isActive: boolean;
  progress: number;
  distance: number;
}

export function SwipeBackIndicator({ isActive, progress, distance }: SwipeBackIndicatorProps) {
  const showIndicator = isActive && distance > 10;
  const isTriggered = progress >= 1;

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ 
            opacity: Math.min(progress * 1.5, 1), 
            x: Math.min(distance * 0.4, 20) - 10,
          }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-[100] pointer-events-none"
        >
          <motion.div
            animate={{
              scale: 0.6 + progress * 0.4,
              backgroundColor: isTriggered 
                ? 'hsl(var(--primary))' 
                : 'hsl(var(--primary) / 0.15)',
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full",
              "backdrop-blur-md border shadow-xl",
              isTriggered 
                ? "border-primary/50 shadow-primary/30" 
                : "border-primary/20 shadow-primary/10"
            )}
          >
            <motion.div
              animate={{ 
                x: isTriggered ? -3 : 0,
                scale: isTriggered ? 1.1 : 1,
              }}
              transition={{ type: 'spring', stiffness: 600, damping: 20 }}
            >
              <ChevronLeft
                className={cn(
                  "h-6 w-6 transition-colors duration-150",
                  isTriggered ? "text-primary-foreground" : "text-primary"
                )}
              />
            </motion.div>
          </motion.div>
          
          {/* Ripple effect when triggered */}
          {isTriggered && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0.6 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full bg-primary/30"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
