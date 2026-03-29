import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Bot, TrendingUp, TrendingDown, BarChart3, Calendar } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/dashboard/StatCard';
import { EquityChart, DrawdownChart } from '@/components/charts/EquityChart';
import { MonthlyHeatmap } from '@/components/charts/MonthlyHeatmap';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const CHART_COLORS = [
  'hsl(187, 100%, 50%)',
  'hsl(142, 76%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(262, 83%, 58%)',
  'hsl(0, 72%, 55%)',
  'hsl(200, 80%, 50%)',
];

export default function EAProfile() {
  const { eaId } = useParams<{ eaId: string }>();
  const { eas, results, batches } = useStore();

  const ea = eas.find((e) => e.id === eaId);
  const eaResults = results.filter((r) => r.eaId === eaId);

  if (!ea) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center border-dashed">
          <CardContent className="py-12">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">EA Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested Expert Advisor doesn't exist.</p>
            <Button asChild>
              <Link to="/ea-manager">Back to EA Manager</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate aggregate statistics
  const totalProfit = eaResults.reduce((sum, r) => sum + r.netProfit, 0);
  const avgPF = eaResults.length > 0
    ? eaResults.reduce((sum, r) => sum + r.profitFactor, 0) / eaResults.length
    : 0;
  const avgWinRate = eaResults.length > 0
    ? eaResults.reduce((sum, r) => sum + r.winRate, 0) / eaResults.length
    : 0;
  const avgDD = eaResults.length > 0
    ? eaResults.reduce((sum, r) => sum + r.relativeDrawdown, 0) / eaResults.length
    : 0;
  const totalTrades = eaResults.reduce((sum, r) => sum + r.totalTrades, 0);

  // Best and worst results
  const sortedByProfit = [...eaResults].sort((a, b) => b.netProfit - a.netProfit);
  const bestResult = sortedByProfit[0];
  const worstResult = sortedByProfit[sortedByProfit.length - 1];

  // Performance by symbol
  const symbolStats = eaResults.reduce((acc, r) => {
    if (!acc[r.symbol]) {
      acc[r.symbol] = { profit: 0, count: 0, avgPF: 0 };
    }
    acc[r.symbol].profit += r.netProfit;
    acc[r.symbol].count += 1;
    acc[r.symbol].avgPF += r.profitFactor;
    return acc;
  }, {} as Record<string, { profit: number; count: number; avgPF: number }>);

  Object.keys(symbolStats).forEach((s) => {
    symbolStats[s].avgPF = symbolStats[s].avgPF / symbolStats[s].count;
  });

  // Performance by timeframe
  const tfStats = eaResults.reduce((acc, r) => {
    if (!acc[r.timeframe]) {
      acc[r.timeframe] = { profit: 0, count: 0, avgPF: 0 };
    }
    acc[r.timeframe].profit += r.netProfit;
    acc[r.timeframe].count += 1;
    acc[r.timeframe].avgPF += r.profitFactor;
    return acc;
  }, {} as Record<string, { profit: number; count: number; avgPF: number }>);

  Object.keys(tfStats).forEach((tf) => {
    tfStats[tf].avgPF = tfStats[tf].avgPF / tfStats[tf].count;
  });

  // Aggregate monthly returns
  const aggregatedMonthly: Record<string, number> = {};
  eaResults.forEach((r) => {
    if (r.monthlyReturns) {
      Object.entries(r.monthlyReturns).forEach(([month, value]) => {
        aggregatedMonthly[month] = (aggregatedMonthly[month] || 0) + value / eaResults.length;
      });
    }
  });

  // Prepare equity comparison data
  const maxPoints = Math.max(...eaResults.filter(r => r.equityCurve).map(r => r.equityCurve!.length), 0);
  const equityComparisonData = Array.from({ length: Math.min(maxPoints, 100) }, (_, i) => {
    const point: Record<string, number | string> = { point: i };
    eaResults.forEach((r, idx) => {
      if (r.equityCurve && r.equityCurve[i] !== undefined) {
        point[`${r.symbol}_${r.timeframe}`] = r.equityCurve[i];
      }
    });
    return point;
  });

  const equityKeys = [...new Set(eaResults.map(r => `${r.symbol}_${r.timeframe}`))];

  const getRiskBadgeColor = (risk: typeof ea.riskProfile) => {
    switch (risk) {
      case 'conservative': return 'bg-profit/20 text-profit';
      case 'moderate': return 'bg-warning/20 text-warning';
      case 'aggressive': return 'bg-loss/20 text-loss';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/ea-manager">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-3">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{ea.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-sm text-muted-foreground">v{ea.version}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', getRiskBadgeColor(ea.riskProfile))}>
                    {ea.riskProfile}
                  </span>
                </div>
              </div>
            </div>
            {ea.strategyNotes && (
              <p className="mt-3 text-muted-foreground max-w-2xl">{ea.strategyNotes}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/leaderboard">View in Leaderboard</Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title="Total Net Profit"
          value={`$${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          trend={totalProfit >= 0 ? 'up' : 'down'}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Avg Profit Factor"
          value={avgPF.toFixed(2)}
          trend={avgPF >= 1 ? 'up' : 'down'}
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <StatCard
          title="Avg Win Rate"
          value={`${avgWinRate.toFixed(1)}%`}
          trend={avgWinRate >= 50 ? 'up' : 'down'}
        />
        <StatCard
          title="Avg Drawdown"
          value={`${avgDD.toFixed(1)}%`}
          trend={avgDD <= 15 ? 'up' : 'down'}
        />
        <StatCard
          title="Total Trades"
          value={totalTrades.toLocaleString()}
          subtitle={`${eaResults.length} backtest results`}
        />
      </div>

      {/* Best/Worst Performance */}
      {bestResult && worstResult && eaResults.length > 1 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card variant="stat" className="border-profit/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-profit flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Best Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold font-mono text-profit">
                  ${bestResult.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-sm text-muted-foreground">
                  {bestResult.symbol} {bestResult.timeframe}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">PF:</span>{' '}
                  <span className="font-mono">{bestResult.profitFactor.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">DD:</span>{' '}
                  <span className="font-mono">{bestResult.relativeDrawdown.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Win:</span>{' '}
                  <span className="font-mono">{bestResult.winRate.toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="stat" className="border-loss/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-loss flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Worst Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-2">
                <span className={cn('text-2xl font-bold font-mono', worstResult.netProfit >= 0 ? 'text-profit' : 'text-loss')}>
                  ${worstResult.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-sm text-muted-foreground">
                  {worstResult.symbol} {worstResult.timeframe}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">PF:</span>{' '}
                  <span className="font-mono">{worstResult.profitFactor.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">DD:</span>{' '}
                  <span className="font-mono">{worstResult.relativeDrawdown.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Win:</span>{' '}
                  <span className="font-mono">{worstResult.winRate.toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Equity Comparison Chart */}
      {equityComparisonData.length > 0 && equityKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Equity Curve Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={equityComparisonData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                <XAxis dataKey="point" hide />
                <YAxis
                  tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(222, 47%, 8%)',
                    border: '1px solid hsl(222, 30%, 18%)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [
                    `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                    name,
                  ]}
                />
                <Legend />
                {equityKeys.slice(0, 6).map((key, idx) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Performance Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Symbol */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance by Symbol</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(symbolStats)
                .sort((a, b) => b[1].profit - a[1].profit)
                .map(([symbol, stats]) => (
                  <div key={symbol} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <span className="font-mono font-semibold truncate">{symbol}</span>
                      <span className="text-xs text-muted-foreground ml-2">({stats.count} tests)</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 text-sm shrink-0">
                      <div className={cn('font-mono text-xs sm:text-sm', stats.profit >= 0 ? 'text-profit' : 'text-loss')}>
                        ${stats.profit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
                        PF: <span className={cn('font-mono', stats.avgPF >= 1 ? 'text-profit' : 'text-loss')}>
                          {stats.avgPF.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              {Object.keys(symbolStats).length === 0 && (
                <p className="text-center text-muted-foreground py-4">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* By Timeframe */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance by Timeframe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(tfStats)
                .sort((a, b) => b[1].profit - a[1].profit)
                .map(([tf, stats]) => (
                  <div key={tf} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <span className="font-mono font-semibold truncate">{tf}</span>
                      <span className="text-xs text-muted-foreground ml-2">({stats.count} tests)</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 text-sm shrink-0">
                      <div className={cn('font-mono text-xs sm:text-sm', stats.profit >= 0 ? 'text-profit' : 'text-loss')}>
                        ${stats.profit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
                        PF: <span className={cn('font-mono', stats.avgPF >= 1 ? 'text-profit' : 'text-loss')}>
                          {stats.avgPF.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              {Object.keys(tfStats).length === 0 && (
                <p className="text-center text-muted-foreground py-4">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Heatmap */}
      {Object.keys(aggregatedMonthly).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Monthly Performance (Averaged)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyHeatmap data={aggregatedMonthly} />
          </CardContent>
        </Card>
      )}

      {/* Full Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Full Backtest History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Timeframe</th>
                  <th className="text-right">Net Profit</th>
                  <th className="text-right">PF</th>
                  <th className="text-right">DD %</th>
                  <th className="text-right">Recovery</th>
                  <th className="text-right">Trades</th>
                  <th className="text-right">Win %</th>
                  <th className="text-right">Avg Trade</th>
                  <th className="text-right">Sharpe</th>
                  <th>Imported</th>
                </tr>
              </thead>
              <tbody>
                {eaResults
                  .sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime())
                  .map((result) => (
                    <tr key={result.id}>
                      <td className="font-mono">{result.symbol}</td>
                      <td className="font-mono">{result.timeframe}</td>
                      <td className={cn('text-right font-mono', result.netProfit >= 0 ? 'text-profit' : 'text-loss')}>
                        ${result.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className={cn('text-right font-mono', result.profitFactor >= 1 ? 'text-profit' : 'text-loss')}>
                        {result.profitFactor.toFixed(2)}
                      </td>
                      <td className="text-right font-mono text-loss">
                        {result.relativeDrawdown.toFixed(1)}%
                      </td>
                      <td className="text-right font-mono">
                        {result.recoveryFactor.toFixed(2)}
                      </td>
                      <td className="text-right font-mono">{result.totalTrades}</td>
                      <td className={cn('text-right font-mono', result.winRate >= 50 ? 'text-profit' : 'text-loss')}>
                        {result.winRate.toFixed(1)}%
                      </td>
                      <td className={cn('text-right font-mono', result.avgTrade >= 0 ? 'text-profit' : 'text-loss')}>
                        ${result.avgTrade.toFixed(2)}
                      </td>
                      <td className="text-right font-mono text-muted-foreground">
                        {result.sharpeRatio?.toFixed(2) || '-'}
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {new Date(result.importedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {eaResults.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No backtest results for this EA yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
