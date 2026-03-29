/**
 * Standardized Page Header Component
 * Provides consistent page-level structure across all pages:
 * Title + subtitle + optional KPI strip + optional actions
 */

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children?: ReactNode;       // Right-side actions
  kpiStrip?: ReactNode;       // KPI strip below header
  className?: string;
  compact?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  children,
  kpiStrip,
  className,
  compact = false,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-2',
        compact ? 'mb-2' : 'mb-0'
      )}>
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className={cn(
              'font-bold tracking-tight text-foreground',
              compact ? 'text-lg' : 'text-xl md:text-2xl'
            )}>
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground/70 mt-0.5 font-medium truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {children && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {children}
          </div>
        )}
      </div>
      {kpiStrip && (
        <div className="w-full">
          {kpiStrip}
        </div>
      )}
    </div>
  );
}

/**
 * Section Header — for content sections within a page.
 */
interface SectionHeaderProps {
  icon?: LucideIcon;
  iconColor?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ icon: Icon, iconColor, title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-2.5', className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className={cn('h-3.5 w-3.5', iconColor || 'text-muted-foreground/50')} />}
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          {title}
        </span>
      </div>
      {action}
    </div>
  );
}
