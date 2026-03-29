/**
 * Equity Curve Chart - cumulative P&L over time
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import type { Trade } from '@/hooks/useTradesDB';

interface EquityCurveProps {
  trades: Trade[];
}

export function EquityCurve({ trades }: EquityCurveProps) {
  const data = useMemo(() => {
    const closed = trades
      .filter(t => t.status === 'closed')
      .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());

    let cumulative = 0;
    let peak = 0;
    return closed.map(t => {
      cumulative += t.net_pnl;
      peak = Math.max(peak, cumulative);
      return {
        date: format(new Date(t.entry_time), 'dd MMM'),
        equity: Math.round(cumulative),
        drawdown: Math.round(cumulative - peak),
      };
    });
  }, [trades]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Equity Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
            No closed trades yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Equity Curve</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `₹${v}`} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              formatter={(value: number, name: string) => [`₹${value}`, name === 'equity' ? 'Equity' : 'Drawdown']}
            />
            <Area type="monotone" dataKey="equity" stroke="hsl(var(--primary))" fill="url(#equityGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="drawdown" stroke="hsl(var(--destructive))" fill="url(#ddGrad)" strokeWidth={1} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
