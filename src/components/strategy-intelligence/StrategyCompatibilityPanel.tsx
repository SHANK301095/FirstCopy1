/**
 * StrategyCompatibilityPanel — Markets, regimes, sessions, execution characteristics
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MARKET_LABELS, REGIME_LABELS, SESSION_LABELS, type StrategyIntelligence, type SensitivityLevel } from '@/types/strategyIntelligence';
import { cn } from '@/lib/utils';
import { Globe, Clock, Activity, Zap, Newspaper, TrendingUp, Gauge } from 'lucide-react';

interface StrategyCompatibilityPanelProps {
  strategy: StrategyIntelligence;
}

const sensitivityColors: Record<SensitivityLevel, string> = {
  low: 'text-emerald-400 bg-emerald-500/15',
  medium: 'text-amber-400 bg-amber-500/15',
  high: 'text-orange-400 bg-orange-500/15',
  critical: 'text-red-400 bg-red-500/15',
};

function SensitivityBadge({ level }: { level: SensitivityLevel }) {
  return (
    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium capitalize', sensitivityColors[level])}>
      {level}
    </span>
  );
}

export function StrategyCompatibilityPanel({ strategy }: StrategyCompatibilityPanelProps) {
  const { compatibility, execution } = strategy;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Markets & Assets */}
      <Card variant="glass">
        <CardHeader className="pb-2 p-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> Market Compatibility
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">Markets</p>
            <div className="flex flex-wrap gap-1.5">
              {compatibility.markets.map(m => (
                <Badge key={m} variant="outline" className="text-xs">{MARKET_LABELS[m]}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">Assets</p>
            <div className="flex flex-wrap gap-1.5">
              {compatibility.assets.map(a => (
                <span key={a} className="text-[11px] px-2 py-0.5 rounded bg-muted text-foreground font-mono">{a}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">Timeframes</p>
            <div className="flex flex-wrap gap-1.5">
              {compatibility.timeframes.map(tf => (
                <span key={tf} className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">{tf}</span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regime & Session */}
      <Card variant="glass">
        <CardHeader className="pb-2 p-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Regime & Session
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">Regime Suitability</p>
            <div className="flex flex-wrap gap-1.5">
              {compatibility.regimeSuitability.map(r => (
                <Badge key={r} variant="secondary" className="text-xs capitalize">{REGIME_LABELS[r]}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">Session Dependency</p>
            <Badge variant="outline" className="text-xs">{SESSION_LABELS[compatibility.sessionDependency]}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Execution Characteristics */}
      <Card variant="glass" className="sm:col-span-2">
        <CardHeader className="pb-2 p-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Execution Characteristics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Activity className="h-3 w-3" /> Volatility
              </div>
              <SensitivityBadge level={execution.volatilitySensitivity} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Gauge className="h-3 w-3" /> Spread
              </div>
              <SensitivityBadge level={execution.spreadSensitivity} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Zap className="h-3 w-3" /> Slippage
              </div>
              <SensitivityBadge level={execution.slippageSensitivity} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Newspaper className="h-3 w-3" /> News
              </div>
              <SensitivityBadge level={execution.newsSensitivity} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" /> Realism Score
              </div>
              <span className={cn(
                'text-sm font-mono font-bold',
                execution.executionRealismScore > 70 ? 'text-emerald-400' : execution.executionRealismScore > 50 ? 'text-amber-400' : 'text-red-400'
              )}>
                {execution.executionRealismScore}/100
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
