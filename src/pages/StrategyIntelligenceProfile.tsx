/**
 * Strategy Intelligence Profile — Detailed strategy research profile page
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, FileText, Rocket } from 'lucide-react';
import { StrategyProfileHeader } from '@/components/strategy-intelligence/StrategyProfileHeader';
import { StrategyMetricStrip } from '@/components/strategy-intelligence/StrategyMetricStrip';
import { StrategyResearchCharts } from '@/components/strategy-intelligence/StrategyResearchCharts';
import { StrategyCompatibilityPanel } from '@/components/strategy-intelligence/StrategyCompatibilityPanel';
import { StrategyScoreBreakdown } from '@/components/strategy-intelligence/StrategyScoreBreakdown';
import { generateStrategyIntelligenceData } from '@/lib/strategyIntelligenceData';
import { PageErrorBoundary } from '@/components/error/PageErrorBoundary';
import { cn } from '@/lib/utils';

// In production, fetch from backend. For now, use generated data.
const ALL_STRATEGIES = generateStrategyIntelligenceData();

const readinessConfig: Record<string, { label: string; color: string; desc: string }> = {
  ready: { label: 'Ready for Deployment', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30', desc: 'This strategy has passed all validation gates and is cleared for live deployment.' },
  needs_review: { label: 'Needs Review', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30', desc: 'Some metrics are borderline. Manual review recommended before deployment.' },
  not_ready: { label: 'Not Ready', color: 'text-red-400 bg-red-500/15 border-red-500/30', desc: 'Strategy does not meet minimum deployment criteria. Further optimization required.' },
};

function StrategyIntelligenceProfileContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const strategy = useMemo(() => ALL_STRATEGIES.find(s => s.identity.id === id), [id]);

  if (!strategy) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Strategy Not Found</h2>
        <p className="text-muted-foreground text-sm">The strategy you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }

  const readiness = readinessConfig[strategy.deploymentReadiness];

  return (
    <div className="space-y-4">
      {/* Header */}
      <StrategyProfileHeader strategy={strategy} onBack={() => navigate('/strategy-intelligence')} />

      {/* Metric Strip */}
      <StrategyMetricStrip performance={strategy.performance} research={strategy.research} />

      {/* Charts */}
      <StrategyResearchCharts charts={strategy.charts} />

      {/* Score Breakdown + Compatibility */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <StrategyScoreBreakdown strategy={strategy} />
        </div>
        <div className="lg:col-span-2">
          <StrategyCompatibilityPanel strategy={strategy} />
        </div>
      </div>

      {/* Risk Metrics */}
      <Card variant="glass">
        <CardHeader className="pb-2 p-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Risk & Research Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ResearchMetric label="Walk-Forward Stability" value={`${strategy.research.walkForwardStability}%`} positive={strategy.research.walkForwardStability > 70} />
            <ResearchMetric label="Out-of-Sample Perf" value={`${strategy.research.outOfSamplePerformance}%`} positive={strategy.research.outOfSamplePerformance > 65} />
            <ResearchMetric label="Parameter Robustness" value={`${strategy.research.parameterRobustness}%`} positive={strategy.research.parameterRobustness > 70} />
            <ResearchMetric label="Recovery Efficiency" value={`${strategy.research.recoveryEfficiency}%`} positive={strategy.research.recoveryEfficiency > 60} />
          </div>
        </CardContent>
      </Card>

      {/* Methodology */}
      <Card variant="glass">
        <CardHeader className="pb-2 p-4">
          <CardTitle className="text-sm">Methodology & Notes</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Methodology</p>
            <p className="text-sm text-foreground leading-relaxed">{strategy.methodology}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Research Notes</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{strategy.notes}</p>
          </div>
        </CardContent>
      </Card>

      {/* Deployment Readiness */}
      <Card variant="glass">
        <CardHeader className="pb-2 p-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" /> Deployment Readiness
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center gap-3">
            <Badge className={cn('text-xs', readiness.color)}>{readiness.label}</Badge>
            <p className="text-sm text-muted-foreground">{readiness.desc}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ResearchMetric({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={cn('text-lg font-mono font-bold tabular-nums', positive ? 'text-emerald-400' : 'text-amber-400')}>{value}</p>
    </div>
  );
}

export default function StrategyIntelligenceProfile() {
  return (
    <PageErrorBoundary pageName="Strategy Profile">
      <StrategyIntelligenceProfileContent />
    </PageErrorBoundary>
  );
}
