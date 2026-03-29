/**
 * Win/Loss Streak Visualization - P0 Results
 */

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Trade {
  id: string;
  pnl: number;
  date: Date;
}

interface StreakVisualizationProps {
  trades: Trade[];
  className?: string;
}

export function StreakVisualization({ trades, className }: StreakVisualizationProps) {
  const analysis = useMemo(() => {
    if (trades.length === 0) return null;

    const streaks: { type: 'win' | 'loss'; length: number; trades: Trade[] }[] = [];
    let currentStreak: { type: 'win' | 'loss'; trades: Trade[] } | null = null;

    for (const trade of trades) {
      const isWin = trade.pnl > 0;
      const type = isWin ? 'win' : 'loss';

      if (!currentStreak || currentStreak.type !== type) {
        if (currentStreak) {
          streaks.push({ ...currentStreak, length: currentStreak.trades.length });
        }
        currentStreak = { type, trades: [trade] };
      } else {
        currentStreak.trades.push(trade);
      }
    }

    if (currentStreak) {
      streaks.push({ ...currentStreak, length: currentStreak.trades.length });
    }

    const maxWinStreak = Math.max(...streaks.filter(s => s.type === 'win').map(s => s.length), 0);
    const maxLossStreak = Math.max(...streaks.filter(s => s.type === 'loss').map(s => s.length), 0);
    const avgWinStreak = streaks.filter(s => s.type === 'win').length > 0
      ? streaks.filter(s => s.type === 'win').reduce((sum, s) => sum + s.length, 0) / streaks.filter(s => s.type === 'win').length
      : 0;
    const avgLossStreak = streaks.filter(s => s.type === 'loss').length > 0
      ? streaks.filter(s => s.type === 'loss').reduce((sum, s) => sum + s.length, 0) / streaks.filter(s => s.type === 'loss').length
      : 0;

    // Current streak
    const currentStreakInfo = streaks[streaks.length - 1];

    return {
      streaks: streaks.slice(-20), // Last 20 streaks for visualization
      maxWinStreak,
      maxLossStreak,
      avgWinStreak,
      avgLossStreak,
      currentStreak: currentStreakInfo,
      totalStreaks: streaks.length,
    };
  }, [trades]);

  if (!analysis) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="py-8 text-center">
          <Flame className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No trades to analyze</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-4 w-4 text-warning" />
            Win/Loss Streaks
          </CardTitle>
          {analysis.currentStreak && (
            <Badge 
              variant={analysis.currentStreak.type === 'win' ? 'default' : 'destructive'}
              className="text-xs"
            >
              Current: {analysis.currentStreak.length} {analysis.currentStreak.type}s
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-profit/10 border border-profit/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Max Win Streak</p>
            <p className="text-lg font-bold text-profit flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              {analysis.maxWinStreak}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-loss/10 border border-loss/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Max Loss Streak</p>
            <p className="text-lg font-bold text-loss flex items-center gap-1">
              <TrendingDown className="h-4 w-4" />
              {analysis.maxLossStreak}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Win Streak</p>
            <p className="text-lg font-bold">{analysis.avgWinStreak.toFixed(1)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Loss Streak</p>
            <p className="text-lg font-bold">{analysis.avgLossStreak.toFixed(1)}</p>
          </div>
        </div>

        {/* Visual Streak Display */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Recent Streaks</p>
          <div className="flex items-end gap-0.5 h-16 overflow-x-auto">
            {analysis.streaks.map((streak, idx) => {
              const maxStreak = Math.max(analysis.maxWinStreak, analysis.maxLossStreak, 1);
              const height = (streak.length / maxStreak) * 100;
              
              return (
                <div
                  key={idx}
                  className={cn(
                    "w-3 rounded-t transition-all hover:opacity-80 cursor-pointer",
                    streak.type === 'win' ? "bg-profit" : "bg-loss"
                  )}
                  style={{ height: `${Math.max(height, 15)}%` }}
                  title={`${streak.length} ${streak.type}s`}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
            <span>← Older</span>
            <span>Recent →</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Rolling Metrics Selector - P0 Results
 */
interface RollingMetricsSelectorProps {
  value: number; // days
  onChange: (days: number) => void;
  className?: string;
}

const ROLLING_OPTIONS = [
  { value: 7, label: '7D' },
  { value: 14, label: '14D' },
  { value: 30, label: '30D' },
  { value: 60, label: '60D' },
  { value: 90, label: '90D' },
];

export function RollingMetricsSelector({ value, onChange, className }: RollingMetricsSelectorProps) {
  return (
    <div className={cn("flex items-center gap-1 p-0.5 rounded-md bg-muted/50", className)}>
      {ROLLING_OPTIONS.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "px-2 py-1 text-xs rounded transition-colors",
            value === option.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
