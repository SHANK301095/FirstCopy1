/**
 * Phase 15: Overfitting Risk Badge
 * Shows overfitting risk level based on walk-forward efficiency & sample size
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OverfittingBadgeProps {
  overfittingScore: number; // 0-100, higher = more overfitting risk
  sampleSize?: number;
  className?: string;
}

function getLevel(score: number): { label: string; color: string; icon: typeof CheckCircle; description: string } {
  if (score <= 25) return {
    label: 'Low Risk',
    color: 'bg-profit/20 text-profit border-profit/30',
    icon: CheckCircle,
    description: 'Strategy shows robust out-of-sample performance',
  };
  if (score <= 50) return {
    label: 'Moderate',
    color: 'bg-chart-4/20 text-chart-4 border-chart-4/30',
    icon: AlertTriangle,
    description: 'Some curve-fitting detected — validate with more data',
  };
  if (score <= 75) return {
    label: 'High Risk',
    color: 'bg-warning/20 text-warning border-warning/30',
    icon: AlertTriangle,
    description: 'Significant overfitting likely — OOS performance degrades',
  };
  return {
    label: 'Overfit',
    color: 'bg-loss/20 text-loss border-loss/30',
    icon: ShieldAlert,
    description: 'Strategy is almost certainly overfit to in-sample data',
  };
}

export function OverfittingBadge({ overfittingScore, sampleSize, className }: OverfittingBadgeProps) {
  const level = getLevel(overfittingScore);
  const Icon = level.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn('gap-1 text-[10px] cursor-help', level.color, className)}
          >
            <Icon className="h-3 w-3" />
            {level.label} ({overfittingScore}%)
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px]">
          <p className="text-xs font-medium">{level.description}</p>
          {sampleSize !== undefined && (
            <p className="text-xs text-muted-foreground mt-1">
              Sample size: {sampleSize} trades
              {sampleSize < 30 && ' ⚠️ Too few for reliable score'}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
