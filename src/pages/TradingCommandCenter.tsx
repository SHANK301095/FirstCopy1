/**
 * Trading Command Center — Bloomberg-style unified institutional dashboard
 * Phase 7: All panels wired to real engines (no mock/random data)
 */
import { useState, useMemo, memo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, Shield, TrendingUp, TrendingDown, BarChart3, Zap,
  AlertTriangle, Target, Briefcase, Globe, Clock, Eye,
  ChevronRight, Radio, Gauge, Brain, Trophy, ArrowRightLeft, Play
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { PageTitle } from '@/components/ui/PageTitle';
import { useTradesDB } from '@/hooks/useTradesDB';
import { useStrategyIntelligence } from '@/hooks/useStrategyIntelligence';
import { useRegimeSnapshots } from '@/hooks/useRegimeSnapshots';
import { useAutoSelection } from '@/hooks/useAutoSelection';
import { Skeleton } from '@/components/ui/skeleton';
import { PageErrorBoundary } from '@/components/error/PageErrorBoundary';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { usePortfolioAllocation } from '@/hooks/usePortfolioAllocation';

// ── SYSTEM BAR ──
const SystemBar = memo(function SystemBar({ strategyCount, riskStatus }: { strategyCount: number; riskStatus: string }) {
  const [now, setNow] = useState(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  useEffect(() => {
    const t = setInterval(() => setNow(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })), 1000);
    return () => clearInterval(t);
  }, []);

  const riskColor = riskStatus === 'Normal'
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    : riskStatus === 'Warning'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      : 'bg-red-500/10 text-red-400 border-red-500/30';

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-card border border-border/50">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" /></span>
        <span className="text-xs font-mono text-muted-foreground">SYSTEM</span>
        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
      </div>
      <div className="h-4 w-px bg-border hidden sm:block" />
      <div className="flex items-center gap-4 flex-wrap text-xs font-mono">
        <span className="text-muted-foreground">UTC <span className="text-foreground">{now}</span></span>
        <span className="text-muted-foreground">Strategies <span className="text-foreground font-semibold">{strategyCount}</span></span>
        <span className="text-muted-foreground">Risk <Badge variant="outline" className={cn('text-[10px] ml-1', riskColor)}>{riskStatus}</Badge></span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild><Link to="/risk-dashboard"><Shield className="h-3 w-3 mr-1" />Risk Console</Link></Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild><Link to="/factory/monitoring"><Activity className="h-3 w-3 mr-1" />Monitor</Link></Button>
      </div>
    </div>
  );
});

