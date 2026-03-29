/**
 * GitHub-style Calendar Heatmap for Trade Journal
 * Shows daily P&L, trade count, win rate, and journal status
 */
import { useMemo, useState } from 'react';
import {
  format, startOfWeek, endOfWeek, eachDayOfInterval, subMonths,
  addMonths, isSameDay, isSameMonth, getDay, startOfMonth, endOfMonth,
  differenceInCalendarDays, subDays,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Flame, Trophy, TrendingDown, Calendar as CalIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Trade } from '@/hooks/useTradesDB';

interface JournalEntry {
  id: string;
  date: string;
  [key: string]: unknown;
}

interface Props {
  trades: Trade[];
  journalEntries: JournalEntry[];
  onDayClick: (date: string) => void;
}

interface DayData {
  pnl: number;
  count: number;
  wins: number;
  hasJournal: boolean;
  journalId?: string;
}

export function JournalCalendarHeatmap({ trades, journalEntries, onDayClick }: Props) {
  const today = new Date();
  const [viewEnd, setViewEnd] = useState(today);

  // Build daily map
  const dayMap = useMemo(() => {
    const map = new Map<string, DayData>();

    // Aggregate closed trades
    trades.filter(t => t.status === 'closed').forEach(t => {
      const key = t.entry_time.slice(0, 10);
      const prev = map.get(key) || { pnl: 0, count: 0, wins: 0, hasJournal: false };
      prev.pnl += t.net_pnl;
      prev.count += 1;
      if (t.net_pnl > 0) prev.wins += 1;
      map.set(key, prev);
    });

    // Mark journal entries
    journalEntries.forEach(je => {
      const key = je.date;
      const prev = map.get(key) || { pnl: 0, count: 0, wins: 0, hasJournal: false };
      prev.hasJournal = true;
      prev.journalId = je.id;
      map.set(key, prev);
    });

    return map;
  }, [trades, journalEntries]);

  // Streak calculations
  const { currentStreak, bestStreak } = useMemo(() => {
    const journalDates = new Set(journalEntries.map(j => j.date));
    let current = 0;
    let best = 0;
    let d = new Date();
    // Check today, then go backwards
    while (journalDates.has(format(d, 'yyyy-MM-dd'))) {
      current++;
      d = subDays(d, 1);
    }
    // Best streak - scan all dates
    const sorted = [...journalDates].sort();
    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const diff = differenceInCalendarDays(new Date(sorted[i]), new Date(sorted[i - 1]));
      if (diff === 1) { streak++; best = Math.max(best, streak); }
      else streak = 1;
    }
    best = Math.max(best, streak, current);
    return { currentStreak: current, bestStreak: best };
  }, [journalEntries]);

  // Best/worst day
  const { bestDay, worstDay } = useMemo(() => {
    let best = { date: '', pnl: -Infinity };
    let worst = { date: '', pnl: Infinity };
    dayMap.forEach((v, k) => {
      if (v.count === 0) return;
      if (v.pnl > best.pnl) best = { date: k, pnl: v.pnl };
      if (v.pnl < worst.pnl) worst = { date: k, pnl: v.pnl };
    });
    return {
      bestDay: best.pnl > -Infinity ? best : null,
      worstDay: worst.pnl < Infinity ? worst : null,
    };
  }, [dayMap]);

  // Generate weeks for display (last 12 months from viewEnd)
  const viewStart = subMonths(viewEnd, 11);
  const calStart = startOfWeek(startOfMonth(viewStart), { weekStartsOn: 1 });
  const calEnd = endOfWeek(endOfMonth(viewEnd), { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd });

  // Group into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const mid = week[3] || week[0];
      const m = mid.getMonth();
      if (m !== lastMonth) {
        labels.push({ label: format(mid, 'MMM'), col: wi });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);

  const getCellColor = (data: DayData | undefined, isInRange: boolean) => {
    if (!isInRange) return 'bg-transparent';
    if (!data || (data.count === 0 && !data.hasJournal)) return 'bg-muted/20';
    if (data.count === 0 && data.hasJournal) return 'bg-muted/30 ring-1 ring-blue-400/50';

    const pnl = data.pnl;
    if (Math.abs(pnl) < 1) return 'bg-yellow-500/40'; // breakeven

    if (pnl > 0) {
      if (pnl > 5000) return 'bg-emerald-500';
      if (pnl > 2000) return 'bg-emerald-500/80';
      if (pnl > 500) return 'bg-emerald-400/60';
      return 'bg-emerald-400/35';
    }
    if (pnl < -5000) return 'bg-red-500';
    if (pnl < -2000) return 'bg-red-500/80';
    if (pnl < -500) return 'bg-red-400/60';
    return 'bg-red-400/35';
  };

  const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

  return (
    <Card>
      <CardContent className="pt-5 pb-4 space-y-4">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <CalIcon className="h-4 w-4 text-primary" /> Activity Calendar
          </h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => setViewEnd(subMonths(viewEnd, 3))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="sm" className="h-7 text-xs"
              onClick={() => setViewEnd(today)}
            >
              This Year
            </Button>
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => setViewEnd(addMonths(viewEnd, 3))}
              disabled={isSameMonth(viewEnd, today)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <TooltipProvider delayDuration={100}>
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Month labels */}
              <div className="flex ml-8 mb-1">
                {monthLabels.map(({ label, col }, i) => (
                  <div
                    key={i}
                    className="text-[10px] text-muted-foreground"
                    style={{
                      position: 'absolute',
                      left: `calc(2rem + ${col * 14}px)`,
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>
              {/* Use relative container for month labels */}
              <div className="relative">
                <div className="flex gap-0 ml-8 mb-1 h-4">
                  {monthLabels.map(({ label, col }, i) => (
                    <span
                      key={i}
                      className="text-[10px] text-muted-foreground absolute"
                      style={{ left: `${col * 14}px` }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex">
                {/* Day labels */}
                <div className="flex flex-col gap-[2px] mr-1 mt-0">
                  {DAY_LABELS.map((d, i) => (
                    <div key={i} className="h-[12px] w-7 text-[9px] text-muted-foreground flex items-center justify-end pr-1">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Weeks */}
                <div className="flex gap-[2px]">
                  {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[2px]">
                      {week.map(day => {
                        const key = format(day, 'yyyy-MM-dd');
                        const data = dayMap.get(key);
                        const isInRange = day >= startOfMonth(viewStart) && day <= today;
                        const isToday = isSameDay(day, today);

                        return (
                          <Tooltip key={key}>
                            <TooltipTrigger asChild>
                              <button
                                className={cn(
                                  'h-[12px] w-[12px] rounded-[2px] transition-colors cursor-pointer',
                                  getCellColor(data, isInRange),
                                  isToday && 'ring-1 ring-primary',
                                  !isInRange && 'invisible'
                                )}
                                onClick={() => isInRange && onDayClick(key)}
                              />
                            </TooltipTrigger>
                            {isInRange && (
                              <TooltipContent side="top" className="text-xs space-y-1 max-w-[200px]">
                                <p className="font-semibold">{format(day, 'EEE, MMM d')}</p>
                                {data && data.count > 0 ? (
                                  <>
                                    <p className={cn('font-mono', data.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                                      P&L: {data.pnl >= 0 ? '+' : ''}₹{data.pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                    </p>
                                    <p>Trades: {data.count}</p>
                                    <p>Win Rate: {data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0}%</p>
                                  </>
                                ) : (
                                  <p className="text-muted-foreground">No trades</p>
                                )}
                                <p>{data?.hasJournal ? '✅ Journal written' : '❌ No journal'}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TooltipProvider>

        {/* Legend + Stats */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
          {/* Legend */}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>Less</span>
            <div className="w-[10px] h-[10px] rounded-[2px] bg-red-500" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-red-400/50" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-muted/20" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-emerald-400/50" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-emerald-500" />
            <span>More</span>
            <span className="ml-2">|</span>
            <div className="w-[10px] h-[10px] rounded-[2px] bg-muted/30 ring-1 ring-blue-400/50 ml-1" />
            <span>Journal only</span>
          </div>

          {/* Mini stats */}
          <div className="flex items-center gap-3 text-[11px]">
            {bestDay && (
              <span className="flex items-center gap-1 text-emerald-400">
                <Trophy className="h-3 w-3" /> Best: +₹{bestDay.pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            )}
            {worstDay && (
              <span className="flex items-center gap-1 text-red-400">
                <TrendingDown className="h-3 w-3" /> Worst: ₹{worstDay.pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Flame className={cn('h-3 w-3', currentStreak >= 7 ? 'text-orange-400' : 'text-muted-foreground')} />
              Streak: {currentStreak}d
              {currentStreak >= 7 && ' 🔥'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
