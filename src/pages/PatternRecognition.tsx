/**
 * Pattern Recognition - Real pattern detection from user's trade data
 * Detects: Best Session, Best Symbol, Best Setup, Day of Week, Momentum, Revenge Trading
 */

import { useMemo } from 'react';
import {
  Clock, BarChart3, Target, Calendar, TrendingUp, TrendingDown,
  AlertTriangle, Construction, Zap, BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { PageTitle } from '@/components/ui/PageTitle';
import { useTradesDB } from '@/hooks/useTradesDB';
import { safeNetPnl } from '@/lib/tradeMetrics';
import { Link } from 'react-router-dom';

interface DetectedPattern {
  id: string;
  name: string;
  type: 'time' | 'symbol' | 'setup' | 'day' | 'behavioral';
  sentiment: 'positive' | 'negative' | 'neutral';
  winRate: number;
  tradeCount: number;
  avgPnl: number;
  totalPnl: number;
  description: string;
  confidence: number; // 0-100
}

const TYPE_ICONS: Record<string, typeof Clock> = {
  time: Clock,
  symbol: BarChart3,
  setup: Target,
  day: Calendar,
  behavioral: Zap,
};

const TYPE_LABELS: Record<string, string> = {
  time: 'Session',
  symbol: 'Symbol',
  setup: 'Setup',
  day: 'Day of Week',
  behavioral: 'Behavioral',
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function detectPatterns(trades: any[]): DetectedPattern[] {
  const closed = trades.filter(t => t.status === 'closed');
  if (closed.length < 20) return [];

  const patterns: DetectedPattern[] = [];
  let patternId = 0;

  // PATTERN 1: Best Session (hour of entry)
  const byHour = new Map<number, { wins: number; losses: number; pnl: number; count: number }>();
  for (const t of closed) {
    const hour = new Date(t.entry_time).getHours();
    const entry = byHour.get(hour) || { wins: 0, losses: 0, pnl: 0, count: 0 };
    const pnl = safeNetPnl(t);
    entry.count++;
    entry.pnl += pnl;
    if (pnl > 0) entry.wins++;
    else if (pnl < 0) entry.losses++;
    byHour.set(hour, entry);
  }
  for (const [hour, data] of byHour) {
    if (data.count < 5) continue;
    const decisive = data.wins + data.losses;
    const wr = decisive > 0 ? (data.wins / decisive) * 100 : 0;
    if (wr >= 60) {
      patterns.push({
        id: `session-${patternId++}`,
        name: `${hour}:00 Session Edge`,
        type: 'time',
        sentiment: 'positive',
        winRate: wr,
        tradeCount: data.count,
        avgPnl: data.pnl / data.count,
        totalPnl: data.pnl,
        description: `Trades entered at ${hour}:00 have a ${wr.toFixed(0)}% win rate across ${data.count} trades.`,
        confidence: Math.min(95, 50 + data.count * 2),
      });
    }
  }

  // PATTERN 2: Best Symbol
  const bySymbol = new Map<string, { wins: number; losses: number; pnl: number; count: number }>();
  for (const t of closed) {
    const sym = t.symbol;
    const entry = bySymbol.get(sym) || { wins: 0, losses: 0, pnl: 0, count: 0 };
    const pnl = safeNetPnl(t);
    entry.count++;
    entry.pnl += pnl;
    if (pnl > 0) entry.wins++;
    else if (pnl < 0) entry.losses++;
    bySymbol.set(sym, entry);
  }
  for (const [sym, data] of bySymbol) {
    if (data.count < 5) continue;
    const grossWin = closed.filter(t => t.symbol === sym && safeNetPnl(t) > 0).reduce((s, t) => s + safeNetPnl(t), 0);
    const grossLoss = Math.abs(closed.filter(t => t.symbol === sym && safeNetPnl(t) < 0).reduce((s, t) => s + safeNetPnl(t), 0));
    const pf = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
    const decisive = data.wins + data.losses;
    const wr = decisive > 0 ? (data.wins / decisive) * 100 : 0;
    if (pf > 1.5) {
      patterns.push({
        id: `symbol-${patternId++}`,
        name: `${sym} Edge`,
        type: 'symbol',
        sentiment: 'positive',
        winRate: wr,
        tradeCount: data.count,
        avgPnl: data.pnl / data.count,
        totalPnl: data.pnl,
        description: `${sym} has a profit factor of ${isFinite(pf) ? pf.toFixed(1) : '∞'} with ${wr.toFixed(0)}% win rate.`,
        confidence: Math.min(95, 50 + data.count * 2),
      });
    } else if (pf < 0.7 && data.count >= 5) {
      patterns.push({
        id: `symbol-neg-${patternId++}`,
        name: `${sym} Weakness`,
        type: 'symbol',
        sentiment: 'negative',
        winRate: wr,
        tradeCount: data.count,
        avgPnl: data.pnl / data.count,
        totalPnl: data.pnl,
        description: `${sym} has a low profit factor of ${pf.toFixed(1)}. Consider reducing exposure.`,
        confidence: Math.min(90, 50 + data.count * 2),
      });
    }
  }

  // PATTERN 3: Best Setup
  const bySetup = new Map<string, { wins: number; losses: number; pnl: number; count: number }>();
  for (const t of closed) {
    const setup = t.setup_type || t.strategy_tag;
    if (!setup) continue;
    const entry = bySetup.get(setup) || { wins: 0, losses: 0, pnl: 0, count: 0 };
    const pnl = safeNetPnl(t);
    entry.count++;
    entry.pnl += pnl;
    if (pnl > 0) entry.wins++;
    else if (pnl < 0) entry.losses++;
    bySetup.set(setup, entry);
  }
  for (const [setup, data] of bySetup) {
    if (data.count < 5) continue;
    const decisive = data.wins + data.losses;
    const wr = decisive > 0 ? (data.wins / decisive) * 100 : 0;
    if (wr > 55) {
      patterns.push({
        id: `setup-${patternId++}`,
        name: `"${setup}" Setup`,
        type: 'setup',
        sentiment: 'positive',
        winRate: wr,
        tradeCount: data.count,
        avgPnl: data.pnl / data.count,
        totalPnl: data.pnl,
        description: `Setup "${setup}" wins ${wr.toFixed(0)}% of the time with avg ₹${(data.pnl / data.count).toFixed(0)} per trade.`,
        confidence: Math.min(90, 50 + data.count * 2),
      });
    }
  }

  // PATTERN 4: Day of Week
  const byDay = new Map<number, { wins: number; losses: number; pnl: number; count: number }>();
  for (const t of closed) {
    const day = new Date(t.entry_time).getDay();
    const entry = byDay.get(day) || { wins: 0, losses: 0, pnl: 0, count: 0 };
    const pnl = safeNetPnl(t);
    entry.count++;
    entry.pnl += pnl;
    if (pnl > 0) entry.wins++;
    else if (pnl < 0) entry.losses++;
    byDay.set(day, entry);
  }
  // Find best and worst days
  let bestDay = { day: -1, wr: 0, count: 0, pnl: 0 };
  let worstDay = { day: -1, wr: 100, count: 0, pnl: 0 };
  for (const [day, data] of byDay) {
    if (data.count < 5) continue;
    const decisive = data.wins + data.losses;
    const wr = decisive > 0 ? (data.wins / decisive) * 100 : 0;
    if (wr > bestDay.wr) bestDay = { day, wr, count: data.count, pnl: data.pnl };
    if (wr < worstDay.wr) worstDay = { day, wr, count: data.count, pnl: data.pnl };
  }
  if (bestDay.day >= 0 && bestDay.wr >= 55) {
    patterns.push({
      id: `day-best-${patternId++}`,
      name: `${DAY_NAMES[bestDay.day]} Edge`,
      type: 'day',
      sentiment: 'positive',
      winRate: bestDay.wr,
      tradeCount: bestDay.count,
      avgPnl: bestDay.pnl / bestDay.count,
      totalPnl: bestDay.pnl,
      description: `${DAY_NAMES[bestDay.day]}s are your strongest day with ${bestDay.wr.toFixed(0)}% win rate.`,
      confidence: Math.min(85, 50 + bestDay.count),
    });
  }
  if (worstDay.day >= 0 && worstDay.wr < 45 && worstDay.day !== bestDay.day) {
    patterns.push({
      id: `day-worst-${patternId++}`,
      name: `${DAY_NAMES[worstDay.day]} Weakness`,
      type: 'day',
      sentiment: 'negative',
      winRate: worstDay.wr,
      tradeCount: worstDay.count,
      avgPnl: worstDay.pnl / worstDay.count,
      totalPnl: worstDay.pnl,
      description: `${DAY_NAMES[worstDay.day]}s underperform at ${worstDay.wr.toFixed(0)}% win rate. Consider reducing size.`,
      confidence: Math.min(85, 50 + worstDay.count),
    });
  }

  // PATTERN 5: Momentum Continuation (win after win)
  const sorted = [...closed].sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
  let afterWinTotal = 0, afterWinWins = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (safeNetPnl(sorted[i - 1]) > 0) {
      afterWinTotal++;
      if (safeNetPnl(sorted[i]) > 0) afterWinWins++;
    }
  }
  if (afterWinTotal >= 5) {
    const wr = (afterWinWins / afterWinTotal) * 100;
    if (wr >= 60) {
      patterns.push({
        id: `momentum-${patternId++}`,
        name: 'Momentum Continuation',
        type: 'behavioral',
        sentiment: 'positive',
        winRate: wr,
        tradeCount: afterWinTotal,
        avgPnl: 0,
        totalPnl: 0,
        description: `After a win, your next trade wins ${wr.toFixed(0)}% of the time. You trade well with momentum.`,
        confidence: Math.min(85, 50 + afterWinTotal),
      });
    }
  }

  // PATTERN 6: Revenge Trading (trade within 30 min after a loss)
  let revengeCount = 0, revengeWins = 0, revengePnl = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (safeNetPnl(sorted[i - 1]) < 0) {
      const prevExit = sorted[i - 1].exit_time ? new Date(sorted[i - 1].exit_time).getTime() : new Date(sorted[i - 1].entry_time).getTime();
      const nextEntry = new Date(sorted[i].entry_time).getTime();
      const diffMin = (nextEntry - prevExit) / 60000;
      if (diffMin >= 0 && diffMin <= 30) {
        revengeCount++;
        const pnl = safeNetPnl(sorted[i]);
        revengePnl += pnl;
        if (pnl > 0) revengeWins++;
      }
    }
  }
  if (revengeCount >= 5) {
    const wr = (revengeWins / revengeCount) * 100;
    patterns.push({
      id: `revenge-${patternId++}`,
      name: 'Revenge Trading',
      type: 'behavioral',
      sentiment: wr < 45 ? 'negative' : 'neutral',
      winRate: wr,
      tradeCount: revengeCount,
      avgPnl: revengePnl / revengeCount,
      totalPnl: revengePnl,
      description: `${revengeCount} trades entered within 30 min of a loss. Win rate: ${wr.toFixed(0)}%. ${wr < 45 ? 'Consider adding a cooldown after losses.' : ''}`,
      confidence: Math.min(85, 50 + revengeCount),
    });
  }

  // Sort: positive first, then by confidence
  return patterns.sort((a, b) => {
    if (a.sentiment !== b.sentiment) {
      if (a.sentiment === 'positive') return -1;
      if (b.sentiment === 'positive') return 1;
    }
    return b.confidence - a.confidence;
  });
}

