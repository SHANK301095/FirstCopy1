import { ReactNode, memo } from 'react';
import { useLazyLoad } from '@/hooks/useLazyLoad';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LazyComponentProps {
  children: ReactNode;
  height?: number | string;
  className?: string;
  placeholder?: ReactNode;
  rootMargin?: string;
}

export const LazyComponent = memo(function LazyComponent({
  children,
  height = 200,
  className,
  placeholder,
  rootMargin = '150px',
}: LazyComponentProps) {
  const { ref, isVisible } = useLazyLoad<HTMLDivElement>({
    rootMargin,
    triggerOnce: true,
  });

  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      ref={ref}
      className={cn('w-full', className)}
      style={{ minHeight: isVisible ? undefined : heightStyle }}
    >
      {isVisible ? (
        children
      ) : (
        placeholder || (
          <Skeleton 
            className="w-full animate-pulse" 
            style={{ height: heightStyle }} 
          />
        )
      )}
    </div>
  );
});

// Specialized wrapper for charts
interface LazyChartProps {
  children: ReactNode;
  height?: number;
  className?: string;
}

export const LazyChart = memo(function LazyChart({
  children,
  height = 200,
  className,
}: LazyChartProps) {
  return (
    <LazyComponent
      height={height}
      className={className}
      rootMargin="200px"
      placeholder={
        <div 
          className="w-full bg-muted/30 rounded-lg flex items-center justify-center"
          style={{ height }}
        >
          <div className="text-xs text-muted-foreground">Loading chart...</div>
        </div>
      }
    >
      {children}
    </LazyComponent>
  );
});
