/**
 * AI Insights Drilldown — 7-Category dedicated screens
 * Routes: /ai?tab=streaks|risk|time|emotions|benchmarks|quality|correlations
 * Expands AIAnalysisTabs into full-page views with richer charts + "Next Steps"
 */
import { useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageTitle } from '@/components/ui/PageTitle';
import { useTradesDB } from '@/hooks/useTradesDB';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain, TrendingUp, Shield, Clock, Heart, Target,
  BarChart3, GitBranch, AlertTriangle, ArrowRight,
  Flame, Lightbulb, CheckCircle2, XCircle
} from 'lucide-react';
import { safeNetPnl, MIN_SAMPLE_SIZE } from '@/lib/tradeMetrics';
import type { Trade, TradeStats } from '@/hooks/useTradesDB';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { key: 'streaks', label: 'Streaks', icon: Flame, color: 'text-orange-500' },
  { key: 'risk', label: 'Risk', icon: Shield, color: 'text-red-500' },
  { key: 'time', label: 'Time', icon: Clock, color: 'text-blue-500' },
  { key: 'emotions', label: 'Emotions', icon: Heart, color: 'text-pink-500' },
  { key: 'benchmarks', label: 'Benchmarks', icon: Target, color: 'text-emerald-500' },
  { key: 'quality', label: 'Quality', icon: BarChart3, color: 'text-amber-500' },
  { key: 'correlations', label: 'Correlations', icon: GitBranch, color: 'text-violet-500' },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

