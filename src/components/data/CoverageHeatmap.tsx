/**
 * Coverage Heatmap V3.0
 * Calendar showing which dates are covered by datasets
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dataset } from '@/db/index';

interface CoverageHeatmapProps {
  datasets: Dataset[];
  symbol: string;
}

interface DayCoverage {
  date: string;
  datasets: string[];
  coverage: 'full' | 'partial' | 'overlap' | 'gap';
}

export function CoverageHeatmap({ datasets, symbol }: CoverageHeatmapProps) {
  const coverageData = useMemo(() => {
    if (datasets.length === 0) return { days: [], months: [], stats: null };

    // Get date range
    const allFromTs = Math.min(...datasets.map(d => d.rangeFromTs));
    const allToTs = Math.max(...datasets.map(d => d.rangeToTs));

    // Generate days
    const days: DayCoverage[] = [];
    const dayMs = 86400000;
    const startDay = new Date(allFromTs);
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(allToTs);
    endDay.setHours(23, 59, 59, 999);

    let currentDay = startDay.getTime();
    let coveredDays = 0;
    let gapDays = 0;
    let overlapDays = 0;

    while (currentDay <= endDay.getTime()) {
      const dayStart = currentDay;
      const dayEnd = currentDay + dayMs - 1;

      // Check which datasets cover this day
      const coveringDatasets = datasets.filter(d => 
        d.rangeFromTs <= dayEnd && d.rangeToTs >= dayStart
      );

      const dateStr = new Date(currentDay).toISOString().split('T')[0];
      
      let coverage: 'full' | 'partial' | 'overlap' | 'gap';
      if (coveringDatasets.length === 0) {
        coverage = 'gap';
        gapDays++;
      } else if (coveringDatasets.length > 1) {
        coverage = 'overlap';
        overlapDays++;
        coveredDays++;
      } else {
        coverage = 'full';
        coveredDays++;
      }

      days.push({
        date: dateStr,
        datasets: coveringDatasets.map(d => d.name),
        coverage,
      });

      currentDay += dayMs;
    }

    // Group by months for display
    const months: { month: string; days: DayCoverage[] }[] = [];
    for (const day of days) {
      const monthKey = day.date.substring(0, 7);
      const existing = months.find(m => m.month === monthKey);
      if (existing) {
        existing.days.push(day);
      } else {
        months.push({ month: monthKey, days: [day] });
      }
    }

    const totalDays = days.length;
    const coveragePct = (coveredDays / totalDays) * 100;

    return {
      days,
      months,
      stats: {
        totalDays,
        coveredDays,
        gapDays,
        overlapDays,
        coveragePct,
      },
    };
  }, [datasets]);

  if (datasets.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          <p>No datasets to show coverage</p>
        </CardContent>
      </Card>
    );
  }

  const { months, stats } = coverageData;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5 text-primary" />
            Coverage Map: {symbol}
          </CardTitle>
          <div className="flex items-center gap-2">
            {stats && (
              <>
                <Badge variant="outline" className="text-xs">
                  {stats.coveragePct.toFixed(1)}% coverage
                </Badge>
                {stats.gapDays > 0 && (
                  <Badge variant="outline" className="text-xs text-warning border-warning">
                    {stats.gapDays} gap days
                  </Badge>
                )}
                {stats.overlapDays > 0 && (
                  <Badge variant="outline" className="text-xs text-primary border-primary">
                    {stats.overlapDays} overlap days
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-profit/80" />
            <span>Covered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary/80" />
            <span>Overlap</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-loss/50" />
            <span>Gap</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <TooltipProvider>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {months.slice(-12).map(({ month, days }) => (
              <div key={month} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                </p>
                <div className="flex flex-wrap gap-0.5">
                  {days.map((day) => (
                    <Tooltip key={day.date}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'w-3 h-3 rounded-sm cursor-pointer transition-transform hover:scale-150',
                            day.coverage === 'full' && 'bg-profit/80',
                            day.coverage === 'overlap' && 'bg-primary/80',
                            day.coverage === 'gap' && 'bg-loss/50'
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        <p className="font-medium">{day.date}</p>
                        {day.datasets.length > 0 ? (
                          <div className="mt-1">
                            <p className="text-muted-foreground">Datasets:</p>
                            {day.datasets.map((d, i) => (
                              <p key={i}>• {d}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-loss">No data</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TooltipProvider>

        {/* Stats Summary */}
        {stats && (
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-profit" />
              <span>
                <strong>{stats.coveredDays}</strong> of {stats.totalDays} days covered
              </span>
            </div>
            {stats.gapDays > 0 && (
              <div className="flex items-center gap-2 text-warning">
                <AlertCircle className="h-4 w-4" />
                <span>{stats.gapDays} missing days</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
