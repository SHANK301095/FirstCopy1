/**
 * StrategyProfileHeader — Detailed header for strategy profile page
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Calendar, Clock } from 'lucide-react';
import { StrategyTagBadge } from './StrategyTagBadge';
import { StrategyScoreBadge } from './StrategyScoreBadge';
import { STRATEGY_TYPE_LABELS, type StrategyIntelligence } from '@/types/strategyIntelligence';
import { cn } from '@/lib/utils';

interface StrategyProfileHeaderProps {
  strategy: StrategyIntelligence;
  onBack: () => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  paused: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  deprecated: 'bg-red-500/15 text-red-400 border-red-500/30',
  experimental: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
};

const readinessColors: Record<string, string> = {
  ready: 'text-emerald-400',
  needs_review: 'text-amber-400',
  not_ready: 'text-red-400',
};

export function StrategyProfileHeader({ strategy, onBack }: StrategyProfileHeaderProps) {
  const { identity, research, tags } = strategy;

  return (
    <Card variant="glass">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          {/* Back + Title row */}
          <div className="flex items-start gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0 mt-0.5" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{identity.name}</h1>
                <Badge className={cn('text-[10px]', statusColors[identity.status])}>{identity.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{STRATEGY_TYPE_LABELS[identity.type]} · {identity.id}</p>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{identity.description}</p>
            </div>
            <StrategyScoreBadge score={research.mmcCompositeScore} size="lg" className="shrink-0" />
          </div>

          {/* Tags + Meta */}
          <div className="flex flex-wrap items-center gap-2">
            {tags.map(t => <StrategyTagBadge key={t} tag={t} size="md" />)}
            <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(strategy.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated {new Date(strategy.lastUpdated).toLocaleDateString()}
              </span>
              <span className={cn('flex items-center gap-1 font-medium capitalize', readinessColors[strategy.deploymentReadiness])}>
                <Shield className="h-3 w-3" />
                {strategy.deploymentReadiness.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
