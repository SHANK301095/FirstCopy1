/**
 * Trade KPI Cards - summary metrics for trading dashboard
 * Includes: Avg Trade Grade KPI + Current Streak widget
 */
import { Card } from '@/components/ui/card';
import { TrendingUp, Target, Zap, ArrowDownRight, BarChart2, Activity, Award, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Trade, TradeStats } from '@/hooks/useTradesDB';

interface TradeKPICardsProps {
  stats: TradeStats;
  trades?: Trade[];
}

function computeAvgGrade(trades: Trade[]): string | null {
  const graded = trades.filter(t => t.trade_grade);
  if (graded.length === 0) return null;
  const gradeMap: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
  const reverseMap: Record<number, string> = { 4: 'A', 3: 'B', 2: 'C', 1: 'D', 0: 'F' };
  const sum = graded.reduce((s, t) => s + (gradeMap[t.trade_grade!.toUpperCase().charAt(0)] ?? 2), 0);
  const avg = Math.round(sum / graded.length);
  return reverseMap[avg] || 'C';
}

const GRADE_COLORS: Record<string, string> = {
  A: 'text-emerald-400', B: 'text-blue-400', C: 'text-amber-400', D: 'text-orange-400', F: 'text-red-400',
};

export function TradeKPICards({ stats, trades = [] }: TradeKPICardsProps) {
  const avgGrade = computeAvgGrade(trades);
  const streak = stats.currentStreak;

  const kpis = [
    { label: 'Net P&L', value: `₹${stats.totalPnL.toFixed(0)}`, icon: TrendingUp, color: stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400' },
    { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, icon: Target, color: stats.winRate >= 50 ? 'text-emerald-400' : 'text-red-400' },
    { label: 'Profit Factor', value: stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2), icon: Zap, color: stats.profitFactor >= 1.5 ? 'text-emerald-400' : 'text-amber-400' },
    { label: 'Expectancy', value: `₹${stats.expectancy.toFixed(0)}`, icon: Activity, color: stats.expectancy >= 0 ? 'text-emerald-400' : 'text-red-400' },
    { label: 'Max Drawdown', value: `₹${stats.maxDrawdown.toFixed(0)}`, icon: ArrowDownRight, color: 'text-red-400' },
    { label: 'Total Trades', value: stats.totalTrades.toString(), icon: BarChart2, color: 'text-primary' },
    ...(avgGrade ? [{
      label: 'Avg Grade',
      value: avgGrade,
      icon: Award,
      color: GRADE_COLORS[avgGrade] || 'text-amber-400',
    }] : []),
    {
      label: 'Streak',
      value: streak ? `${streak.count} ${streak.type}${streak.count > 1 ? 's' : ''}` : '—',
      icon: Flame,
      color: streak?.type === 'win' ? 'text-emerald-400' : streak?.type === 'loss' ? 'text-red-400' : 'text-muted-foreground',
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
      {kpis.map(kpi => (
        <Card key={kpi.label} className="p-3">
          <div className="flex items-center gap-2">
            <kpi.icon className={cn("h-4 w-4", kpi.color)} />
            <div>
              <p className={cn("text-lg font-bold font-mono", kpi.color)}>{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
