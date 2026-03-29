/**
 * UsageIndicator
 * Shows how many times an asset has been used across the platform
 */

import { Activity, TrendingUp, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface UsageIndicatorProps {
  usageCount: number;
  lastUsedAt?: string | null;
  entityType: 'dataset' | 'strategy' | 'result';
  className?: string;
  showLastUsed?: boolean;
  size?: 'sm' | 'md';
}

export function UsageIndicator({
  usageCount,
  lastUsedAt,
  entityType,
  className,
  showLastUsed = true,
  size = 'sm',
}: UsageIndicatorProps) {
  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const usageText = {
    dataset: 'backtests',
    strategy: 'runs',
    result: 'views',
  }[entityType];

  const isPopular = usageCount >= 100;
  const isTrending = usageCount >= 10 && lastUsedAt && 
    new Date(lastUsedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('flex items-center gap-1.5', className)}>
          {isPopular || isTrending ? (
            <TrendingUp className={cn(
              'text-primary',
              size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
            )} />
          ) : (
            <Activity className={cn(
              'text-muted-foreground',
              size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
            )} />
          )}
          <span className={cn(
            'font-medium',
            size === 'sm' ? 'text-xs' : 'text-sm',
            isPopular ? 'text-primary' : 'text-muted-foreground'
          )}>
            {formatCount(usageCount)}
          </span>
          {showLastUsed && lastUsedAt && (
            <span className={cn(
              'text-muted-foreground',
              size === 'sm' ? 'text-[10px]' : 'text-xs'
            )}>
              • {formatDistanceToNow(new Date(lastUsedAt), { addSuffix: true })}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          <p>Used in {usageCount.toLocaleString()} {usageText}</p>
          {lastUsedAt && (
            <p className="text-muted-foreground">
              Last used: {formatDistanceToNow(new Date(lastUsedAt), { addSuffix: true })}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * UsedByIndicator
 * Shows linked usage: "Used in 12 backtests, 3 strategies"
 */
interface UsedByIndicatorProps {
  counts: {
    backtests?: number;
    strategies?: number;
    results?: number;
    portfolios?: number;
  };
  className?: string;
}

export function UsedByIndicator({ counts, className }: UsedByIndicatorProps) {
  const parts: string[] = [];
  
  if (counts.backtests) parts.push(`${counts.backtests} backtest${counts.backtests > 1 ? 's' : ''}`);
  if (counts.strategies) parts.push(`${counts.strategies} strateg${counts.strategies > 1 ? 'ies' : 'y'}`);
  if (counts.results) parts.push(`${counts.results} result${counts.results > 1 ? 's' : ''}`);
  if (counts.portfolios) parts.push(`${counts.portfolios} portfolio${counts.portfolios > 1 ? 's' : ''}`);

  if (parts.length === 0) return null;

  return (
    <div className={cn('text-xs text-muted-foreground flex items-center gap-1', className)}>
      <Activity className="h-3 w-3" />
      <span>Used in {parts.join(', ')}</span>
    </div>
  );
}

export default UsageIndicator;
