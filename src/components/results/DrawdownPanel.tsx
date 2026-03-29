/**
 * Drawdown Analysis Panel - P0 Results
 * Visualize and analyze drawdowns
 */

import { useMemo } from 'react';
import { TrendingDown, AlertTriangle, Clock, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';

interface DrawdownPeriod {
  startDate: Date;
  endDate: Date | null; // null if ongoing
  peak: number;
  trough: number;
  drawdownPercent: number;
  recoveryDate: Date | null;
  durationDays: number;
  recoveryDays: number | null;
}

interface DrawdownPanelProps {
  equityCurve: { date: Date; equity: number }[];
  className?: string;
}

export function DrawdownPanel({ equityCurve, className }: DrawdownPanelProps) {
  const analysis = useMemo(() => {
    if (equityCurve.length < 2) return null;

    const drawdowns: DrawdownPeriod[] = [];
    let peak = equityCurve[0].equity;
    let peakDate = equityCurve[0].date;
    let inDrawdown = false;
    let currentDrawdown: Partial<DrawdownPeriod> = {};

    for (let i = 0; i < equityCurve.length; i++) {
      const { date, equity } = equityCurve[i];

      if (equity > peak) {
        if (inDrawdown && currentDrawdown.startDate) {
          // Drawdown recovered
          drawdowns.push({
            startDate: currentDrawdown.startDate,
            endDate: currentDrawdown.endDate || date,
            peak: currentDrawdown.peak || peak,
            trough: currentDrawdown.trough || equity,
            drawdownPercent: currentDrawdown.drawdownPercent || 0,
            recoveryDate: date,
            durationDays: differenceInDays(currentDrawdown.endDate || date, currentDrawdown.startDate),
            recoveryDays: differenceInDays(date, currentDrawdown.endDate || date),
          });
          currentDrawdown = {};
          inDrawdown = false;
        }
        peak = equity;
        peakDate = date;
      } else {
        const dd = ((peak - equity) / peak) * 100;
        
        if (!inDrawdown && dd > 0.5) {
          // Start new drawdown
          inDrawdown = true;
          currentDrawdown = {
            startDate: peakDate,
            peak: peak,
            trough: equity,
            drawdownPercent: dd,
            endDate: date,
          };
        } else if (inDrawdown) {
          // Update trough if deeper
          if (equity < (currentDrawdown.trough || Infinity)) {
            currentDrawdown.trough = equity;
            currentDrawdown.drawdownPercent = dd;
            currentDrawdown.endDate = date;
          }
        }
      }
    }

    // Handle ongoing drawdown
    if (inDrawdown && currentDrawdown.startDate) {
      drawdowns.push({
        startDate: currentDrawdown.startDate,
        endDate: currentDrawdown.endDate || new Date(),
        peak: currentDrawdown.peak || peak,
        trough: currentDrawdown.trough || equityCurve[equityCurve.length - 1].equity,
        drawdownPercent: currentDrawdown.drawdownPercent || 0,
        recoveryDate: null,
        durationDays: differenceInDays(currentDrawdown.endDate || new Date(), currentDrawdown.startDate),
        recoveryDays: null,
      });
    }

    const maxDrawdown = Math.max(...drawdowns.map(d => d.drawdownPercent), 0);
    const avgDrawdown = drawdowns.length > 0 
      ? drawdowns.reduce((sum, d) => sum + d.drawdownPercent, 0) / drawdowns.length 
      : 0;
    const longestDrawdown = Math.max(...drawdowns.map(d => d.durationDays), 0);
    const avgRecovery = drawdowns.filter(d => d.recoveryDays !== null).length > 0
      ? drawdowns.filter(d => d.recoveryDays !== null).reduce((sum, d) => sum + (d.recoveryDays || 0), 0) / drawdowns.filter(d => d.recoveryDays !== null).length
      : 0;

    return {
      drawdowns: drawdowns.sort((a, b) => b.drawdownPercent - a.drawdownPercent).slice(0, 5),
      maxDrawdown,
      avgDrawdown,
      longestDrawdown,
      avgRecovery,
      totalDrawdowns: drawdowns.length,
    };
  }, [equityCurve]);

  if (!analysis) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="py-8 text-center">
          <TrendingDown className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No equity data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-loss" />
          Drawdown Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Max DD</p>
            <p className="text-lg font-bold text-loss">-{analysis.maxDrawdown.toFixed(1)}%</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg DD</p>
            <p className="text-lg font-bold">-{analysis.avgDrawdown.toFixed(1)}%</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Longest</p>
            <p className="text-lg font-bold">{analysis.longestDrawdown}d</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Recovery</p>
            <p className="text-lg font-bold">{analysis.avgRecovery.toFixed(0)}d</p>
          </div>
        </div>

        {/* Top Drawdowns */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Top {analysis.drawdowns.length} Drawdowns
          </p>
          <div className="space-y-2">
            {analysis.drawdowns.map((dd, idx) => (
              <div 
                key={idx} 
                className="p-2 rounded-lg bg-muted/20 border border-border/30 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] h-5">
                      #{idx + 1}
                    </Badge>
                    <span className="text-sm font-medium text-loss">
                      -{dd.drawdownPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {dd.durationDays}d
                    {dd.recoveryDate && (
                      <>
                        <span>→</span>
                        {dd.recoveryDays}d recovery
                      </>
                    )}
                    {!dd.recoveryDate && (
                      <Badge variant="destructive" className="text-[9px] h-4">
                        Ongoing
                      </Badge>
                    )}
                  </div>
                </div>
                <Progress 
                  value={(dd.drawdownPercent / analysis.maxDrawdown) * 100} 
                  className="h-1.5" 
                />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(dd.startDate, 'MMM d, yyyy')}
                  </span>
                  <span>→ {dd.endDate ? format(dd.endDate, 'MMM d, yyyy') : 'Present'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
