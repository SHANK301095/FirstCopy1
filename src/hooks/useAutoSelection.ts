/**
 * Hook for strategy auto-selection — orchestrates selection runs,
 * persists decisions, and tracks replacement events
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStrategyIntelligence } from '@/hooks/useStrategyIntelligence';
import { useRegimeSnapshots } from '@/hooks/useRegimeSnapshots';
import {
  runSelectionEvaluation,
  detectReplacements,
  persistSelectionRun,
  persistReplacementEvent,
  fetchSelectionHistory,
  fetchReplacementFeed,
  type SelectionDecision,
  type SelectionRunResult,
  type ReplacementEvent,
} from '@/services/strategyAutoSelectionEngine';
import { logQuantAudit } from '@/services/quantAuditService';
import { toast } from 'sonner';

export function useAutoSelection() {
  const { user } = useAuth();
  const { strategies, loading: stratLoading, isEmpty, refresh: refreshStrategies } = useStrategyIntelligence();
  const { latestBySymbol, loading: regimeLoading } = useRegimeSnapshots();

  const [lastRun, setLastRun] = useState<SelectionRunResult | null>(null);
  const [previousSelected, setPreviousSelected] = useState<SelectionDecision[]>([]);
  const [replacements, setReplacements] = useState<ReplacementEvent[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [replacementFeed, setReplacementFeed] = useState<any[]>([]);
  const [running, setRunning] = useState(false);

  const activeRegimes = useMemo(() =>
    [...new Set(latestBySymbol.filter(s => s.confidence >= 0.6).map(s => s.regime))],
    [latestBySymbol]
  );

  // Load history on mount
  useEffect(() => {
    if (!user) return;
    fetchSelectionHistory(user.id, 10).then(setHistory);
    fetchReplacementFeed(user.id, 20).then(setReplacementFeed);
  }, [user]);

  const runSelection = useCallback(async (
    runType: SelectionRunResult['run_type'] = 'manual'
  ) => {
    if (!user || strategies.length === 0) return null;
    setRunning(true);

    try {
      // 1. Run evaluation
      const decisions = runSelectionEvaluation(strategies, activeRegimes);
      const selected = decisions.filter(d => d.decision === 'selected');
      const rejected = decisions.filter(d => d.decision === 'rejected');

      const result: SelectionRunResult = {
        decisions,
        selected,
        rejected,
        total_candidates: decisions.length,
        active_regimes: activeRegimes,
        run_type: runType,
        timestamp: new Date().toISOString(),
      };

      // 2. Detect replacements vs previous run
      const newReplacements = detectReplacements(previousSelected, selected);
      setReplacements(newReplacements);

      // 3. Persist to DB
      const { runId, error } = await persistSelectionRun(
        user.id,
        null,
        runType,
        decisions,
        { active_regimes: activeRegimes, thresholds_used: true }
      );

      if (runId) result.run_id = runId;
      if (error) {
        console.warn('[AutoSelection] Persistence warning:', error);
      }

      // 4. Persist replacement events
      for (const evt of newReplacements) {
        await persistReplacementEvent(user.id, evt);
      }

      // 5. Audit log
      await logQuantAudit(
        user.id,
        'auto_selection_run',
        'selection',
        runId || 'no-id',
        `${selected.length} selected, ${rejected.length} rejected from ${decisions.length} candidates`,
        undefined,
        { selected_count: selected.length, rejected_count: rejected.length, replacements: newReplacements.length } as any
      );

      setLastRun(result);
      setPreviousSelected(selected);

      // Refresh history
      fetchSelectionHistory(user.id, 10).then(setHistory);
      fetchReplacementFeed(user.id, 20).then(setReplacementFeed);

      toast.success(`Selection complete: ${selected.length} selected, ${rejected.length} rejected`);
      return result;
    } catch (err) {
      console.error('[AutoSelection] Error:', err);
      toast.error('Selection run failed');
      return null;
    } finally {
      setRunning(false);
    }
  }, [user, strategies, activeRegimes, previousSelected]);

  const refresh = useCallback(() => {
    refreshStrategies();
    if (user) {
      fetchSelectionHistory(user.id, 10).then(setHistory);
      fetchReplacementFeed(user.id, 20).then(setReplacementFeed);
    }
  }, [refreshStrategies, user]);

  return {
    strategies,
    activeRegimes,
    lastRun,
    replacements,
    history,
    replacementFeed,
    running,
    loading: stratLoading || regimeLoading,
    isEmpty,
    runSelection,
    refresh,
  };
}
