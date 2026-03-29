/**
 * Setup Decay Analysis - track if a setup's edge is degrading over time
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Trade } from '@/hooks/useTradesDB';
import { safeNetPnl } from '@/lib/tradeMetrics';

export function SetupDecayAnalysis({ trades }: { trades: Trade[] }) {
  const { setups, chartData } = useMemo(() => {
    const closed = trades.filter(t => t.status === 'closed' && t.setup_type).sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
    
    const setupMap = new Map<string, { trades: Trade[]; rollingWR: { idx: number; wr: number }[] }>();
    
    closed.forEach((t, i) => {
      const key = t.setup_type!;
      if (!setupMap.has(key)) setupMap.set(key, { trades: [], rollingWR: [] });
      const entry = setupMap.get(key)!;
      entry.trades.push(t);
      
      // Rolling 10-trade win rate
      const recent = entry.trades.slice(-10);
      const wins = recent.filter(r => safeNetPnl(r) > 0).length;
      entry.rollingWR.push({ idx: entry.trades.length, wr: (wins / recent.length) * 100 });
    });

    // Get top 4 setups by trade count
    const sorted = Array.from(setupMap.entries()).sort((a, b) => b[1].trades.length - a[1].trades.length).slice(0, 4);
    
    const setups = sorted.map(([name, data]) => {
      const totalWR = (data.trades.filter(t => safeNetPnl(t) > 0).length / data.trades.length) * 100;
      const recentWR = data.rollingWR.length > 0 ? data.rollingWR[data.rollingWR.length - 1].wr : 0;
      const isDecaying = recentWR < totalWR - 10;
      return { name, count: data.trades.length, totalWR, recentWR, isDecaying, rollingWR: data.rollingWR };
    });

    // Build unified chart data
    const maxLen = Math.max(...sorted.map(([, d]) => d.rollingWR.length), 0);
    const chartData = Array.from({ length: maxLen }, (_, i) => {
      const point: any = { trade: i + 1 };
      sorted.forEach(([name, data]) => {
        point[name] = data.rollingWR[i]?.wr ?? null;
      });
      return point;
    });

    return { setups, chartData };
  }, [trades]);

  const colors = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
          Setup Edge Decay
        </CardTitle>
      </CardHeader>
      <CardContent>
        {setups.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Add setup_type to trades to track decay</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {setups.map((s, i) => (
                <Badge key={s.name} variant={s.isDecaying ? 'destructive' : 'secondary'} className="text-[10px]">
                  <span className="w-2 h-2 rounded-full mr-1" style={{ background: colors[i] }}></span>
                  {s.name}: {s.recentWR.toFixed(0)}% {s.isDecaying ? '↘' : '→'}
                </Badge>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="trade" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" opacity={0.5} />
                {setups.map((s, i) => (
                  <Line key={s.name} type="monotone" dataKey={s.name} stroke={colors[i]} strokeWidth={1.5} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
