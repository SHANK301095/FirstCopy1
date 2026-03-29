/**
 * Home — "What Matters Now" Command Center
 * Executive summary → Diagnostic layer → Action layer
 */
import { useState, useEffect, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, BarChart3, Brain, Shield, Zap, TrendingUp,
  ChevronRight, ScrollText, Bot, Target, Trophy,
  AlertTriangle, ArrowUpRight, ArrowDownRight,
  Flame, CheckCircle2, DollarSign, XCircle,
  type LucideIcon, Lightbulb, SkullIcon, Award,
  ClipboardCheck, ArrowRight, Gauge, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTradesDB } from '@/hooks/useTradesDB';
import { format, subDays, startOfWeek, startOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { SectionHeader } from '@/components/ui/PageHeader';

// ── SYSTEM STATUS BAR ──
const SystemStatusBar = memo(function SystemStatusBar() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const utc = time.toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' });
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-card/60 border border-border/20 backdrop-blur-sm">
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--profit))] opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[hsl(var(--profit))]" />
        </span>
        <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">ONLINE</span>
      </div>
      <div className="h-3 w-px bg-border/30" />
      <span className="text-[10px] font-mono text-muted-foreground">
        UTC <span className="text-foreground/80 tabular-nums">{utc}</span>
      </span>
    </div>
  );
});

