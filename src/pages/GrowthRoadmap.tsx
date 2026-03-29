/**
 * Growth Roadmap - AI-powered personalized trading journey
 * ProJournX parity: Stage detection, action items, goal calculator
 */
import { useMemo, useState } from 'react';
import { PageTitle } from '@/components/ui/PageTitle';
import { useTradesDB } from '@/hooks/useTradesDB';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, Target, Lightbulb, CheckCircle2, 
  AlertTriangle, Sparkles, Trophy, BarChart3, 
  Calculator, ArrowRight, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TraderStage = 'beginner' | 'developing' | 'intermediate' | 'profitable' | 'elite';

interface StageInfo {
  label: string;
  color: string;
  icon: typeof Trophy;
  description: string;
  nextGoal: string;
}

const STAGES: Record<TraderStage, StageInfo> = {
  beginner: {
    label: 'Beginner',
    color: 'text-muted-foreground',
    icon: Activity,
    description: 'Getting started with trading. Focus on process over profits.',
    nextGoal: 'Log 50+ trades and maintain a journal',
  },
  developing: {
    label: 'Developing',
    color: 'text-yellow-500',
    icon: TrendingUp,
    description: 'Building consistency. You have a process but need refinement.',
    nextGoal: 'Achieve 50%+ win rate with positive expectancy',
  },
  intermediate: {
    label: 'Intermediate',
    color: 'text-blue-500',
    icon: Target,
    description: 'Showing promise. Your edge is emerging.',
    nextGoal: 'Reach profit factor > 1.5 with 100+ trades',
  },
  profitable: {
    label: 'Profitable',
    color: 'text-emerald-500',
    icon: BarChart3,
    description: 'Consistently profitable. Focus on scaling and risk management.',
    nextGoal: 'Maintain profit factor > 2.0 and scale position size',
  },
  elite: {
    label: 'Elite',
    color: 'text-primary',
    icon: Trophy,
    description: 'Top-tier performance. You are a master of your edge.',
    nextGoal: 'Mentor others and diversify strategies',
  },
};

