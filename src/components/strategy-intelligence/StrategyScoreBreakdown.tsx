/**
 * StrategyScoreBreakdown — MMC Composite Score visual breakdown
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StrategyScoreBadge, getScoreGrade } from './StrategyScoreBadge';
import { MMC_SCORE_WEIGHTS, type StrategyIntelligence } from '@/types/strategyIntelligence';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

interface StrategyScoreBreakdownProps {
  strategy: StrategyIntelligence;
}

function ScoreBar({ label, weight, value, maxValue = 100 }: { label: string; weight: number; value: number; maxValue?: number }) {
  const pct = Math.min(100, (value / maxValue) * 100);
  const grade = getScoreGrade(value);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label} <span className="text-[10px]">({(weight * 100).toFixed(0)}%)</span></span>
        <span className={cn('text-xs font-mono font-medium', grade.color)}>{value.toFixed(0)}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', pct > 70 ? 'bg-emerald-500' : pct > 50 ? 'bg-amber-500' : 'bg-red-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function StrategyScoreBreakdown({ strategy }: StrategyScoreBreakdownProps) {
  const { performance, research, execution, compatibility } = strategy;

  const riskAdjReturn = Math.min(100, performance.sharpeRatio * 30);
  const ddControl = Math.max(0, 100 - performance.maxDrawdown * 4);
  const consistency = performance.winRate > 55 ? Math.min(100, performance.winRate * 1.2) : performance.winRate;
  const regimeRobust = compatibility.regimeSuitability.length * 25;

  return (
    <Card variant="glass">
      <CardHeader className="pb-2 p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" /> MMC Composite Score
          </CardTitle>
          <StrategyScoreBadge score={research.mmcCompositeScore} size="md" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <ScoreBar label="Risk-Adjusted Return" weight={MMC_SCORE_WEIGHTS.riskAdjustedReturn} value={riskAdjReturn} />
        <ScoreBar label="Drawdown Control" weight={MMC_SCORE_WEIGHTS.drawdownControl} value={ddControl} />
        <ScoreBar label="Consistency" weight={MMC_SCORE_WEIGHTS.consistency} value={consistency} />
        <ScoreBar label="OOS Stability" weight={MMC_SCORE_WEIGHTS.oosStability} value={research.outOfSamplePerformance} />
        <ScoreBar label="Regime Robustness" weight={MMC_SCORE_WEIGHTS.regimeRobustness} value={regimeRobust} />
        <ScoreBar label="Execution Realism" weight={MMC_SCORE_WEIGHTS.executionRealism} value={execution.executionRealismScore} />
        <ScoreBar label="Recovery Efficiency" weight={MMC_SCORE_WEIGHTS.recoveryEfficiency} value={research.recoveryEfficiency} />

        <div className="pt-2 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            MMC Composite Score weighs risk-adjusted returns (25%), drawdown control (20%), consistency (15%),
            out-of-sample stability (15%), regime robustness (10%), execution realism (10%), and recovery efficiency (5%).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
