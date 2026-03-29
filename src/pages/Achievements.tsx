/**
 * Achievements — Discipline-focused, professional system
 * No childish UI. Tracks consistency, streaks, compliance, and milestones.
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Trophy, Target, Flame, Shield, BookOpen, TrendingUp,
  Clock, CheckCircle, Award, BarChart3, Calendar, Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { PageTitle } from '@/components/ui/PageTitle';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ACHIEVEMENT_DEFS, checkAndUpdateAchievements } from '@/lib/achievementTracker';
import { useTradesDB } from '@/hooks/useTradesDB';
import { toast } from 'sonner';
import { format, differenceInCalendarDays, subDays, isAfter } from 'date-fns';
import type { LucideIcon } from 'lucide-react';

// ── Discipline Metrics ──
function useDisciplineMetrics(trades: any[]) {
  return useMemo(() => {
    const closed = trades.filter(t => t.status === 'closed');
    if (!closed.length) return { consistency: 0, journalStreak: 0, ruleStreak: 0, improvementScore: 0 };

    // Trading days consistency (trades on unique days / calendar days)
    const tradeDays = new Set(closed.map(t => t.entry_time?.split('T')[0]).filter(Boolean));
    const firstTrade = closed[closed.length - 1]?.entry_time;
    const calendarDays = firstTrade ? Math.max(1, differenceInCalendarDays(new Date(), new Date(firstTrade))) : 1;
    const consistency = Math.min(100, Math.round((tradeDays.size / calendarDays) * 100));

    // Rule compliance streak (consecutive trades with SL set)
    let ruleStreak = 0;
    for (const t of [...closed].reverse()) {
      if (t.stop_loss || t.strategy_tag) ruleStreak++;
      else break;
    }

    // Improvement: compare last 20 trades vs previous 20
    const recent20 = closed.slice(0, 20);
    const prev20 = closed.slice(20, 40);
    let improvementScore = 50;
    if (prev20.length >= 10 && recent20.length >= 10) {
      const recentWR = recent20.filter(t => (t.net_pnl || 0) > 0).length / recent20.length;
      const prevWR = prev20.filter(t => (t.net_pnl || 0) > 0).length / prev20.length;
      improvementScore = Math.round(50 + (recentWR - prevWR) * 100);
    }

    return { consistency, journalStreak: tradeDays.size, ruleStreak, improvementScore: Math.min(100, Math.max(0, improvementScore)) };
  }, [trades]);
}

// ── Achievement Row ──
interface AchievementRow {
  achievement_id: string;
  progress: number;
  unlocked: boolean;
  unlocked_at: string | null;
}

const iconMap: Record<string, LucideIcon> = {
  first_backtest: Target, backtest_10: TrendingUp, backtest_100: Shield,
  profitable_strat: TrendingUp, sharpe_2: Target, pf_3: Award, low_dd: Shield,
  first_journal: BookOpen, journal_7: Flame, journal_30: Calendar,
  first_trade: Target, trades_50: BarChart3, trades_100: Trophy,
  win_streak_5: Flame, win_streak_10: Flame, profitable_month: TrendingUp,
  streak_7: Flame, streak_30: Calendar,
};

const tierColors = {
  common: 'border-border/30 text-muted-foreground',
  rare: 'border-blue-500/30 text-blue-400',
  epic: 'border-violet-500/30 text-violet-400',
  legendary: 'border-amber-500/30 text-amber-400',
};

export default function Achievements() {
  const { user } = useAuth();
  const { trades } = useTradesDB();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dbAchievements, setDbAchievements] = useState<AchievementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const metrics = useDisciplineMetrics(trades);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const newlyUnlocked = await checkAndUpdateAchievements(user.id, trades);
      newlyUnlocked.forEach(id => {
        const def = ACHIEVEMENT_DEFS.find(d => d.id === id);
        if (def) toast.success(`Achievement Unlocked: ${def.name}`);
      });
      const { data } = await supabase
        .from('user_achievements')
        .select('achievement_id, progress, unlocked, unlocked_at')
        .eq('user_id', user.id);
      setDbAchievements((data as AchievementRow[]) || []);
      setLoading(false);
    })();
  }, [user, trades.length]);

  const dbMap = useMemo(() => new Map(dbAchievements.map(r => [r.achievement_id, r])), [dbAchievements]);

  const mergedAchievements = useMemo(() => {
    return ACHIEVEMENT_DEFS.map(def => {
      const db = dbMap.get(def.id);
      return {
        ...def,
        icon: iconMap[def.id] || Trophy,
        progress: db?.progress ?? 0,
        unlocked: db?.unlocked ?? false,
        unlocked_at: db?.unlocked_at ?? null,
      };
    });
  }, [dbMap]);

  const unlockedCount = mergedAchievements.filter(a => a.unlocked).length;
  const totalXP = mergedAchievements.filter(a => a.unlocked).reduce((s, a) => s + a.xp, 0);

  const filteredAchievements = selectedCategory === 'all'
    ? mergedAchievements
    : mergedAchievements.filter(a => a.category === selectedCategory);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle title="Achievements" subtitle="Discipline metrics and trading milestones" />

      {/* Discipline Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Flame className="h-5 w-5 text-amber-400 mx-auto mb-1" />
            <div className="text-2xl font-bold font-mono">{metrics.consistency}%</div>
            <div className="text-[10px] text-muted-foreground">Consistency Score</div>
            <Progress value={metrics.consistency} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Calendar className="h-5 w-5 text-blue-400 mx-auto mb-1" />
            <div className="text-2xl font-bold font-mono">{metrics.journalStreak}</div>
            <div className="text-[10px] text-muted-foreground">Trading Days</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Shield className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
            <div className="text-2xl font-bold font-mono">{metrics.ruleStreak}</div>
            <div className="text-[10px] text-muted-foreground">Rule Compliance Streak</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 text-violet-400 mx-auto mb-1" />
            <div className="text-2xl font-bold font-mono">{metrics.improvementScore}%</div>
            <div className="text-[10px] text-muted-foreground">Improvement Score</div>
            <Progress value={metrics.improvementScore} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <Trophy className="h-4 w-4 text-primary" />
          <span className="font-semibold">{unlockedCount}</span>
          <span className="text-muted-foreground">/ {mergedAchievements.length} unlocked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Award className="h-4 w-4 text-amber-400" />
          <span className="font-semibold">{totalXP} XP</span>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'trading', 'journal', 'trades', 'consistency'].map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            size="sm"
            className="text-xs capitalize"
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Achievements Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading achievements...</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredAchievements.map(achievement => {
            const Icon = achievement.icon;
            const progressPct = achievement.maxProgress > 0 ? Math.min(100, (achievement.progress / achievement.maxProgress) * 100) : 0;
            return (
              <Card
                key={achievement.id}
                className={cn(
                  'transition-all',
                  achievement.unlocked ? tierColors[achievement.rarity] : 'opacity-50 border-border/20'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'p-2 rounded-lg border',
                      achievement.unlocked
                        ? tierColors[achievement.rarity]
                        : 'border-border/20 text-muted-foreground'
                    )}>
                      {achievement.unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold truncate">{achievement.name}</span>
                        <Badge variant="outline" className={cn("text-[9px] capitalize", tierColors[achievement.rarity])}>
                          {achievement.rarity}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-2">{achievement.description}</p>
                      <div className="flex items-center gap-2">
                        <Progress value={progressPct} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {achievement.progress}/{achievement.maxProgress}
                        </span>
                      </div>
                      {achievement.unlocked && achievement.unlocked_at && (
                        <div className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-emerald-400" />
                          Unlocked {format(new Date(achievement.unlocked_at), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground shrink-0">
                      +{achievement.xp} XP
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
