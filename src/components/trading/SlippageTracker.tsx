/**
 * Slippage Tracker — Monitors execution quality vs planned entries
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react';
import type { Trade } from '@/hooks/useTradesDB';

interface SlippageData {
  symbol: string;
  trades: number;
  avgSlippage: number;
  totalCost: number;
  worstSlippage: number;
}

function computeSlippage(trades: Trade[]): { bySymbol: SlippageData[]; overall: { avgSlippage: number; totalCost: number; tradesWithSlippage: number } } {
  const closed = trades.filter(t => t.status === 'closed' && t.stop_loss && t.entry_price);
  const symbolMap = new Map<string, { slippages: number[]; costs: number[] }>();

  closed.forEach(t => {
    const planned = t.stop_loss!;
    const actual = t.entry_price;
    const slippagePct = Math.abs(((actual - planned) / planned) * 100);
    const slippageCost = Math.abs(actual - planned) * t.quantity;
    
    if (!symbolMap.has(t.symbol)) symbolMap.set(t.symbol, { slippages: [], costs: [] });
    const entry = symbolMap.get(t.symbol)!;
    entry.slippages.push(slippagePct);
    entry.costs.push(slippageCost);
  });

  const bySymbol: SlippageData[] = Array.from(symbolMap.entries()).map(([symbol, data]) => ({
    symbol,
    trades: data.slippages.length,
    avgSlippage: data.slippages.reduce((a, b) => a + b, 0) / data.slippages.length,
    totalCost: data.costs.reduce((a, b) => a + b, 0),
    worstSlippage: Math.max(...data.slippages),
  })).sort((a, b) => b.totalCost - a.totalCost);

  const allSlippages = Array.from(symbolMap.values()).flatMap(d => d.slippages);
  const allCosts = Array.from(symbolMap.values()).flatMap(d => d.costs);

  return {
    bySymbol,
    overall: {
      avgSlippage: allSlippages.length ? allSlippages.reduce((a, b) => a + b, 0) / allSlippages.length : 0,
      totalCost: allCosts.reduce((a, b) => a + b, 0),
      tradesWithSlippage: allSlippages.filter(s => s > 0.1).length,
    }
  };
}

export function SlippageTracker({ trades }: { trades: Trade[] }) {
  const { bySymbol, overall } = computeSlippage(trades);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-warning" />
            Slippage Tracker
          </CardTitle>
          <Badge variant={overall.avgSlippage < 0.1 ? 'default' : 'destructive'}>
            {overall.avgSlippage < 0.1 ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
            Avg {overall.avgSlippage.toFixed(2)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-mono font-bold text-foreground">₹{overall.totalCost.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Total Cost</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-mono font-bold text-foreground">{overall.avgSlippage.toFixed(2)}%</p>
            <p className="text-[10px] text-muted-foreground uppercase">Avg Slippage</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-mono font-bold text-foreground">{overall.tradesWithSlippage}</p>
            <p className="text-[10px] text-muted-foreground uppercase">High Slip</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {bySymbol.slice(0, 5).map(s => (
            <div key={s.symbol} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/20 text-sm">
              <span className="font-medium">{s.symbol}</span>
              <span className="text-muted-foreground">{s.trades} trades</span>
              <span className={s.avgSlippage > 0.2 ? 'text-destructive' : 'text-muted-foreground'}>
                {s.avgSlippage.toFixed(2)}%
              </span>
              <span className="font-mono text-destructive">₹{s.totalCost.toFixed(0)}</span>
            </div>
          ))}
          {bySymbol.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-3">Need trades with stop-loss data for slippage analysis</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
