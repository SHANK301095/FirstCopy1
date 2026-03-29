/**
 * Trade Reports - 20+ metrics with PDF/CSV export
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, BarChart2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { format, subDays, subMonths, isAfter } from 'date-fns';
import type { Trade, TradeStats } from '@/hooks/useTradesDB';
import { computeExtendedMetrics, escapeCSVField } from '@/lib/tradeMetrics';
import { PeriodComparison } from './PeriodComparison';
import { TagPerformance } from './TagPerformance';

interface TradeReportsProps {
  trades: Trade[];
  stats: TradeStats | null;
}

export function TradeReports({ trades, stats }: TradeReportsProps) {
  const [period, setPeriod] = useState('all');

  const filteredTrades = useMemo(() => {
    const now = new Date();
    return trades.filter(t => {
      if (t.status !== 'closed') return false;
      if (period === '7d') return isAfter(new Date(t.entry_time), subDays(now, 7));
      if (period === '30d') return isAfter(new Date(t.entry_time), subDays(now, 30));
      if (period === '90d') return isAfter(new Date(t.entry_time), subDays(now, 90));
      if (period === '1y') return isAfter(new Date(t.entry_time), subMonths(now, 12));
      return true;
    });
  }, [trades, period]);

  const metrics = useMemo(() => computeExtendedMetrics(filteredTrades), [filteredTrades]);

  const exportCSV = () => {
    const headers = ['Date', 'Symbol', 'Direction', 'Entry', 'Exit', 'Qty', 'P&L', 'Net P&L', 'Fees', 'Strategy', 'Setup', 'Rating'];
    const rows = filteredTrades.map(t => [
      format(new Date(t.entry_time), 'yyyy-MM-dd HH:mm'),
      t.symbol, t.direction, t.entry_price, t.exit_price || '', t.quantity,
      t.pnl, t.net_pnl, t.fees ?? 0, t.strategy_tag || '', t.setup_type || '', t.quality_score || '',
    ]);
    const csv = [headers.map(escapeCSVField).join(','), ...rows.map(r => r.map(escapeCSVField).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mmc_trades_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    // Generate printable HTML and trigger print
    const html = `<!DOCTYPE html><html><head><title>MMC Trade Report</title>
    <style>body{font-family:system-ui;background:#0f172a;color:#e2e8f0;padding:40px;max-width:800px;margin:auto}
    h1{font-size:24px;margin-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:16px}
    th,td{padding:8px 12px;border-bottom:1px solid #334155;text-align:left;font-size:13px}
    th{color:#94a3b8}.pos{color:#22c55e}.neg{color:#ef4444}.card{background:#1e293b;border-radius:8px;padding:16px;margin:8px 0;border:1px solid #334155}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.label{font-size:11px;color:#94a3b8;text-transform:uppercase}
    .val{font-size:20px;font-weight:700;margin-top:2px}</style></head><body>
    <h1>MMC Trading Report</h1><p style="color:#94a3b8;font-size:13px">Generated ${format(new Date(), 'dd MMM yyyy HH:mm')} • ${filteredTrades.length} trades</p>
    ${metrics ? `<div class="grid">
    <div class="card"><div class="label">Net P&L</div><div class="val ${metrics.totalPnL >= 0 ? 'pos' : 'neg'}">₹${metrics.totalPnL.toFixed(0)}</div></div>
    <div class="card"><div class="label">Win Rate</div><div class="val ${metrics.winRate >= 50 ? 'pos' : 'neg'}">${metrics.winRate.toFixed(1)}%</div></div>
    <div class="card"><div class="label">Profit Factor</div><div class="val">${metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}</div></div>
    <div class="card"><div class="label">Sharpe Ratio</div><div class="val">${metrics.sharpeRatio.toFixed(2)}</div></div>
    <div class="card"><div class="label">Max Drawdown</div><div class="val neg">₹${metrics.maxDrawdown.toFixed(0)}</div></div>
    <div class="card"><div class="label">Expectancy</div><div class="val ${metrics.expectancy >= 0 ? 'pos' : 'neg'}">₹${metrics.expectancy.toFixed(0)}</div></div>
    </div>` : ''}
    <table><tr><th>Date</th><th>Symbol</th><th>Dir</th><th>Entry</th><th>Exit</th><th>P&L</th></tr>
    ${filteredTrades.slice(0, 100).map(t => `<tr><td>${format(new Date(t.entry_time), 'dd MMM yy')}</td><td>${t.symbol}</td><td>${t.direction}</td><td>${t.entry_price}</td><td>${t.exit_price || '—'}</td><td class="${t.net_pnl >= 0 ? 'pos' : 'neg'}">${t.net_pnl >= 0 ? '+' : ''}₹${t.net_pnl.toFixed(0)}</td></tr>`).join('')}
    </table><p style="text-align:center;color:#64748b;margin-top:40px;font-size:12px">MMCai.app — India's #1 AI Trading Journal</p></body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  };

  const metricRows = metrics ? [
    { label: 'Total Trades', value: metrics.totalTrades, fmt: 'num' },
    { label: 'Winning Trades', value: metrics.winningTrades, fmt: 'num' },
    { label: 'Losing Trades', value: metrics.losingTrades, fmt: 'num' },
    { label: 'Win Rate', value: metrics.winRate, fmt: 'pct', color: metrics.winRate >= 50 },
    { label: 'Net P&L', value: metrics.totalPnL, fmt: 'inr', color: metrics.totalPnL >= 0 },
    { label: 'Gross Profit', value: metrics.grossProfit, fmt: 'inr', color: true },
    { label: 'Gross Loss', value: metrics.grossLoss, fmt: 'inr', color: false },
    { label: 'Avg Win', value: metrics.avgWin, fmt: 'inr', color: true },
    { label: 'Avg Loss', value: metrics.avgLoss, fmt: 'inr', color: false },
    { label: 'Profit Factor', value: metrics.profitFactor, fmt: 'ratio' },
    { label: 'Expectancy', value: metrics.expectancy, fmt: 'inr', color: metrics.expectancy >= 0 },
    { label: 'Sharpe Ratio', value: metrics.sharpeRatio, fmt: 'ratio' },
    { label: 'Sortino Ratio', value: metrics.sortinoRatio, fmt: 'ratio' },
    { label: 'Max Drawdown', value: metrics.maxDrawdown, fmt: 'inr', color: false },
    { label: 'Recovery Factor', value: metrics.recoveryFactor, fmt: 'ratio' },
    { label: 'Best Trade', value: metrics.bestTrade, fmt: 'inr', color: true },
    { label: 'Worst Trade', value: metrics.worstTrade, fmt: 'inr', color: false },
    { label: 'Std Dev', value: metrics.stdDev, fmt: 'inr' },
    { label: 'Total Fees', value: metrics.totalFees, fmt: 'inr' },
    { label: 'Long Win Rate', value: metrics.longWinRate, fmt: 'pct' },
    { label: 'Short Win Rate', value: metrics.shortWinRate, fmt: 'pct' },
    { label: 'Avg R-Multiple', value: metrics.avgRMultiple, fmt: 'ratio' },
  ] : [];

  const fmtValue = (value: number, fmt: string) => {
    if (fmt === 'pct') return `${value.toFixed(1)}%`;
    if (fmt === 'inr') return `₹${value.toFixed(0)}`;
    if (fmt === 'ratio') return value === Infinity ? '∞' : value.toFixed(2);
    return value.toString();
  };

  return (
    <Tabs defaultValue="metrics" className="space-y-4">
      <TabsList>
        <TabsTrigger value="metrics">Metrics</TabsTrigger>
        <TabsTrigger value="compare">Period Compare</TabsTrigger>
        <TabsTrigger value="tags">Tag Analysis</TabsTrigger>
      </TabsList>

      <TabsContent value="metrics" className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <FileText className="h-4 w-4 mr-1.5" /> PDF
          </Button>
          <Badge variant="secondary" className="text-xs">{filteredTrades.length} trades</Badge>
        </div>

        {/* Metrics Grid */}
        {metrics ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
                Performance Metrics ({filteredTrades.length} trades)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 gap-y-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {metricRows.map(m => (
                  <div key={m.label} className="flex items-center justify-between py-1.5 border-b border-border/30">
                    <span className="text-xs text-muted-foreground">{m.label}</span>
                    <span className={cn(
                      "text-sm font-mono font-medium",
                      m.color === true && 'text-emerald-400',
                      m.color === false && 'text-red-400'
                    )}>
                      {fmtValue(m.value, m.fmt)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No closed trades in this period
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="compare">
        <PeriodComparison trades={trades} />
      </TabsContent>

      <TabsContent value="tags">
        <TagPerformance trades={trades} />
      </TabsContent>
    </Tabs>
  );
}
