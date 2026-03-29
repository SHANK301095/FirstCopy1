/**
 * Pull to Refresh Container - Wraps content with pull-to-refresh functionality
 */

import React from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';
import { cn } from '@/lib/utils';

interface PullToRefreshContainerProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  threshold?: number;
}

export function PullToRefreshContainer({
  onRefresh,
  children,
  className,
  disabled = false,
  threshold = 80,
}: PullToRefreshContainerProps) {
  const { containerProps, indicatorProps, isRefreshing } = usePullToRefresh({
    onRefresh,
    disabled,
    threshold,
  });

  return (
    <div className="relative overflow-hidden">
      <PullToRefreshIndicator {...indicatorProps} />
      <div
        ref={containerProps.ref as React.Ref<HTMLDivElement>}
        style={containerProps.style}
        className={cn(
          "min-h-full overflow-y-auto overscroll-y-contain",
          isRefreshing && "pointer-events-none",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
