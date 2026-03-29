/**
 * 7-Dimension AI Analysis Tabs
 * ProJournX parity: Streak, Risk, Time, Emotional, Benchmarks, Quality, Correlations
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, Shield, Clock, Brain, Target, 
  BarChart3, GitBranch, Flame, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Trade, TradeStats } from '@/hooks/useTradesDB';
import { safeNetPnl, MIN_SAMPLE_SIZE } from '@/lib/tradeMetrics';

interface AIAnalysisTabsProps {
  trades: Trade[];
  stats: TradeStats;
}

export function AIAnalysisTabs({ trades, stats }: AIAnalysisTabsProps) {
  const closed = useMemo(() => trades.filter(t => t.status === 'closed'), [trades]);

  const streakAnalysis = useMemo(() => {
    const sorted = [...closed].sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
    let streaks: { type: 'win' | 'loss'; length: number }[] = [];
    let cur: 'win' | 'loss' | null = null;
    let len = 0;
    for (const t of sorted) {
      const type = t.net_pnl > 0 ? 'win' : 'loss';
      if (type === cur) { len++; } else { if (cur) streaks.push({ type: cur, length: len }); cur = type; len = 1; }
    }
    if (cur) streaks.push({ type: cur, length: len });
    const recoveryRate = streaks.filter((s, i) => s.type === 'loss' && streaks[i + 1]?.type === 'win').length / Math.max(streaks.filter(s => s.type === 'loss').length, 1) * 100;
    const avgStreakLen = streaks.length > 0 ? streaks.reduce((s, st) => s + st.length, 0) / streaks.length : 0;
    return { maxWin: stats.longestWinStreak, maxLoss: stats.longestLossStreak, avgLen: avgStreakLen, recoveryRate };
  }, [closed, stats]);

  const riskAnalysis = useMemo(() => {
    if (closed.length < MIN_SAMPLE_SIZE) return null;
    const pnls = closed.map(t => safeNetPnl(t));
    const mean = pnls.reduce((s, v) => s + v, 0) / pnls.length;
    const variance = pnls.reduce((s, v) => s + (v - mean) ** 2, 0) / pnls.length;
    const stdDev = Math.sqrt(variance);
    const downside = pnls.filter(p => p < 0);
    const downsideVar = downside.length > 0 ? downside.reduce((s, v) => s + v ** 2, 0) / downside.length : 0;
    const downsideDev = Math.sqrt(downsideVar);
    // Per-trade Sharpe/Sortino (consistent with Reports — NOT annualized)
    const sharpe = stdDev > 0 ? mean / stdDev : 0;
    const sortino = downsideDev > 0 ? mean / downsideDev : 0;
    const maxDD = stats.maxDrawdown;
    const recoveryFactor = maxDD > 0 ? stats.totalPnL / maxDD : 0;
    return { stdDev, sharpe, sortino, maxDD, recoveryFactor, var95: mean - 1.645 * stdDev };
  }, [closed, stats]);

  const timeAnalysis = useMemo(() => {
    const byHour = new Map<number, { wins: number; total: number; pnl: number }>();
    const byDay = new Map<string, { wins: number; total: number; pnl: number }>();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    closed.forEach(t => {
      const d = new Date(t.entry_time);
      const h = d.getHours();
      const day = days[d.getDay()];
      const rec = byHour.get(h) || { wins: 0, total: 0, pnl: 0 };
      rec.total++; if (t.net_pnl > 0) rec.wins++; rec.pnl += t.net_pnl;
      byHour.set(h, rec);
      const drec = byDay.get(day) || { wins: 0, total: 0, pnl: 0 };
      drec.total++; if (t.net_pnl > 0) drec.wins++; drec.pnl += t.net_pnl;
      byDay.set(day, drec);
    });
    const bestHour = [...byHour.entries()].sort((a, b) => b[1].pnl - a[1].pnl)[0];
    const worstHour = [...byHour.entries()].sort((a, b) => a[1].pnl - b[1].pnl)[0];
    const bestDay = [...byDay.entries()].sort((a, b) => b[1].pnl - a[1].pnl)[0];
    const worstDay = [...byDay.entries()].sort((a, b) => a[1].pnl - b[1].pnl)[0];
    return { bestHour, worstHour, bestDay, worstDay };
  }, [closed]);

  const emotionAnalysis = useMemo(() => {
    const byEmotion = new Map<string, { wins: number; total: number; pnl: number }>();
    closed.forEach(t => {
      (t.emotions || []).forEach(e => {
        const rec = byEmotion.get(e) || { wins: 0, total: 0, pnl: 0 };
        rec.total++; if (t.net_pnl > 0) rec.wins++; rec.pnl += t.net_pnl;
        byEmotion.set(e, rec);
      });
    });
    return [...byEmotion.entries()]
      .map(([emotion, data]) => ({ emotion, winRate: (data.wins / data.total) * 100, trades: data.total, pnl: data.pnl }))
      .sort((a, b) => b.trades - a.trades);
  }, [closed]);

  const qualityAnalysis = useMemo(() => {
    const withQuality = closed.filter(t => t.quality_score != null);
    if (withQuality.length < 5) return null;
    const byScore = new Map<number, { wins: number; total: number; pnl: number }>();
    withQuality.forEach(t => {
      const score = t.quality_score!;
      const rec = byScore.get(score) || { wins: 0, total: 0, pnl: 0 };
      rec.total++; if (t.net_pnl > 0) rec.wins++; rec.pnl += t.net_pnl;
      byScore.set(score, rec);
    });
    const avgQuality = withQuality.reduce((s, t) => s + (t.quality_score || 0), 0) / withQuality.length;
    const highQuality = withQuality.filter(t => (t.quality_score || 0) >= 4);
    const lowQuality = withQuality.filter(t => (t.quality_score || 0) <= 2);
    const hqWr = highQuality.length > 0 ? (highQuality.filter(t => t.net_pnl > 0).length / highQuality.length) * 100 : 0;
    const lqWr = lowQuality.length > 0 ? (lowQuality.filter(t => t.net_pnl > 0).length / lowQuality.length) * 100 : 0;
    return { avgQuality, highQualityWR: hqWr, lowQualityWR: lqWr, byScore: [...byScore.entries()].sort((a, b) => a[0] - b[0]) };
  }, [closed]);

  const correlations = useMemo(() => {
    // Symbol x Session correlation
    const combos = new Map<string, { wins: number; total: number; pnl: number }>();
    closed.forEach(t => {
      const key = `${t.symbol} × ${t.session_tag || 'Unknown'}`;
      const rec = combos.get(key) || { wins: 0, total: 0, pnl: 0 };
      rec.total++; if (t.net_pnl > 0) rec.wins++; rec.pnl += t.net_pnl;
      combos.set(key, rec);
    });
    return [...combos.entries()]
      .filter(([, d]) => d.total >= 3)
      .map(([combo, data]) => ({ combo, winRate: (data.wins / data.total) * 100, trades: data.total, pnl: data.pnl }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 10);
  }, [closed]);

  if (closed.length < MIN_SAMPLE_SIZE) return null;

  const StatBox = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div className="p-3 rounded-lg bg-muted/50 text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          7-Dimension AI Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="streak">
          <TabsList className="grid grid-cols-4 md:grid-cols-7 h-auto">
            <TabsTrigger value="streak" className="text-[10px] py-1.5">Streaks</TabsTrigger>
            <TabsTrigger value="risk" className="text-[10px] py-1.5">Risk</TabsTrigger>
            <TabsTrigger value="time" className="text-[10px] py-1.5">Time</TabsTrigger>
            <TabsTrigger value="emotion" className="text-[10px] py-1.5">Emotions</TabsTrigger>
            <TabsTrigger value="benchmarks" className="text-[10px] py-1.5">Benchmarks</TabsTrigger>
            <TabsTrigger value="quality" className="text-[10px] py-1.5">Quality</TabsTrigger>
            <TabsTrigger value="correlations" className="text-[10px] py-1.5">Correlations</TabsTrigger>
          </TabsList>

          <TabsContent value="streak" className="mt-4">
            <p className="text-xs text-muted-foreground mb-3">Track winning and losing streaks to identify momentum patterns.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatBox label="Max Win Streak" value={String(streakAnalysis.maxWin)} />
              <StatBox label="Max Loss Streak" value={String(streakAnalysis.maxLoss)} />
              <StatBox label="Avg Streak Length" value={streakAnalysis.avgLen.toFixed(1)} />
              <StatBox label="Streak Recovery" value={`${streakAnalysis.recoveryRate.toFixed(0)}%`} />
            </div>
          </TabsContent>

          <TabsContent value="risk" className="mt-4">
            <p className="text-xs text-muted-foreground mb-3">Risk-adjusted performance metrics.</p>
            {riskAnalysis ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatBox label="Sharpe Ratio" value={riskAnalysis.sharpe.toFixed(2)} />
                <StatBox label="Sortino Ratio" value={riskAnalysis.sortino.toFixed(2)} />
                <StatBox label="Max Drawdown" value={`₹${riskAnalysis.maxDD.toFixed(0)}`} />
                <StatBox label="Recovery Factor" value={riskAnalysis.recoveryFactor.toFixed(2)} />
                <StatBox label="Std Deviation" value={`₹${riskAnalysis.stdDev.toFixed(0)}`} />
                <StatBox label="VaR (95%)" value={`₹${riskAnalysis.var95.toFixed(0)}`} sub="Per trade" />
              </div>
            ) : <p className="text-sm text-muted-foreground">Need 5+ trades</p>}
          </TabsContent>

          <TabsContent value="time" className="mt-4">
            <p className="text-xs text-muted-foreground mb-3">When do you perform best?</p>
            <div className="grid grid-cols-2 gap-3">
              {timeAnalysis.bestHour && (
                <StatBox label="Best Hour" value={`${timeAnalysis.bestHour[0]}:00`} sub={`₹${timeAnalysis.bestHour[1].pnl.toFixed(0)} from ${timeAnalysis.bestHour[1].total} trades`} />
              )}
              {timeAnalysis.worstHour && (
                <StatBox label="Worst Hour" value={`${timeAnalysis.worstHour[0]}:00`} sub={`₹${timeAnalysis.worstHour[1].pnl.toFixed(0)} from ${timeAnalysis.worstHour[1].total} trades`} />
              )}
              {timeAnalysis.bestDay && (
                <StatBox label="Best Day" value={timeAnalysis.bestDay[0]} sub={`₹${timeAnalysis.bestDay[1].pnl.toFixed(0)} | ${((timeAnalysis.bestDay[1].wins / timeAnalysis.bestDay[1].total) * 100).toFixed(0)}% WR`} />
              )}
              {timeAnalysis.worstDay && (
                <StatBox label="Worst Day" value={timeAnalysis.worstDay[0]} sub={`₹${timeAnalysis.worstDay[1].pnl.toFixed(0)} | ${((timeAnalysis.worstDay[1].wins / timeAnalysis.worstDay[1].total) * 100).toFixed(0)}% WR`} />
              )}
            </div>
          </TabsContent>

          <TabsContent value="emotion" className="mt-4">
            <p className="text-xs text-muted-foreground mb-3">How emotions affect your performance.</p>
            {emotionAnalysis.length > 0 ? (
              <div className="space-y-2">
                {emotionAnalysis.map(e => (
                  <div key={e.emotion} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                    <span className="text-sm font-medium w-24 truncate">{e.emotion}</span>
                    <Progress value={e.winRate} className="flex-1 h-2" />
                    <span className="text-xs w-16 text-right">{e.winRate.toFixed(0)}% WR</span>
                    <span className="text-[10px] text-muted-foreground w-16 text-right">{e.trades} trades</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">Tag emotions on trades to see patterns</p>}
          </TabsContent>

          <TabsContent value="benchmarks" className="mt-4">
            <p className="text-xs text-muted-foreground mb-3">How you compare to benchmarks.</p>
            <div className="space-y-3">
              {[
                { label: 'Win Rate', yours: stats.winRate, benchmark: 50, unit: '%' },
                { label: 'Profit Factor', yours: stats.profitFactor, benchmark: 1.5, unit: 'x' },
                { label: 'Expectancy', yours: stats.expectancy, benchmark: 0, unit: '₹' },
                { label: 'Avg R-Multiple', yours: stats.avgRMultiple, benchmark: 1, unit: 'R' },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                  <span className="text-sm w-28">{b.label}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <Badge variant={b.yours >= b.benchmark ? 'default' : 'destructive'} className="text-[10px]">
                      {b.yours.toFixed(b.unit === '%' ? 1 : 2)}{b.unit}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">vs {b.benchmark}{b.unit} benchmark</span>
                  </div>
                  {b.yours >= b.benchmark ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="quality" className="mt-4">
            <p className="text-xs text-muted-foreground mb-3">Does trade quality correlate with results?</p>
            {qualityAnalysis ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <StatBox label="Avg Quality Score" value={qualityAnalysis.avgQuality.toFixed(1)} sub="Out of 5" />
                  <StatBox label="High Quality WR" value={`${qualityAnalysis.highQualityWR.toFixed(0)}%`} sub="Score 4-5" />
                  <StatBox label="Low Quality WR" value={`${qualityAnalysis.lowQualityWR.toFixed(0)}%`} sub="Score 1-2" />
                </div>
                {qualityAnalysis.highQualityWR > qualityAnalysis.lowQualityWR && (
                  <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                    <p className="text-sm">✅ Higher quality setups yield {(qualityAnalysis.highQualityWR - qualityAnalysis.lowQualityWR).toFixed(0)}% better win rate — stick to your A+ setups!</p>
                  </div>
                )}
              </div>
            ) : <p className="text-sm text-muted-foreground">Rate quality on 5+ trades to see analysis</p>}
          </TabsContent>

          <TabsContent value="correlations" className="mt-4">
            <p className="text-xs text-muted-foreground mb-3">Best symbol × session combinations.</p>
            {correlations.length > 0 ? (
              <div className="space-y-2">
                {correlations.map((c, i) => (
                  <div key={c.combo} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                    <span className="text-xs font-mono w-6 text-muted-foreground">#{i + 1}</span>
                    <span className="text-sm font-medium flex-1 truncate">{c.combo}</span>
                    <Badge variant={c.pnl > 0 ? 'default' : 'destructive'} className="text-[10px]">
                      {c.winRate.toFixed(0)}% WR
                    </Badge>
                    <span className="text-xs w-20 text-right">₹{c.pnl.toFixed(0)}</span>
                    <span className="text-[10px] text-muted-foreground w-14 text-right">{c.trades} trades</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">Need 3+ trades per combination</p>}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
