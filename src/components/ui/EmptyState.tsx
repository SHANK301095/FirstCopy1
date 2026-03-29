/**
 * Reusable EmptyState component for consistent empty page UX
 * Upgraded with institutional design and better guidance
 */

import { LucideIcon, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  compact?: boolean;
  /** Optional inline variant for use inside cards */
  inline?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
  compact = false,
  inline = false,
}: EmptyStateProps) {
  if (inline) {
    return (
      <div className={cn('flex flex-col items-center justify-center text-center py-6', className)}>
        <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center mb-3">
          <Icon className="h-5 w-5 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium text-muted-foreground/70 mb-1">{title}</p>
        <p className="text-[11px] text-muted-foreground/50 max-w-[240px] mb-3">{description}</p>
        {primaryAction && (
          <Button onClick={primaryAction.onClick} size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-border/30">
            {primaryAction.icon && <primaryAction.icon className="h-3 w-3" />}
            {primaryAction.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      compact ? 'py-8' : 'py-16',
      className
    )}>
      <div className={cn(
        'rounded-2xl bg-muted/20 border border-border/20 flex items-center justify-center mb-5',
        compact ? 'p-4' : 'p-6'
      )}>
        <Icon className={cn(
          'text-muted-foreground/30',
          compact ? 'h-8 w-8' : 'h-12 w-12'
        )} />
      </div>
      
      <h3 className={cn(
        'font-semibold mb-1.5 text-foreground/80',
        compact ? 'text-base' : 'text-lg'
      )}>
        {title}
      </h3>
      
      <p className={cn(
        'text-muted-foreground/60 max-w-md mb-6',
        compact ? 'text-sm' : 'text-sm'
      )}>
        {description}
      </p>
      
      <div className="flex items-center gap-3">
        {primaryAction && (
          <Button onClick={primaryAction.onClick} className="gap-2 h-9">
            {primaryAction.icon && <primaryAction.icon className="h-4 w-4" />}
            {primaryAction.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
        {secondaryAction && (
          <Button variant="outline" onClick={secondaryAction.onClick} className="h-9 border-border/30">
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
