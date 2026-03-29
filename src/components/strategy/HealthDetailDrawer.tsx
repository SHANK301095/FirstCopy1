/**
 * Health Detail Drawer — shows reasons, warnings, components breakdown
 */
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, Info, Shield, TrendingUp, BarChart2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HealthBadge } from './HealthBadge';
import type { StrategyHealthScore } from '@/hooks/useStrategyHealth';

interface HealthDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  health: StrategyHealthScore | null;
  strategyName?: string;
}

const COMPONENT_META = [
  { key: 'robustness', label: 'Robustness', icon: Shield, weight: '30%', desc: 'Kya strategy different time periods mein stable hai?' },
  { key: 'risk_quality', label: 'Risk Quality', icon: AlertTriangle, weight: '30%', desc: 'Drawdown aur loss streaks kitni severe hain?' },
  { key: 'consistency', label: 'Consistency', icon: TrendingUp, weight: '20%', desc: 'Monthly returns kitne smooth hain?' },
  { key: 'execution_reality', label: 'Execution Reality', icon: Zap, weight: '20%', desc: 'Kya assumptions realistic hain (fees, frequency)?' },
] as const;

export function HealthDetailDrawer({ open, onOpenChange, health, strategyName }: HealthDetailDrawerProps) {
  if (!health) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <BarChart2 className="h-5 w-5 text-primary" />
            Health Score — {strategyName || 'Strategy'}
          </SheetTitle>
          <SheetDescription className="sr-only">Strategy health breakdown</SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Overall Score */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50">
            <div>
              <p className="text-3xl font-bold">{health.score}</p>
              <p className="text-xs text-muted-foreground mt-0.5">out of 100</p>
            </div>
            <HealthBadge score={health.score} grade={health.grade} size="md" />
          </div>

          {/* Components Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Component Breakdown</h4>
            {COMPONENT_META.map(({ key, label, icon: Icon, weight, desc }) => {
              const value = health.components[key as keyof typeof health.components] ?? 0;
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {label}
                      <span className="text-muted-foreground/60">({weight})</span>
                    </span>
                    <span className={cn(
                      'font-bold',
                      value >= 70 ? 'text-profit' : value >= 50 ? 'text-warning' : 'text-destructive'
                    )}>
                      {value}
                    </span>
                  </div>
                  <Progress value={value} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground/60">{desc}</p>
                </div>
              );
            })}
          </div>

          {/* Reasons */}
          {health.reasons.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-profit flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Positives
              </h4>
              <ul className="space-y-1.5">
                {health.reasons.map((r, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-profit mt-0.5">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {health.warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-warning flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Risks
              </h4>
              <ul className="space-y-1.5">
                {health.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-warning mt-0.5">⚠</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Meta */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
            <Badge variant="outline" className="text-[10px]">
              <Info className="h-3 w-3 mr-1" />
              {health.sample_size} trades
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Source: {health.computed_from}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {new Date(health.last_computed_at).toLocaleDateString()}
            </Badge>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
