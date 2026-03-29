/**
 * Cloud Dashboard
 * Aggregated statistics across all cloud-saved backtest results
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Cloud, TrendingUp, TrendingDown, BarChart3, Target,
  Loader2, RefreshCw, Calendar, ArrowUpRight, ArrowDownRight,
  Trophy, AlertTriangle, Activity, Percent, DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/StatCard';
import { PageTitle } from '@/components/ui/PageTitle';

import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchResults, type CloudResult } from '@/lib/cloudSync';
import { cn } from '@/lib/utils';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';

interface ParsedResult {
  id: string;
  created_at: string;
  symbol: string;
  netProfit: number;
  winRate: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  totalTrades: number;
  sharpeRatio: number;
  cagr: number;
  runAt: string;
}

function parseResult(result: CloudResult): ParsedResult {
  const summary = result.summary_json as Record<string, unknown>;
  return {
    id: result.id,
    created_at: result.created_at || new Date().toISOString(),
    symbol: (summary.symbol as string) || 'Unknown',
    netProfit: (summary.netProfit as number) || 0,
    winRate: (summary.winRate as number) || 0,
    profitFactor: (summary.profitFactor as number) || 0,
    maxDrawdownPercent: (summary.maxDrawdownPercent as number) || 0,
    totalTrades: (summary.totalTrades as number) || 0,
    sharpeRatio: (summary.sharpeRatio as number) || 0,
    cagr: (summary.cagr as number) || 0,
    runAt: (summary.runAt as string) || result.created_at || '',
  };
}

export default function CloudDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [results, setResults] = useState<ParsedResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [user]);

  async function loadResults() {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchResults();
      setResults(data.map(parseResult));
    } catch (error) {
      toast({
        title: 'Failed to load results',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  // Aggregated statistics
  const stats = useMemo(() => {
    if (results.length === 0) {
      return {
        totalProfit: 0,
        avgWinRate: 0,
        avgProfitFactor: 0,
        avgDrawdown: 0,
        avgSharpe: 0,
        totalTrades: 0,
        profitableCount: 0,
        losingCount: 0,
        bestResult: null as ParsedResult | null,
        worstResult: null as ParsedResult | null,
      };
    }

    const totalProfit = results.reduce((sum, r) => sum + r.netProfit, 0);
    const avgWinRate = results.reduce((sum, r) => sum + r.winRate, 0) / results.length;
    const avgProfitFactor = results.reduce((sum, r) => sum + r.profitFactor, 0) / results.length;
    const avgDrawdown = results.reduce((sum, r) => sum + r.maxDrawdownPercent, 0) / results.length;
    const avgSharpe = results.reduce((sum, r) => sum + r.sharpeRatio, 0) / results.length;
    const totalTrades = results.reduce((sum, r) => sum + r.totalTrades, 0);
    const profitableCount = results.filter(r => r.netProfit >= 0).length;
    const losingCount = results.filter(r => r.netProfit < 0).length;
    
    const sorted = [...results].sort((a, b) => b.netProfit - a.netProfit);
    const bestResult = sorted[0];
    const worstResult = sorted[sorted.length - 1];

    return {
      totalProfit,
      avgWinRate,
      avgProfitFactor,
      avgDrawdown,
      avgSharpe,
      totalTrades,
      profitableCount,
      losingCount,
      bestResult,
      worstResult,
    };
  }, [results]);

  // Performance over time (cumulative profit by date)
  const performanceTrend = useMemo(() => {
    if (results.length === 0) return [];

    const sorted = [...results].sort((a, b) => 
      new Date(a.runAt || a.created_at).getTime() - new Date(b.runAt || b.created_at).getTime()
    );

    let cumulative = 0;
    return sorted.map((r, i) => {
      cumulative += r.netProfit;
      return {
        date: new Date(r.runAt || r.created_at).toLocaleDateString(),
        profit: r.netProfit,
        cumulative,
        index: i + 1,
      };
    });
  }, [results]);

  // Performance by symbol
  const symbolPerformance = useMemo(() => {
    if (results.length === 0) return [];

    const bySymbol: Record<string, { profit: number; count: number; avgWinRate: number }> = {};
    
    results.forEach(r => {
      if (!bySymbol[r.symbol]) {
        bySymbol[r.symbol] = { profit: 0, count: 0, avgWinRate: 0 };
      }
      bySymbol[r.symbol].profit += r.netProfit;
      bySymbol[r.symbol].count += 1;
      bySymbol[r.symbol].avgWinRate += r.winRate;
    });

    return Object.entries(bySymbol)
      .map(([symbol, data]) => ({
        symbol,
        profit: data.profit,
        count: data.count,
        avgWinRate: data.avgWinRate / data.count,
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [results]);

  // Win/Loss distribution for pie chart
  const winLossData = useMemo(() => [
    { name: 'Profitable', value: stats.profitableCount, color: 'hsl(142, 76%, 45%)' },
    { name: 'Losing', value: stats.losingCount, color: 'hsl(0, 72%, 55%)' },
  ], [stats]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <Cloud className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-4">
              Please log in to view your cloud dashboard.
            </p>
            <Button asChild>
              <Link to="/login">Log In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageTitle 
          title="Cloud Dashboard" 
          subtitle={`Aggregated performance across ${results.length} saved backtest${results.length !== 1 ? 's' : ''}`}
        />
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadResults} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="default" asChild>
            <Link to="/saved-results">View All Results</Link>
          </Button>
        </div>
      </div>

      {results.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Data Yet</h2>
            <p className="text-muted-foreground mb-4">
              Save backtest results to the cloud to see aggregated statistics here.
            </p>
            <Button asChild>
              <Link to="/">Go to Workflow</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Net Profit"
              value={`₹${stats.totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              trend={stats.totalProfit >= 0 ? 'up' : 'down'}
              trendValue={`${results.length} backtests`}
              icon={<DollarSign className="h-5 w-5" />}
            />
            <StatCard
              title="Avg Win Rate"
              value={`${stats.avgWinRate.toFixed(1)}%`}
              trend={stats.avgWinRate >= 50 ? 'up' : 'down'}
              subtitle={stats.avgWinRate >= 55 ? 'Strong' : stats.avgWinRate >= 45 ? 'Moderate' : 'Weak'}
              icon={<Percent className="h-5 w-5" />}
            />
            <StatCard
              title="Avg Profit Factor"
              value={stats.avgProfitFactor.toFixed(2)}
              trend={stats.avgProfitFactor >= 1 ? 'up' : 'down'}
              subtitle={stats.avgProfitFactor >= 1.5 ? 'Excellent' : stats.avgProfitFactor >= 1 ? 'Good' : 'Needs work'}
              icon={<Target className="h-5 w-5" />}
            />
            <StatCard
              title="Avg Max Drawdown"
              value={`${stats.avgDrawdown.toFixed(1)}%`}
              trend={stats.avgDrawdown <= 15 ? 'up' : stats.avgDrawdown <= 25 ? 'neutral' : 'down'}
              subtitle={stats.avgDrawdown <= 10 ? 'Low risk' : stats.avgDrawdown <= 20 ? 'Moderate' : 'High risk'}
              icon={<Activity className="h-5 w-5" />}
            />
          </div>

          {/* Additional Stats Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-profit/10 p-2">
                  <Trophy className="h-5 w-5 text-profit" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono">{stats.profitableCount}</p>
                  <p className="text-xs text-muted-foreground">Profitable Backtests</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-loss/10 p-2">
                  <AlertTriangle className="h-5 w-5 text-loss" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono">{stats.losingCount}</p>
                  <p className="text-xs text-muted-foreground">Losing Backtests</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono">{stats.totalTrades.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Trades</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono">{stats.avgSharpe.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Avg Sharpe Ratio</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Cumulative Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Cumulative Performance Trend
                </CardTitle>
                <CardDescription>Profit accumulation over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="index" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        tickFormatter={(v) => `#${v}`}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                        width={55}
                      />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))', 
                          borderRadius: '8px' 
                        }}
                        formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Cumulative']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="cumulative" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary) / 0.2)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Win/Loss Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Win/Loss Distribution
                </CardTitle>
                <CardDescription>Profitable vs losing backtests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={winLossData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {winLossData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))', 
                          borderRadius: '8px' 
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance by Symbol */}
          {symbolPerformance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Performance by Symbol
                </CardTitle>
                <CardDescription>Net profit breakdown by trading symbol</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={symbolPerformance.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        type="number"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      />
                      <YAxis 
                        type="category"
                        dataKey="symbol"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))', 
                          borderRadius: '8px' 
                        }}
                        formatter={(v: number, name: string) => {
                          if (name === 'profit') return [`₹${v.toLocaleString()}`, 'Net Profit'];
                          return [v, name];
                        }}
                      />
                      <Bar 
                        dataKey="profit" 
                        fill="hsl(var(--primary))"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Best & Worst Performers */}
          <div className="grid gap-4 md:grid-cols-2">
            {stats.bestResult && (
              <Card className="border-profit/30 bg-profit/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 text-profit" />
                    Best Performer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold">{stats.bestResult.symbol}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(stats.bestResult.runAt || stats.bestResult.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold font-mono text-profit">
                        +₹{stats.bestResult.netProfit.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {stats.bestResult.winRate.toFixed(1)}% win rate
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {stats.worstResult && stats.worstResult.netProfit < 0 && (
              <Card className="border-loss/30 bg-loss/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowDownRight className="h-4 w-4 text-loss" />
                    Worst Performer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold">{stats.worstResult.symbol}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(stats.worstResult.runAt || stats.worstResult.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold font-mono text-loss">
                        ₹{stats.worstResult.netProfit.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {stats.worstResult.winRate.toFixed(1)}% win rate
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
