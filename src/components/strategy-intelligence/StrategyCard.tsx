/**
 * StrategyCard — Professional strategy card for card-view
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, TrendingDown, Shield, Zap } from 'lucide-react';
import { StrategyTagBadge } from './StrategyTagBadge';
import { StrategyScoreBadge } from './StrategyScoreBadge';
import { STRATEGY_TYPE_LABELS, MARKET_LABELS, type StrategyIntelligence } from '@/types/strategyIntelligence';
import { cn } from '@/lib/utils';

interface StrategyCardProps {
  strategy: StrategyIntelligence;
  onOpen: (id: string) => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  paused: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  deprecated: 'bg-red-500/15 text-red-400 border-red-500/30',
  experimental: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
};

const readinessIcons: Record<string, typeof Shield> = {
  ready: Shield,
  needs_review: Zap,
  not_ready: TrendingDown,
};

export function StrategyCard({ strategy, onOpen }: StrategyCardProps) {
  const { identity, performance, research, compatibility, tags } = strategy;
  const ReadinessIcon = readinessIcons[strategy.deploymentReadiness] || Shield;

  return (
    <Card
      variant="interactive"
      className="group flex flex-col"
      onClick={() => onOpen(identity.id)}
    >
      <CardContent className="p-4 flex flex-col flex-1 gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate text-foreground">{identity.name}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {STRATEGY_TYPE_LABELS[identity.type]}
            </p>
          </div>
          <StrategyScoreBadge score={research.mmcCompositeScore} size="sm" showLabel={false} />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map(t => (
            <StrategyTagBadge key={t} tag={t} size="sm" />
          ))}
          <Badge className={cn('text-[10px]', statusColors[identity.status])}>
            {identity.status}
          </Badge>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mt-auto">
          <MetricRow label="Win Rate" value={`${performance.winRate}%`} positive={performance.winRate > 55} />
          <MetricRow label="Sharpe" value={performance.sharpeRatio.toFixed(2)} positive={performance.sharpeRatio > 1.5} />
          <MetricRow label="Max DD" value={`${performance.maxDrawdown}%`} positive={performance.maxDrawdown < 10} invert />
          <MetricRow label="Profit Factor" value={performance.profitFactor.toFixed(2)} positive={performance.profitFactor > 1.5} />
        </div>

        {/* Markets */}
        <div className="flex items-center gap-1 flex-wrap">
          {compatibility.markets.map(m => (
            <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {MARKET_LABELS[m]}
            </span>
          ))}
          {compatibility.regimeSuitability.slice(0, 1).map(r => (
            <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary capitalize">
              {r}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/20">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <ReadinessIcon className="h-3 w-3" />
            <span className="capitalize">{strategy.deploymentReadiness.replace('_', ' ')}</span>
          </div>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            Details <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value, positive, invert }: { label: string; value: string; positive: boolean; invert?: boolean }) {
  const color = invert
    ? (positive ? 'text-emerald-400' : 'text-red-400')
    : (positive ? 'text-emerald-400' : 'text-muted-foreground');
  return (
    <div className="flex items-center justify-between min-w-0">
      <span className="text-muted-foreground truncate">{label}</span>
      <span className={cn('font-mono font-medium tabular-nums', color)}>{value}</span>
    </div>
  );
}
