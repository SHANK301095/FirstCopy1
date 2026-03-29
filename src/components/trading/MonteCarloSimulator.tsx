/**
 * Monte Carlo Simulator - run 1000 equity curve simulations from real trades
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dices, Play } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import type { Trade } from '@/hooks/useTradesDB';
import { safeNetPnl } from '@/lib/tradeMetrics';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function MonteCarloSimulator({ trades }: { trades: Trade[] }) {
  const [results, setResults] = useState<{ p5: number[]; p25: number[]; p50: number[]; p75: number[]; p95: number[] } | null>(null);
  const [running, setRunning] = useState(false);

  const pnls = useMemo(() => trades.filter(t => t.status === 'closed').map(t => safeNetPnl(t)), [trades]);

  const runSimulation = () => {
    if (pnls.length < 5) return;
    setRunning(true);
    
    setTimeout(() => {
      const SIMS = 1000;
      const N = pnls.length;
      const curves: number[][] = [];

      for (let s = 0; s < SIMS; s++) {
        const shuffled = shuffle(pnls);
        const curve: number[] = [0];
        let cum = 0;
        for (const p of shuffled) {
          cum += p;
          curve.push(cum);
        }
        curves.push(curve);
      }

      // Calculate percentiles at each trade index
      const p5: number[] = [], p25: number[] = [], p50: number[] = [], p75: number[] = [], p95: number[] = [];
      
      for (let i = 0; i <= N; i++) {
        const vals = curves.map(c => c[i]).sort((a, b) => a - b);
        p5.push(vals[Math.floor(SIMS * 0.05)]);
        p25.push(vals[Math.floor(SIMS * 0.25)]);
        p50.push(vals[Math.floor(SIMS * 0.50)]);
        p75.push(vals[Math.floor(SIMS * 0.75)]);
        p95.push(vals[Math.floor(SIMS * 0.95)]);
      }

      setResults({ p5, p25, p50, p75, p95 });
      setRunning(false);
    }, 100);
  };

  const chartData = useMemo(() => {
    if (!results) return [];
    return results.p50.map((_, i) => ({
      trade: i,
      p5: Math.round(results.p5[i]),
      p25: Math.round(results.p25[i]),
      p50: Math.round(results.p50[i]),
      p75: Math.round(results.p75[i]),
      p95: Math.round(results.p95[i]),
    }));
  }, [results]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Dices className="h-4 w-4 text-muted-foreground" />
            Monte Carlo Simulation
            <Badge variant="secondary" className="text-[10px]">1000 runs</Badge>
          </CardTitle>
          <Button size="sm" className="h-7 text-xs" onClick={runSimulation} disabled={running || pnls.length < 5}>
            <Play className="h-3 w-3 mr-1" /> {running ? 'Running...' : 'Run'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!results ? (
          <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
            {pnls.length < 5 ? 'Need 5+ trades' : 'Click Run to simulate 1000 equity curves'}
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="trade" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" label={{ value: 'Trade #', fontSize: 10, position: 'insideBottom', offset: -2 }} />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `₹${v}`} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="p95" stroke="none" fill="hsl(var(--primary))" fillOpacity={0.08} name="95th" />
                <Area type="monotone" dataKey="p75" stroke="none" fill="hsl(var(--primary))" fillOpacity={0.12} name="75th" />
                <Line type="monotone" dataKey="p50" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Median" />
                <Area type="monotone" dataKey="p25" stroke="none" fill="hsl(var(--destructive))" fillOpacity={0.08} name="25th" />
                <Area type="monotone" dataKey="p5" stroke="none" fill="hsl(var(--destructive))" fillOpacity={0.12} name="5th" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-3 text-center">
              {[{ label: '5th %ile', val: results.p5[results.p5.length - 1] },
                { label: '25th', val: results.p25[results.p25.length - 1] },
                { label: 'Median', val: results.p50[results.p50.length - 1] },
                { label: '75th', val: results.p75[results.p75.length - 1] },
                { label: '95th', val: results.p95[results.p95.length - 1] }
              ].map(p => (
                <div key={p.label} className="p-1.5 rounded bg-muted/30">
                  <p className="text-[9px] text-muted-foreground">{p.label}</p>
                  <p className={`text-xs font-mono font-bold ${p.val >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>₹{Math.round(p.val)}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
