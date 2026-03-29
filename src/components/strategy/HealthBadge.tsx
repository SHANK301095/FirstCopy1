/**
 * Strategy Health Badge — shows score + grade with color semantics
 */
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';

interface HealthBadgeProps {
  score: number;
  grade: 'healthy' | 'medium' | 'risky';
  size?: 'sm' | 'md';
  className?: string;
  onClick?: () => void;
}

const GRADE_CONFIG = {
  healthy: {
    icon: CheckCircle2,
    label: 'Healthy',
    color: 'border-profit/50 text-profit bg-profit/10',
  },
  medium: {
    icon: Shield,
    label: 'Medium',
    color: 'border-warning/50 text-warning bg-warning/10',
  },
  risky: {
    icon: AlertTriangle,
    label: 'Risky',
    color: 'border-destructive/50 text-destructive bg-destructive/10',
  },
};

export function HealthBadge({ score, grade, size = 'sm', className, onClick }: HealthBadgeProps) {
  const config = GRADE_CONFIG[grade];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'cursor-default gap-1 font-medium',
        config.color,
        size === 'md' && 'text-xs px-2.5 py-1',
        size === 'sm' && 'text-[10px] px-1.5 py-0.5',
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      onClick={onClick}
    >
      <Icon className={cn(size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3')} />
      {score} • {config.label}
    </Badge>
  );
}

/** Skeleton placeholder while loading */
export function HealthBadgeSkeleton({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] px-1.5 py-0.5 gap-1 animate-pulse border-muted-foreground/20', className)}
    >
      <HelpCircle className="h-3 w-3 text-muted-foreground/40" />
      <span className="text-muted-foreground/40">—</span>
    </Badge>
  );
}