export default function PatternRecognition() {
  const { trades, loading } = useTradesDB();

  const closedCount = useMemo(() => trades.filter(t => t.status === 'closed').length, [trades]);
  const patterns = useMemo(() => detectPatterns(trades), [trades]);
  const positivePatterns = patterns.filter(p => p.sentiment === 'positive');
  const negativePatterns = patterns.filter(p => p.sentiment === 'negative' || p.sentiment === 'neutral');

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageTitle title="Pattern Recognition" subtitle="Detecting patterns from your trades..." />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="pt-6"><div className="h-32 bg-muted/30 animate-pulse rounded-lg" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <PageTitle
          title="Pattern Recognition"
          subtitle="AI-detected edges and behavioral patterns from your trades"
        />
        <Badge variant="outline" className="w-fit border-warning/50 text-warning">
          <Construction className="h-3 w-3 mr-1" /> Beta
        </Badge>
      </div>

      {/* Coming Soon banner for candlestick patterns */}
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="flex items-center gap-3 py-4">
          <Construction className="h-5 w-5 text-warning shrink-0" />
          <div>
            <p className="font-medium text-sm">Candlestick Pattern Detection — Coming Soon</p>
            <p className="text-xs text-muted-foreground">
              Chart-based pattern detection is under development. Below are behavioral patterns detected from your actual trades.
            </p>
          </div>
        </CardContent>
      </Card>

      {closedCount < 20 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-lg font-medium mb-1">Need 20+ closed trades to detect patterns</p>
            <p className="text-sm text-muted-foreground mb-4">
              Currently have {closedCount} closed trade{closedCount !== 1 ? 's' : ''}. Import more to unlock pattern detection.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/trades">Go to Trades →</Link>
            </Button>
          </CardContent>
        </Card>
      ) : patterns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-lg font-medium mb-1">No strong patterns detected yet</p>
            <p className="text-sm text-muted-foreground">
              Your trades don't show statistically significant edges yet. Keep trading and tagging setups!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Patterns Found</div>
              <div className="text-2xl font-bold font-mono">{patterns.length}</div>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Positive Edges</div>
              <div className="text-2xl font-bold font-mono text-profit">{positivePatterns.length}</div>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Negative Patterns</div>
              <div className="text-2xl font-bold font-mono text-loss">{negativePatterns.length}</div>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Trades Analyzed</div>
              <div className="text-2xl font-bold font-mono">{closedCount}</div>
            </CardContent></Card>
          </div>

          {/* Positive Edges */}
          {positivePatterns.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-profit" /> Edges & Strengths
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {positivePatterns.map(p => <PatternCard key={p.id} pattern={p} />)}
              </div>
            </div>
          )}

          {/* Negative / Warnings */}
          {negativePatterns.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" /> Weaknesses & Warnings
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {negativePatterns.map(p => <PatternCard key={p.id} pattern={p} />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* Data quality */}
      {closedCount >= 20 && (
        <p className="text-[11px] text-muted-foreground text-center">
          Based on {closedCount} closed trades · Minimum 5 trades per pattern · Empirical analysis
        </p>
      )}
    </div>
  );
}

