/**
 * Day of Week Performance - which days are profitable with statistical markers
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import type { Trade } from '@/hooks/useTradesDB';
import { safeNetPnl } from '@/lib/tradeMetrics';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DayOfWeekPerformance({ trades }: { trades: Trade[] }) {
  const data = useMemo(() => {
    const byDay = Array.from({ length: 7 }, (_, i) => ({ day: DAYS[i], pnl: 0, count: 0, wins: 0, winRate: 0 }));
    trades.filter(t => t.status === 'closed').forEach(t => {
      const d = new Date(t.entry_time).getDay();
      byDay[d].pnl += safeNetPnl(t);
      byDay[d].count++;
      if (safeNetPnl(t) > 0) byDay[d].wins++;
    });
    byDay.forEach(d => { d.winRate = d.count > 0 ? (d.wins / d.count) * 100 : 0; });
    return byDay.filter(d => d.count > 0);
  }, [trades]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Day of Week Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `₹${v}`} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                  {data.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
              {data.map(d => (
                <div key={d.day} className="text-center p-1.5 rounded bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">{d.day}</p>
                  <p className="text-xs font-mono font-bold">{d.winRate.toFixed(0)}% WR</p>
                  <p className="text-[10px] text-muted-foreground">{d.count} trades</p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
