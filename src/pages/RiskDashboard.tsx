/**
 * VaR/ES Risk Dashboard — REAL data from user's closed trades
 * Uses riskMetrics.ts for actual VaR/CVaR calculations
 */

import { useState, useMemo } from 'react';
import { 
  Shield, AlertTriangle, TrendingDown, BarChart3, Target,
  AlertCircle, CheckCircle, Settings, Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { StatCardClean, StatCardGrid } from '@/components/ui/StatCardClean';
import { PageTitle } from '@/components/ui/PageTitle';
import { useTradesDB } from '@/hooks/useTradesDB';
import { calculateRiskMetrics } from '@/lib/riskMetrics';

interface RiskLimit {
  id: string;
  name: string;
  description: string;
  value: number;
  current: number;
  enabled: boolean;
  type: 'max' | 'min';
}

export default function RiskDashboard() {
  const { trades, loading } = useTradesDB();
  const [portfolioValue, setPortfolioValue] = useState(500000);
  const [confidenceLevel, setConfidenceLevel] = useState(95);
  const [timeHorizon, setTimeHorizon] = useState(1);

  // Compute real metrics from closed trades using DAILY returns
  const { metrics, returnDistribution, hasData, closedCount, tradingDays, todayLoss } = useMemo(() => {
    const closed = trades.filter(t => t.status === 'closed' && t.net_pnl != null);
    if (closed.length === 0) {
      return { metrics: null, returnDistribution: [], hasData: false, closedCount: 0, tradingDays: 0, todayLoss: 0 };
    }

    // Group trades by date → daily PnL
    const dailyPnlMap = new Map<string, number>();
    for (const t of closed) {
      const day = t.entry_time.slice(0, 10); // YYYY-MM-DD
      dailyPnlMap.set(day, (dailyPnlMap.get(day) ?? 0) + (t.net_pnl ?? 0));
    }
    const numDays = dailyPnlMap.size;

    // Today's loss (for risk limit)
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayPnl = dailyPnlMap.get(todayStr) ?? 0;
    const todayLoss = todayPnl < 0 ? Math.abs(todayPnl) : 0;

    if (numDays < 10) {
      return { metrics: null, returnDistribution: [], hasData: false, closedCount: closed.length, tradingDays: numDays, todayLoss };
    }

    // Daily returns as % of portfolio
    const sortedDays = [...dailyPnlMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const dailyReturns = sortedDays.map(([, pnl]) => (pnl / portfolioValue) * 100);

    // Build equity curve from daily PnL
    let equity = portfolioValue;
    const equityCurve = [portfolioValue];
    for (const [, pnl] of sortedDays) {
      equity += pnl;
      equityCurve.push(equity);
    }

    const metrics = calculateRiskMetrics({
      returns: dailyReturns,
      equity: equityCurve,
      initialCapital: portfolioValue,
      riskFreeRate: 0,
      confidenceLevel: confidenceLevel / 100,
    });

    // Build empirical return distribution histogram
    const binSize = 0.5;
    const minReturn = Math.floor(Math.min(...dailyReturns));
    const maxReturn = Math.ceil(Math.max(...dailyReturns));
    const bins: { return: number; frequency: number; isNegative: boolean }[] = [];
    for (let b = minReturn; b <= maxReturn; b += binSize) {
      const count = dailyReturns.filter(r => r >= b && r < b + binSize).length;
      bins.push({ return: b + binSize / 2, frequency: count, isNegative: b < 0 });
    }

    return { metrics, returnDistribution: bins, hasData: true, closedCount: closed.length, tradingDays: numDays, todayLoss };
  }, [trades, portfolioValue, confidenceLevel]);

  const var95 = metrics?.var95 ?? 0;
  const var99 = metrics?.var99 ?? 0;
  const cvar95 = metrics?.cvar95 ?? 0;
  const cvar99 = metrics?.cvar99 ?? 0;

  const var95Value = portfolioValue * (var95 / 100);
  const var99Value = portfolioValue * (var99 / 100);
  const es95Value = portfolioValue * (cvar95 / 100);
  const es99Value = portfolioValue * (cvar99 / 100);

  // Risk limits — use real max drawdown and daily loss
  const currentDD = metrics?.maxDrawdownPercent ?? 0;
  const dailyLossPct = portfolioValue > 0 ? (todayLoss / portfolioValue) * 100 : 0;
  const openExposure = useMemo(() => {
    const openTrades = trades.filter(t => t.status === 'open');
    const totalExposed = openTrades.reduce((s, t) => s + t.entry_price * t.quantity, 0);
    return portfolioValue > 0 ? (totalExposed / portfolioValue) * 100 : 0;
  }, [trades, portfolioValue]);

  const [riskLimits, setRiskLimits] = useState<RiskLimit[]>([
    { id: 'max-dd', name: 'Max Portfolio Drawdown', description: 'Stop trading if exceeded', value: 15, current: 0, enabled: true, type: 'max' },
    { id: 'daily-loss', name: 'Daily Loss Cap', description: 'Maximum loss per day', value: 2, current: 0, enabled: true, type: 'max' },
    { id: 'exposure', name: 'Max Exposure', description: 'Maximum capital at risk', value: 80, current: 0, enabled: true, type: 'max' },
    { id: 'position', name: 'Max Single Position', description: 'Limit per position', value: 10, current: 0, enabled: false, type: 'max' },
  ]);

  // Update current values in risk limits from real data
  const activeLimits = riskLimits.map(l => {
    if (l.id === 'max-dd') return { ...l, current: currentDD };
    if (l.id === 'daily-loss') return { ...l, current: dailyLossPct };
    if (l.id === 'exposure') return { ...l, current: openExposure };
    return l;
  });

  const toggleLimit = (id: string) => {
    setRiskLimits(prev => prev.map(l => l.id === id ? { ...l, enabled: !l.enabled } : l));
  };

  const breachedLimits = activeLimits.filter(l => l.enabled && l.current >= l.value * 0.9);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <PageTitle 
          title="Risk Dashboard" 
          subtitle={hasData ? `Computed from ${closedCount} closed trades (empirical)` : 'VaR, Expected Shortfall, and Risk Controls'}
        />
        {breachedLimits.length > 0 && (
          <Alert variant="destructive" className="w-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              {breachedLimits.length} risk limit{breachedLimits.length > 1 ? 's' : ''} near breach
            </AlertDescription>
          </Alert>
        )}
      </div>

      {!hasData ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-lg font-medium mb-1">Need 10+ trading days of data</p>
            <p className="text-sm text-muted-foreground">
              Risk calculations require at least 10 trading days. Currently have {tradingDays} trading day{tradingDays !== 1 ? 's' : ''} from {closedCount} closed trade{closedCount !== 1 ? 's' : ''}.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.href = '/trades'}>
              Go to Trades →
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top Stats */}
          <StatCardGrid>
            <StatCardClean label="VaR 95%" value={`${var95.toFixed(2)}%`} icon={TrendingDown} variant="warning" subtitle={`₹${var95Value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
            <StatCardClean label="VaR 99%" value={`${var99.toFixed(2)}%`} icon={TrendingDown} variant="danger" subtitle={`₹${var99Value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
            <StatCardClean label="CVaR 95%" value={`${cvar95.toFixed(2)}%`} icon={AlertCircle} variant="warning" subtitle={`₹${es95Value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
            <StatCardClean label="CVaR 99%" value={`${cvar99.toFixed(2)}%`} icon={AlertCircle} variant="danger" subtitle={`₹${es99Value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
          </StatCardGrid>

          {/* Extra metrics row */}
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Sharpe Ratio</div><div className="text-xl font-bold font-mono">{metrics.sharpeRatio.toFixed(2)}</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Sortino Ratio</div><div className="text-xl font-bold font-mono">{metrics.sortinoRatio.toFixed(2)}</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Max Drawdown</div><div className="text-xl font-bold font-mono text-loss">{metrics.maxDrawdownPercent.toFixed(2)}%</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Kelly Fraction</div><div className="text-xl font-bold font-mono">{(metrics.kellyFraction * 100).toFixed(1)}%</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Skewness</div><div className="text-xl font-bold font-mono">{metrics.skewness.toFixed(2)}</div></CardContent></Card>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Portfolio Value (₹)</Label>
                  <Input type="number" value={portfolioValue} onChange={(e) => setPortfolioValue(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Confidence Level</Label>
                    <span className="text-sm font-mono text-primary">{confidenceLevel}%</span>
                  </div>
                  <Slider value={[confidenceLevel]} onValueChange={([v]) => setConfidenceLevel(v)} min={90} max={99} step={1} />
                </div>
                <div className="pt-4 border-t border-border/50">
                  <h4 className="text-sm font-medium mb-3">VaR Method</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Historical (empirical)</span>
                      <Badge>Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Parametric</span>
                      <Badge variant="outline">Coming Soon</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Return Distribution */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" /> Empirical Return Distribution
                </CardTitle>
                <CardDescription>
                  Based on {tradingDays} trading days · {closedCount} trades · Historical simulation
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={returnDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="return" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <ReferenceLine x={-var95} stroke="hsl(42 95% 52%)" strokeDasharray="5 5" label={{ value: `VaR 95%`, fill: 'hsl(42 95% 52%)', fontSize: 10 }} />
                      <ReferenceLine x={-var99} stroke="hsl(0 85% 55%)" strokeDasharray="5 5" label={{ value: `VaR 99%`, fill: 'hsl(0 85% 55%)', fontSize: 10 }} />
                      <Bar dataKey="frequency" radius={[2, 2, 0, 0]}>
                        {returnDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.isNegative ? 'hsl(0 80% 58%)' : 'hsl(152 75% 48%)'} opacity={0.7} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Risk Limits — always visible */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Risk Limits & Controls</CardTitle>
          <CardDescription>Set thresholds and monitor breaches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {activeLimits.map((limit) => {
              const usage = limit.value > 0 ? (limit.current / limit.value) * 100 : 0;
              const isWarning = usage >= 80;
              const isCritical = usage >= 95;
              return (
                <div key={limit.id} className={cn("p-4 rounded-xl border transition-all", !limit.enabled && "opacity-50", isCritical && limit.enabled && "border-destructive/50 bg-destructive/5", isWarning && !isCritical && limit.enabled && "border-warning/50 bg-warning/5", !isWarning && limit.enabled && "border-border/50")}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isCritical && limit.enabled ? <AlertTriangle className="h-4 w-4 text-destructive" /> : isWarning && limit.enabled ? <AlertCircle className="h-4 w-4 text-warning" /> : <CheckCircle className="h-4 w-4 text-success" />}
                      <div>
                        <h4 className="font-medium text-sm">{limit.name}</h4>
                        <p className="text-xs text-muted-foreground">{limit.description}</p>
                      </div>
                    </div>
                    <Switch checked={limit.enabled} onCheckedChange={() => toggleLimit(limit.id)} />
                  </div>
                  {limit.enabled && (
                    <>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Current: <span className="font-mono">{limit.current.toFixed(1)}%</span></span>
                        <span className="font-mono">Limit: {limit.value}%</span>
                      </div>
                      <Progress value={Math.min(100, usage)} variant={isCritical ? 'danger' : isWarning ? 'warning' : 'success'} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Alert className="border-primary/30 bg-primary/5">
        <Shield className="h-4 w-4" />
        <AlertTitle>About VaR & Expected Shortfall</AlertTitle>
        <AlertDescription className="mt-2 text-sm space-y-1">
          <p>• <strong>VaR (Value at Risk)</strong>: Maximum expected loss at a given confidence level — computed from your actual trade returns</p>
          <p>• <strong>CVaR (Expected Shortfall)</strong>: Average loss beyond VaR — captures tail risk better</p>
          <p>• All values are computed empirically (historical method) from your closed trades</p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