// ── ACCOUNT HEALTH CARD ──
function AccountHealthCard({ todayPnl, weekPnl, drawdownPct, displayName, greeting }: {
  todayPnl: number; weekPnl: number; drawdownPct: number; displayName: string; greeting: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[hsl(var(--premium-border))] bg-gradient-to-r from-[hsl(var(--premium-soft))] to-[hsl(var(--primary)/0.06)] p-4 md:p-5">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--premium))] to-transparent opacity-60" />
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[hsl(var(--premium))] to-[hsl(var(--premium-strong))] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[hsl(var(--premium)/0.3)]">
            <span className="text-lg font-black text-black">{displayName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
              {greeting}, <span className="text-[hsl(var(--premium))]">{displayName}</span>
            </h1>
            <p className="text-xs text-muted-foreground/60 mt-0.5 font-medium">
              {format(new Date(), 'EEEE, MMMM d')} — What matters now
            </p>
          </div>
        </div>
        <div className="flex gap-4 flex-shrink-0">
          <div className="text-center">
            <p className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider">Today</p>
            <p className={cn("text-xl font-bold tabular-nums", todayPnl > 0 ? "text-[hsl(var(--profit))]" : todayPnl < 0 ? "text-[hsl(var(--loss))]" : "text-foreground")}>
              {todayPnl >= 0 ? '+' : ''}${Math.abs(todayPnl).toFixed(0)}
            </p>
          </div>
          <div className="w-px bg-border/30" />
          <div className="text-center">
            <p className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider">Week</p>
            <p className={cn("text-xl font-bold tabular-nums", weekPnl > 0 ? "text-[hsl(var(--profit))]" : weekPnl < 0 ? "text-[hsl(var(--loss))]" : "text-foreground")}>
              {weekPnl >= 0 ? '+' : ''}${Math.abs(weekPnl).toFixed(0)}
            </p>
          </div>
          <div className="w-px bg-border/30" />
          <div className="text-center">
            <p className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider">DD</p>
            <p className={cn("text-xl font-bold tabular-nums", drawdownPct > 3 ? "text-[hsl(var(--loss))]" : "text-[hsl(var(--warning))]")}>
              -{drawdownPct.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── RISK STATUS STRIP ──
function RiskStatusStrip({ riskUsedPct, tradesCount, maxDD }: {
  riskUsedPct: number; tradesCount: number; maxDD: number;
}) {
  const safeRemaining = Math.max(0, 100 - riskUsedPct);
  const riskLevel = riskUsedPct > 80 ? 'critical' : riskUsedPct > 50 ? 'warning' : 'safe';
  return (
    <div className="card-glow rounded-xl border border-border/20 bg-card/80 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className={cn("h-4 w-4", riskLevel === 'critical' ? "text-[hsl(var(--loss))]" : riskLevel === 'warning' ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--profit))]")} />
          <span className="text-sm font-semibold text-foreground">Risk Status</span>
        </div>
        <Badge variant="outline" className={cn("text-[9px] font-mono uppercase",
          riskLevel === 'critical' && "border-[hsl(var(--loss)/0.3)] text-[hsl(var(--loss))] bg-[hsl(var(--loss)/0.05)]",
          riskLevel === 'warning' && "border-[hsl(var(--warning)/0.3)] text-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.05)]",
          riskLevel === 'safe' && "border-[hsl(var(--profit)/0.3)] text-[hsl(var(--profit))] bg-[hsl(var(--profit)/0.05)]",
        )}>
          {riskLevel}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">Risk Used</p>
          <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden mb-1">
            <div className={cn("h-full rounded-full transition-all duration-700",
              riskLevel === 'critical' ? "bg-[hsl(var(--loss))]" : riskLevel === 'warning' ? "bg-[hsl(var(--warning))]" : "bg-[hsl(var(--profit))]"
            )} style={{ width: `${Math.min(100, riskUsedPct)}%` }} />
          </div>
          <p className="text-xs font-mono font-bold tabular-nums">{riskUsedPct.toFixed(0)}%</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">Safe Remaining</p>
          <p className="text-lg font-bold tabular-nums text-[hsl(var(--profit))]">{safeRemaining.toFixed(0)}%</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">Trades Today</p>
          <p className="text-lg font-bold tabular-nums text-foreground">{tradesCount}</p>
        </div>
      </div>
      {riskLevel !== 'safe' && (
        <div className={cn("mt-3 p-2 rounded-lg text-[11px] flex items-center gap-2",
          riskLevel === 'critical' ? "bg-[hsl(var(--loss)/0.08)] text-[hsl(var(--loss))]" : "bg-[hsl(var(--warning)/0.08)] text-[hsl(var(--warning))]"
        )}>
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
          {riskLevel === 'critical' ? 'Daily risk limit nearly exhausted. Consider stopping trading.' : 'Risk usage elevated. Monitor position sizes closely.'}
        </div>
      )}
    </div>
  );
}

// ── DIAGNOSTIC CARD ──
function DiagnosticCard({ icon: Icon, iconColor, bgColor, title, value, detail, href }: {
  icon: LucideIcon; iconColor: string; bgColor: string; title: string; value: string; detail: string; href?: string;
}) {
  const content = (
    <div className="card-glow rounded-xl border border-border/20 bg-card/60 p-4 hover:border-border/40 transition-all">
      <div className="flex items-start gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", bgColor)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{title}</p>
          <p className="text-base font-bold text-foreground mt-0.5">{value}</p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-2">{detail}</p>
        </div>
        {href && <ChevronRight className="h-4 w-4 text-muted-foreground/20 mt-1 flex-shrink-0" />}
      </div>
    </div>
  );
  return href ? <Link to={href}>{content}</Link> : content;
}

// ── DAILY CHECKLIST ──
function DailyChecklist({ journalDone, riskChecked, reviewDone }: {
  journalDone: boolean; riskChecked: boolean; reviewDone: boolean;
}) {
  const items = [
    { label: 'Pre-market plan written', done: journalDone, href: '/journal' },
    { label: 'Risk limits reviewed', done: riskChecked, href: '/risk-guardian' },
    { label: 'Post-market review', done: reviewDone, href: '/journal' },
  ];
  const completedCount = items.filter(i => i.done).length;
  return (
    <div className="card-glow rounded-xl border border-border/20 bg-card/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-[hsl(var(--premium))]" />
          <span className="text-sm font-semibold text-foreground">Daily Checklist</span>
        </div>
        <Badge variant="outline" className="text-[9px] font-mono">
          {completedCount}/{items.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <Link key={item.label} to={item.href} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/15 transition-colors group">
            {item.done ? (
              <CheckCircle2 className="h-4 w-4 text-[hsl(var(--profit))] flex-shrink-0" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/20 flex-shrink-0 group-hover:border-primary/40 transition-colors" />
            )}
            <span className={cn("text-[12px]", item.done ? "text-muted-foreground/50 line-through" : "text-foreground/80 group-hover:text-foreground")}>
              {item.label}
            </span>
            {!item.done && <ArrowRight className="h-3 w-3 text-muted-foreground/15 ml-auto group-hover:text-primary/40 transition-colors" />}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── RECOMMENDED ACTIONS ──
function RecommendedActions({ actions }: { actions: { text: string; href: string; priority: 'high' | 'medium' | 'low' }[] }) {
  return (
    <div className="card-glow rounded-xl border border-border/20 bg-card/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-[hsl(var(--premium))]" />
        <span className="text-sm font-semibold text-foreground">Recommended Next Steps</span>
      </div>
      <div className="space-y-2">
        {actions.map((action, i) => (
          <Link key={i} to={action.href} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/10 border border-border/10 hover:bg-muted/20 transition-colors group">
            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
              action.priority === 'high' ? "bg-[hsl(var(--loss)/0.15)] text-[hsl(var(--loss))]" :
              action.priority === 'medium' ? "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]" :
              "bg-primary/10 text-primary"
            )}>
              {i + 1}
            </div>
            <span className="text-[12px] text-foreground/80 group-hover:text-foreground flex-1">{action.text}</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/15 group-hover:text-primary/40 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── MAIN ──
export default function Home() {
  const [mounted, setMounted] = useState(false);
  const { user, profile } = useAuth();
  const { trades: allTrades } = useTradesDB();
  const [journalStreak, setJournalStreak] = useState(0);
  const [todayJournalExists, setTodayJournalExists] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        const { data: todayEntry } = await supabase.from('journal_entries').select('id').eq('user_id', user.id).eq('date', todayKey).maybeSingle();
        setTodayJournalExists(!!todayEntry);

        const { data: entries } = await supabase.from('journal_entries').select('date').eq('user_id', user.id).order('date', { ascending: false }).limit(90);
        if (entries) {
          const dates = new Set(entries.map((e: any) => e.date));
          let streak = 0;
          let d = new Date();
          while (dates.has(format(d, 'yyyy-MM-dd'))) { streak++; d = new Date(d.getTime() - 86400000); }
          setJournalStreak(streak);
        }
      } catch { /* ignore */ }
    })();
  }, [user]);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Trader';
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  const todaySummary = useMemo(() => {
    const todayTrades = allTrades.filter(t => t.entry_time?.slice(0, 10) === todayKey && t.status === 'closed');
    const pnl = todayTrades.reduce((s, t) => s + (t.net_pnl || 0), 0);
    const wins = todayTrades.filter(t => (t.net_pnl || 0) > 0).length;
    const total = todayTrades.length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    return { count: total, pnl, wins, winRate };
  }, [allTrades, todayKey]);

  const weekSummary = useMemo(() => {
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekTrades = allTrades.filter(t => t.entry_time?.slice(0, 10) >= weekStart && t.status === 'closed');
    const pnl = weekTrades.reduce((s, t) => s + (t.net_pnl || 0), 0);
    return { pnl, count: weekTrades.length };
  }, [allTrades]);

  // Best setup this week
  const bestSetup = useMemo(() => {
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekTrades = allTrades.filter(t => t.entry_time?.slice(0, 10) >= weekStart && t.status === 'closed' && t.setup_type);
    const bySetup: Record<string, { pnl: number; count: number; wins: number }> = {};
    weekTrades.forEach(t => {
      const s = t.setup_type || 'Unknown';
      if (!bySetup[s]) bySetup[s] = { pnl: 0, count: 0, wins: 0 };
      bySetup[s].pnl += t.net_pnl || 0;
      bySetup[s].count++;
      if ((t.net_pnl || 0) > 0) bySetup[s].wins++;
    });
    const entries = Object.entries(bySetup);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1].pnl - a[1].pnl);
    const [name, data] = entries[0];
    return { name, ...data, winRate: Math.round((data.wins / data.count) * 100) };
  }, [allTrades]);

  // Biggest mistake this week
  const biggestMistake = useMemo(() => {
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekLosses = allTrades
      .filter(t => t.entry_time?.slice(0, 10) >= weekStart && t.status === 'closed' && (t.net_pnl || 0) < 0)
      .sort((a, b) => (a.net_pnl || 0) - (b.net_pnl || 0));
    if (weekLosses.length === 0) return null;
    const worst = weekLosses[0];
    return { symbol: worst.symbol, pnl: worst.net_pnl || 0, setup: worst.setup_type || 'Unknown' };
  }, [allTrades]);

  // Drawdown approximation
  const drawdownPct = useMemo(() => {
    const closed = allTrades.filter(t => t.status === 'closed');
    if (closed.length === 0) return 0;
    let peak = 0, maxDD = 0, equity = 0;
    closed.sort((a, b) => (a.entry_time || '').localeCompare(b.entry_time || ''));
    closed.forEach(t => {
      equity += t.net_pnl || 0;
      if (equity > peak) peak = equity;
      const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
    });
    return maxDD;
  }, [allTrades]);

  // Risk used approximation
  const riskUsedPct = useMemo(() => {
    if (todaySummary.count === 0) return 0;
    const losses = allTrades.filter(t => t.entry_time?.slice(0, 10) === todayKey && t.status === 'closed' && (t.net_pnl || 0) < 0);
    const totalLoss = Math.abs(losses.reduce((s, t) => s + (t.net_pnl || 0), 0));
    // Assume 5% daily risk budget of a $10k account
    const riskBudget = 500;
    return Math.min(100, (totalLoss / riskBudget) * 100);
  }, [allTrades, todayKey, todaySummary.count]);

  // Recommended actions
  const recommendedActions = useMemo(() => {
    const actions: { text: string; href: string; priority: 'high' | 'medium' | 'low' }[] = [];
    if (!todayJournalExists) {
      actions.push({ text: 'Write today\'s pre-market plan', href: '/journal', priority: 'high' });
    }
    if (todaySummary.pnl < -200) {
      actions.push({ text: 'Review risk exposure — significant daily loss', href: '/risk-guardian', priority: 'high' });
    }
    if (todaySummary.count === 0) {
      actions.push({ text: 'Import or log your trades to track performance', href: '/trades', priority: 'medium' });
    }
    if (biggestMistake && Math.abs(biggestMistake.pnl) > 100) {
      actions.push({ text: `Analyze your worst loss on ${biggestMistake.symbol}`, href: '/analytics', priority: 'medium' });
    }
    if (actions.length === 0) {
      actions.push({ text: 'Review your weekly performance analytics', href: '/analytics', priority: 'low' });
      actions.push({ text: 'Run AI copilot analysis for edge improvement', href: '/ai-copilot', priority: 'low' });
    }
    return actions.slice(0, 3);
  }, [todayJournalExists, todaySummary, biggestMistake]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const fadeIn = (delay: number) => cn(
    'transition-all duration-500',
    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-3 md:px-6 py-3 md:py-5 space-y-4 md:space-y-5">

        {/* ═══ EXECUTIVE SUMMARY ═══ */}
        <div className={fadeIn(0)} style={{ transitionDelay: '0ms' }}>
          <div className="flex items-center justify-between mb-2">
            <SystemStatusBar />
            <div className="flex items-center gap-2">
              {journalStreak > 0 && (
                <div className="flex items-center gap-1 text-[10px] font-mono text-[hsl(var(--warning))]">
                  <Flame className="h-3 w-3" /> {journalStreak}d streak
                </div>
              )}
            </div>
          </div>
          <AccountHealthCard
            displayName={displayName}
            greeting={greeting}
            todayPnl={todaySummary.pnl}
            weekPnl={weekSummary.pnl}
            drawdownPct={drawdownPct}
          />
        </div>

        {/* Risk Status */}
        <div className={fadeIn(50)} style={{ transitionDelay: '50ms' }}>
          <RiskStatusStrip
            riskUsedPct={riskUsedPct}
            tradesCount={todaySummary.count}
            maxDD={drawdownPct}
          />
        </div>

        {/* ═══ DIAGNOSTIC LAYER ═══ */}
        <div className={cn(fadeIn(100), 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3')} style={{ transitionDelay: '100ms' }}>
          {/* Top Insight */}
          <DiagnosticCard
            icon={Brain}
            iconColor="text-primary"
            bgColor="bg-primary/10"
            title="Top Insight"
            value={todaySummary.count > 0
              ? (todaySummary.winRate >= 60 ? 'Edge Active' : todaySummary.winRate < 40 ? 'Edge Degrading' : 'Neutral Day')
              : 'Awaiting Data'}
            detail={todaySummary.count > 0
              ? `${todaySummary.winRate}% win rate across ${todaySummary.count} trades today`
              : 'No trades yet today — import or log trades to get insights'}
            href="/ai-copilot"
          />

          {/* Best Setup */}
          <DiagnosticCard
            icon={Award}
            iconColor="text-[hsl(var(--profit))]"
            bgColor="bg-[hsl(var(--profit)/0.1)]"
            title="Best Setup (Week)"
            value={bestSetup ? bestSetup.name : 'No Data'}
            detail={bestSetup
              ? `+$${bestSetup.pnl.toFixed(0)} · ${bestSetup.winRate}% WR · ${bestSetup.count} trades`
              : 'Tag your setups on trades to see which edges perform best'}
            href="/analytics"
          />

          {/* Biggest Mistake */}
          <DiagnosticCard
            icon={SkullIcon}
            iconColor="text-[hsl(var(--loss))]"
            bgColor="bg-[hsl(var(--loss)/0.1)]"
            title="Biggest Mistake"
            value={biggestMistake ? `${biggestMistake.symbol}` : 'Clean Week'}
            detail={biggestMistake
              ? `$${biggestMistake.pnl.toFixed(0)} loss · Setup: ${biggestMistake.setup}`
              : 'No significant losses this week — keep it up!'}
            href="/analytics"
          />

          {/* Compliance */}
          <DiagnosticCard
            icon={Shield}
            iconColor="text-[hsl(var(--premium))]"
            bgColor="bg-[hsl(var(--premium)/0.1)]"
            title="Compliance"
            value={riskUsedPct < 80 ? 'Within Limits' : 'At Limit'}
            detail={`DD: -${drawdownPct.toFixed(1)}% · Daily risk: ${riskUsedPct.toFixed(0)}% used`}
            href="/risk-guardian"
          />
        </div>

        {/* ═══ ACTION LAYER ═══ */}
        <div className={cn(fadeIn(150), 'grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4')} style={{ transitionDelay: '150ms' }}>

          {/* LEFT: Checklist + Actions */}
          <div className="lg:col-span-5 space-y-3">
            <DailyChecklist
              journalDone={todayJournalExists}
              riskChecked={todaySummary.count > 0}
              reviewDone={todayJournalExists && todaySummary.count > 0}
            />
            <RecommendedActions actions={recommendedActions} />
          </div>

          {/* RIGHT: Quick nav + Recent */}
          <div className="lg:col-span-7 space-y-3">
            {/* Quick Links */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { icon: ScrollText, label: 'Journal', href: '/journal', primary: true },
                { icon: BarChart3, label: 'Analytics', href: '/analytics' },
                { icon: Shield, label: 'Risk', href: '/risk-guardian' },
                { icon: Bot, label: 'Copilot', href: '/ai-copilot' },
                { icon: Trophy, label: 'Achievements', href: '/achievements' },
                { icon: Target, label: 'Playbook', href: '/playbook' },
              ].map(a => (
                <Button key={a.href} variant={a.primary ? 'default' : 'ghost'} size="sm"
                  className={cn("h-7 text-[11px] gap-1 rounded-lg",
                    a.primary ? "bg-primary hover:bg-primary/90 text-primary-foreground px-3" : "text-muted-foreground hover:text-foreground hover:bg-muted/30 px-2"
                  )} asChild>
                  <Link to={a.href}><a.icon className="h-3 w-3" />{a.label}</Link>
                </Button>
              ))}
            </div>

            {/* Recent Trades */}
            <div className="card-glow rounded-xl border border-border/20 bg-card/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <SectionHeader icon={Clock} title="Recent Trades" />
                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground/40 p-0 hover:text-primary" asChild>
                  <Link to="/trades">View All <ChevronRight className="h-2.5 w-2.5 ml-0.5" /></Link>
                </Button>
              </div>
              {allTrades.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-8 w-8 text-muted-foreground/15 mx-auto mb-2" />
                  <p className="text-[11px] text-muted-foreground/50 mb-2">No trades yet</p>
                  <Button variant="outline" size="sm" className="h-7 text-[11px]" asChild>
                    <Link to="/trades">Import Trades</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-0">
                  {allTrades.slice(0, 8).map((trade, i) => (
                    <div key={trade.id || i} className="flex items-center justify-between py-2 border-b border-border/5 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0",
                          (trade.net_pnl || 0) >= 0 ? "bg-[hsl(var(--profit))]" : "bg-[hsl(var(--loss))]"
                        )} />
                        <span className="text-[11px] font-mono font-semibold text-foreground/90 truncate">{trade.symbol}</span>
                        <span className="text-[9px] text-muted-foreground/40 uppercase">{trade.direction}</span>
                        {trade.setup_type && <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">{trade.setup_type}</Badge>}
                      </div>
                      <span className={cn("text-[11px] font-mono font-medium tabular-nums",
                        (trade.net_pnl || 0) >= 0 ? "text-[hsl(var(--profit))]" : "text-[hsl(var(--loss))]"
                      )}>
                        {(trade.net_pnl || 0) >= 0 ? '+' : ''}{(trade.net_pnl || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