function PatternCard({ pattern }: { pattern: DetectedPattern }) {
  const Icon = TYPE_ICONS[pattern.type] || Target;
  const isPositive = pattern.sentiment === 'positive';

  return (
    <Card className={cn(
      'transition-all hover:shadow-md',
      isPositive ? 'border-profit/20 hover:border-profit/40' : 'border-warning/20 hover:border-warning/40'
    )}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              'p-1.5 rounded-lg',
              isPositive ? 'bg-profit/10 text-profit' : 'bg-warning/10 text-warning'
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{pattern.name}</p>
              <Badge variant="outline" className="text-[9px] mt-0.5">{TYPE_LABELS[pattern.type]}</Badge>
            </div>
          </div>
          <Badge className={cn(
            'text-[10px]',
            isPositive ? 'bg-profit/10 text-profit border-profit/30' : 'bg-warning/10 text-warning border-warning/30'
          )} variant="outline">
            {pattern.confidence}%
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">{pattern.description}</p>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Win Rate</span>
            <span className={cn('font-mono font-medium', pattern.winRate >= 55 ? 'text-profit' : pattern.winRate < 45 ? 'text-loss' : '')}>
              {pattern.winRate.toFixed(0)}%
            </span>
          </div>
          <Progress
            value={pattern.winRate}
            className="h-1.5"
            variant={pattern.winRate >= 55 ? 'success' : pattern.winRate < 45 ? 'danger' : 'default'}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Trades: </span>
            <span className="font-mono font-medium">{pattern.tradeCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Avg P&L: </span>
            <span className={cn('font-mono font-medium', pattern.avgPnl >= 0 ? 'text-profit' : 'text-loss')}>
              {pattern.avgPnl >= 0 ? '+' : ''}₹{pattern.avgPnl.toFixed(0)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
