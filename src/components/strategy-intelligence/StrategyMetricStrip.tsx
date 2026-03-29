/**
 * StrategyMetricStrip — Horizontal metric summary strip for profile page
 */
import { Card, CardContent } from '@/components/ui/card';
import type { StrategyPerformance, StrategyResearch } from '@/types/strategyIntelligence';
import { cn } from '@/lib/utils';

interface StrategyMetricStripProps {
  performance: StrategyPerformance;
  research: StrategyResearch;
}

function MetricCell({ label, value, unit, positive }: { label: string; value: string; unit?: string; positive?: boolean }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 min-w-[80px]">
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{label}</span>
      <span className={cn('text-sm font-mono font-bold tabular-nums', positive === undefined ? 'text-foreground' : positive ? 'text-emerald-400' : 'text-red-400')}>
        {value}{unit || ''}
      </span>
    </div>
  );
}

export function StrategyMetricStrip({ performance, research }: StrategyMetricStripProps) {
  return (
    <Card variant="glass">
      <CardContent className="p-0">
        <div className="flex overflow-x-auto divide-x divide-border/30">
          <MetricCell label="Win Rate" value={`${performance.winRate}`} unit="%" positive={performance.winRate > 55} />
          <MetricCell label="Profit Factor" value={performance.profitFactor.toFixed(2)} positive={performance.profitFactor > 1.5} />
          <MetricCell label="Sharpe" value={performance.sharpeRatio.toFixed(2)} positive={performance.sharpeRatio > 1.5} />
          <MetricCell label="Sortino" value={performance.sortinoRatio.toFixed(2)} positive={performance.sortinoRatio > 2} />
          <MetricCell label="Max DD" value={`${performance.maxDrawdown}`} unit="%" positive={performance.maxDrawdown < 10} />
          <MetricCell label="CAGR" value={`${performance.cagr}`} unit="%" positive={performance.cagr > 20} />
          <MetricCell label="Expectancy" value={performance.expectancy.toFixed(2)} positive={performance.expectancy > 0.5} />
          <MetricCell label="Avg Duration" value={performance.avgTradeDuration} />
          <MetricCell label="Ulcer Idx" value={performance.ulcerIndex.toFixed(1)} positive={performance.ulcerIndex < 5} />
          <MetricCell label="Max Losses" value={`${performance.consecutiveLossCount}`} positive={performance.consecutiveLossCount < 6} />
          <MetricCell label="WF Stability" value={`${research.walkForwardStability}`} unit="%" positive={research.walkForwardStability > 70} />
          <MetricCell label="OOS Perf" value={`${research.outOfSamplePerformance}`} unit="%" positive={research.outOfSamplePerformance > 65} />
        </div>
      </CardContent>
    </Card>
  );
}
