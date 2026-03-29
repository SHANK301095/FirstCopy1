/**
 * Convergence Chart - P1 Optimizer
 * Shows optimization progress over iterations
 */

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConvergenceDataPoint {
  iteration: number;
  bestValue: number;
  currentValue: number;
  averageValue?: number;
}

interface ConvergenceChartProps {
  data: ConvergenceDataPoint[];
  objectiveLabel?: string;
  targetValue?: number;
  isRunning?: boolean;
  className?: string;
}

export function ConvergenceChart({
  data,
  objectiveLabel = 'Objective',
  targetValue,
  isRunning = false,
  className,
}: ConvergenceChartProps) {
  const stats = useMemo(() => {
    if (data.length === 0) return null;
    
    const lastPoint = data[data.length - 1];
    const firstPoint = data[0];
    const improvement = lastPoint.bestValue - firstPoint.bestValue;
    const improvementPct = firstPoint.bestValue !== 0 
      ? ((improvement / Math.abs(firstPoint.bestValue)) * 100) 
      : 0;
    
    // Check if converged (no improvement in last 10% of iterations)
    const recentWindow = Math.max(1, Math.floor(data.length * 0.1));
    const recentData = data.slice(-recentWindow);
    const isConverged = recentData.every(d => d.bestValue === lastPoint.bestValue);
    
    return {
      currentBest: lastPoint.bestValue,
      improvement,
      improvementPct,
      isConverged,
      iterationsToConverge: isConverged 
        ? data.findIndex(d => d.bestValue === lastPoint.bestValue) + 1
        : null,
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <Card className={cn("card-neural", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Convergence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            {isRunning ? 'Collecting data...' : 'Start optimization to see convergence'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("card-neural", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Convergence
          </CardTitle>
          <div className="flex items-center gap-2">
            {stats?.isConverged && (
              <Badge variant="secondary" className="text-xs bg-profit/10 text-profit">
                Converged
              </Badge>
            )}
            {isRunning && !stats?.isConverged && (
              <Badge variant="outline" className="text-xs animate-pulse">
                Running
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Best {objectiveLabel}</p>
            <p className="text-lg font-mono font-bold text-primary">
              {stats?.currentBest.toFixed(4)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Improvement</p>
            <p className={cn(
              "text-lg font-mono font-bold",
              stats && stats.improvement >= 0 ? "text-profit" : "text-loss"
            )}>
              {stats && stats.improvement >= 0 ? '+' : ''}{stats?.improvementPct.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Iterations</p>
            <p className="text-lg font-mono font-bold">
              {data.length}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="iteration" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              {targetValue && (
                <ReferenceLine 
                  y={targetValue} 
                  stroke="hsl(var(--warning))" 
                  strokeDasharray="5 5"
                  label={{ value: 'Target', fill: 'hsl(var(--warning))', fontSize: 10 }}
                />
              )}
              <Line 
                type="monotone" 
                dataKey="bestValue" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
                name="Best"
              />
              <Line 
                type="monotone" 
                dataKey="currentValue" 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={1}
                dot={false}
                opacity={0.5}
                name="Current"
              />
              {data[0]?.averageValue !== undefined && (
                <Line 
                  type="monotone" 
                  dataKey="averageValue" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                  opacity={0.7}
                  name="Average"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Early Stopping Suggestion - P1 Optimizer
 */
interface EarlyStoppingSuggestionProps {
  iterationsSinceImprovement: number;
  totalIterations: number;
  threshold?: number;
  onStop?: () => void;
  className?: string;
}

export function EarlyStoppingSuggestion({
  iterationsSinceImprovement,
  totalIterations,
  threshold = 50,
  onStop,
  className,
}: EarlyStoppingSuggestionProps) {
  const shouldSuggestStop = iterationsSinceImprovement >= threshold;
  
  if (!shouldSuggestStop) return null;

  return (
    <div className={cn(
      "p-3 rounded-lg border border-warning/30 bg-warning/5 flex items-center justify-between gap-3",
      className
    )}>
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-warning" />
        <div>
          <p className="text-sm font-medium">Consider stopping early</p>
          <p className="text-xs text-muted-foreground">
            No improvement in {iterationsSinceImprovement} iterations ({((iterationsSinceImprovement / totalIterations) * 100).toFixed(0)}% of total)
          </p>
        </div>
      </div>
      {onStop && (
        <button
          onClick={onStop}
          className="px-3 py-1 text-xs font-medium rounded-md bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
        >
          Stop Now
        </button>
      )}
    </div>
  );
}
