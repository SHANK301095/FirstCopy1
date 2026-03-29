/**
 * Portfolio Heat Map — Visual correlation of symbol performance
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import type { Trade } from '@/hooks/useTradesDB';

function computeHeatData(trades: Trade[]) {
  const closed = trades.filter(t => t.status === 'closed');
  const symbolMap = new Map<string, { pnl: number; trades: number; winRate: number }>();

  closed.forEach(t => {
    if (!symbolMap.has(t.symbol)) symbolMap.set(t.symbol, { pnl: 0, trades: 0, winRate: 0 });
    const e = symbolMap.get(t.symbol)!;
    e.pnl += t.net_pnl || 0;
    e.trades++;
  });

  // Calculate win rates
  symbolMap.forEach((val, sym) => {
    const wins = closed.filter(t => t.symbol === sym && (t.net_pnl || 0) > 0).length;
    val.winRate = val.trades > 0 ? (wins / val.trades) * 100 : 0;
  });

  return Array.from(symbolMap.entries())
    .map(([symbol, data]) => ({ symbol, ...data }))
    .sort((a, b) => b.pnl - a.pnl);
}

function getHeatColor(pnl: number, maxPnl: number): string {
  if (maxPnl === 0) return 'bg-muted/30';
  const ratio = pnl / maxPnl;
  if (pnl > 0) {
    if (ratio > 0.7) return 'bg-emerald-500/40 border-emerald-500/30';
    if (ratio > 0.3) return 'bg-emerald-500/25 border-emerald-500/20';
    return 'bg-emerald-500/10 border-emerald-500/10';
  } else {
    const negRatio = Math.abs(ratio);
    if (negRatio > 0.7) return 'bg-red-500/40 border-red-500/30';
    if (negRatio > 0.3) return 'bg-red-500/25 border-red-500/20';
    return 'bg-red-500/10 border-red-500/10';
  }
}

export function PortfolioHeatMap({ trades }: { trades: Trade[] }) {
  const data = computeHeatData(trades);
  const maxAbsPnl = Math.max(...data.map(d => Math.abs(d.pnl)), 1);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          Portfolio Heat Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No closed trades to analyze</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {data.map(d => (
              <div
                key={d.symbol}
                className={`rounded-lg border p-3 text-center transition-all hover:scale-105 ${getHeatColor(d.pnl, maxAbsPnl)}`}
              >
                <p className="font-medium text-sm">{d.symbol}</p>
                <p className={`text-lg font-mono font-bold ${d.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ₹{d.pnl.toFixed(0)}
                </p>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>{d.trades}t</span>
                  <span>{d.winRate.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
