/**
 * Unified Loading Skeleton System
 * Finance-grade, consistent skeleton patterns across all pages
 */

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

/* ===== BASE SKELETON COMPONENTS ===== */

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  shimmer?: boolean;
}

export function Skeleton({ className, shimmer = true, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-muted/60 rounded",
        shimmer && [
          "relative overflow-hidden",
          "before:absolute before:inset-0",
          "before:-translate-x-full before:animate-shimmer",
          "before:bg-gradient-to-r",
          "before:from-transparent before:via-muted-foreground/15 before:to-transparent",
          "before:will-change-transform"
        ],
        className
      )}
      style={style}
      {...props}
    />
  );
}

// Skeleton variants for common UI elements
export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 && lines > 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonButton({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const sizes = { sm: 'h-8 w-20', default: 'h-10 w-28', lg: 'h-12 w-36' };
  return <Skeleton className={cn("rounded-md", sizes[size])} />;
}

export function SkeletonAvatar({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const sizes = { sm: 'h-8 w-8', default: 'h-10 w-10', lg: 'h-14 w-14' };
  return <Skeleton className={cn("rounded-full shrink-0", sizes[size])} />;
}

export function SkeletonBadge({ width = 16 }: { width?: number }) {
  return <Skeleton className={cn("h-5 rounded-full")} style={{ width: `${width * 4}px` }} />;
}

export function SkeletonIcon({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const sizes = { sm: 'h-4 w-4', default: 'h-5 w-5', lg: 'h-8 w-8' };
  return <Skeleton className={cn("rounded", sizes[size])} />;
}

export function SkeletonInput({ fullWidth = true }: { fullWidth?: boolean }) {
  return <Skeleton className={cn("h-10 rounded-md", fullWidth ? "w-full" : "w-48")} />;
}

export function SkeletonChart({ height = 200 }: { height?: number }) {
  return <Skeleton className="w-full rounded-lg" style={{ height }} />;
}

/* ===== CARD SKELETONS ===== */

interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
  variant?: 'default' | 'stat' | 'list-item';
}

export function SkeletonCard({ children, className, variant = 'default', style, ...props }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card/50 animate-fade-in",
        variant === 'stat' && "p-4",
        variant === 'list-item' && "p-3",
        variant === 'default' && "p-5",
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

// Stat card skeleton - common across dashboard, analytics
export function StatCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <SkeletonCard
      variant="stat"
      className="animate-fade-in"
      style={{ animationDelay: `${delay}ms` } as React.CSSProperties}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </SkeletonCard>
  );
}

// List item skeleton - for tables, lists
export function ListItemSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex items-center gap-3 p-3 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Skeleton className="h-9 w-9 rounded-lg" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 5, delay = 0 }: { columns?: number; delay?: number }) {
  return (
    <tr className="animate-fade-in" style={{ animationDelay: `${delay}ms` }}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={cn("h-4", i === 0 ? "w-32" : i === columns - 1 ? "w-16" : "w-20")} />
        </td>
      ))}
    </tr>
  );
}

/* ===== PAGE-SPECIFIC SKELETONS ===== */

// Dashboard skeleton - matches stat cards + activity layout
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <SkeletonButton size="sm" />
          <SkeletonButton />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <StatCardSkeleton key={i} delay={i * 50} />
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonCard>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-4 w-28" />
            <SkeletonBadge width={14} />
          </div>
          <div className="space-y-1">
            {[...Array(5)].map((_, i) => (
              <ListItemSkeleton key={i} delay={i * 40} />
            ))}
          </div>
        </SkeletonCard>

        <SkeletonCard>
          <Skeleton className="h-4 w-28 mb-4" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 px-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <SkeletonIcon size="sm" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}

// Strategy Library skeleton
export function StrategySkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <SkeletonButton />
      </div>

      {/* Grid layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Strategy list sidebar */}
        <SkeletonCard className="lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <SkeletonIcon size="sm" />
            <SkeletonInput />
          </div>
          <div className="flex gap-1 mb-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonBadge key={i} width={16} />
            ))}
          </div>
          <div className="space-y-1">
            {[...Array(8)].map((_, i) => (
              <ListItemSkeleton key={i} delay={i * 30} />
            ))}
          </div>
        </SkeletonCard>

        {/* Detail panel */}
        <SkeletonCard className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SkeletonIcon />
              <Skeleton className="h-6 w-40" />
            </div>
            <div className="flex gap-2">
              <SkeletonButton size="sm" />
              <SkeletonButton size="sm" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
          <Skeleton className="h-4 w-3/4 mb-4" />
          <div className="flex gap-2 mb-6">
            {[...Array(3)].map((_, i) => (
              <SkeletonBadge key={i} width={20} />
            ))}
          </div>
          <SkeletonChart height={320} />
        </SkeletonCard>
      </div>
    </div>
  );
}

