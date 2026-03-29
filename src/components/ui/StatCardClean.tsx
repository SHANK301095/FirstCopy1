/**
 * Clean Finance-Grade Stat Card
 * Simple, readable KPI cards without glow/neon effects
 */

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Card } from './card';

interface StatCardCleanProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
  compact?: boolean;
}

export function StatCardClean({
  label,
  value,
  icon: Icon,
  trend,
  trendValue,
  subtitle,
  variant = 'default',
  className,
  compact = false,
}: StatCardCleanProps) {
  const variantStyles = {
    default: {
      accent: 'text-foreground',
      iconBg: 'bg-muted',
      iconColor: 'text-muted-foreground',
    },
    success: {
      accent: 'text-profit',
      iconBg: 'bg-profit/10',
      iconColor: 'text-profit',
    },
    warning: {
      accent: 'text-warning',
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
    danger: {
      accent: 'text-loss',
      iconBg: 'bg-loss/10',
      iconColor: 'text-loss',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Card className={cn(compact ? 'p-2.5' : 'p-4', className)}>
      <div className={cn('flex items-start justify-between', compact ? 'mb-1' : 'mb-2')}>
        <span className={cn('font-medium text-muted-foreground uppercase tracking-wide', compact ? 'text-[10px]' : 'text-xs')}>
          {label}
        </span>
        {Icon && (
          <div className={cn('rounded-lg', styles.iconBg, compact ? 'p-1.5' : 'p-2')}>
            <Icon className={cn(styles.iconColor, compact ? 'h-3 w-3' : 'h-4 w-4')} />
          </div>
        )}
      </div>
      
      <div className={cn('font-bold font-mono tracking-tight', styles.accent, compact ? 'text-lg' : 'text-2xl')}>
        {value}
      </div>
      
      {(trend || trendValue || subtitle) && (
        <div className="flex items-center gap-2 mt-2">
          {trend && trendValue && (
            <span className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              trend === 'up' && 'bg-profit/10 text-profit',
              trend === 'down' && 'bg-loss/10 text-loss',
              trend === 'neutral' && 'bg-muted text-muted-foreground'
            )}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      )}
    </Card>
  );
}

interface StatCardGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
}

export function StatCardGrid({ children, className, columns = 4 }: StatCardGridProps) {
  const colsClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };
  
  return (
    <div className={cn('grid gap-3', colsClass[columns], className)}>
      {children}
    </div>
  );
}
