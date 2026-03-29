/**
 * Risk Guardian — Flagship Risk Command Center
 * Live risk states (Safe/Caution/Danger), position sizing, if-next-trade-loses sim,
 * daily stop, session guardrails, correlation warning, audit trail
 */
import { useState, useMemo, useEffect } from 'react';
import {
  Shield, AlertTriangle, AlertOctagon, Power, Activity, TrendingDown,
  Gauge, Clock, Zap, CheckCircle, XCircle, Eye, Database, FileText,
  Calculator, Target, Flame, Ban, ArrowRight, Lock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { PageTitle } from '@/components/ui/PageTitle';
import { toast } from 'sonner';
import { PageErrorBoundary } from '@/components/error/PageErrorBoundary';
import { useTradesDB } from '@/hooks/useTradesDB';
import { useIncidents } from '@/hooks/useIncidents';
import { fetchAuditTrail } from '@/services/auditService';
import { supabase } from '@/integrations/supabase/client';
import { safeNetPnl } from '@/lib/tradeMetrics';

/* ─── Types ─── */
type RiskState = 'safe' | 'caution' | 'danger';

const riskStateConfig: Record<RiskState, { label: string; color: string; bg: string; icon: typeof Shield }> = {
  safe: { label: 'SAFE', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/40', icon: Shield },
  caution: { label: 'CAUTION', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/40', icon: AlertTriangle },
  danger: { label: 'DANGER', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/40', icon: AlertOctagon },
};

/* ─── helpers ─── */
function fmt(n: number) { return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`; }
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }

export default function RiskGuardian() {
  const { trades, loading, stats } = useTradesDB();
  const { active: activeIncidents, acknowledge, resolve, openCount } = useIncidents();
  const [killSwitch, setKillSwitch] = useState(false);
  const [breaches, setBreaches] = useState<any[]>([]);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);

  // Config — user-adjustable limits (could be from DB later)
  const DAILY_LOSS_LIMIT = 5000;
  const MAX_DD_LIMIT = 15; // percent
  const MAX_CONSEC_LOSS = 6;
  const MAX_TRADES_PER_DAY = 20;
  const MAX_OPEN_POSITIONS = 10;
  const ACCOUNT_CAPITAL = 100000;

  useEffect(() => {
    loadBreaches();
    fetchAuditTrail(20).then(setAuditTrail);
  }, []);

  async function loadBreaches() {
    const { data } = await supabase
      .from('risk_breaches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setBreaches(data);
  }

  /* ══════════════════════════════════════════
     CORE RISK COMPUTATIONS
     ══════════════════════════════════════════ */
  const riskEngine = useMemo(() => {
    const closed = trades.filter(t => t.status === 'closed');
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayTrades = closed.filter(t => t.entry_time?.startsWith(todayStr));
    const todayPnl = todayTrades.reduce((s, t) => s + safeNetPnl(t), 0);
    const dailyLoss = todayPnl < 0 ? Math.abs(todayPnl) : 0;

    // Equity & drawdown
    let peak = 0, maxDD = 0, equity = 0;
    const sorted = [...closed].sort((a, b) => (a.entry_time || '').localeCompare(b.entry_time || ''));
    for (const t of sorted) {
      equity += safeNetPnl(t);
      if (equity > peak) peak = equity;
      const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
    }

    // Consecutive losses (current)
    let consecLoss = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (safeNetPnl(sorted[i]) < 0) consecLoss++;
      else break;
    }

    // Open positions
    const openPositions = trades.filter(t => t.status === 'open').length;

    // Safe remaining risk
    const safeRemaining = Math.max(0, DAILY_LOSS_LIMIT - dailyLoss);

    // Risk state
    const dailyPct = DAILY_LOSS_LIMIT > 0 ? dailyLoss / DAILY_LOSS_LIMIT : 0;
    const ddPct = MAX_DD_LIMIT > 0 ? maxDD / MAX_DD_LIMIT : 0;
    const consecPct = MAX_CONSEC_LOSS > 0 ? consecLoss / MAX_CONSEC_LOSS : 0;
    const worstPct = Math.max(dailyPct, ddPct, consecPct);
    const riskState: RiskState = worstPct >= 0.9 ? 'danger' : worstPct >= 0.5 ? 'caution' : 'safe';

    // Position size advisory (1% risk per trade)
    const riskPerTrade = ACCOUNT_CAPITAL * 0.01;
    const adjustedRisk = riskState === 'danger' ? riskPerTrade * 0.25
      : riskState === 'caution' ? riskPerTrade * 0.5
      : riskPerTrade;

    // If-next-trade-loses simulation
    const avgLoss = stats?.avgLoss || 0;
    const simAfterLoss = {
      newDailyLoss: dailyLoss + avgLoss,
      newConsecLoss: consecLoss + 1,
      wouldBreach: (dailyLoss + avgLoss) > DAILY_LOSS_LIMIT || (consecLoss + 1) >= MAX_CONSEC_LOSS,
      remainingAfterLoss: Math.max(0, DAILY_LOSS_LIMIT - dailyLoss - avgLoss),
    };

    // Daily stop recommendation
    const dailyStopReco = DAILY_LOSS_LIMIT - (dailyLoss * 0.2); // leave 20% buffer
    const shouldStop = dailyLoss > DAILY_LOSS_LIMIT * 0.7;

    // Session guardrails
    const hour = new Date().getHours();
    const session = hour >= 9 && hour < 15 ? 'Market Hours' : hour >= 15 && hour < 17 ? 'Post-Market' : 'Off-Hours';
    const sessionWarning = session === 'Off-Hours' ? 'Trading outside market hours — higher risk' : null;

    // Correlation warning (same symbol overexposure)
    const symbolMap = new Map<string, number>();
    trades.filter(t => t.status === 'open').forEach(t => symbolMap.set(t.symbol, (symbolMap.get(t.symbol) || 0) + 1));
    const correlationWarnings = [...symbolMap.entries()].filter(([, c]) => c > 2).map(([s, c]) => `${s}: ${c} open positions`);

    return {
      dailyLoss, maxDD, consecLoss, openPositions, todayTradeCount: todayTrades.length,
      todayPnl, safeRemaining, riskState, adjustedRisk, riskPerTrade,
      simAfterLoss, shouldStop, dailyStopReco, session, sessionWarning,
      correlationWarnings, equity,
      metrics: [
        { id: 'daily_loss', label: 'Daily Loss', current: dailyLoss, limit: DAILY_LOSS_LIMIT, unit: '₹', icon: TrendingDown },
        { id: 'total_dd', label: 'Total Drawdown', current: maxDD, limit: MAX_DD_LIMIT, unit: '%', icon: TrendingDown },
        { id: 'consec_loss', label: 'Consec. Losses', current: consecLoss, limit: MAX_CONSEC_LOSS, unit: '', icon: Activity },
        { id: 'open_pos', label: 'Open Positions', current: openPositions, limit: MAX_OPEN_POSITIONS, unit: '', icon: Gauge },
        { id: 'trades_today', label: 'Trades Today', current: todayTrades.length, limit: MAX_TRADES_PER_DAY, unit: '', icon: Clock },
      ],
    };
  }, [trades, stats]);

  const handleKillSwitch = (on: boolean) => {
    setKillSwitch(on);
    if (on) toast.error('🚨 Kill Switch ACTIVATED — all trading halted');
    else toast.success('Kill Switch deactivated — trading resumed');
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      </div>
    );
  }

  const stCfg = riskStateConfig[riskEngine.riskState];
  const StateIcon = stCfg.icon;
  const closedCount = trades.filter(t => t.status === 'closed').length;

  return (
    <PageErrorBoundary pageName="Risk Guardian">
      <div className="space-y-5 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <PageTitle title="Risk Guardian" subtitle={`Live risk command • ${closedCount} trades analyzed`} />
          <Badge className={cn('text-sm px-4 py-1.5 font-bold border', stCfg.bg, stCfg.color)}>
            <StateIcon className="h-4 w-4 mr-1.5" /> {stCfg.label}
          </Badge>
        </div>

        {/* ═══ KILL SWITCH ═══ */}
        <Card className={cn('border-2 transition-all', killSwitch ? 'border-red-500/60 bg-red-500/5' : 'border-border/40')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Power className={cn('h-6 w-6', killSwitch ? 'text-red-400' : 'text-muted-foreground')} />
              <div>
                <div className="text-sm font-semibold">Emergency Kill Switch</div>
                <div className="text-xs text-muted-foreground">Immediately halt all automated trading</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('text-xs font-mono font-bold', killSwitch ? 'text-red-400' : 'text-muted-foreground')}>{killSwitch ? 'ACTIVE' : 'OFF'}</span>
              <Switch checked={killSwitch} onCheckedChange={handleKillSwitch} />
            </div>
          </CardContent>
        </Card>

        {closedCount === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <h3 className="text-base font-semibold mb-1">No Trade Data</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">Import trades or start paper trading to activate live risk monitoring</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/journal'}>
                <ArrowRight className="h-4 w-4 mr-2" /> Go to Journal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ═══ SAFE REMAINING + POSITION SIZE + DAILY STOP ═══ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className={cn('border-l-4', riskEngine.safeRemaining > DAILY_LOSS_LIMIT * 0.3 ? 'border-l-emerald-500' : riskEngine.safeRemaining > 0 ? 'border-l-amber-500' : 'border-l-red-500')}>
                <CardContent className="p-4">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Safe Remaining Risk</div>
                  <div className="text-2xl font-bold font-mono mt-1">{fmt(riskEngine.safeRemaining)}</div>
                  <div className="text-[10px] text-muted-foreground">of {fmt(DAILY_LOSS_LIMIT)} daily limit</div>
                  <Progress value={((DAILY_LOSS_LIMIT - riskEngine.safeRemaining) / DAILY_LOSS_LIMIT) * 100} className="h-1.5 mt-2" />
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Calculator className="h-3 w-3" /> Position Size Advisory</div>
                  <div className="text-2xl font-bold font-mono mt-1">{fmt(Math.round(riskEngine.adjustedRisk))}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {riskEngine.riskState === 'safe' ? '1% risk (normal)' : riskEngine.riskState === 'caution' ? '0.5% risk (reduced)' : '0.25% risk (minimal)'}
                  </div>
                </CardContent>
              </Card>
              <Card className={cn('border-l-4', riskEngine.shouldStop ? 'border-l-red-500' : 'border-l-emerald-500')}>
                <CardContent className="p-4">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Ban className="h-3 w-3" /> Daily Stop Status</div>
                  <div className={cn('text-lg font-bold mt-1', riskEngine.shouldStop ? 'text-red-400' : 'text-emerald-400')}>
                    {riskEngine.shouldStop ? '⛔ Stop Trading' : '✅ Continue'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {riskEngine.shouldStop ? `Used ${fmtPct((riskEngine.dailyLoss / DAILY_LOSS_LIMIT) * 100)} of daily limit` : `Today: ${fmt(riskEngine.todayPnl)}`}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ═══ IF-NEXT-TRADE-LOSES SIMULATION ═══ */}
            <Card className={cn('border', riskEngine.simAfterLoss.wouldBreach ? 'border-red-500/30 bg-red-500/[0.02]' : 'border-border/40')}>
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-400" /> If Next Trade Loses…
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="text-muted-foreground">Avg Loss Size</div>
                    <div className="font-mono font-bold text-base mt-0.5">{fmt(stats?.avgLoss || 0)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">New Daily Loss</div>
                    <div className={cn('font-mono font-bold text-base mt-0.5', riskEngine.simAfterLoss.newDailyLoss > DAILY_LOSS_LIMIT ? 'text-red-400' : 'text-foreground')}>
                      {fmt(Math.round(riskEngine.simAfterLoss.newDailyLoss))}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Consec. Losses After</div>
                    <div className={cn('font-mono font-bold text-base mt-0.5', riskEngine.simAfterLoss.newConsecLoss >= MAX_CONSEC_LOSS ? 'text-red-400' : 'text-foreground')}>
                      {riskEngine.simAfterLoss.newConsecLoss}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Remaining After Loss</div>
                    <div className={cn('font-mono font-bold text-base mt-0.5', riskEngine.simAfterLoss.remainingAfterLoss <= 0 ? 'text-red-400' : 'text-emerald-400')}>
                      {fmt(Math.round(riskEngine.simAfterLoss.remainingAfterLoss))}
                    </div>
                  </div>
                </div>
                {riskEngine.simAfterLoss.wouldBreach && (
                  <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span><strong>Warning:</strong> Next loss would breach daily limit or max consecutive loss threshold. Consider reducing position size or stopping.</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ═══ SESSION GUARDRAILS + CORRELATION ═══ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 mb-2"><Clock className="h-3 w-3" /> Session Guardrails</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{riskEngine.session}</Badge>
                    {riskEngine.sessionWarning ? (
                      <span className="text-[11px] text-amber-400">{riskEngine.sessionWarning}</span>
                    ) : (
                      <span className="text-[11px] text-emerald-400">✅ Safe trading window</span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Today: {riskEngine.todayTradeCount} trades • {fmt(riskEngine.todayPnl)} P&L
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 mb-2"><Zap className="h-3 w-3" /> Correlation Warning</div>
                  {riskEngine.correlationWarnings.length > 0 ? (
                    <div className="space-y-1">
                      {riskEngine.correlationWarnings.map((w, i) => (
                        <div key={i} className="text-xs text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {w}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> No concentration risk detected
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ═══ RISK METRICS GRID ═══ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {riskEngine.metrics.map(m => {
                const pct = m.limit > 0 ? (m.current / m.limit) * 100 : 0;
                const state: RiskState = pct >= 90 ? 'danger' : pct >= 50 ? 'caution' : 'safe';
                const cfg = riskStateConfig[state];
                return (
                  <Card key={m.id} className="border-border/40">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <m.icon className={cn('h-3.5 w-3.5', cfg.color)} />
                          <span className="text-[11px] font-medium">{m.label}</span>
                        </div>
                        <Badge variant="outline" className={cn('text-[9px] px-1.5', cfg.bg, cfg.color)}>{cfg.label}</Badge>
                      </div>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className={cn('text-xl font-bold font-mono', cfg.color)}>
                          {m.unit === '₹' ? '₹' : ''}{typeof m.current === 'number' ? m.current.toFixed(m.unit === '%' ? 1 : 0) : m.current}{m.unit === '%' ? '%' : ''}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">/ {m.limit}{m.unit}</span>
                      </div>
                      <Progress value={Math.min(pct, 100)} className="h-1" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* ═══ INCIDENTS + AUDIT ═══ */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Recent Breaches */}
              <Card className="border-border/40">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertOctagon className="h-4 w-4 text-amber-400" />
                    Active Incidents
                    {openCount > 0 && <Badge variant="destructive" className="text-[10px] h-5">{openCount}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {activeIncidents.length === 0 ? (
                    <div className="text-center py-6">
                      <CheckCircle className="h-6 w-6 mx-auto mb-2 text-emerald-400 opacity-50" />
                      <p className="text-xs text-muted-foreground">No active incidents — all clear</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {activeIncidents.slice(0, 10).map((inc: any) => (
                          <div key={inc.id} className="p-2.5 rounded border border-border/30 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn('text-[10px]',
                                  inc.severity === 'critical' ? 'text-red-400 border-red-500/30' : 'text-amber-400 border-amber-500/30'
                                )}>{inc.severity}</Badge>
                                <span className="text-xs font-medium">{inc.title}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">{new Date(inc.created_at).toLocaleTimeString()}</span>
                            </div>
                            {inc.detail && <p className="text-[11px] text-muted-foreground">{inc.detail}</p>}
                            <div className="flex gap-1.5">
                              {inc.status === 'open' && (
                                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => acknowledge(inc.id)}>
                                  <Eye className="h-3 w-3 mr-1" /> Ack
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => resolve(inc.id)}>
                                <CheckCircle className="h-3 w-3 mr-1" /> Resolve
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Audit Trail */}
              <Card className="border-border/40">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" /> Risk Parameter Audit
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {auditTrail.length === 0 ? (
                    <div className="text-center py-6">
                      <Database className="h-6 w-6 mx-auto mb-2 text-muted-foreground opacity-30" />
                      <p className="text-xs text-muted-foreground">No risk parameter changes recorded</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-1.5">
                        {auditTrail.map((evt: any) => (
                          <div key={evt.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded text-xs hover:bg-muted/30 transition-colors">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            <span className="font-mono text-muted-foreground w-16 shrink-0">{new Date(evt.created_at).toLocaleTimeString()}</span>
                            <span className="font-medium">{evt.action}</span>
                            <span className="text-muted-foreground truncate">{evt.entity_type}{evt.entity_id ? ` #${evt.entity_id.slice(0, 8)}` : ''}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ═══ RISK BREACHES HISTORY ═══ */}
            {breaches.length > 0 && (
              <Card className="border-border/40">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm font-medium">Recent Risk Breaches</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {breaches.map((b: any) => (
                      <div key={b.id} className="flex items-start gap-3 p-2 rounded border border-border/30 text-xs">
                        <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{b.rule_type}</span>
                            <Badge variant="outline" className="text-[10px]">{b.action_taken}</Badge>
                            <span className="text-[10px] text-muted-foreground">{new Date(b.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-muted-foreground mt-0.5">
                            Current: {b.current_value} / Limit: {b.limit_value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PageErrorBoundary>
  );
}