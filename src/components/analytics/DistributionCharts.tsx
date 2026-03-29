/**
 * Distribution Charts - P1 Results & Analytics
 * Return distribution visualization
 */

import { useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

interface Trade {
  pnl: number;
  pnlPercent?: number;
}

interface ReturnDistributionChartProps {
  trades: Trade[];
  bucketCount?: number;
  showPercent?: boolean;
  className?: string;
}

export function ReturnDistributionChart({
  trades,
  bucketCount = 20,
  showPercent = false,
  className,
}: ReturnDistributionChartProps) {
  const distribution = useMemo(() => {
    if (trades.length === 0) return { buckets: [], stats: null };

    const values = trades.map(t => showPercent ? (t.pnlPercent ?? 0) : t.pnl);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const bucketSize = range / bucketCount;

    // Create buckets
    const buckets: { range: string; count: number; min: number; max: number }[] = [];
    for (let i = 0; i < bucketCount; i++) {
      const bucketMin = min + i * bucketSize;
      const bucketMax = min + (i + 1) * bucketSize;
      buckets.push({
        range: showPercent 
          ? `${bucketMin.toFixed(1)}%` 
          : `₹${bucketMin.toFixed(0)}`,
        count: 0,
        min: bucketMin,
        max: bucketMax,
      });
    }

    // Fill buckets
    values.forEach(val => {
      const bucketIndex = Math.min(
        Math.floor((val - min) / bucketSize),
        bucketCount - 1
      );
      if (bucketIndex >= 0 && bucketIndex < buckets.length) {
        buckets[bucketIndex].count++;
      }
    });

    // Calculate stats
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );
    const skewness = values.reduce((sum, val) => 
      sum + Math.pow((val - mean) / stdDev, 3), 0
    ) / values.length;

    return {
      buckets,
      stats: {
        mean,
        median,
        stdDev,
        skewness,
        min,
        max,
      },
    };
  }, [trades, bucketCount, showPercent]);

  if (trades.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="py-8 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No trade data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Return Distribution
          </CardTitle>
          <div className="flex items-center gap-2">
            {distribution.stats && (
              <>
                <Badge variant="outline" className="text-[10px]">
                  μ = {showPercent 
                    ? `${distribution.stats.mean.toFixed(2)}%` 
                    : `₹${distribution.stats.mean.toFixed(0)}`}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px]",
                    distribution.stats.skewness > 0 ? "text-profit" : "text-loss"
                  )}
                >
                  {distribution.stats.skewness > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-0.5" />
                  )}
                  Skew: {distribution.stats.skewness.toFixed(2)}
                </Badge>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribution.buckets}>
              <XAxis 
                dataKey="range" 
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value} trades`, 'Count']}
              />
              {distribution.stats && (
                <ReferenceLine
                  x={distribution.buckets.findIndex(b => 
                    b.min <= 0 && b.max >= 0
                  )}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                />
              )}
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {distribution.buckets.map((entry, index) => (
                  <Cell 
                    key={index}
                    fill={entry.min >= 0 
                      ? 'hsl(var(--profit))' 
                      : 'hsl(var(--loss))'
                    }
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stats summary */}
        {distribution.stats && (
          <div className="grid grid-cols-4 gap-2 mt-4">
            <div className="p-2 rounded-md bg-muted/30 text-center">
              <p className="text-[10px] text-muted-foreground">Mean</p>
              <p className="text-xs font-bold">
                {showPercent 
                  ? `${distribution.stats.mean.toFixed(2)}%`
                  : `₹${distribution.stats.mean.toFixed(0)}`}
              </p>
            </div>
            <div className="p-2 rounded-md bg-muted/30 text-center">
              <p className="text-[10px] text-muted-foreground">Median</p>
              <p className="text-xs font-bold">
                {showPercent 
                  ? `${distribution.stats.median.toFixed(2)}%`
                  : `₹${distribution.stats.median.toFixed(0)}`}
              </p>
            </div>
            <div className="p-2 rounded-md bg-muted/30 text-center">
              <p className="text-[10px] text-muted-foreground">Std Dev</p>
              <p className="text-xs font-bold">
                {showPercent 
                  ? `${distribution.stats.stdDev.toFixed(2)}%`
                  : `₹${distribution.stats.stdDev.toFixed(0)}`}
              </p>
            </div>
            <div className="p-2 rounded-md bg-muted/30 text-center">
              <p className="text-[10px] text-muted-foreground">Range</p>
              <p className="text-xs font-bold">
                {showPercent 
                  ? `${(distribution.stats.max - distribution.stats.min).toFixed(1)}%`
                  : `₹${(distribution.stats.max - distribution.stats.min).toFixed(0)}`}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
