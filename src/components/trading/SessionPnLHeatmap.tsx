/**
 * Session P&L Heatmap - hourly breakdown showing when you make/lose money
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Trade } from '@/hooks/useTradesDB';
import { safeNetPnl } from '@/lib/tradeMetrics';

const SESSIONS = ['Asia (00-08)', 'London (08-14)', 'New York (14-20)', 'Late NY (20-24)'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function getSessionIdx(hour: number): number {
  if (hour < 8) return 0;
  if (hour < 14) return 1;
  if (hour < 20) return 2;
  return 3;
}

export function SessionPnLHeatmap({ trades }: { trades: Trade[] }) {
  const grid = useMemo(() => {
    const cells: { day: number; session: number; pnl: number; count: number }[][] = 
      Array.from({ length: 5 }, () => Array.from({ length: 4 }, (_, s) => ({ day: 0, session: s, pnl: 0, count: 0 })));
    
    trades.filter(t => t.status === 'closed').forEach(t => {
      const d = new Date(t.entry_time);
      const dayIdx = d.getDay() - 1; // Mon=0
      if (dayIdx < 0 || dayIdx > 4) return;
      const sessIdx = getSessionIdx(d.getUTCHours());
      cells[dayIdx][sessIdx].pnl += safeNetPnl(t);
      cells[dayIdx][sessIdx].count++;
    });
    return cells;
  }, [trades]);

  const maxAbs = useMemo(() => {
    let m = 1;
    grid.forEach(row => row.forEach(c => { m = Math.max(m, Math.abs(c.pnl)); }));
    return m;
  }, [grid]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Session × Day Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left text-muted-foreground py-1 w-12"></th>
                {SESSIONS.map(s => <th key={s} className="text-center text-muted-foreground py-1 text-[10px]">{s}</th>)}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, di) => (
                <tr key={day}>
                  <td className="text-muted-foreground font-medium py-1">{day}</td>
                  {grid[di].map((cell, si) => {
                    const intensity = maxAbs > 0 ? cell.pnl / maxAbs : 0;
                    const bg = cell.count === 0
                      ? 'bg-muted/20'
                      : intensity > 0
                        ? `bg-emerald-500/${Math.round(Math.abs(intensity) * 60 + 10)}`
                        : `bg-red-500/${Math.round(Math.abs(intensity) * 60 + 10)}`;
                    return (
                      <td key={si} className="p-0.5">
                        <div className={cn(
                          'rounded p-2 text-center transition-colors min-h-[40px] flex flex-col items-center justify-center',
                          cell.count === 0 ? 'bg-muted/20' : intensity > 0 ? 'bg-emerald-500/20' : intensity < 0 ? 'bg-red-500/20' : 'bg-muted/20'
                        )} style={{ opacity: cell.count === 0 ? 0.3 : 0.4 + Math.abs(intensity) * 0.6 }}>
                          <span className={cn('font-mono font-bold text-[11px]', cell.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                            {cell.count > 0 ? `₹${cell.pnl.toFixed(0)}` : '—'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{cell.count}t</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
