/**
 * Loading Skeleton Components
 * Beautiful loading states with cyber variants
 */

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
  variant?: 'default' | 'cyber';
}

export function Skeleton({ className, style, variant = 'default' }: SkeletonProps) {
  return (
    <div 
      className={cn(
        'h-4 w-full rounded',
        variant === 'default' && 'skeleton',
        variant === 'cyber' && 'cyber-skeleton',
        className
      )} 
      style={style} 
    />
  );
}

export function SkeletonCard({ className, variant = 'default' }: SkeletonProps) {
  return (
    <div className={cn('p-4 rounded-xl bg-card border border-border/20', className)}>
      <div className="space-y-3">
        <Skeleton className="h-3 w-1/3" variant={variant} />
        <Skeleton className="h-7 w-1/2" variant={variant} />
        <div className="flex gap-3 pt-1">
          <Skeleton className="h-3 w-16" variant={variant} />
          <Skeleton className="h-3 w-12" variant={variant} />
        </div>
      </div>
    </div>
  );
}

/** Page-level skeleton matching the Home command center layout */
export function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Skeleton className="h-8 w-36 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {[1, 2, 3, 4].map(i => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <Skeleton className="h-6 w-24" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <div className="lg:col-span-4 space-y-3">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, variant = 'default' }: { rows?: number; variant?: 'default' | 'cyber' }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 py-3 px-4 bg-muted/30 rounded-lg">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-4" style={{ width: `${15 + Math.random() * 15}%` }} variant={variant} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-4 px-4 border-b border-border/30" style={{ animationDelay: `${i * 0.05}s` }}>
          {[1, 2, 3, 4, 5].map(j => (
            <Skeleton key={j} className="h-4" style={{ width: `${10 + Math.random() * 20}%` }} variant={variant} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ className, variant = 'default' }: SkeletonProps) {
  return (
    <div className={cn('relative p-6 rounded-xl bg-card border border-border/50', className)}>
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/4" variant={variant} />
        <div className="h-48 flex items-end gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-t",
                variant === 'default' && "skeleton",
                variant === 'cyber' && "cyber-skeleton"
              )}
              style={{ height: `${30 + Math.random() * 70}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-8" variant={variant} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonStats({ variant = 'default' }: { variant?: 'default' | 'cyber' }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  );
}

export function LoadingSpinner({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div
      className={cn(
        'rounded-full border-primary/30 border-t-primary animate-spin',
        sizes[size],
        className
      )}
    />
  );
}

export function CyberSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("cyber-spinner", className)}>
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[hsl(185_100%_50%)] animate-spin" />
      <div className="absolute inset-1 rounded-full border-2 border-transparent border-r-[hsl(270_100%_65%)] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
      <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-[hsl(185_100%_50%/0.5)] animate-spin" style={{ animationDuration: '2s' }} />
    </div>
  );
}

export function LoadingDots() {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="h-2 w-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export function PageLoading({ variant = 'default' }: { variant?: 'default' | 'cyber' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      {variant === 'cyber' ? (
        <CyberSpinner />
      ) : (
        <LoadingSpinner size="lg" />
      )}
      <p className="text-muted-foreground animate-pulse">Loading...</p>
    </div>
  );
}
