/**
 * Strategy Comparison Modal
 * Side-by-side comparison of backtest results with diff highlighting
 */

import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Target,
  Activity,
  BarChart3,
  Percent,
  DollarSign,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

interface ComparisonResult {
  id: string;
  symbol: string;
  netProfit: number;
  winRate: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  totalTrades: number;
  sharpeRatio: number;
  cagr: number;
  equityCurve: number[];
  strategyName?: string;
  versionNumber?: string;
}

interface StrategyComparisonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: ComparisonResult[];
}

const chartColors = [
  'hsl(210, 100%, 55%)',
  'hsl(142, 76%, 45%)',
  'hsl(45, 93%, 47%)',
  'hsl(280, 87%, 65%)',
];

interface MetricConfig {
  key: keyof ComparisonResult;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  format: (value: number) => string;
  higherIsBetter: boolean;
}

const metrics: MetricConfig[] = [
  {
    key: 'netProfit',
    label: 'Net Profit',
    icon: DollarSign,
    format: (v) => `$${v.toLocaleString()}`,
    higherIsBetter: true,
  },
  {
    key: 'winRate',
    label: 'Win Rate',
    icon: Target,
    format: (v) => `${v.toFixed(1)}%`,
    higherIsBetter: true,
  },
  {
    key: 'profitFactor',
    label: 'Profit Factor',
    icon: TrendingUp,
    format: (v) => v.toFixed(2),
    higherIsBetter: true,
  },
  {
    key: 'maxDrawdownPercent',
    label: 'Max Drawdown',
    icon: TrendingDown,
    format: (v) => `${v.toFixed(1)}%`,
    higherIsBetter: false,
  },
  {
    key: 'sharpeRatio',
    label: 'Sharpe Ratio',
    icon: Activity,
    format: (v) => v.toFixed(2),
    higherIsBetter: true,
  },
  {
    key: 'cagr',
    label: 'CAGR',
    icon: Percent,
    format: (v) => `${v.toFixed(1)}%`,
    higherIsBetter: true,
  },
  {
    key: 'totalTrades',
    label: 'Total Trades',
    icon: BarChart3,
    format: (v) => v.toLocaleString(),
    higherIsBetter: true,
  },
];

function DiffBadge({ 
  value, 
  baseline, 
  higherIsBetter,
  format 
}: { 
  value: number; 
  baseline: number;
  higherIsBetter: boolean;
  format: (v: number) => string;
}) {
  if (value === baseline) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />
        Baseline
      </Badge>
    );
  }

  const diff = value - baseline;
  const percentDiff = baseline !== 0 ? (diff / Math.abs(baseline)) * 100 : 0;
  const isPositive = higherIsBetter ? diff > 0 : diff < 0;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'gap-1',
        isPositive ? 'text-profit border-profit/30 bg-profit/5' : 'text-loss border-loss/30 bg-loss/5'
      )}
    >
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}%
    </Badge>
  );
}

