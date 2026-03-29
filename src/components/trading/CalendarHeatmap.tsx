/**
 * Calendar Heatmap - shows daily P&L as color-coded grid
 */
import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Trade } from '@/hooks/useTradesDB';

interface CalendarHeatmapProps {
  trades: Trade[];
  months?: number;
}

export function CalendarHeatmap({ trades, months = 3 }: CalendarHeatmapProps) {
  const dailyPnL = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number }>();
    trades.filter(t => t.status === 'closed').forEach(t => {
      const day = format(new Date(t.entry_time), 'yyyy-MM-dd');
      const existing = map.get(day) || { pnl: 0, count: 0 };
      map.set(day, { pnl: existing.pnl + t.net_pnl, count: existing.count + 1 });
    });
    return map;
  }, [trades]);

  const monthsData = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 0; i < months; i++) {
      const monthDate = subMonths(now, i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const days = eachDayOfInterval({ start, end });
      result.push({ month: format(monthDate, 'MMM yyyy'), days });
    }
    return result.reverse();
  }, [months]);

  const getColor = (pnl: number) => {
    if (pnl > 500) return 'bg-emerald-500';
    if (pnl > 100) return 'bg-emerald-400/80';
    if (pnl > 0) return 'bg-emerald-400/50';
    if (pnl === 0) return 'bg-muted/40';
    if (pnl > -100) return 'bg-red-400/50';
    if (pnl > -500) return 'bg-red-400/80';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">P&L Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {monthsData.map(({ month, days }) => (
            <div key={month}>
              <p className="text-xs text-muted-foreground font-medium mb-2">{month}</p>
              <div className="grid grid-cols-7 gap-1">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <div key={i} className="text-[10px] text-muted-foreground text-center">{d}</div>
                ))}
                {/* Offset for first day of month */}
                {Array.from({ length: (getDay(days[0]) + 6) % 7 }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {days.map(day => {
                  const key = format(day, 'yyyy-MM-dd');
                  const data = dailyPnL.get(key);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={key}
                      className={cn(
                        'aspect-square rounded-sm flex items-center justify-center text-[8px] font-mono cursor-default transition-colors',
                        data ? getColor(data.pnl) : 'bg-muted/20',
                        isToday && 'ring-1 ring-primary'
                      )}
                      title={data ? `${key}: ₹${data.pnl.toFixed(0)} (${data.count} trades)` : key}
                    >
                      {format(day, 'd')}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 text-[10px] text-muted-foreground">
          <span>Loss</span>
          <div className="flex gap-0.5">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            <div className="w-3 h-3 rounded-sm bg-red-400/80" />
            <div className="w-3 h-3 rounded-sm bg-red-400/50" />
            <div className="w-3 h-3 rounded-sm bg-muted/40" />
            <div className="w-3 h-3 rounded-sm bg-emerald-400/50" />
            <div className="w-3 h-3 rounded-sm bg-emerald-400/80" />
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          </div>
          <span>Profit</span>
        </div>
      </CardContent>
    </Card>
  );
}
