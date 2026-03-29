/**
 * Behavioral Diagnostics - Overtrading detection, revenge trading, consistency score
 * Part of MMCai.app Projournx feature set
 */
import { useMemo } from 'react';
import {
  Brain, AlertTriangle, TrendingUp, TrendingDown,
  Target, Activity, Clock, Shield, Zap, BarChart2,
  CheckCircle2, XCircle, ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { PageTitle } from '@/components/ui/PageTitle';
import { useTradesDB } from '@/hooks/useTradesDB';
import { safeNetPnl, MIN_SAMPLE_SIZE } from '@/lib/tradeMetrics';

export default function BehavioralDiagnostics() {
  const { trades, stats } = useTradesDB();

  const diagnostics = useMemo(() => {
    if (trades.length < MIN_SAMPLE_SIZE) return null;

    const closed = trades.filter(t => t.status === 'closed');
    const sorted = [...closed].sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());

    // Overtrading detection - trades per day
    const dayMap = new Map<string, number>();
    sorted.forEach(t => {
      const day = t.entry_time.slice(0, 10);
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    });
    const avgTradesPerDay = sorted.length / Math.max(1, dayMap.size);
    const overtradeDays = [...dayMap.entries()].filter(([, count]) => count > avgTradesPerDay * 1.5);
    const overtradingScore = Math.min(100, (overtradeDays.length / Math.max(1, dayMap.size)) * 100);

    // Revenge trading - trade within 30min after a loss with larger size
    let revengeCount = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (safeNetPnl(prev) < 0) {
        const timeDiff = new Date(curr.entry_time).getTime() - new Date(prev.entry_time).getTime();
        if (timeDiff < 30 * 60 * 1000) {
          revengeCount++;
        }
      }
    }
    const revengeScore = Math.min(100, (revengeCount / Math.max(1, closed.length)) * 200);

    // Emotion-loss correlation
    const emotionLosses: Record<string, { total: number; losses: number }> = {};
    closed.forEach(t => {
      (t.emotions || []).forEach(em => {
        if (!emotionLosses[em]) emotionLosses[em] = { total: 0, losses: 0 };
        emotionLosses[em].total++;
        if (safeNetPnl(t) < 0) emotionLosses[em].losses++;
      });
    });
    const dangerousEmotions = Object.entries(emotionLosses)
      .filter(([, v]) => v.total >= 3 && (v.losses / v.total) > 0.6)
      .sort((a, b) => (b[1].losses / b[1].total) - (a[1].losses / a[1].total));

    // Consistency Score (0-100)
    const winRate = stats?.winRate || 0;
    const riskDiscipline = 100 - overtradingScore;
    const ddControl = stats ? Math.max(0, 100 - (stats.maxDrawdown / Math.max(1, Math.abs(stats.totalPnL)) * 100)) : 50;
    const frequencyStability = Math.max(0, 100 - (overtradeDays.length * 10));
    const consistencyScore = Math.round(
      winRate * 0.3 + riskDiscipline * 0.25 + ddControl * 0.25 + frequencyStability * 0.2
    );

    return {
      overtradingScore: Math.round(overtradingScore),
      overtradeDays: overtradeDays.length,
      avgTradesPerDay: avgTradesPerDay.toFixed(1),
      revengeScore: Math.round(revengeScore),
      revengeCount,
      dangerousEmotions,
      consistencyScore: Math.min(100, Math.max(0, consistencyScore)),
      totalAnalyzed: closed.length,
    };
  }, [trades, stats]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-profit';
    if (score >= 40) return 'text-warning';
    return 'text-destructive';
  };

  const getDangerColor = (score: number) => {
    if (score <= 20) return 'text-profit';
    if (score <= 50) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle title="Behavioral Diagnostics" subtitle="Identify patterns that hurt your trading performance" />

      {!diagnostics ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Brain className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Need at least 5 closed trades for diagnostics</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Consistency Score */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <CardContent className="relative pt-6 pb-8">
              <div className="text-center space-y-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Consistency Score</p>
                <p className={cn("text-6xl font-bold font-mono", getScoreColor(diagnostics.consistencyScore))}>
                  {diagnostics.consistencyScore}
                </p>
                <p className="text-sm text-muted-foreground">
                  Based on {diagnostics.totalAnalyzed} trades • Win rate, discipline, DD control, frequency
                </p>
                <Badge variant={diagnostics.consistencyScore >= 70 ? 'default' : diagnostics.consistencyScore >= 40 ? 'secondary' : 'destructive'}>
                  {diagnostics.consistencyScore >= 70 ? 'Consistent Trader' : diagnostics.consistencyScore >= 40 ? 'Developing' : 'Needs Work'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Diagnostics Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Overtrading */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className={cn("h-4 w-4", getDangerColor(diagnostics.overtradingScore))} />
                  Overtrading Detection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Danger Level</span>
                  <span className={cn("text-lg font-bold font-mono", getDangerColor(diagnostics.overtradingScore))}>
                    {diagnostics.overtradingScore}%
                  </span>
                </div>
                <Progress value={diagnostics.overtradingScore} className={cn("h-2", diagnostics.overtradingScore > 50 ? '[&>div]:bg-destructive' : '')} />
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm font-mono font-medium">{diagnostics.avgTradesPerDay}</p>
                    <p className="text-[10px] text-muted-foreground">Avg/Day</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm font-mono font-medium">{diagnostics.overtradeDays}</p>
                    <p className="text-[10px] text-muted-foreground">Overtrade Days</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenge Trading */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className={cn("h-4 w-4", getDangerColor(diagnostics.revengeScore))} />
                  Revenge Trading
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Danger Level</span>
                  <span className={cn("text-lg font-bold font-mono", getDangerColor(diagnostics.revengeScore))}>
                    {diagnostics.revengeScore}%
                  </span>
                </div>
                <Progress value={diagnostics.revengeScore} className={cn("h-2", diagnostics.revengeScore > 50 ? '[&>div]:bg-destructive' : '')} />
                <p className="text-xs text-muted-foreground">
                  {diagnostics.revengeCount} trades entered within 30min after a loss
                </p>
              </CardContent>
            </Card>

            {/* Emotion-Loss Correlation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Dangerous Emotions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {diagnostics.dangerousEmotions.length === 0 ? (
                  <div className="text-center py-4">
                    <CheckCircle2 className="h-6 w-6 text-profit mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No strong emotion-loss correlations found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {diagnostics.dangerousEmotions.slice(0, 5).map(([emotion, data]) => (
                      <div key={emotion} className="flex items-center justify-between p-2 rounded-lg bg-destructive/5">
                        <span className="text-sm font-medium">{emotion}</span>
                        <div className="text-right">
                          <p className="text-xs font-mono text-destructive">{((data.losses / data.total) * 100).toFixed(0)}% loss rate</p>
                          <p className="text-[10px] text-muted-foreground">{data.total} trades</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3-Step Improvement */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  3-Step Improvement Framework
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    step: 1, title: 'Identify',
                    desc: diagnostics.overtradingScore > 50
                      ? 'Overtrading is your biggest issue. You trade too many times on volatile days.'
                      : diagnostics.revengeScore > 30
                        ? 'Revenge trading after losses is eroding your edge.'
                        : 'Your consistency is developing well. Focus on emotional discipline.',
                    icon: Activity,
                  },
                  {
                    step: 2, title: 'Constraint',
                    desc: diagnostics.overtradingScore > 50
                      ? `Set a max ${Math.ceil(parseFloat(diagnostics.avgTradesPerDay))} trades/day limit.`
                      : diagnostics.revengeScore > 30
                        ? 'Add a 1-hour cooldown after any loss before taking a new trade.'
                        : 'Maintain your current trade frequency and risk discipline.',
                    icon: Shield,
                  },
                  {
                    step: 3, title: 'Practice',
                    desc: 'Track your adherence daily in the journal. Review weekly for improvement trends.',
                    icon: TrendingUp,
                  },
                ].map(s => (
                  <div key={s.step} className="flex gap-3 p-2.5 rounded-lg bg-muted/30">
                    <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{s.step}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
