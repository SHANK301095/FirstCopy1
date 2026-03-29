/**
 * Period Comparison - side-by-side metric comparison for two date ranges
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight, Minus, GitCompareArrows } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths,
  isWithinInterval, format
} from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import type { Trade } from '@/hooks/useTradesDB';
import { computeExtendedMetrics, safeNetPnl } from '@/lib/tradeMetrics';

type Preset = 'week' | 'month' | 'quarter';

const PRESETS: { key: Preset; label: string; labelA: string; labelB: string }[] = [
  { key: 'week', label: 'Week vs Week', labelA: 'This Week', labelB: 'Last Week' },
  { key: 'month', label: 'Month vs Month', labelA: 'This Month', labelB: 'Last Month' },
  { key: 'quarter', label: 'Quarter vs Quarter', labelA: 'This Quarter', labelB: 'Last Quarter' },
];

function getDateRanges(preset: Preset) {
  const now = new Date();
  if (preset === 'week') {
    const thisStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    return { a: { start: thisStart, end: thisEnd }, b: { start: lastStart, end: lastEnd } };
  }
  if (preset === 'month') {
    const thisStart = startOfMonth(now);
    const thisEnd = endOfMonth(now);
    const lastStart = startOfMonth(subMonths(now, 1));
    const lastEnd = endOfMonth(subMonths(now, 1));
    return { a: { start: thisStart, end: thisEnd }, b: { start: lastStart, end: lastEnd } };
  }
  // quarter
  const thisStart = startOfMonth(subMonths(now, 2));
  const thisEnd = endOfMonth(now);
  const lastStart = startOfMonth(subMonths(now, 5));
  const lastEnd = endOfMonth(subMonths(now, 3));
  return { a: { start: thisStart, end: thisEnd }, b: { start: lastStart, end: lastEnd } };
}

function filterByRange(trades: Trade[], start: Date, end: Date) {
  return trades.filter(t =>
    t.status === 'closed' &&
    isWithinInterval(new Date(t.entry_time), { start, end })
  );
}

interface DeltaProps {
  current: number;
  previous: number;
  format: 'pct' | 'inr' | 'ratio' | 'num';
  higherIsBetter?: boolean;
}

function DeltaArrow({ current, previous, format: fmt, higherIsBetter = true }: DeltaProps) {
  const diff = current - previous;
  const pctChange = previous !== 0 ? ((diff / Math.abs(previous)) * 100) : (diff !== 0 ? 100 : 0);
  const isPositive = higherIsBetter ? diff > 0 : diff < 0;
  const isNeutral = diff === 0;

  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[10px] font-medium',
      isNeutral ? 'text-muted-foreground' : isPositive ? 'text-emerald-400' : 'text-red-400'
    )}>
      {isNeutral ? <Minus className="h-3 w-3" /> : isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pctChange).toFixed(0)}%
    </span>
  );
}

function fmtVal(v: number, fmt: string) {
  if (fmt === 'pct') return `${v.toFixed(1)}%`;
  if (fmt === 'inr') return `₹${v.toFixed(0)}`;
  if (fmt === 'ratio') return v === Infinity ? '∞' : v.toFixed(2);
  return v.toString();
}

interface PeriodComparisonProps {
  trades: Trade[];
}

export function PeriodComparison({ trades }: PeriodComparisonProps) {
  const [preset, setPreset] = useState<Preset>('week');
  const presetConfig = PRESETS.find(p => p.key === preset)!;
  const ranges = useMemo(() => getDateRanges(preset), [preset]);

  const tradesA = useMemo(() => filterByRange(trades, ranges.a.start, ranges.a.end), [trades, ranges]);
  const tradesB = useMemo(() => filterByRange(trades, ranges.b.start, ranges.b.end), [trades, ranges]);

  const metricsA = useMemo(() => computeExtendedMetrics(tradesA), [tradesA]);
  const metricsB = useMemo(() => computeExtendedMetrics(tradesB), [tradesB]);

  const comparisonRows = useMemo(() => {
    if (!metricsA && !metricsB) return [];
    const a = metricsA ?? {} as any;
    const b = metricsB ?? {} as any;
    return [
      { label: 'Trades', key: 'totalTrades', fmt: 'num' as const, hib: true },
      { label: 'Net P&L', key: 'totalPnL', fmt: 'inr' as const, hib: true },
      { label: 'Win Rate', key: 'winRate', fmt: 'pct' as const, hib: true },
      { label: 'Profit Factor', key: 'profitFactor', fmt: 'ratio' as const, hib: true },
      { label: 'Expectancy', key: 'expectancy', fmt: 'inr' as const, hib: true },
      { label: 'Max Drawdown', key: 'maxDrawdown', fmt: 'inr' as const, hib: false },
      { label: 'Sharpe', key: 'sharpeRatio', fmt: 'ratio' as const, hib: true },
      { label: 'Avg Win', key: 'avgWin', fmt: 'inr' as const, hib: true },
      { label: 'Avg Loss', key: 'avgLoss', fmt: 'inr' as const, hib: false },
    ].map(r => ({
      ...r,
      valA: a[r.key] ?? 0,
      valB: b[r.key] ?? 0,
    }));
  }, [metricsA, metricsB]);

  const chartData = useMemo(() => {
    return [
      { metric: 'P&L', A: metricsA?.totalPnL ?? 0, B: metricsB?.totalPnL ?? 0 },
      { metric: 'Win%', A: metricsA?.winRate ?? 0, B: metricsB?.winRate ?? 0 },
      { metric: 'PF', A: metricsA?.profitFactor === Infinity ? 10 : (metricsA?.profitFactor ?? 0), B: metricsB?.profitFactor === Infinity ? 10 : (metricsB?.profitFactor ?? 0) },
      { metric: 'Exp', A: metricsA?.expectancy ?? 0, B: metricsB?.expectancy ?? 0 },
    ];
  }, [metricsA, metricsB]);

  const hasData = tradesA.length > 0 || tradesB.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
            Period Comparison
          </CardTitle>
          <div className="flex gap-1.5">
            {PRESETS.map(p => (
              <Button
                key={p.key}
                variant={preset === p.key ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7 px-2.5"
                onClick={() => setPreset(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 text-[10px] text-muted-foreground mt-1">
          <span>{presetConfig.labelA}: {format(ranges.a.start, 'dd MMM')} – {format(ranges.a.end, 'dd MMM')}</span>
          <span>vs</span>
          <span>{presetConfig.labelB}: {format(ranges.b.start, 'dd MMM')} – {format(ranges.b.end, 'dd MMM')}</span>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No trades in either period. Import or log trades to compare.
          </div>
        ) : (
          <div className="space-y-5">
            {/* Comparison Table */}
            <div className="grid gap-x-6 gap-y-0.5">
              {/* Header */}
              <div className="grid grid-cols-4 gap-2 py-1.5 border-b border-border/50">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Metric</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider text-right">{presetConfig.labelA}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider text-right">{presetConfig.labelB}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider text-right">Change</span>
              </div>
              {comparisonRows.map(r => (
                <div key={r.label} className="grid grid-cols-4 gap-2 py-2 border-b border-border/20">
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                  <span className="text-sm font-mono text-right">{fmtVal(r.valA, r.fmt)}</span>
                  <span className="text-sm font-mono text-right text-muted-foreground">{fmtVal(r.valB, r.fmt)}</span>
                  <span className="text-right">
                    <DeltaArrow current={r.valA} previous={r.valB} format={r.fmt} higherIsBetter={r.hib} />
                  </span>
                </div>
              ))}
            </div>

            {/* Bar Chart */}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Visual Comparison</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="metric" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="A" name={presetConfig.labelA} fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="B" name={presetConfig.labelB} fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} opacity={0.5} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