export function StrategyComparisonModal({
  open,
  onOpenChange,
  results,
}: StrategyComparisonModalProps) {
  // Prepare equity curve data for chart
  const equityChartData = useMemo(() => {
    if (results.length === 0) return [];
    const maxLength = Math.max(...results.map(r => r.equityCurve.length));
    return Array.from({ length: maxLength }, (_, i) => {
      const point: Record<string, number> = { point: i };
      results.forEach((r, idx) => {
        point[`equity${idx}`] = r.equityCurve[i] || r.equityCurve[r.equityCurve.length - 1] || 0;
      });
      return point;
    });
  }, [results]);

  // Prepare radar chart data
  const radarData = useMemo(() => {
    // Normalize metrics to 0-100 scale for radar chart
    const normalize = (values: number[], higherIsBetter: boolean) => {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      return values.map(v => {
        const normalized = ((v - min) / range) * 100;
        return higherIsBetter ? normalized : 100 - normalized;
      });
    };

    const radarMetrics = ['winRate', 'profitFactor', 'sharpeRatio', 'cagr'] as const;
    
    return radarMetrics.map(metricKey => {
      const metric = metrics.find(m => m.key === metricKey)!;
      const values = results.map(r => r[metricKey] as number);
      const normalized = normalize(values, metric.higherIsBetter);
      
      const point: Record<string, string | number> = { metric: metric.label };
      results.forEach((_, idx) => {
        point[`result${idx}`] = normalized[idx];
      });
      return point;
    });
  }, [results]);

  // Find best performer for each metric
  const bestPerformers = useMemo(() => {
    const best: Record<string, number> = {};
    metrics.forEach(metric => {
      const values = results.map((r, idx) => ({ idx, value: r[metric.key] as number }));
      if (metric.higherIsBetter) {
        best[metric.key] = values.reduce((a, b) => a.value > b.value ? a : b).idx;
      } else {
        best[metric.key] = values.reduce((a, b) => a.value < b.value ? a : b).idx;
      }
    });
    return best;
  }, [results]);

  const baseline = results[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Strategy Comparison
          </DialogTitle>
          <DialogDescription>
            Comparing {results.length} backtest results side-by-side
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Results Header Row */}
            <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${results.length}, 1fr)` }}>
              <div /> {/* Empty corner */}
              {results.map((result, idx) => (
                <div
                  key={result.id}
                  className="p-3 rounded-lg border"
                  style={{ borderLeftColor: chartColors[idx], borderLeftWidth: 3 }}
                >
                  <div className="font-medium truncate">
                    {result.strategyName || result.symbol}
                  </div>
                  {result.versionNumber && (
                    <Badge variant="outline" className="mt-1">
                      v{result.versionNumber}
                    </Badge>
                  )}
                  {idx === 0 && (
                    <Badge variant="secondary" className="mt-1 ml-1">
                      Baseline
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Metrics Comparison Table */}
            <div className="border rounded-lg overflow-hidden">
              {metrics.map((metric, metricIdx) => (
                <div
                  key={metric.key}
                  className={cn(
                    'grid gap-4 p-3',
                    metricIdx % 2 === 0 && 'bg-muted/30'
                  )}
                  style={{ gridTemplateColumns: `200px repeat(${results.length}, 1fr)` }}
                >
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <metric.icon className="h-4 w-4 text-muted-foreground" />
                    {metric.label}
                  </div>
                  {results.map((result, idx) => {
                    const value = result[metric.key] as number;
                    const isBest = bestPerformers[metric.key] === idx;
                    
                    return (
                      <div key={result.id} className="flex flex-col gap-1">
                        <div className={cn(
                          'font-mono text-sm',
                          isBest && 'font-semibold text-primary'
                        )}>
                          {metric.format(value)}
                          {isBest && <Trophy className="inline h-3 w-3 ml-1 text-amber-500" />}
                        </div>
                        {idx > 0 && (
                          <DiffBadge
                            value={value}
                            baseline={baseline[metric.key] as number}
                            higherIsBetter={metric.higherIsBetter}
                            format={metric.format}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Equity Curves */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-4">Equity Curves</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={equityChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="point" tick={false} />
                      <YAxis 
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Equity']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                      />
                      <Legend />
                      {results.map((result, idx) => (
                        <Line
                          key={result.id}
                          type="monotone"
                          dataKey={`equity${idx}`}
                          stroke={chartColors[idx]}
                          strokeWidth={2}
                          dot={false}
                          name={result.strategyName || result.symbol}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Radar Chart */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-4">Performance Profile</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis 
                        dataKey="metric" 
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <PolarRadiusAxis 
                        angle={30} 
                        domain={[0, 100]}
                        tick={{ fontSize: 10 }}
                      />
                      {results.map((result, idx) => (
                        <Radar
                          key={result.id}
                          name={result.strategyName || result.symbol}
                          dataKey={`result${idx}`}
                          stroke={chartColors[idx]}
                          fill={chartColors[idx]}
                          fillOpacity={0.1}
                          strokeWidth={2}
                        />
                      ))}
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Winner Summary */}
            <div className="border rounded-lg p-4 bg-gradient-to-r from-amber-500/5 to-transparent">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Overall Winner
              </h4>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  // Count wins per result
                  const winCounts = results.map(() => 0);
                  Object.values(bestPerformers).forEach(idx => {
                    winCounts[idx]++;
                  });
                  const maxWins = Math.max(...winCounts);
                  const winnerIdx = winCounts.indexOf(maxWins);
                  const winner = results[winnerIdx];
                  
                  return (
                    <div className="flex items-center gap-3">
                      <Badge 
                        style={{ backgroundColor: chartColors[winnerIdx], color: 'white' }}
                        className="text-sm px-3 py-1"
                      >
                        {winner.strategyName || winner.symbol}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Best in {maxWins} of {metrics.length} metrics
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
