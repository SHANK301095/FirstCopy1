/**
 * Result Comparison Mode - P1 Results & Analytics
 * Side-by-side comparison of backtest results
 */

import { useState, useMemo } from 'react';
import { 
  ArrowLeftRight, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Check,
  X,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface BacktestResult {
  id: string;
  strategyName: string;
  datasetName: string;
  createdAt: Date;
  metrics: {
    netProfit: number;
    netProfitPct: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    totalTrades: number;
    avgTradeDuration: number;
    expectancy: number;
  };
}

interface ResultComparisonModeProps {
  results: BacktestResult[];
  onClose?: () => void;
  className?: string;
}

const METRICS_CONFIG = [
  { key: 'netProfitPct', label: 'Net Profit %', format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, higherBetter: true },
  { key: 'sharpeRatio', label: 'Sharpe Ratio', format: (v: number) => v.toFixed(2), higherBetter: true },
  { key: 'maxDrawdown', label: 'Max Drawdown', format: (v: number) => `-${v.toFixed(2)}%`, higherBetter: false },
  { key: 'winRate', label: 'Win Rate', format: (v: number) => `${v.toFixed(1)}%`, higherBetter: true },
  { key: 'profitFactor', label: 'Profit Factor', format: (v: number) => v.toFixed(2), higherBetter: true },
  { key: 'totalTrades', label: 'Total Trades', format: (v: number) => v.toString(), higherBetter: null },
  { key: 'expectancy', label: 'Expectancy', format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`, higherBetter: true },
] as const;

export function ResultComparisonMode({
  results,
  onClose,
  className,
}: ResultComparisonModeProps) {
  if (results.length < 2) {
    return (
      <Card className={cn("card-neural", className)}>
        <CardContent className="py-8 text-center">
          <ArrowLeftRight className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Select at least 2 results to compare
          </p>
        </CardContent>
      </Card>
    );
  }

  const [result1, result2] = results;

  const comparison = useMemo(() => {
    return METRICS_CONFIG.map(metric => {
      const val1 = result1.metrics[metric.key as keyof typeof result1.metrics] as number;
      const val2 = result2.metrics[metric.key as keyof typeof result2.metrics] as number;
      const diff = val1 - val2;
      
      let winner: 1 | 2 | null = null;
      if (metric.higherBetter !== null) {
        if (metric.higherBetter) {
          winner = val1 > val2 ? 1 : val1 < val2 ? 2 : null;
        } else {
          winner = val1 < val2 ? 1 : val1 > val2 ? 2 : null;
        }
      }
      
      return {
        ...metric,
        val1,
        val2,
        diff,
        winner,
      };
    });
  }, [result1, result2]);

  const overallWinner = useMemo(() => {
    const wins1 = comparison.filter(c => c.winner === 1).length;
    const wins2 = comparison.filter(c => c.winner === 2).length;
    if (wins1 > wins2) return 1;
    if (wins2 > wins1) return 2;
    return null;
  }, [comparison]);

  return (
    <Card className={cn("card-neural", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            Result Comparison
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Header row with strategy names */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-sm font-medium text-muted-foreground">Metric</div>
          <div className={cn(
            "text-sm font-medium text-center p-2 rounded-md",
            overallWinner === 1 && "bg-profit/10 text-profit"
          )}>
            <p className="truncate">{result1.strategyName}</p>
            <p className="text-xs text-muted-foreground truncate">{result1.datasetName}</p>
            {overallWinner === 1 && (
              <Badge className="mt-1 text-xs bg-profit/20 text-profit">Winner</Badge>
            )}
          </div>
          <div className={cn(
            "text-sm font-medium text-center p-2 rounded-md",
            overallWinner === 2 && "bg-profit/10 text-profit"
          )}>
            <p className="truncate">{result2.strategyName}</p>
            <p className="text-xs text-muted-foreground truncate">{result2.datasetName}</p>
            {overallWinner === 2 && (
              <Badge className="mt-1 text-xs bg-profit/20 text-profit">Winner</Badge>
            )}
          </div>
        </div>

        {/* Metrics comparison */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {comparison.map((metric) => (
              <div 
                key={metric.key}
                className="grid grid-cols-3 gap-4 p-2 rounded-md hover:bg-muted/30 transition-colors"
              >
                <div className="text-sm text-muted-foreground flex items-center">
                  {metric.label}
                </div>
                <div className={cn(
                  "text-sm font-mono text-center flex items-center justify-center gap-1",
                  metric.winner === 1 && "text-profit font-bold"
                )}>
                  {metric.format(metric.val1)}
                  {metric.winner === 1 && <Check className="h-3 w-3" />}
                </div>
                <div className={cn(
                  "text-sm font-mono text-center flex items-center justify-center gap-1",
                  metric.winner === 2 && "text-profit font-bold"
                )}>
                  {metric.format(metric.val2)}
                  {metric.winner === 2 && <Check className="h-3 w-3" />}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-border/30">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Metrics Won</span>
            <div className="flex items-center gap-4">
              <span className={cn(
                "font-mono",
                overallWinner === 1 && "text-profit font-bold"
              )}>
                {comparison.filter(c => c.winner === 1).length}
              </span>
              <span className="text-muted-foreground">vs</span>
              <span className={cn(
                "font-mono",
                overallWinner === 2 && "text-profit font-bold"
              )}>
                {comparison.filter(c => c.winner === 2).length}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Sortable Metric Cards - P1 Results
 */
interface SortableMetricCardsProps {
  metrics: Array<{
    key: string;
    label: string;
    value: number;
    format: (v: number) => string;
    higherBetter?: boolean;
  }>;
  sortBy?: string;
  onSortChange?: (key: string) => void;
  className?: string;
}

export function SortableMetricCards({
  metrics,
  sortBy,
  onSortChange,
  className,
}: SortableMetricCardsProps) {
  const sortedMetrics = useMemo(() => {
    if (!sortBy) return metrics;
    return [...metrics].sort((a, b) => {
      if (a.key === sortBy) return -1;
      if (b.key === sortBy) return 1;
      return 0;
    });
  }, [metrics, sortBy]);

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-3", className)}>
      {sortedMetrics.map((metric) => (
        <button
          key={metric.key}
          onClick={() => onSortChange?.(metric.key)}
          className={cn(
            "p-3 rounded-lg border text-left transition-all hover:shadow-md",
            sortBy === metric.key
              ? "bg-primary/10 border-primary/30"
              : "bg-card border-border/50 hover:border-primary/20"
          )}
        >
          <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
          <p className={cn(
            "text-lg font-mono font-bold",
            metric.higherBetter !== undefined && (
              metric.higherBetter
                ? metric.value >= 0 ? "text-profit" : "text-loss"
                : metric.value <= 20 ? "text-profit" : "text-loss"
            )
          )}>
            {metric.format(metric.value)}
          </p>
          {sortBy === metric.key && (
            <Badge variant="secondary" className="mt-1 text-[10px]">
              Sorted
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}
