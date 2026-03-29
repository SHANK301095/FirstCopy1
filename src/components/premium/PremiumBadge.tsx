import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PremiumBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  animate?: boolean;
}

export function PremiumBadge({ className, size = 'md', showText = true, animate = false }: PremiumBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3.5 py-1.5 text-sm',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-bold tracking-wide uppercase',
        'bg-gradient-to-r from-premium via-premium-strong to-orange-500 text-white',
        'shadow-md shadow-premium/30',
        'border border-premium/20',
        sizeClasses[size],
        className
      )}
    >
      <Crown className={cn(iconSizes[size], 'drop-shadow-sm')} />
      {showText && <span>PRO</span>}
    </span>
  );

  if (animate) {
    return (
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        {badge}
      </motion.span>
    );
  }

  return badge;
}
