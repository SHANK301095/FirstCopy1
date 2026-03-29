/**
 * Analytics — Decision Intelligence Engine
 * Refactored: logic extracted to useAnalyticsData, shared components to analytics/
 */
import { useState } from 'react';
import {
  TrendingUp, Brain, Target, Layers, Shield,
  BarChart3, GitCompare, Lightbulb, ArrowRight,
  Flame, Repeat, Zap, AlertTriangle, Clock, Gauge,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { PageTitle } from '@/components/ui/PageTitle';
import { PageErrorBoundary } from '@/components/error/PageErrorBoundary';
import { EquityCurve } from '@/components/trading/EquityCurve';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { MiniStat } from '@/components/analytics/MiniStat';
import { SectionVerdict } from '@/components/analytics/SectionVerdict';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { MIN_SAMPLE_SIZE } from '@/lib/tradeMetrics';

function fmt(n: number) { return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`; }
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }

export default function Analytics() {
  const {
    trades, loading, stats, closed, insufficient,
    perfData, behavioral, setupData, regimeData, riskData, compareData, aiSummary,
  } = useAnalyticsData();
  const [activeTab, setActiveTab] = useState('performance');

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <PageErrorBoundary pageName="Analytics">
      <div className="space-y-5 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <PageTitle title="Decision Intelligence" subtitle={`${closed.length} closed trades analyzed`} />
          {stats && (
            <Badge variant="outline" className={cn('text-xs', stats.totalPnL >= 0 ? 'text-emerald-400 border-emerald-500/30' : 'text-red-400 border-red-500/30')}>
              {fmt(stats.totalPnL)} Total P&L
            </Badge>
          )}
        </div>

        {insufficient ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <h3 className="text-base font-semibold mb-1">Need More Data</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Import at least {MIN_SAMPLE_SIZE} closed trades to unlock full Decision Intelligence.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/journal'}>
                <ArrowRight className="h-4 w-4 mr-2" /> Go to Journal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/30 p-1">
              <TabsTrigger value="performance" className="text-xs gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Performance</TabsTrigger>
              <TabsTrigger value="behavioral" className="text-xs gap-1.5"><Brain className="h-3.5 w-3.5" />Behavioral</TabsTrigger>
              <TabsTrigger value="setup" className="text-xs gap-1.5"><Target className="h-3.5 w-3.5" />Setups</TabsTrigger>
              <TabsTrigger value="regime" className="text-xs gap-1.5"><Layers className="h-3.5 w-3.5" />Regime</TabsTrigger>
              <TabsTrigger value="risk" className="text-xs gap-1.5"><Shield className="h-3.5 w-3.5" />Risk</TabsTrigger>
              <TabsTrigger value="compare" className="text-xs gap-1.5"><GitCompare className="h-3.5 w-3.5" />Compare</TabsTrigger>
              <TabsTrigger value="summary" className="text-xs gap-1.5"><Lightbulb className="h-3.5 w-3.5" />AI Summary</TabsTrigger>
            </TabsList>

            {/* ═══ 1. PERFORMANCE ═══ */}
            <TabsContent value="performance" className="space-y-4 mt-4">
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  <MiniStat label="Total P&L" value={fmt(stats.totalPnL)} variant={stats.totalPnL >= 0 ? 'success' : 'danger'} />
                  <MiniStat label="Win Rate" value={fmtPct(stats.winRate)} sub={`${stats.winningTrades}W / ${stats.losingTrades}L`} variant={stats.winRate > 50 ? 'success' : 'warning'} />
                  <MiniStat label="Expectancy" value={fmt(stats.expectancy)} variant={stats.expectancy > 0 ? 'success' : 'danger'} />
                  <MiniStat label="Profit Factor" value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)} variant={stats.profitFactor > 1.5 ? 'success' : 'warning'} />
                  <MiniStat label="Max Drawdown" value={fmt(stats.maxDrawdown)} variant={stats.maxDrawdown < 5000 ? 'success' : 'danger'} />
                  <MiniStat label="Avg R" value={stats.avgRMultiple.toFixed(2)} sub="R-Multiple" variant={stats.avgRMultiple > 0 ? 'success' : 'danger'} />
                </div>
              )}
              <EquityCurve trades={trades} />
              {perfData && perfData.dailyPnl.length > 1 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Daily P&L Distribution</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={perfData.dailyPnl}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `₹${v}`} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                          {perfData.dailyPnl.map((d, i) => (
                            <Cell key={i} fill={d.pnl >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
              <SectionVerdict
                strength={stats && stats.winRate > 50 ? `${fmtPct(stats.winRate)} win rate shows edge` : 'Consistent trade logging'}
                weakness={stats && stats.maxDrawdown > 5000 ? `₹${stats.maxDrawdown.toLocaleString()} max drawdown is high` : 'Limited upside capture'}
                stop={stats && stats.profitFactor < 1 ? 'Trading this system live' : 'Adding to losers'}
                cont={stats && stats.expectancy > 0 ? 'Current edge exploitation' : 'Trade journaling habit'}
                test="Reduce position size by 20% and measure impact on drawdown"
              />
            </TabsContent>

            {/* ═══ 2. BEHAVIORAL ═══ */}
            <TabsContent value="behavioral" className="space-y-4 mt-4">
              {behavioral && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Card className={cn('border-l-2', behavioral.revengeCount > 3 ? 'border-l-red-500' : 'border-l-emerald-500')}>
                      <CardContent className="p-3">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Flame className="h-3 w-3" /> Revenge Trades</div>
                        <div className="text-xl font-bold font-mono mt-1">{behavioral.revengeCount}</div>
                        <div className="text-[10px] text-red-400">Cost: {fmt(behavioral.revengeLoss)}</div>
                      </CardContent>
                    </Card>
                    <Card className={cn('border-l-2', behavioral.overtradeDays > 3 ? 'border-l-amber-500' : 'border-l-emerald-500')}>
                      <CardContent className="p-3">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Repeat className="h-3 w-3" /> Overtrading Days</div>
                        <div className="text-xl font-bold font-mono mt-1">{behavioral.overtradeDays}</div>
                        <div className="text-[10px] text-amber-400">Avg: {behavioral.avgPerDay}/day</div>
                      </CardContent>
                    </Card>
                    <Card className={cn('border-l-2', behavioral.fomoCount > 3 ? 'border-l-amber-500' : 'border-l-emerald-500')}>
                      <CardContent className="p-3">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Zap className="h-3 w-3" /> FOMO Entries</div>
                        <div className="text-xl font-bold font-mono mt-1">{behavioral.fomoCount}</div>
                        <div className="text-[10px] text-muted-foreground">Same symbol &lt;5min</div>
                      </CardContent>
                    </Card>
                    <Card className={cn('border-l-2', behavioral.disciplineScore > 70 ? 'border-l-emerald-500' : 'border-l-red-500')}>
                      <CardContent className="p-3">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Discipline Score</div>
                        <div className="text-xl font-bold font-mono mt-1">{behavioral.disciplineScore}%</div>
                        <Progress value={behavioral.disciplineScore} className="h-1 mt-1" />
                      </CardContent>
                    </Card>
                  </div>
                  {behavioral.topEmotions.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Emotion Distribution</CardTitle></CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {behavioral.topEmotions.map(([emotion, count]) => (
                            <Badge key={emotion} variant="outline" className="text-xs">
                              {emotion} <span className="ml-1 text-muted-foreground font-mono">×{count}</span>
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <SectionVerdict
                    strength={behavioral.disciplineScore > 70 ? `${behavioral.disciplineScore}% discipline — SL/TP consistently set` : 'Awareness of behavioral patterns'}
                    weakness={behavioral.revengeCount > 3 ? `${behavioral.revengeCount} revenge trades cost ${fmt(behavioral.revengeLoss)}` : 'Emotional tagging incomplete'}
                    stop={behavioral.revengeCount > 5 ? 'Trading within 30 min after a loss' : 'Entering without a plan'}
                    cont="Journaling emotions on every trade"
                    test="Implement a mandatory 15-min cooldown after losses"
                  />
                </>
              )}
            </TabsContent>

            {/* ═══ 3. SETUP INTELLIGENCE ═══ */}
            <TabsContent value="setup" className="space-y-4 mt-4">
              {setupData && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {setupData.best && (
                      <Card className="border-emerald-500/20">
                        <CardContent className="p-4">
                          <div className="text-[11px] text-emerald-400 font-semibold mb-1">🏆 Best Performing Setup</div>
                          <div className="text-lg font-bold">{setupData.best.name}</div>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{fmtPct(setupData.best.winRate)} WR</span>
                            <span>{fmt(setupData.best.pnl)} P&L</span>
                            <span>{setupData.best.count} trades</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {setupData.mostTraded && (
                      <Card className="border-blue-500/20">
                        <CardContent className="p-4">
                          <div className="text-[11px] text-blue-400 font-semibold mb-1">📊 Most Traded Setup</div>
                          <div className="text-lg font-bold">{setupData.mostTraded.name}</div>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{fmtPct(setupData.mostTraded.wins / Math.max(1, setupData.mostTraded.wins + setupData.mostTraded.losses) * 100)} WR</span>
                            <span>{fmt(setupData.mostTraded.pnl)} P&L</span>
                            <span>{setupData.mostTraded.count} trades</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">All Setups Breakdown</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="max-h-[300px]">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-card border-b border-border/30">
                            <tr className="text-muted-foreground">
                              <th className="text-left p-2.5">Setup</th>
                              <th className="text-right p-2.5">Trades</th>
                              <th className="text-right p-2.5">Win Rate</th>
                              <th className="text-right p-2.5">Total P&L</th>
                              <th className="text-right p-2.5">Avg P&L</th>
                            </tr>
                          </thead>
                          <tbody>
                            {setupData.setups.map(s => (
                              <tr key={s.name} className="border-b border-border/10 hover:bg-muted/30 transition-colors">
                                <td className="p-2.5 font-medium">{s.name}</td>
                                <td className="p-2.5 text-right font-mono">{s.count}</td>
                                <td className="p-2.5 text-right font-mono"><span className={s.winRate > 50 ? 'text-emerald-400' : 'text-red-400'}>{fmtPct(s.winRate)}</span></td>
                                <td className={cn('p-2.5 text-right font-mono font-semibold', s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>{fmt(s.pnl)}</td>
                                <td className={cn('p-2.5 text-right font-mono', s.avgPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>{fmt(Math.round(s.avgPnl))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                  <SectionVerdict
                    strength={setupData.best ? `"${setupData.best.name}" has ${fmtPct(setupData.best.winRate)} win rate` : 'Consistent setup tagging'}
                    weakness={setupData.setups.some(s => s.pnl < 0 && s.count > 5) ? 'Losing setup(s) with 5+ trades' : 'Not enough tagged setups'}
                    stop={setupData.setups.filter(s => s.pnl < 0 && s.count > 5).map(s => `"${s.name}"`).join(', ') || 'Trading untagged setups'}
                    cont={setupData.best ? `Focus on "${setupData.best.name}" setups` : 'Tagging every trade with setup type'}
                    test="Remove worst setup for 2 weeks and measure P&L impact"
                  />
                </>
              )}
            </TabsContent>

            {/* ═══ 4. REGIME INTELLIGENCE ═══ */}
            <TabsContent value="regime" className="space-y-4 mt-4">
              {regimeData && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {regimeData.sessions.map(s => (
                      <Card key={s.name} className={cn('border-l-2', s.pnl >= 0 ? 'border-l-emerald-500' : 'border-l-red-500')}>
                        <CardContent className="p-4">
                          <div className="text-sm font-semibold mb-1">{s.name} Session</div>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span className={s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>{fmt(s.pnl)}</span>
                            <span>{fmtPct(s.winRate)} WR</span>
                            <span>{s.count} trades</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Day-of-Week Performance</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={regimeData.dayOfWeek}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                          <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `₹${v}`} />
                          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                          <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                            {regimeData.dayOfWeek.map((d, i) => (
                              <Cell key={i} fill={d.pnl >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <SectionVerdict
                    strength={(() => { const best = [...regimeData.sessions].sort((a, b) => b.pnl - a.pnl)[0]; return best ? `${best.name} session nets ${fmt(best.pnl)}` : 'Trading across sessions'; })()}
                    weakness={(() => { const worst = [...regimeData.sessions].sort((a, b) => a.pnl - b.pnl)[0]; return worst && worst.pnl < 0 ? `${worst.name} session loses ${fmt(Math.abs(worst.pnl))}` : 'Insufficient regime data'; })()}
                    stop={(() => { const worst = [...regimeData.sessions].sort((a, b) => a.pnl - b.pnl)[0]; return worst && worst.pnl < -500 ? `Trading ${worst.name} session` : 'Trading on worst day'; })()}
                    cont={(() => { const best = [...regimeData.sessions].sort((a, b) => b.pnl - a.pnl)[0]; return best ? `Focus on ${best.name} session` : 'Session tagging'; })()}
                    test="Trade only best 2 sessions for 2 weeks"
                  />
                </>
              )}
            </TabsContent>

            {/* ═══ 5. RISK INTELLIGENCE ═══ */}
            <TabsContent value="risk" className="space-y-4 mt-4">
              {riskData && stats && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <MiniStat label="Tail Risk (Worst 5%)" value={fmt(Math.round(riskData.tailAvg))} sub={`${riskData.tailCut} trades`} variant="danger" />
                    <MiniStat label="Loss Clusters" value={String(riskData.clusters.length)} sub="3+ consecutive" variant={riskData.clusters.length > 2 ? 'danger' : 'success'} />
                    <MiniStat label="Worst Streak" value={`${riskData.worstLossStreak}`} sub="consecutive losses" variant={riskData.worstLossStreak > 5 ? 'danger' : 'warning'} />
                    <MiniStat label="Worst Trade" value={fmt(stats.worstTrade)} variant="danger" />
                  </div>
                  {riskData.clusters.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-400">Loss Clusters Detected</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {riskData.clusters.map((c, i) => (
                            <div key={i} className="flex items-center gap-3 p-2 rounded border border-red-500/20 bg-red-500/5 text-xs">
                              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                              <span><strong>{c.length} consecutive losses</strong> starting at trade #{c.start + 1}, total loss: <span className="text-red-400 font-mono">{fmt(c.totalLoss)}</span></span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {riskData.rolling.length > 5 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Rolling Win Rate (10-trade window)</CardTitle></CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={180}>
                          <AreaChart data={riskData.rolling}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                            <XAxis dataKey="idx" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${v}%`} />
                            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v.toFixed(0)}%`, 'Win Rate']} />
                            <Area type="monotone" dataKey="wr" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                  <SectionVerdict
                    strength={riskData.clusters.length === 0 ? 'No loss clusters — consistent execution' : `Recovery after ${riskData.clusters.length} cluster(s)`}
                    weakness={`Tail risk avg: ${fmt(Math.round(riskData.tailAvg))} per trade in worst 5%`}
                    stop={riskData.worstLossStreak > 5 ? 'Trading without daily stop-loss rule' : 'Increasing size during drawdowns'}
                    cont="Position sizing within risk limits"
                    test="Reduce size by 50% after 3 consecutive losses"
                  />
                </>
              )}
            </TabsContent>

            {/* ═══ 6. COMPARE MODE ═══ */}
            <TabsContent value="compare" className="space-y-4 mt-4">
              {compareData ? (
                <>
                  <h3 className="text-sm font-semibold text-muted-foreground">First Half vs Second Half</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'First Half', d: compareData.firstHalf, tag: 'Earlier trades' },
                      { label: 'Second Half', d: compareData.secondHalf, tag: 'Recent trades' },
                    ].map(({ label, d, tag }) => (
                      <Card key={label}>
                        <CardContent className="p-4">
                          <div className="text-sm font-semibold">{label}</div>
                          <div className="text-[10px] text-muted-foreground mb-2">{tag} — {d.count} trades</div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between"><span className="text-muted-foreground">P&L</span><span className={cn('font-mono', d.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>{fmt(d.pnl)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Win Rate</span><span className="font-mono">{fmtPct(d.winRate)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Avg P&L</span><span className="font-mono">{fmt(Math.round(d.avg))}</span></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <h3 className="text-sm font-semibold text-muted-foreground mt-4">Compliant vs Non-Compliant</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: '✅ With SL/TP', d: compareData.compliant },
                      { label: '❌ Without SL/TP', d: compareData.nonCompliant },
                    ].map(({ label, d }) => (
                      <Card key={label}>
                        <CardContent className="p-4">
                          <div className="text-sm font-semibold">{label}</div>
                          <div className="text-[10px] text-muted-foreground mb-2">{d.count} trades</div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between"><span className="text-muted-foreground">P&L</span><span className={cn('font-mono', d.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>{fmt(d.pnl)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Win Rate</span><span className="font-mono">{fmtPct(d.winRate)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Avg P&L</span><span className="font-mono">{fmt(Math.round(d.avg))}</span></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <SectionVerdict
                    strength={compareData.secondHalf.pnl > compareData.firstHalf.pnl ? 'Improving over time — recent trades are better' : 'Early consistency was strong'}
                    weakness={compareData.secondHalf.pnl < compareData.firstHalf.pnl ? 'Performance declining in recent trades' : 'Earlier trades underperformed'}
                    stop={compareData.nonCompliant.pnl < 0 ? 'Trading without stop loss' : 'Ignoring compliance data'}
                    cont={compareData.compliant.pnl > compareData.nonCompliant.pnl ? 'Setting SL/TP on every trade' : 'Tracking compliance vs non-compliance'}
                    test="Go 100% compliant for 2 weeks and compare results"
                  />
                </>
              ) : (
                <Card className="border-dashed"><CardContent className="py-12 text-center text-sm text-muted-foreground">Need at least {MIN_SAMPLE_SIZE * 2} trades for comparison analysis</CardContent></Card>
              )}
            </TabsContent>

            {/* ═══ 7. AI SUMMARY ═══ */}
            <TabsContent value="summary" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-amber-400" /> AI Analysis Summary</CardTitle></CardHeader>
                <CardContent>
                  {aiSummary ? (
                    <ul className="space-y-2">
                      {aiSummary.map((line, i) => (
                        <li key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Insufficient data for AI analysis</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageErrorBoundary>
  );
}
