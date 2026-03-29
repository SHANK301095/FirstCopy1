/**
 * AI Playbook Page - Full pattern detection view with 7-dimension analysis
 */
import { PageTitle } from '@/components/ui/PageTitle';
import { useTradesDB } from '@/hooks/useTradesDB';
import { AIPlaybookCards } from '@/components/trading/AIPlaybookCards';
import { AIAnalysisTabs } from '@/components/trading/AIAnalysisTabs';
import { PreTradeCheck } from '@/components/trading/PreTradeCheck';
import { EquityCurve } from '@/components/trading/EquityCurve';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Brain } from 'lucide-react';
import { useMemo } from 'react';

export default function AIPlaybook() {
  const { trades, loading, stats } = useTradesDB();

  const insights = useMemo(() => {
    const closed = trades.filter(t => t.status === 'closed');
    if (closed.length < 5) return [];

    const results: string[] = [];
    
    if (stats) {
      if (stats.currentStreak.count >= 3) {
        results.push(stats.currentStreak.type === 'win'
          ? `🔥 You're on a ${stats.currentStreak.count}-trade winning streak! Stay disciplined.`
          : `⚠️ ${stats.currentStreak.count}-trade losing streak. Consider reducing size or taking a break.`);
      }
      if (stats.winRate >= 60) results.push(`✅ Your ${stats.winRate.toFixed(0)}% win rate is excellent — focus on consistency.`);
      if (stats.profitFactor < 1) results.push(`🔴 Profit factor below 1.0 — losses exceed wins. Review risk management.`);
      if (stats.profitFactor >= 2) results.push(`💎 Profit factor ${stats.profitFactor.toFixed(1)} is exceptional — consider scaling up carefully.`);
    }

    const tradesByDay = new Map<string, number>();
    closed.forEach(t => {
      const day = new Date(t.entry_time).toDateString();
      tradesByDay.set(day, (tradesByDay.get(day) || 0) + 1);
    });
    const avgTradesPerDay = [...tradesByDay.values()].reduce((s, n) => s + n, 0) / tradesByDay.size;
    const maxTradesDay = Math.max(...tradesByDay.values());
    if (maxTradesDay > avgTradesPerDay * 2.5) {
      results.push(`📊 Possible overtrading detected: ${maxTradesDay} trades on busiest day vs ${avgTradesPerDay.toFixed(1)} avg.`);
    }

    return results;
  }, [trades, stats]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <PageTitle title="AI Playbook" subtitle="Pattern detection, insights, and recommendations" />
        <Badge variant="secondary" className="w-fit">
          <Brain className="h-3 w-3 mr-1" />
          {trades.filter(t => t.status === 'closed').length} trades analyzed
        </Badge>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.map((insight, i) => (
                <p key={i} className="text-sm">{insight}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pre-Trade Check */}
      <PreTradeCheck trades={trades} />

      {/* Playbook Patterns */}
      <AIPlaybookCards trades={trades} />

      {/* 7-Dimension Analysis */}
      {stats && <AIAnalysisTabs trades={trades} stats={stats} />}

      {/* Equity for reference */}
      <EquityCurve trades={trades} />
    </div>
  );
}