// Data Manager skeleton
export function DataManagerSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex gap-2">
          <SkeletonButton />
          <SkeletonButton size="sm" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>

      {/* Grid layout */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Folder sidebar */}
        <SkeletonCard className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
          <div className="space-y-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg">
                <SkeletonIcon size="sm" />
                <Skeleton className="h-4 flex-1" />
                <SkeletonBadge width={8} />
              </div>
            ))}
          </div>
        </SkeletonCard>

        {/* Dataset list */}
        <div className="lg:col-span-3 space-y-4">
          {/* Upload zone */}
          <div className="border-2 border-dashed border-border/50 rounded-xl p-8">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>

          {/* Dataset cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-5 w-32" />
                  <SkeletonBadge width={16} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Skeleton className="h-8 flex-1 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </SkeletonCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Analytics skeleton
export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <SkeletonButton />
          <SkeletonButton size="sm" />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <StatCardSkeleton key={i} delay={i * 50} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonCard className="p-6">
          <Skeleton className="h-5 w-32 mb-4" />
          <SkeletonChart height={256} />
        </SkeletonCard>
        <SkeletonCard className="p-6">
          <Skeleton className="h-5 w-28 mb-4" />
          <SkeletonChart height={256} />
        </SkeletonCard>
      </div>
    </div>
  );
}

// Workflow skeleton
export function WorkflowSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
        <SkeletonButton />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/50 pb-px">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-t-lg" />
        ))}
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonCard className="space-y-4 p-6">
          <Skeleton className="h-5 w-28" />
          <SkeletonInput />
          <SkeletonInput />
          <SkeletonInput />
        </SkeletonCard>
        <SkeletonCard className="p-6">
          <Skeleton className="h-5 w-24 mb-4" />
          <SkeletonChart height={192} />
        </SkeletonCard>
      </div>
    </div>
  );
}

// Marketplace skeleton
export function MarketplaceSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
        <SkeletonButton />
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard
            key={i}
            className="overflow-hidden p-0"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <Skeleton className="h-40 w-full rounded-none" />
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <SkeletonBadge width={12} />
              </div>
              <SkeletonText lines={2} />
              <div className="flex gap-2 pt-2">
                <SkeletonBadge width={16} />
                <SkeletonBadge width={20} />
              </div>
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-4 w-16" />
                <SkeletonButton size="sm" />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-muted/30 px-4 py-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className={cn("h-4", i === 0 ? "w-32" : "w-20")} />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-border/50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex gap-4" style={{ animationDelay: `${i * 30}ms` }}>
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton
                key={j}
                className={cn("h-4", j === 0 ? "w-32" : j === columns - 1 ? "w-16" : "w-20")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Generic page skeleton for other pages
export function GenericPageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard key={i} className="space-y-4" style={{ animationDelay: `${i * 50}ms` }}>
            <Skeleton className="h-5 w-28" />
            <SkeletonText lines={2} />
            <SkeletonButton />
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

// Results/Saved Results skeleton
export function ResultsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <SkeletonInput fullWidth={false} />
          <SkeletonButton size="sm" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <SkeletonBadge key={i} width={18} />
        ))}
      </div>

      {/* Table */}
      <TableSkeleton rows={10} columns={6} />
    </div>
  );
}

// Backtest skeleton
export function BacktestSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <SkeletonButton size="lg" />
      </div>

      {/* Config panels */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SkeletonCard className="lg:col-span-2 space-y-4">
          <Skeleton className="h-5 w-28" />
          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonInput />
            <SkeletonInput />
            <SkeletonInput />
            <SkeletonInput />
          </div>
        </SkeletonCard>

        <SkeletonCard className="space-y-4">
          <Skeleton className="h-5 w-24" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>

      {/* Chart placeholder */}
      <SkeletonCard className="p-6">
        <Skeleton className="h-5 w-32 mb-4" />
        <SkeletonChart height={300} />
      </SkeletonCard>
    </div>
  );
}
