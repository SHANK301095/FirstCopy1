/**
 * R-Multiple Distribution - histogram with bell curve overlay
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import type { Trade } from '@/hooks/useTradesDB';

export function RMultipleDistribution({ trades }: { trades: Trade[] }) {
  const { bins, avg, median } = useMemo(() => {
    const rValues = trades.filter(t => t.status === 'closed' && t.r_multiple != null).map(t => t.r_multiple!);
    if (rValues.length === 0) return { bins: [], avg: 0, median: 0 };

    const sorted = [...rValues].sort((a, b) => a - b);
    const avg = rValues.reduce((s, r) => s + r, 0) / rValues.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    // Create bins from -3R to +5R
    const binSize = 0.5;
    const binMap = new Map<number, number>();
    for (let b = -3; b <= 5; b += binSize) binMap.set(b, 0);
    
    rValues.forEach(r => {
      const bin = Math.round(Math.max(-3, Math.min(5, Math.floor(r / binSize) * binSize)) * 10) / 10;
      binMap.set(bin, (binMap.get(bin) || 0) + 1);
    });

    const bins = Array.from(binMap.entries()).map(([r, count]) => ({
      r: `${r >= 0 ? '+' : ''}${r.toFixed(1)}R`,
      rNum: r,
      count,
    }));

    return { bins, avg, median };
  }, [trades]);

  if (bins.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-muted-foreground" /> R-Multiple Distribution</CardTitle></CardHeader>
        <CardContent><div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No R-multiple data. Add stop loss to your trades.</div></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          R-Multiple Distribution
          <span className="text-xs font-normal text-muted-foreground ml-auto">Avg: {avg.toFixed(2)}R • Med: {median.toFixed(2)}R</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={bins}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="r" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" interval={1} />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
            <ReferenceLine x={`${avg >= 0 ? '+' : ''}${(Math.round(avg / 0.5) * 0.5).toFixed(1)}R`} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ value: 'Avg', fontSize: 10, fill: 'hsl(var(--primary))' }} />
            <Bar dataKey="count" name="Trades" radius={[2, 2, 0, 0]}>
              {bins.map((b, i) => <Cell key={i} fill={b.rNum >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'} opacity={0.7} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
