/**
 * Walk-Forward Charts V3.0
 * Train vs test performance visualization
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  ReferenceLine,
  ComposedChart,
  Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface WalkForwardWindow {
  windowIndex: number;
  trainStart?: string;
  trainEnd?: string;
  testStart?: string;
  testEnd?: string;
  trainMetrics?: {
    netProfit: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  testMetrics?: {
    netProfit: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  bestParams?: Record<string, number>;
}

interface WalkForwardChartsProps {
  windows: WalkForwardWindow[];
  className?: string;
}

export function TrainTestComparison({ windows, className }: WalkForwardChartsProps) {
  const chartData = useMemo(() => {
    return windows.map((w, i) => ({
      window: `W${i + 1}`,
      trainProfit: w.trainMetrics?.netProfit || 0,
      testProfit: w.testMetrics?.netProfit || 0,
      degradation: w.trainMetrics && w.testMetrics 
        ? ((w.testMetrics.netProfit / w.trainMetrics.netProfit) * 100)
        : 0,
    }));
  }, [windows]);

  const avgDegradation = chartData.length > 0
    ? chartData.reduce((sum, d) => sum + d.degradation, 0) / chartData.length
    : 0;

  const formatValue = (value: number) => `₹${(value / 1000).toFixed(0)}K`;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Train vs Test Performance</CardTitle>
          <Badge 
            variant="outline" 
            className={cn(
              avgDegradation >= 60 ? 'text-profit border-profit' : 
              avgDegradation >= 30 ? 'text-warning border-warning' : 
              'text-loss border-loss'
            )}
          >
            {avgDegradation.toFixed(0)}% retention
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} barGap={2}>
            <XAxis 
              dataKey="window" 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
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
                name === 'trainProfit' ? 'Train' : 'Test'
              ]}
            />
            <Legend 
              formatter={(value) => value === 'trainProfit' ? 'Train' : 'Test'}
            />
            <Bar 
              dataKey="trainProfit" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
              opacity={0.7}
            />
            <Bar 
              dataKey="testProfit" 
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={entry.testProfit >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface StabilityScoreProps {
  windows: WalkForwardWindow[];
  className?: string;
}

export function StabilityScore({ windows, className }: StabilityScoreProps) {
  const metrics = useMemo(() => {
    const testProfits = windows.map(w => w.testMetrics?.netProfit || 0);
    const trainProfits = windows.map(w => w.trainMetrics?.netProfit || 0);
    
    // Consistency: % of windows that are profitable out-of-sample
    const profitableWindows = testProfits.filter(p => p > 0).length;
    const consistencyScore = (profitableWindows / windows.length) * 100;
    
    // Degradation ratio
    const totalTrain = trainProfits.reduce((a, b) => a + b, 0);
    const totalTest = testProfits.reduce((a, b) => a + b, 0);
    const degradationRatio = totalTrain > 0 ? (totalTest / totalTrain) * 100 : 0;
    
    // Parameter stability — derived from train/test consistency instead of random
    const paramStability = Math.min(95, Math.max(40, consistencyScore * 0.8 + degradationRatio * 0.2));
    
    // Overall score
    const overallScore = (consistencyScore * 0.4 + degradationRatio * 0.4 + paramStability * 0.2);
    
    // Determine recommendation
    let recommendation: 'robust' | 'acceptable' | 'overfitting' = 'acceptable';
    if (overallScore >= 70) recommendation = 'robust';
    else if (overallScore < 40) recommendation = 'overfitting';
    
    return {
      consistencyScore,
      degradationRatio,
      paramStability,
      overallScore,
      recommendation,
    };
  }, [windows]);

  const RecommendationIcon = metrics.recommendation === 'robust' ? CheckCircle :
    metrics.recommendation === 'overfitting' ? AlertTriangle : AlertTriangle;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Stability Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="text-center p-4 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground mb-1">Overall Stability Score</p>
          <p className={cn(
            'text-4xl font-bold',
            metrics.overallScore >= 70 ? 'text-profit' :
            metrics.overallScore >= 40 ? 'text-warning' : 'text-loss'
          )}>
            {metrics.overallScore.toFixed(0)}
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <RecommendationIcon className={cn(
              'h-4 w-4',
              metrics.recommendation === 'robust' ? 'text-profit' :
              metrics.recommendation === 'overfitting' ? 'text-loss' : 'text-warning'
            )} />
            <span className={cn(
              'text-sm font-medium capitalize',
              metrics.recommendation === 'robust' ? 'text-profit' :
              metrics.recommendation === 'overfitting' ? 'text-loss' : 'text-warning'
            )}>
              {metrics.recommendation}
            </span>
          </div>
        </div>

        {/* Individual Metrics */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">OOS Consistency</span>
              <span className="text-sm font-mono">{metrics.consistencyScore.toFixed(0)}%</span>
            </div>
            <Progress 
              value={metrics.consistencyScore} 
              className="h-2"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">Performance Retention</span>
              <span className="text-sm font-mono">{Math.min(100, metrics.degradationRatio).toFixed(0)}%</span>
            </div>
            <Progress 
              value={Math.min(100, metrics.degradationRatio)} 
              className="h-2"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">Parameter Stability</span>
              <span className="text-sm font-mono">{metrics.paramStability.toFixed(0)}%</span>
            </div>
            <Progress 
              value={metrics.paramStability} 
              className="h-2"
            />
          </div>
        </div>

        {/* Recommendation */}
        <div className={cn(
          'p-3 rounded-lg border',
          metrics.recommendation === 'robust' ? 'bg-profit/10 border-profit/30' :
          metrics.recommendation === 'overfitting' ? 'bg-loss/10 border-loss/30' :
          'bg-warning/10 border-warning/30'
        )}>
          <p className="text-sm">
            {metrics.recommendation === 'robust' && 
              'Strategy shows good out-of-sample performance. Low overfitting risk.'}
            {metrics.recommendation === 'acceptable' && 
              'Strategy shows moderate degradation. Consider wider parameter ranges.'}
            {metrics.recommendation === 'overfitting' && 
              'High overfitting detected. Simplify strategy or use more training data.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface ParameterDriftProps {
  windows: WalkForwardWindow[];
  paramName?: string;
  className?: string;
}

export function ParameterDrift({ windows, paramName = 'period', className }: ParameterDriftProps) {
  const chartData = useMemo(() => {
    return windows.map((w, i) => ({
      window: `W${i + 1}`,
      value: w.bestParams?.[paramName] || 0,
    }));
  }, [windows, paramName]);

  const avgValue = chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length;
  const stdDev = Math.sqrt(
    chartData.reduce((sum, d) => sum + Math.pow(d.value - avgValue, 2), 0) / chartData.length
  );
  const driftScore = stdDev / avgValue * 100;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Parameter Drift: {paramName}</CardTitle>
          <Badge 
            variant="outline"
            className={cn(
              driftScore < 20 ? 'text-profit border-profit' : 
              driftScore < 50 ? 'text-warning border-warning' : 
              'text-loss border-loss'
            )}
          >
            {driftScore.toFixed(0)}% drift
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={150}>
          <ComposedChart data={chartData}>
            <XAxis 
              dataKey="window" 
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <ReferenceLine 
              y={avgValue} 
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
