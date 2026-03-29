/**
 * Achievement Badges - gamify trading discipline
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Star, Flame, Target, Shield, TrendingUp, Zap, Award, Crown, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Trade } from '@/hooks/useTradesDB';
import { safeNetPnl } from '@/lib/tradeMetrics';
import type { LucideIcon } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  earned: boolean;
  progress?: number;
  target?: number;
}

export function AchievementBadges({ trades }: { trades: Trade[] }) {
  const achievements = useMemo((): Achievement[] => {
    const closed = trades.filter(t => t.status === 'closed');
    const sorted = [...closed].sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
    
    // Calculate streaks
    let maxWinStreak = 0, currentWin = 0;
    sorted.forEach(t => {
      if (safeNetPnl(t) > 0) { currentWin++; maxWinStreak = Math.max(maxWinStreak, currentWin); }
      else currentWin = 0;
    });

    const wins = closed.filter(t => safeNetPnl(t) > 0).length;
    const decisiveTrades = closed.filter(t => safeNetPnl(t) !== 0).length;
    const winRate = decisiveTrades > 0 ? (wins / decisiveTrades) * 100 : 0;
    const totalPnl = closed.reduce((s, t) => s + safeNetPnl(t), 0);
    const withRR = closed.filter(t => t.risk_reward != null && t.risk_reward >= 2).length;
    const withJournal = closed.filter(t => t.notes).length;

    return [
      { id: 'first-trade', name: 'First Blood', description: 'Log your first trade', icon: Zap, color: 'text-blue-400', earned: closed.length >= 1, progress: Math.min(1, closed.length), target: 1 },
      { id: '10-trades', name: 'Getting Started', description: 'Complete 10 trades', icon: Star, color: 'text-yellow-400', earned: closed.length >= 10, progress: Math.min(10, closed.length), target: 10 },
      { id: '50-trades', name: 'Consistency', description: 'Complete 50 trades', icon: Target, color: 'text-emerald-400', earned: closed.length >= 50, progress: Math.min(50, closed.length), target: 50 },
      { id: '100-trades', name: 'Century', description: 'Log 100 trades', icon: Trophy, color: 'text-amber-400', earned: closed.length >= 100, progress: Math.min(100, closed.length), target: 100 },
      { id: '500-trades', name: 'Veteran', description: '500 trades logged', icon: Crown, color: 'text-purple-400', earned: closed.length >= 500, progress: Math.min(500, closed.length), target: 500 },
      { id: '5-win-streak', name: 'Hot Streak', description: '5 wins in a row', icon: Flame, color: 'text-orange-400', earned: maxWinStreak >= 5 },
      { id: '10-win-streak', name: 'Unstoppable', description: '10 wins in a row', icon: Flame, color: 'text-red-400', earned: maxWinStreak >= 10 },
      { id: '60-wr', name: 'Sharp Shooter', description: '60%+ win rate (20+ trades)', icon: Target, color: 'text-emerald-400', earned: winRate >= 60 && closed.length >= 20 },
      { id: 'profitable', name: 'In the Green', description: 'Total P&L positive', icon: TrendingUp, color: 'text-emerald-400', earned: totalPnl > 0 && closed.length >= 5 },
      { id: '10k-profit', name: '10K Club', description: 'Earn ₹10,000+ total', icon: Award, color: 'text-yellow-400', earned: totalPnl >= 10000 },
      { id: 'risk-manager', name: 'Risk Manager', description: '10+ trades with 2:1+ R:R', icon: Shield, color: 'text-blue-400', earned: withRR >= 10, progress: Math.min(10, withRR), target: 10 },
      { id: 'journaler', name: 'Reflective', description: 'Add notes to 20+ trades', icon: Medal, color: 'text-indigo-400', earned: withJournal >= 20, progress: Math.min(20, withJournal), target: 20 },
    ];
  }, [trades]);

  const earned = achievements.filter(a => a.earned).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-muted-foreground" />
          Achievements
          <span className="text-xs font-normal text-muted-foreground ml-auto">{earned}/{achievements.length} unlocked</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {achievements.map(a => (
            <div key={a.id} className={cn(
              'flex flex-col items-center p-2 rounded-lg text-center transition-all',
              a.earned ? 'bg-primary/5 border border-primary/20' : 'bg-muted/20 opacity-40'
            )}>
              <a.icon className={cn('h-5 w-5 mb-1', a.earned ? a.color : 'text-muted-foreground')} />
              <span className="text-[10px] font-medium leading-tight">{a.name}</span>
              {a.target && !a.earned && (
                <span className="text-[10px] text-muted-foreground">{a.progress}/{a.target}</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
