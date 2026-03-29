import { Zap, Crown, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface UsageCounterProps {
  used: number;
  limit: number;
  className?: string;
  showUpgradeLink?: boolean;
  onUpgradeClick?: () => void;
}

export function UsageCounter({ 
  used, 
  limit, 
  className,
  showUpgradeLink = true,
  onUpgradeClick 
}: UsageCounterProps) {
  const remaining = Math.max(0, limit - used);
  const percentage = Math.min(100, (used / limit) * 100);
  
  const isLow = remaining <= 1 && remaining > 0;
  const isExhausted = remaining === 0;

  return (
    <motion.div 
      className={cn(
        'p-4 rounded-xl border backdrop-blur-sm transition-all duration-300',
        isExhausted 
          ? 'bg-destructive/10 border-destructive/30 shadow-sm shadow-destructive/10' 
          : isLow 
            ? 'bg-warning/10 border-warning/30 shadow-sm shadow-warning/10'
            : 'bg-muted/30 border-border/50 hover:border-primary/30',
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'h-8 w-8 rounded-lg flex items-center justify-center',
            isExhausted ? 'bg-destructive/15' : isLow ? 'bg-warning/15' : 'bg-primary/10'
          )}>
            {isExhausted ? (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            ) : (
              <Zap className={cn(
                'w-4 h-4',
                isLow ? 'text-warning' : 'text-primary'
              )} />
            )}
          </div>
          <div>
            <span className={cn(
              'text-sm font-medium block',
              isExhausted ? 'text-destructive' : isLow ? 'text-warning' : 'text-foreground'
            )}>
              {isExhausted 
                ? 'No generations left today' 
                : `${remaining} of ${limit} left`
              }
            </span>
            <span className="text-xs text-muted-foreground">
              Free daily generations
            </span>
          </div>
        </div>
        {showUpgradeLink && (
          <button
            onClick={onUpgradeClick}
            className="flex items-center gap-1.5 text-xs font-medium text-premium hover:text-premium-strong transition-colors px-3 py-1.5 rounded-full bg-premium/10 hover:bg-premium/15 border border-premium/20"
          >
            <Crown className="h-3 w-3" />
            Upgrade
          </button>
        )}
      </div>
      <div className="relative">
        <Progress 
          value={percentage} 
          className={cn(
            'h-2 bg-muted/50',
            isExhausted 
              ? '[&>div]:bg-gradient-to-r [&>div]:from-destructive [&>div]:to-red-400' 
              : isLow 
                ? '[&>div]:bg-gradient-to-r [&>div]:from-warning [&>div]:to-yellow-400'
                : '[&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-cyan-400'
          )} 
        />
        {/* Animated glow effect */}
        {!isExhausted && percentage > 0 && (
          <motion.div 
            className={cn(
              'absolute top-0 h-2 rounded-full opacity-50 blur-sm',
              isLow ? 'bg-warning' : 'bg-primary'
            )}
            style={{ width: `${percentage}%` }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>
    </motion.div>
  );
}
