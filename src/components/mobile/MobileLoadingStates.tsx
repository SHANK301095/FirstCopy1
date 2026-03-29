import { ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useTouchGestures';

interface MobileSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
}

export function MobileSkeleton({ className, variant = 'rectangular' }: MobileSkeletonProps) {
  const reducedMotion = useReducedMotion();
  
  const variantStyles = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full aspect-square',
    rectangular: 'rounded-lg',
    card: 'h-24 w-full rounded-2xl',
  };

  return (
    <div 
      className={cn(
        'bg-muted/60',
        variantStyles[variant],
        !reducedMotion && 'animate-pulse',
        className
      )}
    />
  );
}

interface MobileSkeletonCardProps {
  lines?: number;
  showAvatar?: boolean;
  className?: string;
}

export function MobileSkeletonCard({ lines = 2, showAvatar = false, className }: MobileSkeletonCardProps) {
  return (
    <div className={cn('p-4 rounded-2xl bg-card/60 border border-border/40 space-y-3', className)}>
      {showAvatar && (
        <div className="flex items-center gap-3">
          <MobileSkeleton variant="circular" className="w-10 h-10" />
          <div className="flex-1 space-y-2">
            <MobileSkeleton variant="text" className="w-1/2" />
            <MobileSkeleton variant="text" className="w-1/3 h-3" />
          </div>
        </div>
      )}
      {!showAvatar && Array.from({ length: lines }).map((_, i) => (
        <MobileSkeleton 
          key={i} 
          variant="text" 
          className={cn(
            i === 0 ? 'w-3/4' : 'w-full',
            i === lines - 1 && 'w-1/2'
          )} 
        />
      ))}
    </div>
  );
}

interface MobileLoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MobileLoadingSpinner({ size = 'md', className }: MobileLoadingSpinnerProps) {
  const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={cn('relative', sizeStyles[size], className)}>
      <div className="absolute inset-0 rounded-full border-2 border-muted" />
      <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

interface MobileEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function MobileEmptyState({ icon, title, description, action, className }: MobileEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface MobilePullIndicatorProps {
  progress: number;
  isRefreshing: boolean;
}

export function MobilePullIndicator({ progress, isRefreshing }: MobilePullIndicatorProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(progress > 0 || isRefreshing);
  }, [progress, isRefreshing]);

  if (!visible && !isRefreshing) return null;

  return (
    <div 
      className={cn(
        'fixed top-16 left-1/2 -translate-x-1/2 z-50',
        'w-10 h-10 rounded-full bg-card border border-border/50 shadow-lg',
        'flex items-center justify-center',
        'transition-all duration-200 ease-out',
        progress > 0 ? 'opacity-100' : 'opacity-0 -translate-y-4'
      )}
      style={{ transform: `translateX(-50%) translateY(${Math.min(progress * 0.5, 20)}px)` }}
    >
      {isRefreshing ? (
        <MobileLoadingSpinner size="sm" />
      ) : (
        <div 
          className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent transition-transform"
          style={{ transform: `rotate(${progress * 3.6}deg)` }}
        />
      )}
    </div>
  );
}

interface MobileToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  visible: boolean;
}

export function MobileToast({ message, type = 'info', visible }: MobileToastProps) {
  const typeStyles = {
    success: 'bg-success text-success-foreground',
    error: 'bg-destructive text-destructive-foreground',
    info: 'bg-card text-foreground border border-border/50',
  };

  return (
    <div 
      className={cn(
        'fixed bottom-24 left-1/2 -translate-x-1/2 z-50',
        'px-4 py-2.5 rounded-full shadow-lg',
        'transition-all duration-300 ease-out',
        typeStyles[type],
        visible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4 pointer-events-none'
      )}
    >
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
