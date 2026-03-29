/**
 * Strategy Auto-Selection Engine — DB-persisted selection runs with
 * evidence linking, replacement feed, and historical drill-down
 */
import { useState } from 'react';
import {
  CheckCircle, XCircle, AlertTriangle, ArrowRightLeft, Shield,
  TrendingUp, Brain, RefreshCw, Activity, Clock, Play,
  ChevronDown, ChevronUp, Zap, History
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTitle } from '@/components/ui/PageTitle';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageErrorBoundary } from '@/components/error/PageErrorBoundary';
import { useAutoSelection } from '@/hooks/useAutoSelection';
import { SELECTION_THRESHOLDS, type SelectionDecision, type ReplacementEvent } from '@/services/strategyAutoSelectionEngine';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// ═══════ Decision Row ═══════

function DecisionRow({ d }: { d: SelectionDecision }) {
  const [expanded, setExpanded] = useState(false);
  const isSelected = d.decision === 'selected';
  return (
    <div className="p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isSelected
              ? <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              : <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
            <span className="text-sm font-medium truncate">{d.strategy_name}</span>
            <Badge variant="outline" className="text-[10px] shrink-0">Rank #{d.rank_at_time}</Badge>
            <Badge variant="outline" className="text-[10px] shrink-0">MMC {d.mmc_score}</Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono ml-6">
            <span>Regime Fit {d.regime_fit_score}%</span>
            <span>Corr {d.correlation_score}%</span>
            <span>Exec {d.execution_realism_score}</span>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </div>
      {expanded && (
        <div className="mt-2 ml-6 space-y-1 border-t border-border/30 pt-2">
          {isSelected && d.selection_reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs">
              <CheckCircle className="h-3 w-3 mt-0.5 text-emerald-400 shrink-0" />
              <span className="text-emerald-400">{r}</span>
            </div>
          ))}
          {d.rejection_reasons.map((r, i) => (
            <div key={`rej-${i}`} className="flex items-start gap-1.5 text-xs">
              <AlertTriangle className="h-3 w-3 mt-0.5 text-amber-400 shrink-0" />
              <span className="text-muted-foreground">{r}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════ Replacement Feed ═══════

function ReplacementFeedCard({ events }: { events: ReplacementEvent[] }) {
  if (events.length === 0) return null;
  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-amber-400" />
          Strategy Replacements Detected
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.map((evt, i) => (
          <div key={i} className="p-2 rounded border border-border/30 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">OUT</Badge>
              <span className="font-medium">{evt.outgoing_strategy_name}</span>
              {evt.incoming_strategy_name && (
                <>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">IN</Badge>
                  <span className="font-medium">{evt.incoming_strategy_name}</span>
                </>
              )}
            </div>
            <p className="text-muted-foreground">{evt.reason}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[9px]">{evt.trigger}</Badge>
              <Badge variant={evt.auto_approved ? 'default' : 'outline'} className="text-[9px]">
                {evt.auto_approved ? 'Auto-approved' : 'Pending approval'}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ═══════ History Panel ═══════

function HistoryPanel({ history }: { history: any[] }) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No selection runs yet. Run your first selection above.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {history.map((run: any) => (
        <div key={run.id} className="p-3 rounded-lg border border-border/40">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <History className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">{run.run_type}</span>
              <Badge variant="outline" className="text-[9px]">v{run.selection_version || '?'}</Badge>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
            </span>
          </div>
          <div className="flex gap-4 text-xs font-mono">
            <span className="text-emerald-400">{run.selected_count || 0} selected</span>
            <span className="text-red-400">{run.rejected_count || 0} rejected</span>
            <span className="text-muted-foreground">{run.total_candidates || 0} total</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════ Main Page ═══════

export default function StrategyAutoSelection() {
  const {
    strategies, activeRegimes, lastRun, replacements,
    history, running, loading, isEmpty, runSelection, refresh,
  } = useAutoSelection();

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageTitle title="Strategy Auto-Selection" subtitle="Loading strategy intelligence..." />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const selected = lastRun?.selected || [];
  const rejected = lastRun?.rejected || [];

  return (
    <PageErrorBoundary pageName="Strategy Auto-Selection">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <PageTitle
            title="Strategy Auto-Selection"
            subtitle="Evidence-linked selection engine — persisted decisions with full audit trail"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => runSelection('manual')}
              disabled={running || isEmpty}
              className="gap-2"
            >
              {running ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Run Selection
            </Button>
          </div>
        </div>

        {/* Active Regime Context */}
        {activeRegimes.length > 0 && (
          <Card className="border-border/50">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Active Regimes:</span>
                {activeRegimes.map(r => (
                  <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                ))}
                <span className="text-[10px] text-muted-foreground ml-auto">
                  Strategies incompatible with active regimes are auto-rejected
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Thresholds Reference */}
        <Card className="border-border/30">
          <CardContent className="py-2">
            <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span className="font-medium">Gates:</span>
              <span>MMC ≥ {SELECTION_THRESHOLDS.mmcScore}</span>
              <span>•</span>
              <span>DD ≤ {SELECTION_THRESHOLDS.maxDrawdown}%</span>
              <span>•</span>
              <span>WF ≥ {SELECTION_THRESHOLDS.walkForwardStability}</span>
              <span>•</span>
              <span>Exec ≥ {SELECTION_THRESHOLDS.executionRealism}</span>
              <span>•</span>
              <span>Sharpe ≥ {SELECTION_THRESHOLDS.minSharpe}</span>
              <span>•</span>
              <span>Corr &lt; {SELECTION_THRESHOLDS.maxCorrelation}</span>
            </div>
          </CardContent>
        </Card>

        {isEmpty ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-lg font-medium mb-1">No Strategy Intelligence Data</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Auto-selection requires strategy intelligence profiles backed by real backtest, walk-forward, and Monte Carlo evidence.
              </p>
            </CardContent>
          </Card>
        ) : !lastRun ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Zap className="h-12 w-12 mx-auto mb-4 text-primary opacity-40" />
              <p className="text-lg font-medium mb-1">Ready to Evaluate</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {strategies.length} strategies loaded. Click "Run Selection" to evaluate against thresholds, regime compatibility, and correlation gates.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Card className="bg-card border-border/50"><CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-emerald-400">{selected.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Selected</div>
              </CardContent></Card>
              <Card className="bg-card border-border/50"><CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-red-400">{rejected.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Rejected</div>
              </CardContent></Card>
              <Card className="bg-card border-border/50"><CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-foreground">{lastRun.total_candidates}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Evaluated</div>
              </CardContent></Card>
              <Card className="bg-card border-border/50"><CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-primary">
                  {lastRun.total_candidates > 0 ? Math.round((selected.length / lastRun.total_candidates) * 100) : 0}%
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Pass Rate</div>
              </CardContent></Card>
              <Card className="bg-card border-border/50"><CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-amber-400">{replacements.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Replacements</div>
              </CardContent></Card>
            </div>

            {/* Replacement Feed */}
            <ReplacementFeedCard events={replacements} />

            {/* Decisions */}
            <Tabs defaultValue="selected">
              <TabsList className="bg-muted/40">
                <TabsTrigger value="selected">Selected ({selected.length})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
                <TabsTrigger value="history">Run History</TabsTrigger>
              </TabsList>
              <TabsContent value="selected" className="mt-4 space-y-2">
                {selected.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No strategies meet all selection criteria</p>
                ) : selected.map(d => <DecisionRow key={d.strategy_id} d={d} />)}
              </TabsContent>
              <TabsContent value="rejected" className="mt-4 space-y-2">
                {rejected.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">All strategies passed selection criteria</p>
                ) : rejected.map(d => <DecisionRow key={d.strategy_id} d={d} />)}
              </TabsContent>
              <TabsContent value="history" className="mt-4">
                <HistoryPanel history={history} />
              </TabsContent>
            </Tabs>

            {/* Run metadata */}
            {lastRun.run_id && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Run ID: {lastRun.run_id.slice(0, 8)}...</span>
                <span>•</span>
                <span>Type: {lastRun.run_type}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(lastRun.timestamp), { addSuffix: true })}</span>
              </div>
            )}
          </>
        )}
      </div>
    </PageErrorBoundary>
  );
}