export default function GrowthRoadmap() {
  const { trades, loading, stats } = useTradesDB();
  const [goalTarget, setGoalTarget] = useState(10000);
  const [goalMonths, setGoalMonths] = useState(6);

  const analysis = useMemo(() => {
    const closed = trades.filter(t => t.status === 'closed');
    if (closed.length === 0 || !stats) return null;

    // Determine stage
    let stage: TraderStage = 'beginner';
    if (closed.length >= 10 && stats.winRate >= 40) stage = 'developing';
    if (closed.length >= 50 && stats.winRate >= 50 && stats.profitFactor > 1) stage = 'intermediate';
    if (closed.length >= 100 && stats.winRate >= 55 && stats.profitFactor > 1.5) stage = 'profitable';
    if (closed.length >= 200 && stats.winRate >= 60 && stats.profitFactor > 2) stage = 'elite';

    const stageIndex = ['beginner', 'developing', 'intermediate', 'profitable', 'elite'].indexOf(stage);
    const progressPercent = Math.min(100, ((stageIndex + 1) / 5) * 100);

    // Trading days
    const tradingDays = new Set(closed.map(t => new Date(t.entry_time).toDateString())).size;
    const avgTradesPerDay = closed.length / Math.max(tradingDays, 1);

    // Action items
    const actions: { text: string; priority: 'high' | 'medium' | 'low'; done: boolean }[] = [];

    if (stats.winRate < 50) {
      actions.push({ text: 'Improve win rate above 50% — review losing setups', priority: 'high', done: false });
    } else {
      actions.push({ text: 'Win rate above 50% ✓', priority: 'low', done: true });
    }

    if (stats.profitFactor < 1.5) {
      actions.push({ text: 'Increase profit factor to 1.5+ — cut losers faster', priority: 'high', done: false });
    } else {
      actions.push({ text: 'Profit factor above 1.5 ✓', priority: 'low', done: true });
    }

    if (stats.avgRMultiple < 1) {
      actions.push({ text: 'Target avg R-multiple > 1.0 — let winners run', priority: 'medium', done: false });
    } else {
      actions.push({ text: 'Average R-multiple above 1.0 ✓', priority: 'low', done: true });
    }

    if (closed.length < 100) {
      actions.push({ text: `Log ${100 - closed.length} more trades for statistically significant data`, priority: 'medium', done: false });
    } else {
      actions.push({ text: '100+ trades logged ✓', priority: 'low', done: true });
    }

    if (stats.maxDrawdown > stats.totalPnL * 0.3) {
      actions.push({ text: 'Reduce max drawdown — it exceeds 30% of total P&L', priority: 'high', done: false });
    }

    // Insights
    const insights: string[] = [];
    if (stats.longestLossStreak >= 5) {
      insights.push(`⚠️ Your longest losing streak is ${stats.longestLossStreak} trades. Have a plan for drawdown recovery.`);
    }
    if (stats.avgWin > stats.avgLoss * 2) {
      insights.push(`💎 Your avg win (₹${stats.avgWin.toFixed(0)}) is 2x+ your avg loss — excellent risk/reward discipline.`);
    }
    if (avgTradesPerDay > 5) {
      insights.push(`📊 You average ${avgTradesPerDay.toFixed(1)} trades/day — consider if you're overtrading.`);
    }
    if (stats.profitFactor > 2) {
      insights.push(`🔥 Profit factor of ${stats.profitFactor.toFixed(1)} is outstanding. Consider scaling up.`);
    }

    // Goal calculator
    const avgDailyPnL = stats.totalPnL / Math.max(tradingDays, 1);
    const projectedMonthly = avgDailyPnL * 22;
    const monthsToGoal = avgDailyPnL > 0 ? goalTarget / (avgDailyPnL * 22) : Infinity;

    return {
      stage,
      stageInfo: STAGES[stage],
      progressPercent,
      tradingDays,
      avgTradesPerDay,
      actions: actions.sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1)),
      insights,
      avgDailyPnL,
      projectedMonthly,
      monthsToGoal,
    };
  }, [trades, stats, goalTarget]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!analysis || !stats) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageTitle title="Growth Roadmap" subtitle="Your personalized trading journey" />
        <Card>
          <CardContent className="py-16 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">Log some closed trades to see your growth roadmap</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StageIcon = analysis.stageInfo.icon;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <PageTitle title="Growth Roadmap" subtitle="Your personalized trading journey" />
        <Badge variant="secondary" className={cn("w-fit", analysis.stageInfo.color)}>
          <StageIcon className="h-3 w-3 mr-1" />
          {analysis.stageInfo.label} Trader
        </Badge>
      </div>

      {/* Stage Overview */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={cn("h-14 w-14 rounded-xl flex items-center justify-center bg-primary/10", analysis.stageInfo.color)}>
              <StageIcon className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{analysis.stageInfo.label} Trader</h3>
              <p className="text-sm text-muted-foreground">{analysis.stageInfo.description}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Journey Progress</span>
              <span className="font-medium">{analysis.progressPercent.toFixed(0)}%</span>
            </div>
            <Progress value={analysis.progressPercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Beginner</span>
              <span>Developing</span>
              <span>Intermediate</span>
              <span>Profitable</span>
              <span>Elite</span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">₹{stats.totalPnL.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Total P&L</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.profitFactor.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Profit Factor</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalTrades}</p>
              <p className="text-xs text-muted-foreground">Total Trades</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{analysis.tradingDays}</p>
              <p className="text-xs text-muted-foreground">Trading Days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="actions">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="path">Growth Path</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="actions">Action Items</TabsTrigger>
          <TabsTrigger value="calculator">Goal Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="path" className="space-y-4 mt-4">
          {Object.entries(STAGES).map(([key, info], i) => {
            const isCurrentOrPast = ['beginner', 'developing', 'intermediate', 'profitable', 'elite'].indexOf(key) <= ['beginner', 'developing', 'intermediate', 'profitable', 'elite'].indexOf(analysis.stage);
            const isCurrent = key === analysis.stage;
            const Icon = info.icon;
            return (
              <Card key={key} className={cn(
                "transition-all",
                isCurrent && "border-primary/50 bg-primary/5",
                !isCurrentOrPast && "opacity-50"
              )}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                    isCurrentOrPast ? "bg-primary/20" : "bg-muted"
                  )}>
                    {isCurrentOrPast ? (
                      isCurrent ? <Icon className="h-5 w-5 text-primary" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{info.label}</h4>
                      {isCurrent && <Badge variant="default" className="text-[10px]">Current</Badge>}
                      {isCurrentOrPast && !isCurrent && <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-500">Completed</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{info.description}</p>
                    {isCurrent && (
                      <p className="text-xs text-primary mt-1 flex items-center gap-1">
                        <ArrowRight className="h-3 w-3" /> Next: {info.nextGoal}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="insights" className="space-y-3 mt-4">
          {analysis.insights.length > 0 ? (
            analysis.insights.map((insight, i) => (
              <Card key={i}>
                <CardContent className="py-3">
                  <p className="text-sm">{insight}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Log more trades to unlock personalized insights
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="actions" className="space-y-3 mt-4">
          {analysis.actions.map((action, i) => (
            <Card key={i} className={cn(action.done && "opacity-60")}>
              <CardContent className="flex items-center gap-3 py-3">
                {action.done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className={cn(
                    "h-5 w-5 shrink-0",
                    action.priority === 'high' ? 'text-red-500' : action.priority === 'medium' ? 'text-yellow-500' : 'text-muted-foreground'
                  )} />
                )}
                <span className="text-sm flex-1">{action.text}</span>
                {!action.done && (
                  <Badge variant={action.priority === 'high' ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
                    {action.priority}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="calculator" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="h-4 w-4 text-primary" />
                Goal Calculator
              </CardTitle>
              <CardDescription>Based on your current performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>P&L Target (₹)</Label>
                  <Input
                    type="number"
                    value={goalTarget}
                    onChange={e => setGoalTarget(Number(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time Horizon (months)</Label>
                  <Input
                    type="number"
                    value={goalMonths}
                    onChange={e => setGoalMonths(Number(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">₹{analysis.avgDailyPnL.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Avg Daily P&L</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">₹{analysis.projectedMonthly.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Projected Monthly</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">
                    {analysis.monthsToGoal === Infinity ? '∞' : analysis.monthsToGoal.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">Months to ₹{goalTarget.toLocaleString()}</p>
                </div>
              </div>

              {analysis.avgDailyPnL > 0 && (
                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                  <p className="text-sm">
                    {analysis.monthsToGoal <= goalMonths
                      ? `✅ On track! At current pace, you'll reach ₹${goalTarget.toLocaleString()} in ${analysis.monthsToGoal.toFixed(1)} months.`
                      : `⚠️ At current pace, you need ${analysis.monthsToGoal.toFixed(1)} months. To hit your ${goalMonths}-month target, increase daily avg to ₹${(goalTarget / (goalMonths * 22)).toFixed(0)}.`
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
