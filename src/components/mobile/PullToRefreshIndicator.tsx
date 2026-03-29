/**
 * Pull to Refresh Indicator - Premium Mobile Experience with spring physics
 */

import { RefreshCw, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  isRefreshing: boolean;
  progress: number;
  pullDistance: number;
  className?: string;
}

export function PullToRefreshIndicator({
  isPulling,
  isRefreshing,
  progress,
  pullDistance,
  className,
}: PullToRefreshIndicatorProps) {
  const isVisible = isPulling || isRefreshing || pullDistance > 0;
  const isTriggered = progress >= 1;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ 
            opacity: Math.min(progress * 1.5, 1),
            y: 0,
          }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={cn(
            "absolute left-0 right-0 top-0 flex items-center justify-center pointer-events-none z-50",
            className
          )}
          style={{
            height: isRefreshing ? 64 : Math.max(pullDistance, 0),
          }}
        >
          <motion.div 
            animate={{
              scale: 0.6 + progress * 0.4,
              backgroundColor: isTriggered 
                ? 'hsl(var(--primary) / 0.2)' 
                : 'hsl(var(--primary) / 0.1)',
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-full",
              "backdrop-blur-md border shadow-lg",
              isTriggered 
                ? "border-primary/40 shadow-primary/20" 
                : "border-primary/20 shadow-primary/10"
            )}
          >
            {isRefreshing ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <RefreshCw className="h-4 w-4 text-primary" />
                </motion.div>
                <span className="text-xs font-medium text-primary">Refreshing...</span>
              </>
            ) : (
              <>
                <motion.div
                  animate={{ 
                    rotate: progress * 180,
                    scale: isTriggered ? 1.2 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <ArrowDown className={cn(
                    "h-4 w-4 transition-colors duration-150",
                    isTriggered ? "text-primary" : "text-primary/70"
                  )} />
                </motion.div>
                <span className={cn(
                  "text-xs font-medium transition-colors duration-150",
                  isTriggered ? "text-primary" : "text-primary/70"
                )}>
                  {isTriggered ? 'Release to refresh' : 'Pull to refresh'}
                </span>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
