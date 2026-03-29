/**
 * Strategy Performance Badge - P1 Strategy Library
 * Visual indicators for strategy performance metrics
 */

import { TrendingUp, TrendingDown, Target, Zap, Award, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type PerformanceLevel = 'excellent' | 'good' | 'average' | 'poor' | 'unknown';

interface StrategyPerformanceMetrics {
  sharpeRatio?: number;
  maxDrawdown?: number;
  winRate?: number;
  profitFactor?: number;
  totalTrades?: number;
}

interface StrategyPerformanceBadgeProps {
  metrics: StrategyPerformanceMetrics;
  variant?: 'compact' | 'full';
  className?: string;
}

function getPerformanceLevel(metrics: StrategyPerformanceMetrics): PerformanceLevel {
  const { sharpeRatio, maxDrawdown, winRate, profitFactor } = metrics;
  
  if (!sharpeRatio && !maxDrawdown && !winRate && !profitFactor) return 'unknown';
  
  let score = 0;
  let count = 0;
  
  if (sharpeRatio !== undefined) {
    if (sharpeRatio >= 2) score += 3;
    else if (sharpeRatio >= 1) score += 2;
    else if (sharpeRatio >= 0.5) score += 1;
    count++;
  }
  
  if (maxDrawdown !== undefined) {
    if (maxDrawdown <= 10) score += 3;
    else if (maxDrawdown <= 20) score += 2;
    else if (maxDrawdown <= 30) score += 1;
    count++;
  }
  
  if (winRate !== undefined) {
    if (winRate >= 60) score += 3;
    else if (winRate >= 50) score += 2;
    else if (winRate >= 40) score += 1;
    count++;
  }
  
  if (profitFactor !== undefined) {
    if (profitFactor >= 2) score += 3;
    else if (profitFactor >= 1.5) score += 2;
    else if (profitFactor >= 1.2) score += 1;
    count++;
  }
  
  const avgScore = count > 0 ? score / count : 0;
  
  if (avgScore >= 2.5) return 'excellent';
  if (avgScore >= 1.5) return 'good';
  if (avgScore >= 0.5) return 'average';
  return 'poor';
}

const levelConfig = {
  excellent: {
    label: 'Excellent',
    icon: Award,
    color: 'text-profit',
    bgColor: 'bg-profit/10',
    borderColor: 'border-profit/30',
  },
  good: {
    label: 'Good',
    icon: Star,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
  },
  average: {
    label: 'Average',
    icon: Target,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
  },
  poor: {
    label: 'Needs Work',
    icon: TrendingDown,
    color: 'text-loss',
    bgColor: 'bg-loss/10',
    borderColor: 'border-loss/30',
  },
  unknown: {
    label: 'Not Tested',
    icon: Zap,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    borderColor: 'border-border',
  },
};

export function StrategyPerformanceBadge({
  metrics,
  variant = 'compact',
  className,
}: StrategyPerformanceBadgeProps) {
  const level = getPerformanceLevel(metrics);
  const config = levelConfig[level];
  const Icon = config.icon;

  if (variant === 'compact') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1",
              config.bgColor,
              config.borderColor,
              config.color,
              className
            )}
          >
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{config.label} Performance</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {metrics.sharpeRatio !== undefined && (
                <>
                  <span className="text-muted-foreground">Sharpe:</span>
                  <span className="font-mono">{metrics.sharpeRatio.toFixed(2)}</span>
                </>
              )}
              {metrics.maxDrawdown !== undefined && (
                <>
                  <span className="text-muted-foreground">Max DD:</span>
                  <span className="font-mono text-loss">-{metrics.maxDrawdown.toFixed(1)}%</span>
                </>
              )}
              {metrics.winRate !== undefined && (
                <>
                  <span className="text-muted-foreground">Win Rate:</span>
                  <span className="font-mono">{metrics.winRate.toFixed(1)}%</span>
                </>
              )}
              {metrics.profitFactor !== undefined && (
                <>
                  <span className="text-muted-foreground">Profit Factor:</span>
                  <span className="font-mono">{metrics.profitFactor.toFixed(2)}</span>
                </>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Full variant
  return (
    <div className={cn(
      "p-3 rounded-lg border",
      config.bgColor,
      config.borderColor,
      className
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", config.color)} />
        <span className={cn("font-medium", config.color)}>{config.label}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {metrics.sharpeRatio !== undefined && (
          <div>
            <p className="text-xs text-muted-foreground">Sharpe</p>
            <p className="font-mono font-bold">{metrics.sharpeRatio.toFixed(2)}</p>
          </div>
        )}
        {metrics.maxDrawdown !== undefined && (
          <div>
            <p className="text-xs text-muted-foreground">Max DD</p>
            <p className="font-mono font-bold text-loss">-{metrics.maxDrawdown.toFixed(1)}%</p>
          </div>
        )}
        {metrics.winRate !== undefined && (
          <div>
            <p className="text-xs text-muted-foreground">Win Rate</p>
            <p className="font-mono font-bold">{metrics.winRate.toFixed(1)}%</p>
          </div>
        )}
        {metrics.profitFactor !== undefined && (
          <div>
            <p className="text-xs text-muted-foreground">PF</p>
            <p className="font-mono font-bold">{metrics.profitFactor.toFixed(2)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Strategy Complexity Score - P1 Strategy Library
 */
interface StrategyComplexityScoreProps {
  linesOfCode: number;
  parameterCount: number;
  indicatorCount: number;
  className?: string;
}

export function StrategyComplexityScore({
  linesOfCode,
  parameterCount,
  indicatorCount,
  className,
}: StrategyComplexityScoreProps) {
  // Calculate complexity score (1-10)
  const locScore = Math.min(linesOfCode / 50, 3);
  const paramScore = Math.min(parameterCount / 5, 3);
  const indicatorScore = Math.min(indicatorCount / 3, 4);
  const totalScore = Math.min(Math.round(locScore + paramScore + indicatorScore), 10);
  
  const getComplexityLabel = (score: number) => {
    if (score <= 3) return { label: 'Simple', color: 'text-profit' };
    if (score <= 6) return { label: 'Moderate', color: 'text-warning' };
    return { label: 'Complex', color: 'text-loss' };
  };
  
  const { label, color } = getComplexityLabel(totalScore);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex items-center gap-1.5", className)}>
          <div className="flex gap-0.5">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 h-3 rounded-sm",
                  i < totalScore ? color.replace('text-', 'bg-') : "bg-muted"
                )}
              />
            ))}
          </div>
          <span className={cn("text-xs font-medium", color)}>{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          <p>Complexity Score: {totalScore}/10</p>
          <p className="text-muted-foreground">
            {linesOfCode} lines, {parameterCount} params, {indicatorCount} indicators
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
