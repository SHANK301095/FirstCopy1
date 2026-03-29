/**
 * Market Regime Detector — Identifies trending/ranging/volatile regimes from trade data
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Compass } from 'lucide-react';
import type { Trade } from '@/hooks/useTradesDB';

type Regime = 'Trending' | 'Ranging' | 'Volatile' | 'Calm';

function detectRegime(trades: Trade[]): { current: Regime; confidence: number; history: { week: string; regime: Regime; pnl: number }[] } {
  const closed = trades.filter(t => t.status === 'closed').sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
  
  if (closed.length < 5) return { current: 'Calm', confidence: 0, history: [] };

  // Group by week
  const weekMap = new Map<string, Trade[]>();
  closed.forEach(t => {
    const d = new Date(t.entry_time);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split('T')[0];
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key)!.push(t);
  });

  const history = Array.from(weekMap.entries()).map(([week, wTrades]) => {
    const pnls = wTrades.map(t => t.net_pnl || 0);
    const avg = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const variance = pnls.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / pnls.length;
    const stdDev = Math.sqrt(variance);
    const totalPnl = pnls.reduce((a, b) => a + b, 0);
    const winRate = pnls.filter(p => p > 0).length / pnls.length;

    let regime: Regime;
    if (stdDev > Math.abs(avg) * 2) regime = 'Volatile';
    else if (winRate > 0.6 && totalPnl > 0) regime = 'Trending';
    else if (Math.abs(totalPnl) < stdDev * 0.5) regime = 'Ranging';
    else regime = 'Calm';

    return { week: week.slice(5), regime, pnl: totalPnl };
  }).slice(-12);

  const recentRegimes = history.slice(-3);
  const regimeCounts = { Trending: 0, Ranging: 0, Volatile: 0, Calm: 0 };
  recentRegimes.forEach(h => regimeCounts[h.regime]++);
  const current = (Object.entries(regimeCounts).sort((a, b) => b[1] - a[1])[0][0]) as Regime;
  const confidence = Math.round((regimeCounts[current] / recentRegimes.length) * 100);

  return { current, confidence, history };
}

const regimeColors: Record<Regime, string> = {
  Trending: '#22c55e',
  Ranging: '#3b82f6',
  Volatile: '#ef4444',
  Calm: '#a855f7',
};

const regimeEmoji: Record<Regime, string> = {
  Trending: '📈',
  Ranging: '↔️',
  Volatile: '⚡',
  Calm: '🧘',
};

export function MarketRegimeDetector({ trades }: { trades: Trade[] }) {
  const { current, confidence, history } = detectRegime(trades);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" />
            Market Regime
          </CardTitle>
          <Badge style={{ backgroundColor: regimeColors[current] + '33', color: regimeColors[current], borderColor: regimeColors[current] + '55' }} className="border">
            {regimeEmoji[current]} {current} ({confidence}%)
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Need more trades for regime detection</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={history}>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'hsl(210 15% 55%)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(210 15% 55%)' }} tickFormatter={v => `₹${v}`} />
              <Tooltip
                contentStyle={{ background: 'hsl(220 18% 10%)', border: '1px solid hsl(220 15% 18%)', borderRadius: 8, fontSize: 12 }}
                formatter={(val: number, name: string) => [`₹${val.toFixed(0)}`, 'P&L']}
                labelFormatter={(label) => `Week: ${label}`}
              />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {history.map((h, i) => (
                  <Cell key={i} fill={regimeColors[h.regime]} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className="flex justify-center gap-3 mt-2">
          {(['Trending', 'Ranging', 'Volatile', 'Calm'] as Regime[]).map(r => (
            <div key={r} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: regimeColors[r] }} />
              {r}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
