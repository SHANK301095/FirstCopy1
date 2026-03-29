/**
 * Win Probability Meter — Shows real-time probability based on recent performance
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target } from 'lucide-react';
import type { Trade } from '@/hooks/useTradesDB';

function computeWinProbability(trades: Trade[]) {
  const closed = trades.filter(t => t.status === 'closed').sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime());
  if (closed.length < 5) return { overall: 0, recent10: 0, recent20: 0, byDirection: { long: 0, short: 0 }, streak: { type: 'none' as const, count: 0 } };

  const overall = (closed.filter(t => (t.net_pnl || 0) > 0).length / closed.length) * 100;
  const r10 = closed.slice(0, 10);
  const r20 = closed.slice(0, 20);
  const recent10 = r10.length ? (r10.filter(t => (t.net_pnl || 0) > 0).length / r10.length) * 100 : 0;
  const recent20 = r20.length ? (r20.filter(t => (t.net_pnl || 0) > 0).length / r20.length) * 100 : 0;

  const longs = closed.filter(t => t.direction === 'long');
  const shorts = closed.filter(t => t.direction === 'short');
  const longWR = longs.length ? (longs.filter(t => (t.net_pnl || 0) > 0).length / longs.length) * 100 : 0;
  const shortWR = shorts.length ? (shorts.filter(t => (t.net_pnl || 0) > 0).length / shorts.length) * 100 : 0;

  let streakType: 'win' | 'loss' | 'none' = 'none';
  let streakCount = 0;
  if (closed.length > 0) {
    streakType = (closed[0].net_pnl || 0) > 0 ? 'win' : 'loss';
    for (const t of closed) {
      if ((streakType === 'win' && (t.net_pnl || 0) > 0) || (streakType === 'loss' && (t.net_pnl || 0) <= 0)) {
        streakCount++;
      } else break;
    }
  }

  return { overall, recent10, recent20, byDirection: { long: longWR, short: shortWR }, streak: { type: streakType, count: streakCount } };
}

function getProbColor(pct: number) {
  if (pct >= 65) return 'text-emerald-400';
  if (pct >= 50) return 'text-primary';
  if (pct >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

export function WinProbabilityMeter({ trades }: { trades: Trade[] }) {
  const prob = computeWinProbability(trades);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Win Probability
          </CardTitle>
          {prob.streak.type !== 'none' && (
            <Badge variant={prob.streak.type === 'win' ? 'default' : 'destructive'} className="text-xs">
              {prob.streak.count} {prob.streak.type === 'win' ? '🔥' : '❄️'} streak
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Main gauge */}
        <div className="text-center mb-4">
          <div className="relative w-32 h-32 mx-auto">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(220 15% 18%)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={prob.recent10 >= 60 ? '#22c55e' : prob.recent10 >= 45 ? '#3b82f6' : '#ef4444'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(prob.recent10 / 100) * 264} 264`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-mono font-bold ${getProbColor(prob.recent10)}`}>
                {prob.recent10.toFixed(0)}%
              </span>
              <span className="text-[10px] text-muted-foreground">Last 10</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className={`text-lg font-mono font-bold ${getProbColor(prob.overall)}`}>{prob.overall.toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground uppercase">Overall</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className={`text-lg font-mono font-bold ${getProbColor(prob.recent20)}`}>{prob.recent20.toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground uppercase">Last 20</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className={`text-lg font-mono font-bold ${getProbColor(prob.byDirection.long)}`}>{prob.byDirection.long.toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground uppercase">Long WR</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className={`text-lg font-mono font-bold ${getProbColor(prob.byDirection.short)}`}>{prob.byDirection.short.toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground uppercase">Short WR</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
