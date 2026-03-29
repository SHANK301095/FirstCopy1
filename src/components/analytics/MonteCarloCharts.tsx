/**
 * Monte Carlo Chart V3.0
 * Equity fan chart with confidence bands
 */

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MonteCarloChartProps {
  simulations: number[][];
  percentiles?: {
    p5: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p95: number[];
  };
  initialCapital: number;
  className?: string;
}

export function MonteCarloFanChart({ 
  simulations, 
  percentiles,
  initialCapital,
  className 
}: MonteCarloChartProps) {
  const chartData = useMemo(() => {
    if (percentiles) {
      return percentiles.p50.map((_, i) => ({
        idx: i,
        p5: percentiles.p5[i],
        p25: percentiles.p25[i],
        p50: percentiles.p50[i],
        p75: percentiles.p75[i],
        p95: percentiles.p95[i],
      }));
    }

    // Calculate percentiles from simulations
    if (simulations.length === 0) return [];
    
    const numPoints = simulations[0]?.length || 0;
    const data = [];
    
    for (let i = 0; i < numPoints; i++) {
      const values = simulations.map(s => s[i]).sort((a, b) => a - b);
      const p5Idx = Math.floor(values.length * 0.05);
      const p25Idx = Math.floor(values.length * 0.25);
      const p50Idx = Math.floor(values.length * 0.5);
      const p75Idx = Math.floor(values.length * 0.75);
      const p95Idx = Math.floor(values.length * 0.95);
      
      data.push({
        idx: i,
        p5: values[p5Idx],
        p25: values[p25Idx],
        p50: values[p50Idx],
        p75: values[p75Idx],
        p95: values[p95Idx],
      });
    }
    
    return data;
  }, [simulations, percentiles]);

  const formatValue = (value: number) => {
    if (value >= 1e6) return `₹${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `₹${(value / 1e3).toFixed(0)}K`;
    return `₹${value.toFixed(0)}`;
  };

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          No simulation data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Equity Fan Chart (Monte Carlo)</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {simulations.length} simulations
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="p95Gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="p75Gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            
            <XAxis 
              dataKey="idx" 
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => [
                formatValue(value),
                name.toUpperCase().replace('P', '') + 'th Percentile'
              ]}
            />
            
            {/* 5-95 percentile band */}
            <Area
              type="monotone"
              dataKey="p95"
              stroke="none"
              fill="url(#p95Gradient)"
              stackId="band1"
            />
            
            {/* 25-75 percentile band */}
            <Area
              type="monotone"
              dataKey="p75"
              stroke="none"
              fill="url(#p75Gradient)"
              stackId="band2"
            />
            
            {/* Median line */}
            <Line
              type="monotone"
              dataKey="p50"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
            
            {/* 5th percentile (worst case) */}
            <Line
              type="monotone"
              dataKey="p5"
              stroke="hsl(var(--destructive))"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
            />
            
            {/* Initial capital reference */}
            <ReferenceLine 
              y={initialCapital} 
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
              label={{ value: 'Initial', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
          </AreaChart>
        </ResponsiveContainer>
        
        {/* Legend */}
        <div className="flex justify-center gap-6 mt-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-primary" />
            <span className="text-muted-foreground">Median (50th)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-primary/20 rounded" />
            <span className="text-muted-foreground">25-75th</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 border-t border-dashed border-destructive" />
            <span className="text-muted-foreground">Worst 5%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DrawdownDistributionProps {
  drawdowns: number[];
  className?: string;
}

export function DrawdownDistribution({ drawdowns, className }: DrawdownDistributionProps) {
  const histogramData = useMemo(() => {
    if (drawdowns.length === 0) return [];
    
    const bins = 20;
    const min = Math.min(...drawdowns);
    const max = Math.max(...drawdowns);
    const binSize = (max - min) / bins;
    
    const histogram: { bin: string; count: number; pct: number }[] = [];
    
    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binSize;
      const binEnd = binStart + binSize;
      const count = drawdowns.filter(d => d >= binStart && d < binEnd).length;
      
      histogram.push({
        bin: `${Math.abs(binStart).toFixed(0)}%`,
        count,
        pct: (count / drawdowns.length) * 100,
      });
    }
    
    return histogram;
  }, [drawdowns]);

  if (histogramData.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Max Drawdown Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={histogramData}>
            <defs>
              <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="bin" 
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Frequency']}
            />
            <Area
              type="monotone"
              dataKey="pct"
              stroke="hsl(var(--destructive))"
              fill="url(#ddGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