// ── Shared StatBox ──
function StatBox({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={cn("p-4 rounded-lg border text-center transition-colors", highlight ? "bg-primary/10 border-primary/30" : "bg-muted/50 border-border")}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function NextSteps({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          What To Do Next
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function InsufficientData({ needed = MIN_SAMPLE_SIZE }: { needed?: number }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Insufficient sample size. Need at least {needed} closed trades for this analysis.</p>
      </CardContent>
    </Card>
  );
}

// ── STREAK ANALYSIS ──
function StreakView({ trades, stats }: { trades: Trade[]; stats: TradeStats }) {
  const closed = useMemo(() => trades.filter(t => t.status === 'closed').sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime()), [trades]);
  
  const analysis = useMemo(() => {
    const streaks: { type: 'win' | 'loss'; length: number; pnl: number }[] = [];
    let cur: 'win' | 'loss' | null = null;
    let len = 0, pnl = 0;
    for (const t of closed) {
      const type = safeNetPnl(t) > 0 ? 'win' : 'loss';
      if (type === cur) { len++; pnl += safeNetPnl(t); }
      else { if (cur) streaks.push({ type: cur, length: len, pnl }); cur = type; len = 1; pnl = safeNetPnl(t); }
    }
    if (cur) streaks.push({ type: cur, length: len, pnl });
    
    const winStreaks = streaks.filter(s => s.type === 'win');
    const lossStreaks = streaks.filter(s => s.type === 'loss');
    const recoveryRate = lossStreaks.filter((s, i) => {
      const idx = streaks.indexOf(s);
      return streaks[idx + 1]?.type === 'win';
    }).length / Math.max(lossStreaks.length, 1) * 100;
    
    return { streaks, winStreaks, lossStreaks, recoveryRate };
  }, [closed]);

  if (closed.length < MIN_SAMPLE_SIZE) return <InsufficientData />;

  const nextSteps: string[] = [];
  if (stats.longestLossStreak >= 5) nextSteps.push("Your max loss streak is high. Consider reducing position size after 3 consecutive losses.");
  if (analysis.recoveryRate < 50) nextSteps.push("Recovery rate is below 50%. Take a break after losing streaks before re-entering.");
  if (stats.longestWinStreak >= 5) nextSteps.push("Great win streaks! Don't increase size during streaks — stay disciplined.");
  if (!nextSteps.length) nextSteps.push("Your streak patterns look healthy. Keep maintaining consistency.");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox label="Max Win Streak" value={String(stats.longestWinStreak)} highlight={stats.longestWinStreak >= 5} />
        <StatBox label="Max Loss Streak" value={String(stats.longestLossStreak)} highlight={stats.longestLossStreak >= 5} />
        <StatBox label="Recovery Rate" value={`${analysis.recoveryRate.toFixed(0)}%`} sub="Win after loss streak" />
        <StatBox label="Total Streaks" value={String(analysis.streaks.length)} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Streaks Timeline</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {analysis.streaks.slice(-20).map((s, i) => (
              <div key={i} className={cn("rounded px-2 py-1 text-xs font-mono", s.type === 'win' ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
                {s.type === 'win' ? 'W' : 'L'}{s.length}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <NextSteps items={nextSteps} />
    </div>
  );
}

// ── RISK ANALYSIS ──
function RiskView({ trades, stats }: { trades: Trade[]; stats: TradeStats }) {
  const closed = useMemo(() => trades.filter(t => t.status === 'closed'), [trades]);
  
  const analysis = useMemo(() => {
    if (closed.length < MIN_SAMPLE_SIZE) return null;
    const pnls = closed.map(t => safeNetPnl(t));
    const mean = pnls.reduce((s, v) => s + v, 0) / pnls.length;
    const variance = pnls.reduce((s, v) => s + (v - mean) ** 2, 0) / pnls.length;
    const stdDev = Math.sqrt(variance);
    const downside = pnls.filter(p => p < 0);
    const downsideVar = downside.length > 0 ? downside.reduce((s, v) => s + v ** 2, 0) / downside.length : 0;
    const downsideDev = Math.sqrt(downsideVar);
    const sharpe = stdDev > 0 ? mean / stdDev : 0;
    const sortino = downsideDev > 0 ? mean / downsideDev : 0;
    const maxDD = stats.maxDrawdown;
    const recoveryFactor = maxDD > 0 ? stats.totalPnL / maxDD : 0;
    const var95 = mean - 1.645 * stdDev;
    const var99 = mean - 2.326 * stdDev;
    const avgLoss = downside.length > 0 ? downside.reduce((s, v) => s + v, 0) / downside.length : 0;
    return { stdDev, sharpe, sortino, maxDD, recoveryFactor, var95, var99, avgLoss, mean };
  }, [closed, stats]);

  if (!analysis) return <InsufficientData />;

  const nextSteps: string[] = [];
  if (analysis.sharpe < 0.5) nextSteps.push("Sharpe below 0.5 — your risk-adjusted returns need improvement. Focus on higher R:R setups.");
  if (analysis.recoveryFactor < 1) nextSteps.push("Recovery factor below 1 — you haven't recovered from max drawdown yet. Reduce size.");
  if (analysis.sortino > 1) nextSteps.push("Great Sortino ratio! Your downside risk is well managed.");
  if (!nextSteps.length) nextSteps.push("Risk metrics look solid. Monitor VaR to keep losses within acceptable bounds.");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatBox label="Sharpe Ratio" value={analysis.sharpe.toFixed(2)} highlight={analysis.sharpe >= 1} />
        <StatBox label="Sortino Ratio" value={analysis.sortino.toFixed(2)} highlight={analysis.sortino >= 1} />
        <StatBox label="Max Drawdown" value={`₹${analysis.maxDD.toFixed(0)}`} />
        <StatBox label="Recovery Factor" value={analysis.recoveryFactor.toFixed(2)} highlight={analysis.recoveryFactor >= 2} />
        <StatBox label="VaR (95%)" value={`₹${analysis.var95.toFixed(0)}`} sub="Per trade worst case" />
        <StatBox label="VaR (99%)" value={`₹${analysis.var99.toFixed(0)}`} sub="Extreme scenario" />
        <StatBox label="Std Deviation" value={`₹${analysis.stdDev.toFixed(0)}`} />
        <StatBox label="Avg Loss" value={`₹${analysis.avgLoss.toFixed(0)}`} />
        <StatBox label="Avg P&L" value={`₹${analysis.mean.toFixed(0)}`} highlight={analysis.mean > 0} />
      </div>
      <NextSteps items={nextSteps} />
    </div>
  );
}

// ── TIME ANALYSIS ──
function TimeView({ trades }: { trades: Trade[] }) {
  const closed = useMemo(() => trades.filter(t => t.status === 'closed'), [trades]);
  
  const analysis = useMemo(() => {
    const byHour = new Map<number, { wins: number; total: number; pnl: number }>();
    const byDay = new Map<string, { wins: number; total: number; pnl: number }>();
    const bySession = new Map<string, { wins: number; total: number; pnl: number }>();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    closed.forEach(t => {
      const d = new Date(t.entry_time);
      const h = d.getHours();
      const day = days[d.getDay()];
      const session = t.session_tag || (h < 9 ? 'Pre-Market' : h < 15 ? 'Regular' : 'After-Hours');
      
      const hRec = byHour.get(h) || { wins: 0, total: 0, pnl: 0 };
      hRec.total++; if (safeNetPnl(t) > 0) hRec.wins++; hRec.pnl += safeNetPnl(t);
      byHour.set(h, hRec);
      
      const dRec = byDay.get(day) || { wins: 0, total: 0, pnl: 0 };
      dRec.total++; if (safeNetPnl(t) > 0) dRec.wins++; dRec.pnl += safeNetPnl(t);
      byDay.set(day, dRec);
      
      const sRec = bySession.get(session) || { wins: 0, total: 0, pnl: 0 };
      sRec.total++; if (safeNetPnl(t) > 0) sRec.wins++; sRec.pnl += safeNetPnl(t);
      bySession.set(session, sRec);
    });
    
    const hourEntries = [...byHour.entries()].sort((a, b) => a[0] - b[0]);
    const dayEntries = [...byDay.entries()];
    const sessionEntries = [...bySession.entries()].sort((a, b) => b[1].pnl - a[1].pnl);
    const bestHour = [...byHour.entries()].sort((a, b) => b[1].pnl - a[1].pnl)[0];
    const worstHour = [...byHour.entries()].sort((a, b) => a[1].pnl - b[1].pnl)[0];
    
    return { hourEntries, dayEntries, sessionEntries, bestHour, worstHour };
  }, [closed]);

  if (closed.length < MIN_SAMPLE_SIZE) return <InsufficientData />;

  const nextSteps: string[] = [];
  if (analysis.bestHour) nextSteps.push(`Your best hour is ${analysis.bestHour[0]}:00 with ₹${analysis.bestHour[1].pnl.toFixed(0)} P&L. Focus more trades here.`);
  if (analysis.worstHour && analysis.worstHour[1].pnl < 0) nextSteps.push(`Avoid trading at ${analysis.worstHour[0]}:00 — it costs you ₹${Math.abs(analysis.worstHour[1].pnl).toFixed(0)}.`);

  return (
    <div className="space-y-6">
      {/* Hour heatmap */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Hourly P&L Heatmap</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-1">
            {Array.from({ length: 24 }, (_, h) => {
              const data = analysis.hourEntries.find(([hour]) => hour === h)?.[1];
              const pnl = data?.pnl || 0;
              const maxPnl = Math.max(...analysis.hourEntries.map(([, d]) => Math.abs(d.pnl)), 1);
              const intensity = Math.min(Math.abs(pnl) / maxPnl, 1);
              return (
                <div key={h} className={cn("rounded p-1.5 text-center text-[10px] font-mono border", 
                  pnl > 0 ? "bg-emerald-500/20 border-emerald-500/30" : pnl < 0 ? "bg-red-500/20 border-red-500/30" : "bg-muted/30 border-border"
                )} style={{ opacity: 0.3 + intensity * 0.7 }}>
                  <div className="font-medium">{h}:00</div>
                  {data && <div className="text-[8px]">{data.total}t</div>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day + Session */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">By Day of Week</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {analysis.dayEntries.map(([day, data]) => (
              <div key={day} className="flex items-center gap-3">
                <span className="text-sm w-10 font-medium">{day}</span>
                <Progress value={(data.wins / data.total) * 100} className="flex-1 h-2" />
                <span className={cn("text-xs w-16 text-right font-mono", data.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>₹{data.pnl.toFixed(0)}</span>
                <span className="text-[10px] text-muted-foreground w-8 text-right">{data.total}t</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">By Session</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {analysis.sessionEntries.map(([session, data]) => (
              <div key={session} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                <span className="text-sm font-medium flex-1 truncate">{session}</span>
                <Badge variant={data.pnl > 0 ? 'default' : 'destructive'} className="text-[10px]">
                  {((data.wins / data.total) * 100).toFixed(0)}% WR
                </Badge>
                <span className={cn("text-xs font-mono", data.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>₹{data.pnl.toFixed(0)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <NextSteps items={nextSteps} />
    </div>
  );
}

// ── EMOTIONS ANALYSIS ──
function EmotionsView({ trades }: { trades: Trade[] }) {
  const closed = useMemo(() => trades.filter(t => t.status === 'closed'), [trades]);
  
  const analysis = useMemo(() => {
    const byEmotion = new Map<string, { wins: number; total: number; pnl: number; rMultiples: number[] }>();
    closed.forEach(t => {
      (t.emotions || []).forEach(e => {
        const rec = byEmotion.get(e) || { wins: 0, total: 0, pnl: 0, rMultiples: [] };
        rec.total++; if (safeNetPnl(t) > 0) rec.wins++; rec.pnl += safeNetPnl(t);
        if (t.r_multiple != null) rec.rMultiples.push(t.r_multiple);
        byEmotion.set(e, rec);
      });
    });
    return [...byEmotion.entries()]
      .map(([emotion, data]) => ({
        emotion,
        winRate: (data.wins / data.total) * 100,
        trades: data.total,
        pnl: data.pnl,
        avgR: data.rMultiples.length > 0 ? data.rMultiples.reduce((s, v) => s + v, 0) / data.rMultiples.length : null,
      }))
      .sort((a, b) => b.trades - a.trades);
  }, [closed]);

  const tagged = closed.filter(t => t.emotions?.length);
  if (tagged.length < 5) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Heart className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Tag emotions on at least 5 trades to see analysis.</p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <a href="/trades">Go to Trades</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const nextSteps: string[] = [];
  const worst = analysis.filter(e => e.pnl < 0).sort((a, b) => a.pnl - b.pnl)[0];
  const best = analysis.filter(e => e.pnl > 0).sort((a, b) => b.pnl - a.pnl)[0];
  if (worst) nextSteps.push(`"${worst.emotion}" costs you ₹${Math.abs(worst.pnl).toFixed(0)}. Build a pre-trade pause when feeling this.`);
  if (best) nextSteps.push(`"${best.emotion}" correlates with ₹${best.pnl.toFixed(0)} profit. Cultivate this mindset.`);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {analysis.map(e => (
          <Card key={e.emotion}>
            <CardContent className="py-3 flex items-center gap-4">
              <div className="w-24 shrink-0">
                <p className="text-sm font-semibold">{e.emotion}</p>
                <p className="text-[10px] text-muted-foreground">{e.trades} trades</p>
              </div>
              <div className="flex-1 space-y-1">
                <Progress value={e.winRate} className="h-2" />
                <p className="text-[10px] text-muted-foreground">{e.winRate.toFixed(0)}% win rate</p>
              </div>
              <div className="text-right shrink-0">
                <p className={cn("text-sm font-mono font-bold", e.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                  ₹{e.pnl.toFixed(0)}
                </p>
                {e.avgR != null && <p className="text-[10px] text-muted-foreground">{e.avgR.toFixed(1)}R avg</p>}
              </div>
              {e.pnl >= 0 ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" /> : <XCircle className="h-5 w-5 text-red-500 shrink-0" />}
            </CardContent>
          </Card>
        ))}
      </div>
      <NextSteps items={nextSteps} />
    </div>
  );
}

// ── BENCHMARKS ──
function BenchmarksView({ trades, stats }: { trades: Trade[]; stats: TradeStats }) {
  const closed = useMemo(() => trades.filter(t => t.status === 'closed'), [trades]);

  const periods = useMemo(() => {
    const now = Date.now();
    const ranges = [
      { label: 'Last 7 Days', ms: 7 * 86400000 },
      { label: 'Last 30 Days', ms: 30 * 86400000 },
      { label: 'Last 90 Days', ms: 90 * 86400000 },
    ];
    return ranges.map(r => {
      const filtered = closed.filter(t => now - new Date(t.entry_time).getTime() < r.ms);
      const wins = filtered.filter(t => safeNetPnl(t) > 0).length;
      const pnl = filtered.reduce((s, t) => s + safeNetPnl(t), 0);
      const winRate = filtered.length > 0 ? (wins / filtered.length) * 100 : 0;
      const grossWins = filtered.filter(t => safeNetPnl(t) > 0).reduce((s, t) => s + safeNetPnl(t), 0);
      const grossLosses = Math.abs(filtered.filter(t => safeNetPnl(t) < 0).reduce((s, t) => s + safeNetPnl(t), 0));
      const pf = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;
      return { ...r, trades: filtered.length, winRate, pnl, profitFactor: pf };
    });
  }, [closed]);

  if (closed.length < MIN_SAMPLE_SIZE) return <InsufficientData />;

  const benchmarks = [
    { label: 'Win Rate', yours: stats.winRate, target: 50, unit: '%' },
    { label: 'Profit Factor', yours: stats.profitFactor, target: 1.5, unit: 'x' },
    { label: 'Expectancy', yours: stats.expectancy, target: 0, unit: '₹' },
    { label: 'Avg R-Multiple', yours: stats.avgRMultiple, target: 1, unit: 'R' },
  ];

  return (
    <div className="space-y-6">
      {/* Overall vs Benchmark */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Your Metrics vs Benchmarks</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {benchmarks.map(b => (
            <div key={b.label} className="flex items-center gap-3 p-2 rounded bg-muted/30">
              <span className="text-sm w-32">{b.label}</span>
              <Badge variant={b.yours >= b.target ? 'default' : 'destructive'} className="text-xs">
                {b.yours.toFixed(b.unit === '%' ? 1 : 2)}{b.unit}
              </Badge>
              <span className="text-[10px] text-muted-foreground flex-1">Target: {b.target}{b.unit}</span>
              {b.yours >= b.target ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Period comparison */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Period Comparison</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {periods.map(p => (
              <div key={p.label} className="p-4 rounded-lg border bg-muted/30 space-y-2">
                <p className="text-sm font-semibold">{p.label}</p>
                <p className="text-[10px] text-muted-foreground">{p.trades} trades</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">WR: </span><span className="font-mono">{p.winRate.toFixed(0)}%</span></div>
                  <div><span className="text-muted-foreground">PF: </span><span className="font-mono">{p.profitFactor === Infinity ? '∞' : p.profitFactor.toFixed(1)}</span></div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">P&L: </span>
                    <span className={cn("font-mono font-bold", p.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>₹{p.pnl.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <NextSteps items={[
        periods[0]?.pnl < 0 ? "Recent 7-day P&L is negative — review last week's trades for pattern breaks." : "Last 7 days are profitable. Maintain current approach.",
        "Compare monthly performance to identify improvement trends.",
      ]} />
    </div>
  );
}

// ── QUALITY ANALYSIS ──
function QualityView({ trades }: { trades: Trade[] }) {
  const closed = useMemo(() => trades.filter(t => t.status === 'closed'), [trades]);
  const withQuality = useMemo(() => closed.filter(t => t.quality_score != null), [closed]);

  if (withQuality.length < 5) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Rate quality (1-5) on at least 5 trades to see analysis.</p>
        </CardContent>
      </Card>
    );
  }

  const byScore = [1, 2, 3, 4, 5].map(score => {
    const group = withQuality.filter(t => t.quality_score === score);
    const wins = group.filter(t => safeNetPnl(t) > 0).length;
    const pnl = group.reduce((s, t) => s + safeNetPnl(t), 0);
    return { score, trades: group.length, winRate: group.length > 0 ? (wins / group.length) * 100 : 0, pnl };
  });

  const highQ = withQuality.filter(t => (t.quality_score || 0) >= 4);
  const lowQ = withQuality.filter(t => (t.quality_score || 0) <= 2);
  const hqWR = highQ.length > 0 ? (highQ.filter(t => safeNetPnl(t) > 0).length / highQ.length) * 100 : 0;
  const lqWR = lowQ.length > 0 ? (lowQ.filter(t => safeNetPnl(t) > 0).length / lowQ.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatBox label="Avg Quality" value={(withQuality.reduce((s, t) => s + (t.quality_score || 0), 0) / withQuality.length).toFixed(1)} sub="Out of 5" />
        <StatBox label="High Quality WR" value={`${hqWR.toFixed(0)}%`} sub="Score 4-5" highlight={hqWR > 60} />
        <StatBox label="Low Quality WR" value={`${lqWR.toFixed(0)}%`} sub="Score 1-2" />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Win Rate by Quality Score</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {byScore.filter(s => s.trades > 0).map(s => (
            <div key={s.score} className="flex items-center gap-3">
              <div className="flex gap-0.5 w-20">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className={cn("h-3 w-3 rounded-sm", i < s.score ? "bg-primary" : "bg-muted")} />
                ))}
              </div>
              <Progress value={s.winRate} className="flex-1 h-2" />
              <span className="text-xs w-12 text-right font-mono">{s.winRate.toFixed(0)}%</span>
              <span className={cn("text-xs w-16 text-right font-mono", s.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>₹{s.pnl.toFixed(0)}</span>
              <span className="text-[10px] text-muted-foreground w-8 text-right">{s.trades}t</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <NextSteps items={[
        hqWR > lqWR ? `High quality setups outperform by ${(hqWR - lqWR).toFixed(0)}% — stick to A+ setups!` : "Quality score doesn't correlate with results yet. Refine your scoring criteria.",
        "Aim for 80%+ of trades rated 4-5 quality."
      ]} />
    </div>
  );
}

// ── CORRELATIONS ──
function CorrelationsView({ trades }: { trades: Trade[] }) {
  const closed = useMemo(() => trades.filter(t => t.status === 'closed'), [trades]);

  const combos = useMemo(() => {
    const map = new Map<string, { wins: number; total: number; pnl: number }>();
    closed.forEach(t => {
      // Symbol × Session
      const k1 = `${t.symbol} × ${t.session_tag || 'Unknown'}`;
      const r1 = map.get(k1) || { wins: 0, total: 0, pnl: 0 };
      r1.total++; if (safeNetPnl(t) > 0) r1.wins++; r1.pnl += safeNetPnl(t);
      map.set(k1, r1);
      
      // Symbol × Strategy
      if (t.strategy_tag) {
        const k2 = `${t.symbol} × ${t.strategy_tag}`;
        const r2 = map.get(k2) || { wins: 0, total: 0, pnl: 0 };
        r2.total++; if (safeNetPnl(t) > 0) r2.wins++; r2.pnl += safeNetPnl(t);
        map.set(k2, r2);
      }

      // Strategy × Day
      if (t.strategy_tag) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const day = days[new Date(t.entry_time).getDay()];
        const k3 = `${t.strategy_tag} × ${day}`;
        const r3 = map.get(k3) || { wins: 0, total: 0, pnl: 0 };
        r3.total++; if (safeNetPnl(t) > 0) r3.wins++; r3.pnl += safeNetPnl(t);
        map.set(k3, r3);
      }
    });
    
    return [...map.entries()]
      .filter(([, d]) => d.total >= 3)
      .map(([combo, data]) => ({ combo, winRate: (data.wins / data.total) * 100, trades: data.total, pnl: data.pnl, expectancy: data.pnl / data.total }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [closed]);

  if (closed.length < MIN_SAMPLE_SIZE) return <InsufficientData />;

  const top5 = combos.slice(0, 5);
  const bottom5 = combos.slice(-5).reverse();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-400">🏆 Top 5 Combos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {top5.map((c, i) => (
              <div key={c.combo} className="flex items-center gap-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs font-mono text-muted-foreground w-5">#{i + 1}</span>
                <span className="text-sm font-medium flex-1 truncate">{c.combo}</span>
                <Badge className="text-[10px]">{c.winRate.toFixed(0)}%</Badge>
                <span className="text-xs font-mono text-emerald-400">₹{c.pnl.toFixed(0)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-red-400">⚠️ Bottom 5 Combos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {bottom5.map((c, i) => (
              <div key={c.combo} className="flex items-center gap-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                <span className="text-xs font-mono text-muted-foreground w-5">#{i + 1}</span>
                <span className="text-sm font-medium flex-1 truncate">{c.combo}</span>
                <Badge variant="destructive" className="text-[10px]">{c.winRate.toFixed(0)}%</Badge>
                <span className="text-xs font-mono text-red-400">₹{c.pnl.toFixed(0)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <NextSteps items={[
        top5[0] ? `"${top5[0].combo}" is your best edge at ${top5[0].winRate.toFixed(0)}% WR. Trade this more.` : "Not enough combos with 3+ trades yet.",
        bottom5[0] && bottom5[0].pnl < 0 ? `Avoid "${bottom5[0].combo}" — it costs you ₹${Math.abs(bottom5[0].pnl).toFixed(0)}.` : "No significantly losing combos detected.",
      ]} />
    </div>
  );
}

// ── MAIN PAGE ──
export default function AIInsightsDrilldown() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { trades, loading, stats } = useTradesDB();
  const activeTab = (searchParams.get('tab') as CategoryKey) || 'streaks';

  const setTab = useCallback((tab: string) => {
    setSearchParams({ tab });
  }, [setSearchParams]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const activeCat = CATEGORIES.find(c => c.key === activeTab) || CATEGORIES[0];
  const ActiveIcon = activeCat.icon;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <PageTitle
          title="AI Insights"
          subtitle="Deep-dive into 7 dimensions of your trading performance"
        />
        <Badge variant="secondary" className="w-fit">
          <Brain className="h-3 w-3 mr-1" />
          {trades.filter(t => t.status === 'closed').length} trades analyzed
        </Badge>
      </div>

      {/* Category Nav */}
      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 md:grid-cols-7 h-auto">
          {CATEGORIES.map(cat => (
            <TabsTrigger key={cat.key} value={cat.key} className="text-xs py-2 gap-1.5">
              <cat.icon className={cn("h-3.5 w-3.5", activeTab === cat.key && cat.color)} />
              <span className="hidden sm:inline">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Category Header */}
      <Card className="bg-muted/30">
        <CardContent className="py-4 flex items-center gap-3">
          <ActiveIcon className={cn("h-6 w-6", activeCat.color)} />
          <div>
            <p className="font-semibold">{activeCat.label} Analysis</p>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'streaks' && 'Track winning and losing streaks to identify momentum patterns.'}
              {activeTab === 'risk' && 'Risk-adjusted performance metrics and downside analysis.'}
              {activeTab === 'time' && 'When do you perform best? Hour, day, and session breakdown.'}
              {activeTab === 'emotions' && 'How your emotional state affects trading outcomes.'}
              {activeTab === 'benchmarks' && 'Compare your metrics against targets and across time periods.'}
              {activeTab === 'quality' && 'Does trade quality correlate with results?'}
              {activeTab === 'correlations' && 'Best and worst symbol × strategy × session × day combinations.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Category Content */}
      {stats ? (
        <>
          {activeTab === 'streaks' && <StreakView trades={trades} stats={stats} />}
          {activeTab === 'risk' && <RiskView trades={trades} stats={stats} />}
          {activeTab === 'time' && <TimeView trades={trades} />}
          {activeTab === 'emotions' && <EmotionsView trades={trades} />}
          {activeTab === 'benchmarks' && <BenchmarksView trades={trades} stats={stats} />}
          {activeTab === 'quality' && <QualityView trades={trades} />}
          {activeTab === 'correlations' && <CorrelationsView trades={trades} />}
        </>
      ) : (
        <InsufficientData />
      )}
    </div>
  );
}
