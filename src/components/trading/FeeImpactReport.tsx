/**
 * Fee Impact Report - how fees eat into profits
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Trade } from '@/hooks/useTradesDB';
import { safeNetPnl, safeFees } from '@/lib/tradeMetrics';

export function FeeImpactReport({ trades }: { trades: Trade[] }) {
  const stats = useMemo(() => {
    const closed = trades.filter(t => t.status === 'closed');
    if (closed.length === 0) return null;

    const totalFees = closed.reduce((s, t) => s + safeFees(t), 0);
    const grossPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const netPnl = closed.reduce((s, t) => s + safeNetPnl(t), 0);
    const avgFeePerTrade = totalFees / closed.length;
    const feeAsPercentOfGross = grossPnl > 0 ? (totalFees / grossPnl) * 100 : 0;
    
    // How many trades turn from profit to loss due to fees
    const flippedByFees = closed.filter(t => (t.pnl ?? 0) > 0 && safeNetPnl(t) <= 0).length;
    
    // Breakeven trades needed to cover fees
    const avgWin = closed.filter(t => safeNetPnl(t) > 0);
    const avgWinAmt = avgWin.length > 0 ? avgWin.reduce((s, t) => s + safeNetPnl(t), 0) / avgWin.length : 1;
    const tradesNeededForFees = avgWinAmt > 0 ? Math.ceil(totalFees / avgWinAmt) : 0;

    return { totalFees, grossPnl, netPnl, avgFeePerTrade, feeAsPercentOfGross, flippedByFees, tradesNeededForFees, totalTrades: closed.length };
  }, [trades]);

  if (!stats) return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4 text-muted-foreground" /> Fee Impact</CardTitle></CardHeader>
      <CardContent><div className="text-center py-6 text-muted-foreground text-sm">No data</div></CardContent>
    </Card>
  );

  const rows = [
    { label: 'Total Fees Paid', value: `₹${stats.totalFees.toFixed(0)}`, warn: stats.totalFees > stats.netPnl * 0.3 },
    { label: 'Gross P&L (before fees)', value: `₹${stats.grossPnl.toFixed(0)}` },
    { label: 'Net P&L (after fees)', value: `₹${stats.netPnl.toFixed(0)}`, color: stats.netPnl >= 0 },
    { label: 'Avg Fee / Trade', value: `₹${stats.avgFeePerTrade.toFixed(1)}` },
    { label: 'Fees as % of Gross', value: `${stats.feeAsPercentOfGross.toFixed(1)}%`, warn: stats.feeAsPercentOfGross > 20 },
    { label: 'Trades Flipped by Fees', value: stats.flippedByFees.toString(), warn: stats.flippedByFees > 0 },
    { label: 'Wins Needed to Cover Fees', value: stats.tradesNeededForFees.toString() },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          Fee Impact Report
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {rows.map(r => (
            <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-border/20">
              <span className="text-xs text-muted-foreground">{r.label}</span>
              <span className={cn(
                'text-sm font-mono font-medium',
                r.warn && 'text-amber-400',
                r.color === true && 'text-emerald-400',
                r.color === false && 'text-red-400',
              )}>{r.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
