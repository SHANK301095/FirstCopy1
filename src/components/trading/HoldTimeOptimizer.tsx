/**
 * Hold Time Optimizer - analyze hold time for winners vs losers
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Timer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import type { Trade } from '@/hooks/useTradesDB';
import { safeNetPnl } from '@/lib/tradeMetrics';
import { differenceInMinutes } from 'date-fns';

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins.toFixed(0)}m`;
  if (mins < 1440) return `${(mins / 60).toFixed(1)}h`;
  return `${(mins / 1440).toFixed(1)}d`;
}

export function HoldTimeOptimizer({ trades }: { trades: Trade[] }) {
  const data = useMemo(() => {
    const withExit = trades.filter(t => t.status === 'closed' && t.exit_time);
    if (withExit.length === 0) return null;

    const tradesWithDuration = withExit.map(t => ({
      ...t,
      duration: differenceInMinutes(new Date(t.exit_time!), new Date(t.entry_time)),
    })).filter(t => t.duration > 0);

    const winners = tradesWithDuration.filter(t => safeNetPnl(t) > 0);
    const losers = tradesWithDuration.filter(t => safeNetPnl(t) < 0);

    const avgWinDuration = winners.length > 0 ? winners.reduce((s, t) => s + t.duration, 0) / winners.length : 0;
    const avgLossDuration = losers.length > 0 ? losers.reduce((s, t) => s + t.duration, 0) / losers.length : 0;

    // Bucket by duration
    const buckets = [
      { label: '<5m', min: 0, max: 5 },
      { label: '5-15m', min: 5, max: 15 },
      { label: '15-60m', min: 15, max: 60 },
      { label: '1-4h', min: 60, max: 240 },
      { label: '4h-1d', min: 240, max: 1440 },
      { label: '1d+', min: 1440, max: Infinity },
    ];

    const bucketData = buckets.map(b => {
      const inBucket = tradesWithDuration.filter(t => t.duration >= b.min && t.duration < b.max);
      const wins = inBucket.filter(t => safeNetPnl(t) > 0).length;
      const totalPnl = inBucket.reduce((s, t) => s + safeNetPnl(t), 0);
      return {
        label: b.label,
        count: inBucket.length,
        winRate: inBucket.length > 0 ? (wins / inBucket.length) * 100 : 0,
        avgPnl: inBucket.length > 0 ? totalPnl / inBucket.length : 0,
      };
    }).filter(b => b.count > 0);

    return { avgWinDuration, avgLossDuration, bucketData, totalWithDuration: tradesWithDuration.length };
  }, [trades]);

  if (!data) return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Timer className="h-4 w-4 text-muted-foreground" /> Hold Time Analysis</CardTitle></CardHeader>
      <CardContent><div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Need exit_time on trades</div></CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          Hold Time Optimizer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-2 rounded bg-emerald-500/10 text-center">
            <p className="text-[10px] text-muted-foreground">Avg Winner Hold</p>
            <p className="text-sm font-mono font-bold text-emerald-400">{formatDuration(data.avgWinDuration)}</p>
          </div>
          <div className="p-2 rounded bg-red-500/10 text-center">
            <p className="text-[10px] text-muted-foreground">Avg Loser Hold</p>
            <p className="text-sm font-mono font-bold text-red-400">{formatDuration(data.avgLossDuration)}</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data.bucketData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
            <Bar dataKey="winRate" name="Win Rate" radius={[3, 3, 0, 0]}>
              {data.bucketData.map((d, i) => <Cell key={i} fill={d.winRate >= 50 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