// ── KPI STRIP (real trade data) ──
function KPIStrip({ trades, strategies }: { trades: any[]; strategies: any[] }) {
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayTrades = trades.filter(t => t.exit_time?.startsWith(today));
    const dailyPnl = todayTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    const totalPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);
    const wins = trades.filter(t => (t.pnl || 0) > 0).length;
    const winRate = trades.length > 0 ? ((wins / trades.length) * 100).toFixed(1) : '0';

    // Simple Sharpe proxy from last 90 days
    const recent = trades.slice(-90);
    const returns = recent.map(t => t.pnl || 0);
    const avgR = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdR = returns.length > 1 ? Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - avgR, 2), 0) / (returns.length - 1)) : 1;
    const sharpe = stdR > 0 ? (avgR / stdR * Math.sqrt(252)).toFixed(2) : '0.00';

    // Max DD from cumulative equity
    let peak = 0, maxDD = 0, cum = 0;
    for (const t of todayTrades) {
      cum += (t.pnl || 0);
      if (cum > peak) peak = cum;
      const dd = peak > 0 ? ((peak - cum) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
    }

    return [
      { label: 'Total PnL', value: `$${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, change: `${trades.length} trades`, up: totalPnl >= 0, icon: BarChart3 },
      { label: 'Daily PnL', value: `${dailyPnl >= 0 ? '+' : ''}$${dailyPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, change: `${todayTrades.length} today`, up: dailyPnl >= 0, icon: TrendingUp },
      { label: 'Active Strategies', value: String(strategies.length), change: `${strategies.filter(s => s.identity.status === 'active').length} active`, up: true, icon: Brain },
      { label: 'Win Rate', value: `${winRate}%`, change: `${wins}W / ${trades.length - wins}L`, up: Number(winRate) >= 50, icon: Target },
      { label: 'Max DD Today', value: maxDD > 0 ? `-${maxDD.toFixed(1)}%` : '0%', change: 'Limit: 3%', up: maxDD < 3, icon: Shield },
      { label: 'Sharpe (est)', value: sharpe, change: `${recent.length} samples`, up: Number(sharpe) >= 1, icon: Gauge },
    ];
  }, [trades, strategies]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {stats.map(k => (
        <Card key={k.label} className="bg-card border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</span>
              <k.icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="text-lg font-bold font-mono text-foreground">{k.value}</div>
            <span className={cn('text-[10px] font-mono', k.up ? 'text-emerald-400' : 'text-red-400')}>{k.change}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── MINI EQUITY (real trade PnL curve) ──
function MiniEquityPanel({ trades }: { trades: any[] }) {
  const data = useMemo(() => {
    if (trades.length === 0) return [];
    const sorted = [...trades].sort((a, b) => (a.exit_time || '').localeCompare(b.exit_time || ''));
    let cumPnl = 0;
    const points: { d: string; v: number }[] = [];
    const dailyMap = new Map<string, number>();
    for (const t of sorted) {
      const day = (t.exit_time || '').slice(0, 10);
      if (!day) continue;
      cumPnl += (t.pnl || 0);
      dailyMap.set(day, cumPnl);
    }
    for (const [day, val] of dailyMap) {
      points.push({ d: day, v: Math.round(val) });
    }
    return points.slice(-30);
  }, [trades]);

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Cumulative PnL (30d)</CardTitle>
          <Button variant="ghost" size="sm" className="h-6 text-[10px]" asChild><Link to="/analytics">Details <ChevronRight className="h-3 w-3" /></Link></Button>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        {data.length === 0 ? (
          <div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground">No trade data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data}>
              <defs><linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="d" hide />
              <YAxis hide domain={['dataMin - 500', 'dataMax + 500']} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`$${v.toLocaleString()}`, 'Cumulative PnL']} />
              <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" fill="url(#eqFill)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ── ACTIVE STRATEGIES (real intelligence data) ──
function ActiveStrategiesPanel({ strategies }: { strategies: any[] }) {
  const top = strategies.slice(0, 6);
  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Active Strategies</CardTitle>
          <Button variant="ghost" size="sm" className="h-6 text-[10px]" asChild><Link to="/strategy-intelligence">View All <ChevronRight className="h-3 w-3" /></Link></Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {top.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">No strategy profiles yet</div>
        ) : (
          <div className="space-y-1.5">
            {top.map(s => {
              const isReady = s.deploymentReadiness === 'ready';
              return (
                <div key={s.identity.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', isReady ? 'bg-emerald-500' : 'bg-amber-500')} />
                    <span className="text-xs font-medium truncate">{s.identity.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-muted-foreground font-mono">MMC {s.research.mmcCompositeScore}</span>
                    <Badge variant="outline" className={cn('text-[9px]', isReady ? 'text-emerald-400 border-emerald-500/30' : 'text-amber-400 border-amber-500/30')}>
                      {isReady ? 'Ready' : 'Review'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── MARKET REGIME (real regime snapshots) ──
function MarketRegimePanel({ snapshots }: { snapshots: any[] }) {
  const regimeColor: Record<string, string> = {
    trending: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    ranging: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    choppy: 'text-red-400 bg-red-500/10 border-red-500/30',
    volatile: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    low_volatility: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    breakout: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
  };

  // Deduplicate to latest per symbol
  const bySymbol = new Map<string, typeof snapshots[0]>();
  for (const s of snapshots) {
    if (!bySymbol.has(s.symbol) || s.computed_at > bySymbol.get(s.symbol)!.computed_at) {
      bySymbol.set(s.symbol, s);
    }
  }
  const latest = [...bySymbol.values()].slice(0, 6);

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Market Regimes</CardTitle>
          <Button variant="ghost" size="sm" className="h-6 text-[10px]" asChild><Link to="/regime-control">Details <ChevronRight className="h-3 w-3" /></Link></Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-1.5">
        {latest.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">No regime data — compute regimes from Regime Control Center</div>
        ) : latest.map(a => (
          <div key={a.symbol} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">{a.symbol}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn('text-[10px]', regimeColor[a.regime] || 'text-muted-foreground')}>{a.regime}</Badge>
              <span className="text-[10px] font-mono text-muted-foreground">{Math.round(a.confidence * 100)}%</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── RISK GUARDIAN (real from risk metrics) ──
function RiskGuardianPanel({ trades }: { trades: any[] }) {
  const metrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayTrades = trades.filter(t => t.exit_time?.startsWith(today));
    const dailyPnl = todayTrades.reduce((s, t) => s + (t.pnl || 0), 0);

    // Consecutive losses
    let consecLosses = 0, maxConsec = 0;
    for (const t of [...trades].reverse()) {
      if ((t.pnl || 0) < 0) { consecLosses++; maxConsec = Math.max(maxConsec, consecLosses); }
      else break;
    }

    // Total DD approximation from cumulative PnL
    let peak = 0, maxDD = 0, cum = 0;
    for (const t of trades) {
      cum += (t.pnl || 0);
      if (cum > peak) peak = cum;
      const dd = peak > 0 ? ((peak - cum) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
    }

    const dailyDDPct = Math.abs(dailyPnl) > 0 ? Math.min(Math.abs(dailyPnl / 10000) * 100, 10) : 0;

    return [
      { label: 'Daily DD', current: Number(dailyDDPct.toFixed(1)), limit: 3, severity: dailyDDPct > 2 ? 'warning' as const : 'normal' as const },
      { label: 'Total DD', current: Number(maxDD.toFixed(1)), limit: 8, severity: maxDD > 5 ? 'elevated' as const : maxDD > 3 ? 'warning' as const : 'normal' as const },
      { label: 'Consec. Losses', current: consecLosses, limit: 6, severity: consecLosses >= 4 ? 'warning' as const : 'normal' as const },
      { label: 'Open Trades', current: todayTrades.length, limit: 20, severity: todayTrades.length > 15 ? 'warning' as const : 'normal' as const },
    ];
  }, [trades]);

  const sevColor = { normal: 'text-emerald-400', warning: 'text-amber-400', elevated: 'text-orange-400', critical: 'text-red-400' };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Risk Guardian</CardTitle>
          <Button variant="ghost" size="sm" className="h-6 text-[10px]" asChild><Link to="/risk-guardian">Console <ChevronRight className="h-3 w-3" /></Link></Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-3">
        {metrics.map(r => (
          <div key={r.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">{r.label}</span>
              <span className={cn('text-[10px] font-mono', sevColor[r.severity])}>
                {r.current} / {r.limit}{typeof r.limit === 'number' && r.limit < 100 ? (r.label.includes('DD') ? '%' : '') : ''}
              </span>
            </div>
            <Progress value={Math.min((r.current / r.limit) * 100, 100)} className="h-1.5" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── AUTO-SELECTION MINI ──
function AutoSelectionMini() {
  const { lastRun, replacements, running, runSelection, isEmpty } = useAutoSelection();
  const selected = lastRun?.selected || [];
  const rejected = lastRun?.rejected || [];

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Auto-Selection</CardTitle>
          <div className="flex gap-1">
            {!isEmpty && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => runSelection('manual')} disabled={running}>
                <Play className="h-3 w-3" />{running ? 'Running...' : 'Run'}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-6 text-[10px]" asChild>
              <Link to="/strategy-auto-selection">Details <ChevronRight className="h-3 w-3" /></Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {!lastRun ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            {isEmpty ? 'Needs strategy intelligence data' : 'Click Run to evaluate strategies'}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><div className="text-lg font-bold text-emerald-400">{selected.length}</div><div className="text-[10px] text-muted-foreground">Selected</div></div>
              <div><div className="text-lg font-bold text-red-400">{rejected.length}</div><div className="text-[10px] text-muted-foreground">Rejected</div></div>
              <div><div className="text-lg font-bold text-amber-400">{replacements.length}</div><div className="text-[10px] text-muted-foreground">Replaced</div></div>
            </div>
            {replacements.length > 0 && (
              <div className="p-2 rounded border border-amber-500/30 bg-amber-500/5 text-[10px]">
                <div className="flex items-center gap-1 text-amber-400 mb-1">
                  <ArrowRightLeft className="h-3 w-3" /> Rotation detected
                </div>
                <span className="text-muted-foreground">{replacements[0].outgoing_strategy_name} → {replacements[0].incoming_strategy_name || 'No replacement'}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── RANKING BOARD ──
function RankingBoard({ strategies }: { strategies: any[] }) {
  const sorted = [...strategies].sort((a, b) => b.research.mmcCompositeScore - a.research.mmcCompositeScore).slice(0, 8);
  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Strategy Ranking</CardTitle>
          <Button variant="ghost" size="sm" className="h-6 text-[10px]" asChild><Link to="/factory/leaderboard">Full Board <ChevronRight className="h-3 w-3" /></Link></Button>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        {sorted.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">No strategy profiles yet</div>
        ) : (
          <div className="w-full min-w-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border/40">
                <th className="text-left px-2 py-1.5 text-[10px] text-muted-foreground font-medium">#</th>
                <th className="text-left px-2 py-1.5 text-[10px] text-muted-foreground font-medium">Strategy</th>
                <th className="text-right px-2 py-1.5 text-[10px] text-muted-foreground font-medium">MMC</th>
                <th className="text-right px-2 py-1.5 text-[10px] text-muted-foreground font-medium">Win%</th>
                <th className="text-right px-2 py-1.5 text-[10px] text-muted-foreground font-medium">DD</th>
                <th className="text-right px-2 py-1.5 text-[10px] text-muted-foreground font-medium">Sharpe</th>
              </tr></thead>
              <tbody>
                {sorted.map((s, i) => (
                  <tr key={s.identity.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                    <td className="px-2 py-1.5 font-mono text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-1.5 font-medium truncate max-w-[120px]">{s.identity.name}</td>
                    <td className="px-2 py-1.5 text-right font-mono font-semibold text-primary">{s.research.mmcCompositeScore}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{s.performance.winRate}%</td>
                    <td className="px-2 py-1.5 text-right font-mono text-red-400">{s.performance.maxDrawdown}%</td>
                    <td className="px-2 py-1.5 text-right font-mono">{s.performance.sharpeRatio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── ALLOCATION MAP (Real Engine) ──
function AllocationMap() {
  const { result, computing, runAllocation, riskCheck } = usePortfolioAllocation();

  useEffect(() => { runAllocation(); }, []);

  const allocs = result?.allocations.slice(0, 6) || [];
  const colors = ['bg-primary', 'bg-emerald-500', 'bg-amber-500', 'bg-sky-500', 'bg-violet-500', 'bg-rose-500'];
  const total = allocs.reduce((a, b) => a + b.weight_pct, 0) || 1;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Capital Allocation</CardTitle>
          <div className="flex items-center gap-1.5">
            {riskCheck && !riskCheck.passed && (
              <Badge variant="destructive" className="text-[9px] h-4">Breach</Badge>
            )}
            {result && (
              <Badge variant="outline" className="text-[9px] h-4 font-mono">
                Div: {result.diversification_score}%
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="h-6 text-[10px]" asChild>
              <Link to="/factory/portfolio">Builder <ChevronRight className="h-3 w-3" /></Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-3">
        {computing ? (
          <Skeleton className="h-3 w-full rounded-full" />
        ) : allocs.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">No strategies allocated yet</div>
        ) : (
          <>
            <div className="flex h-3 rounded-full overflow-hidden">
              {allocs.map((a, i) => (
                <div key={a.strategy_id} className={cn(colors[i % colors.length], 'transition-all')} style={{ width: `${(a.weight_pct / total) * 100}%` }} />
              ))}
            </div>
            <div className="space-y-1.5">
              {allocs.map((a, i) => (
                <div key={a.strategy_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('h-2.5 w-2.5 rounded-sm', colors[i % colors.length])} />
                    <span className="text-xs truncate max-w-[100px]">{a.strategy_name}</span>
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1">{a.role}</Badge>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{a.weight_pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
            {result && (
              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                <span>Exp. DD: {result.portfolio_expected_dd.toFixed(1)}%</span>
                <span>Exp. Return: {result.portfolio_expected_return.toFixed(1)}%</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── MAIN PAGE ──
export default function TradingCommandCenter() {
  const { trades } = useTradesDB();
  const { strategies } = useStrategyIntelligence();
  const { snapshots } = useRegimeSnapshots();

  // Compute overall risk status from trade data
  const riskStatus = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayTrades = trades.filter(t => t.exit_time?.startsWith(today));
    const dailyPnl = todayTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    if (dailyPnl < -3000) return 'Critical';
    if (dailyPnl < -1000) return 'Warning';
    return 'Normal';
  }, [trades]);

  return (
    <PageErrorBoundary pageName="Trading Command Center">
      <div className="space-y-4 animate-fade-in">
        <PageTitle title="Trading Command Center" subtitle="Unified institutional trading intelligence — all data real-time from DB" />

        <SystemBar strategyCount={strategies.length} riskStatus={riskStatus} />
        <KPIStrip trades={trades} strategies={strategies} />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <MiniEquityPanel trades={trades} />
            <RankingBoard strategies={strategies} />
          </div>
          <div className="space-y-4">
            <ActiveStrategiesPanel strategies={strategies} />
            <RiskGuardianPanel trades={trades} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <MarketRegimePanel snapshots={snapshots} />
          <AllocationMap />
          <AutoSelectionMini />
        </div>
      </div>
    </PageErrorBoundary>
  );
}
