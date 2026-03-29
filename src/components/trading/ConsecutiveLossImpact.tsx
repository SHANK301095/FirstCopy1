/**
 * Consecutive Loss Impact - how losing streaks affect subsequent trades
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import type { Trade } from '@/hooks/useTradesDB';
import { safeNetPnl } from '@/lib/tradeMetrics';

export function ConsecutiveLossImpact({ trades }: { trades: Trade[] }) {
  const data = useMemo(() => {
    const closed = trades.filter(t => t.status === 'closed')
      .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
    
    if (closed.length < 10) return [];

    // For each trade, count how many consecutive losses preceded it
    const results: { streak: number; nextTrades: number[]; }[] = [];
    for (let s = 0; s <= 7; s++) results.push({ streak: s, nextTrades: [] });

    let currentLossStreak = 0;
    for (let i = 0; i < closed.length; i++) {
      const pnl = safeNetPnl(closed[i]);
      
      if (i > 0) {
        const streakBucket = Math.min(currentLossStreak, 7);
        results[streakBucket].nextTrades.push(pnl);
      }

      if (pnl < 0) currentLossStreak++;
      else currentLossStreak = 0;
    }

    return results.filter(r => r.nextTrades.length > 0).map(r => ({
      streak: r.streak === 7 ? '7+' : `${r.streak}`,
      avgPnl: r.nextTrades.reduce((s, p) => s + p, 0) / r.nextTrades.length,
      winRate: (r.nextTrades.filter(p => p > 0).length / r.nextTrades.length) * 100,
      count: r.nextTrades.length,
    }));
  }, [trades]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          After Consecutive Losses
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Need 10+ trades</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="streak" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" label={{ value: 'Losses Before', fontSize: 10, position: 'insideBottom', offset: -2 }} />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="winRate" name="Win Rate After" radius={[4, 4, 0, 0]}>
                  {data.map((d, i) => <Cell key={i} fill={d.winRate >= 50 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {data.slice(0, 4).map(d => (
                <div key={d.streak} className="text-center p-1.5 rounded bg-muted/30">
                  <p className="text-[9px] text-muted-foreground">After {d.streak}L</p>
                  <p className={cn('text-xs font-mono font-bold', d.winRate >= 50 ? 'text-emerald-400' : 'text-red-400')}>{d.winRate.toFixed(0)}%</p>
                  <p className="text-[9px] text-muted-foreground">{d.count} trades</p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
