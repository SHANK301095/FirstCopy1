/**
 * Premium Micro-interaction Components
 * Clean, subtle animations for professional UI polish
 */

import { forwardRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

// ===== HOVER CARD =====
interface HoverCardProps {
  children: ReactNode;
  className?: string;
  lift?: boolean;
  glow?: boolean;
  glowColor?: 'primary' | 'success' | 'danger';
}

export const HoverCard = forwardRef<HTMLDivElement, HoverCardProps>(
  ({ children, className, lift = true, glow = false, glowColor = 'primary' }, ref) => {
    const glowColors = {
      primary: 'hover:shadow-primary/10',
      success: 'hover:shadow-profit/10',
      danger: 'hover:shadow-loss/10',
    };

    return (
      <motion.div
        ref={ref}
        whileHover={lift ? { y: -2 } : undefined}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(
          'transition-all duration-200',
          lift && 'hover:shadow-lg',
          glow && glowColors[glowColor],
          className
        )}
      >
        {children}
      </motion.div>
    );
  }
);
HoverCard.displayName = 'HoverCard';

// ===== PULSE INDICATOR =====
interface PulseIndicatorProps {
  status: 'active' | 'warning' | 'error' | 'idle';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PulseIndicator({ status, size = 'md', className }: PulseIndicatorProps) {
  const colors = {
    active: 'bg-profit',
    warning: 'bg-warning',
    error: 'bg-loss',
    idle: 'bg-muted-foreground/50',
  };

  const sizes = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  return (
    <span className={cn('relative flex', className)}>
      {status !== 'idle' && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-50',
            colors[status]
          )}
        />
      )}
      <span className={cn('relative inline-flex rounded-full', sizes[size], colors[status])} />
    </span>
  );
}

// ===== PROGRESS RING =====
interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: ReactNode;
}

export function ProgressRing({
  progress,
  size = 56,
  strokeWidth = 3,
  className,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

// ===== PREMIUM BUTTON =====
interface GlowButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'success' | 'danger';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function GlowButton({
  children,
  variant = 'primary',
  className,
  onClick,
  disabled,
}: GlowButtonProps) {
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    success: 'bg-profit text-white hover:bg-profit/90',
    danger: 'bg-loss text-white hover:bg-loss/90',
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'px-6 py-2.5 rounded-xl font-medium transition-all duration-200',
        'shadow-sm hover:shadow-md',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className
      )}
    >
      {children}
    </motion.button>
  );
}

// ===== FADE IN =====
interface FadeInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function FadeIn({ children, delay = 0, className }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: delay / 1000,
        ease: [0.25, 0.1, 0.25, 1] 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ===== STAGGER CONTAINER =====
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
}

export function StaggerContainer({ children, className }: StaggerContainerProps) {
  return (
    <motion.div 
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.05 },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// ===== SUCCESS CHECKMARK =====
interface SuccessCheckmarkProps {
  show: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SuccessCheckmark({ show, size = 'md', className }: SuccessCheckmarkProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={cn(
            'rounded-full bg-profit/15 flex items-center justify-center',
            sizes[size],
            className
          )}
        >
          <Check className={cn('text-profit', iconSizes[size])} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ===== SHIMMER SKELETON =====
interface ShimmerProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export function Shimmer({ className, variant = 'rectangular' }: ShimmerProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted/50',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-lg',
        variant === 'text' && 'rounded h-4 w-24',
        className
      )}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

// ===== NUMBER COUNTER =====
interface CounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function Counter({ 
  value, 
  duration = 1000, 
  className,
  prefix = '',
  suffix = ''
}: CounterProps) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {prefix}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: duration / 1000 }}
      >
        {value.toLocaleString()}
      </motion.span>
      {suffix}
    </motion.span>
  );
}
