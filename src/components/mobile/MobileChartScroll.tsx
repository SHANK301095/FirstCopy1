/**
 * Mobile Chart Scroll Container
 * Wraps charts with horizontal scroll on mobile for better readability
 */
import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface MobileChartScrollProps {
  children: ReactNode;
  minWidth?: number;
  className?: string;
  hint?: boolean;
}

export function MobileChartScroll({ 
  children, 
  minWidth = 600, 
  className,
  hint = true 
}: MobileChartScrollProps) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className="relative">
      {hint && (
        <p className="text-[10px] text-muted-foreground/60 text-center mb-1">
          ← Scroll to see more →
        </p>
      )}
      <div className={cn("overflow-x-auto overscroll-x-contain -mx-1 px-1 pb-2", className)}>
        <div style={{ minWidth: `${minWidth}px` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
