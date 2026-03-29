/**
 * Drawdown Analyzer - visualize equity drawdown zones, recovery, and streaks
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { TrendingDown, Clock, Activity } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Trade } from '@/hooks/useTradesDB';
import { safeNetPnl } from '@/lib/tradeMetrics';

interface DrawdownPeriod {
  startDate: string;
  bottomDate: string;
  recoveryDate: string | null;
  depth: number;
  durationDays: number;
  recovered: boolean;
}

function computeDrawdowns(trades: Trade[]) {
  const closed = trades
    .filter(t => t.status === 'closed')
    .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());

  if (closed.length === 0) return { chartData: [], drawdowns: [], currentDD: 0, peakEquity: 0 };

  let cumulative = 0;
  let peak = 0;
  const chartData = closed.map(t => {
    cumulative += safeNetPnl(t);
    peak = Math.max(peak, cumulative);
    const dd = cumulative - peak;
    return {
      date: format(new Date(t.entry_time), 'dd MMM'),
      fullDate: t.entry_time,
      equity: Math.round(cumulative),
      drawdown: Math.round(dd),
      drawdownPct: peak > 0 ? (dd / peak) * 100 : 0,
    };
  });

  // Identify drawdown periods
  const drawdowns: DrawdownPeriod[] = [];
  let inDD = false;
  let ddStart = '';
  let ddBottom = '';
  let ddDepth = 0;

  for (let i = 0; i < chartData.length; i++) {
    const d = chartData[i];
    if (d.drawdown < 0 && !inDD) {
      inDD = true;
      ddStart = d.fullDate;
      ddBottom = d.fullDate;
      ddDepth = d.drawdown;
    } else if (inDD && d.drawdown < ddDepth) {
      ddBottom = d.fullDate;
      ddDepth = d.drawdown;
    } else if (inDD && d.drawdown === 0) {
      drawdowns.push({
        startDate: ddStart,
        bottomDate: ddBottom,
        recoveryDate: d.fullDate,
        depth: ddDepth,
        durationDays: differenceInCalendarDays(new Date(d.fullDate), new Date(ddStart)),
        recovered: true,
      });
      inDD = false;
      ddDepth = 0;
    }
  }

  // If still in drawdown
  if (inDD) {
    const last = chartData[chartData.length - 1];
    drawdowns.push({
      startDate: ddStart,
      bottomDate: ddBottom,
      recoveryDate: null,
      depth: ddDepth,
      durationDays: differenceInCalendarDays(new Date(last.fullDate), new Date(ddStart)),
      recovered: false,
    });
  }

  const currentDD = chartData.length > 0 ? chartData[chartData.length - 1].drawdown : 0;

  return { chartData, drawdowns, currentDD, peakEquity: peak };
}

interface DrawdownAnalyzerProps {
  trades: Trade[];
}

export function DrawdownAnalyzer({ trades }: DrawdownAnalyzerProps) {
  const { chartData, drawdowns, currentDD, peakEquity } = useMemo(() => computeDrawdowns(trades), [trades]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            Drawdown Analyzer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No closed trades yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxDD = drawdowns.length > 0 ? Math.min(...drawdowns.map(d => d.depth)) : 0;
  const avgRecovery = drawdowns.filter(d => d.recovered).length > 0
    ? drawdowns.filter(d => d.recovered).reduce((s, d) => s + d.durationDays, 0) / drawdowns.filter(d => d.recovered).length
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            Drawdown Analyzer
          </CardTitle>
          <div className="flex gap-2">
            {currentDD < 0 ? (
              <Badge variant="destructive" className="text-[10px]">
                In Drawdown: ₹{Math.abs(currentDD)}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                At Peak
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Max Drawdown</p>
            <p className="text-sm font-mono font-bold text-red-400">₹{Math.abs(maxDD)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Recovery</p>
            <p className="text-sm font-mono font-bold">{avgRecovery.toFixed(0)} days</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">DD Periods</p>
            <p className="text-sm font-mono font-bold">{drawdowns.length}</p>
          </div>
        </div>

        {/* Drawdown Chart */}
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="ddZoneGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `₹${v}`} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
              formatter={(value: number) => [`₹${value}`, 'Drawdown']}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" opacity={0.5} />
            <Area
              type="monotone"
              dataKey="drawdown"
              stroke="hsl(var(--destructive))"
              fill="url(#ddZoneGrad)"
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Drawdown Periods Table */}
        {drawdowns.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Drawdown Periods</p>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              <div className="grid grid-cols-5 gap-2 text-[10px] text-muted-foreground uppercase tracking-wider py-1 border-b border-border/50">
                <span>Start</span>
                <span>Bottom</span>
                <span className="text-right">Depth</span>
                <span className="text-right">Days</span>
                <span className="text-right">Status</span>
              </div>
              {drawdowns.slice(0, 10).map((d, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 text-xs py-1.5 border-b border-border/20">
                  <span className="text-muted-foreground">{format(new Date(d.startDate), 'dd MMM')}</span>
                  <span className="text-muted-foreground">{format(new Date(d.bottomDate), 'dd MMM')}</span>
                  <span className="text-right font-mono text-red-400">₹{Math.abs(d.depth)}</span>
                  <span className="text-right font-mono">{d.durationDays}d</span>
                  <span className="text-right">
                    {d.recovered ? (
                      <Badge variant="secondary" className="text-[9px] bg-emerald-500/10 text-emerald-400 h-4">
                        Recovered
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[9px] h-4">
                        Active
                      </Badge>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
