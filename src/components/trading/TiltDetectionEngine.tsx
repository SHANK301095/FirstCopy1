/**
 * Tilt Detection Engine - real-time emotional tilt scoring
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInMinutes, isToday, isThisWeek } from 'date-fns';
import type { Trade } from '@/hooks/useTradesDB';
import { safeNetPnl } from '@/lib/tradeMetrics';

interface TiltSignal {
  label: string;
  score: number; // 0-100
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export function TiltDetectionEngine({ trades }: { trades: Trade[] }) {
  const { signals, overallScore, status } = useMemo(() => {
    const today = trades.filter(t => t.status === 'closed' && isToday(new Date(t.entry_time)))
      .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
    const thisWeek = trades.filter(t => t.status === 'closed' && isThisWeek(new Date(t.entry_time), { weekStartsOn: 1 }));

    const signals: TiltSignal[] = [];

    // 1. Rapid-fire trading (trades too close together)
    if (today.length >= 2) {
      const gaps = [];
      for (let i = 1; i < today.length; i++) {
        gaps.push(differenceInMinutes(new Date(today[i].entry_time), new Date(today[i - 1].entry_time)));
      }
      const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
      if (avgGap < 5) {
        signals.push({ label: 'Rapid-Fire Trading', score: 80, severity: 'high', description: `Avg ${avgGap.toFixed(0)}min between trades — likely revenge trading` });
      } else if (avgGap < 15) {
        signals.push({ label: 'Fast Trading Pace', score: 40, severity: 'medium', description: `Avg ${avgGap.toFixed(0)}min gaps — consider slowing down` });
      }
    }

    // 2. Consecutive losses today
    const todayLosses = today.filter(t => safeNetPnl(t) < 0).length;
    let streak = 0;
    for (let i = today.length - 1; i >= 0; i--) {
      if (safeNetPnl(today[i]) < 0) streak++;
      else break;
    }
    if (streak >= 3) {
      signals.push({ label: `${streak} Losses in a Row`, score: Math.min(90, streak * 20), severity: 'high', description: 'Consider stopping for the day' });
    }

    // 3. Increasing position sizes after losses
    if (today.length >= 3) {
      const lastThree = today.slice(-3);
      const sizesIncreasing = lastThree.every((t, i) => i === 0 || t.quantity > lastThree[i - 1].quantity);
      const lastTwoLosing = lastThree.slice(0, 2).every(t => safeNetPnl(t) < 0);
      if (sizesIncreasing && lastTwoLosing) {
        signals.push({ label: 'Size Escalation', score: 70, severity: 'high', description: 'Position sizes increasing after losses — classic tilt pattern' });
      }
    }

    // 4. Overtrading (too many trades today)
    const avgDailyTrades = thisWeek.length > 0 ? thisWeek.length / 5 : 5;
    if (today.length > avgDailyTrades * 2) {
      signals.push({ label: 'Overtrading', score: 60, severity: 'medium', description: `${today.length} trades today vs ${avgDailyTrades.toFixed(0)} avg — way above normal` });
    }

    // 5. Deep daily loss
    const todayPnl = today.reduce((s, t) => s + safeNetPnl(t), 0);
    const avgDailyPnl = thisWeek.length > 0 ? thisWeek.reduce((s, t) => s + safeNetPnl(t), 0) / 5 : 0;
    if (todayPnl < avgDailyPnl * -2 && todayPnl < -500) {
      signals.push({ label: 'Deep Daily Loss', score: 75, severity: 'high', description: `₹${todayPnl.toFixed(0)} today — exceeding normal range` });
    }

    const overallScore = signals.length > 0 ? Math.round(signals.reduce((s, sig) => s + sig.score, 0) / signals.length) : 0;
    const status = overallScore >= 60 ? 'tilted' : overallScore >= 30 ? 'caution' : 'calm';

    return { signals, overallScore, status };
  }, [trades]);

  const StatusIcon = status === 'tilted' ? Flame : status === 'caution' ? AlertTriangle : Shield;
  const statusColor = status === 'tilted' ? 'text-red-400' : status === 'caution' ? 'text-amber-400' : 'text-emerald-400';
  const statusBg = status === 'tilted' ? 'bg-red-500/10' : status === 'caution' ? 'bg-amber-500/10' : 'bg-emerald-500/10';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Tilt Detection
          </CardTitle>
          <Badge variant="outline" className={cn('text-[10px]', statusBg, statusColor)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status === 'tilted' ? 'TILTED' : status === 'caution' ? 'CAUTION' : 'CALM'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {signals.length === 0 ? (
          <div className="text-center py-4 text-emerald-400 text-sm">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No tilt signals detected. Trading calmly. 🧘</p>
          </div>
        ) : (
          <div className="space-y-2">
            {signals.map(sig => (
              <div key={sig.label} className={cn(
                'p-2.5 rounded-lg border',
                sig.severity === 'high' ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5'
              )}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium">{sig.label}</span>
                  <Badge variant={sig.severity === 'high' ? 'destructive' : 'secondary'} className="text-[10px]">
                    {sig.score}/100
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{sig.description}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
