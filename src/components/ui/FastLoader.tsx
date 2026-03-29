/**
 * Fast Loading Components
 * Lightweight, performant loading states - no heavy animations
 */

import { cn } from '@/lib/utils';

interface FastLoaderProps {
  className?: string;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Ultra-fast minimal loader - just spinning dots
export function FastLoader({ className, text, size = 'md' }: FastLoaderProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className={cn('relative', sizeClasses[size])}>
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      </div>
      {text && (
        <p className="text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  );
}

// Simple skeleton pulse for content areas
export function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-muted/50 rounded', className)} />
  );
}

// Page skeleton - fast render
export function PageSkeleton() {
  return (
    <div className="space-y-4 p-6 animate-in fade-in duration-150">
      <SkeletonPulse className="h-8 w-48" />
      <SkeletonPulse className="h-4 w-72" />
      <div className="grid gap-4 md:grid-cols-3 mt-6">
        <SkeletonPulse className="h-32" />
        <SkeletonPulse className="h-32" />
        <SkeletonPulse className="h-32" />
      </div>
      <SkeletonPulse className="h-64 mt-4" />
    </div>
  );
}

// Dashboard skeleton - fast render
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <SkeletonPulse className="h-8 w-40 mb-2" />
          <SkeletonPulse className="h-4 w-64" />
        </div>
        <SkeletonPulse className="h-10 w-32" />
      </div>
      
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg border bg-card">
            <SkeletonPulse className="h-4 w-20 mb-2" />
            <SkeletonPulse className="h-8 w-32" />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="rounded-lg border bg-card p-4">
        <SkeletonPulse className="h-6 w-32 mb-4" />
        <SkeletonPulse className="h-48" />
      </div>
    </div>
  );
}

// Inline loader for buttons/actions
export function InlineLoader({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex gap-1', className)}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </span>
  );
}

// Card skeleton
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card p-4 space-y-3', className)}>
      <SkeletonPulse className="h-5 w-1/3" />
      <SkeletonPulse className="h-4 w-full" />
      <SkeletonPulse className="h-4 w-2/3" />
    </div>
  );
}
