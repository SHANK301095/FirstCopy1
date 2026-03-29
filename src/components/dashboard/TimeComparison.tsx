/**
 * Time Comparison Toggle - P0 Dashboard
 * Weekly/monthly comparison for stats
 */

import { useState } from 'react';
import { CalendarDays, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ComparisonPeriod = 'week' | 'month';

interface TimeComparisonProps {
  currentValue: number;
  previousValue: number;
  period: ComparisonPeriod;
  onPeriodChange: (period: ComparisonPeriod) => void;
  formatValue?: (value: number) => string;
  className?: string;
}

export function TimeComparisonToggle({ 
  currentValue, 
  previousValue, 
  period, 
  onPeriodChange,
  formatValue = (v) => v.toLocaleString(),
  className 
}: TimeComparisonProps) {
  const change = previousValue !== 0 
    ? ((currentValue - previousValue) / previousValue) * 100 
    : 0;
  
  const isPositive = change > 0;
  const isNegative = change < 0;
  const isNeutral = change === 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex rounded-md border border-border/50 p-0.5">
        <Button
          variant={period === 'week' ? 'default' : 'ghost'}
          size="sm"
          className="h-6 text-xs px-2"
          onClick={() => onPeriodChange('week')}
        >
          Week
        </Button>
        <Button
          variant={period === 'month' ? 'default' : 'ghost'}
          size="sm"
          className="h-6 text-xs px-2"
          onClick={() => onPeriodChange('month')}
        >
          Month
        </Button>
      </div>
      
      <div className={cn(
        "flex items-center gap-1 text-xs",
        isPositive && "text-profit",
        isNegative && "text-loss",
        isNeutral && "text-muted-foreground"
      )}>
        {isPositive && <TrendingUp className="h-3 w-3" />}
        {isNegative && <TrendingDown className="h-3 w-3" />}
        {isNeutral && <Minus className="h-3 w-3" />}
        <span className="font-medium">
          {isPositive && '+'}{change.toFixed(1)}%
        </span>
        <span className="text-muted-foreground">
          vs last {period}
        </span>
      </div>
    </div>
  );
}

/**
 * Comparison Badge - Simpler inline comparison
 */
interface ComparisonBadgeProps {
  current: number;
  previous: number;
  className?: string;
}

export function ComparisonBadge({ current, previous, className }: ComparisonBadgeProps) {
  if (previous === 0) return null;
  
  const change = ((current - previous) / previous) * 100;
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <span className={cn(
      "inline-flex items-center text-[10px] font-medium",
      isPositive && "text-profit",
      isNegative && "text-loss",
      !isPositive && !isNegative && "text-muted-foreground",
      className
    )}>
      {isPositive && <TrendingUp className="h-2.5 w-2.5 mr-0.5" />}
      {isNegative && <TrendingDown className="h-2.5 w-2.5 mr-0.5" />}
      {isPositive && '+'}{change.toFixed(0)}%
    </span>
  );
}

/**
 * Time Comparison Card - Dashboard comparison widget
 */
interface PeriodStats {
  strategies: number;
  datasets: number;
  runs: number;
  results: number;
}

interface TimeComparisonCardProps {
  currentPeriodStats: PeriodStats;
  previousPeriodStats: PeriodStats;
  className?: string;
}

export function TimeComparison({ currentPeriodStats, previousPeriodStats, className }: TimeComparisonCardProps) {
  const [period, setPeriod] = useState<ComparisonPeriod>('week');

  const metrics = [
    { label: 'Strategies', current: currentPeriodStats.strategies, previous: previousPeriodStats.strategies },
    { label: 'Datasets', current: currentPeriodStats.datasets, previous: previousPeriodStats.datasets },
    { label: 'Runs', current: currentPeriodStats.runs, previous: previousPeriodStats.runs },
    { label: 'Results', current: currentPeriodStats.results, previous: previousPeriodStats.results },
  ];

  return (
    <Card className={cn("bg-card/50 backdrop-blur-sm border-border/30", className)}>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Period Comparison</span>
          </div>
          
          <div className="flex items-center gap-1 p-0.5 rounded-md bg-muted/50">
            <Button
              variant={period === 'week' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 text-xs px-3"
              onClick={() => setPeriod('week')}
            >
              Week
            </Button>
            <Button
              variant={period === 'month' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 text-xs px-3"
              onClick={() => setPeriod('month')}
            >
              Month
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
          {metrics.map(metric => {
            const change = metric.previous !== 0 
              ? ((metric.current - metric.previous) / metric.previous) * 100 
              : metric.current > 0 ? 100 : 0;
            const isPositive = change > 0;
            const isNegative = change < 0;
            
            return (
              <div key={metric.label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{metric.label}</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">{metric.current}</span>
                  <span className={cn(
                    "text-[10px] flex items-center",
                    isPositive && "text-profit",
                    isNegative && "text-loss",
                    !isPositive && !isNegative && "text-muted-foreground"
                  )}>
                    {isPositive && <TrendingUp className="h-2.5 w-2.5" />}
                    {isNegative && <TrendingDown className="h-2.5 w-2.5" />}
                    {isPositive && '+'}{change.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
