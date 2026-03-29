/**
 * Strategy Auto-Selection Engine — Production-grade selection with
 * evidence linking, correlation conflict detection, and DB persistence
 */
import { supabase } from '@/integrations/supabase/client';
import type { StrategyIntelligence } from '@/types/strategyIntelligence';
import type { RegimeSnapshot } from '@/types/quant';

// ═══════ Configuration ═══════

export const SELECTION_THRESHOLDS = {
  mmcScore: 55,
  maxDrawdown: 20,
  walkForwardStability: 50,
  executionRealism: 45,
  minBacktestCount: 3,
  minSharpe: 0.5,
  maxCorrelation: 0.7,
};

export const SELECTION_VERSION = '2.0.0';

// ═══════ Types ═══════

export interface SelectionDecision {
  strategy_id: string;
  strategy_name: string;
  decision: 'selected' | 'rejected';
  mmc_score: number;
  regime_fit_score: number;
  correlation_score: number;
  execution_realism_score: number;
  rank_at_time: number;
  selection_reasons: string[];
  rejection_reasons: string[];
  notes: string;
}

export interface SelectionRunResult {
  run_id?: string;
  decisions: SelectionDecision[];
  selected: SelectionDecision[];
  rejected: SelectionDecision[];
  total_candidates: number;
  active_regimes: string[];
  run_type: 'manual' | 'scheduled' | 'regime_change' | 'replacement';
  timestamp: string;
}

export interface ReplacementEvent {
  outgoing_strategy_id: string;
  outgoing_strategy_name: string;
  incoming_strategy_id?: string;
  incoming_strategy_name?: string;
  trigger: 'degradation' | 'regime_change' | 'risk_breach' | 'manual' | 'kill_switch';
  reason: string;
  auto_approved: boolean;
}

// ═══════ Core Selection Logic ═══════

export function runSelectionEvaluation(
  strategies: StrategyIntelligence[],
  activeRegimes: string[],
  existingCorrelations?: Map<string, Map<string, number>>
): SelectionDecision[] {
  // Score and rank all strategies
  const scored = strategies.map(s => ({
    strategy: s,
    compositeScore: computeCompositeSelectionScore(s, activeRegimes),
  }));

  // Sort by composite score descending
  scored.sort((a, b) => b.compositeScore - a.compositeScore);

  const decisions: SelectionDecision[] = [];
  const selectedSymbols = new Map<string, number>(); // track per-symbol count
  const selectedIds = new Set<string>();

  scored.forEach((item, index) => {
    const s = item.strategy;
    const selectionReasons: string[] = [];
    const rejectionReasons: string[] = [];
    let rejected = false;

    // 1. MMC Score gate
    if (s.research.mmcCompositeScore >= SELECTION_THRESHOLDS.mmcScore) {
      selectionReasons.push(`MMC Score ${s.research.mmcCompositeScore} ≥ ${SELECTION_THRESHOLDS.mmcScore}`);
    } else {
      rejectionReasons.push(`MMC Score ${s.research.mmcCompositeScore} < ${SELECTION_THRESHOLDS.mmcScore} threshold`);
      rejected = true;
    }

    // 2. Drawdown gate
    if (s.performance.maxDrawdown <= SELECTION_THRESHOLDS.maxDrawdown) {
      selectionReasons.push(`Max DD ${s.performance.maxDrawdown}% within ${SELECTION_THRESHOLDS.maxDrawdown}% limit`);
    } else {
      rejectionReasons.push(`Max DD ${s.performance.maxDrawdown}% exceeds ${SELECTION_THRESHOLDS.maxDrawdown}% limit`);
      rejected = true;
    }

    // 3. Walk-Forward stability gate
    if (s.research.walkForwardStability >= SELECTION_THRESHOLDS.walkForwardStability) {
      selectionReasons.push(`WF Stability ${s.research.walkForwardStability} ≥ ${SELECTION_THRESHOLDS.walkForwardStability}`);
    } else {
      rejectionReasons.push(`WF Stability ${s.research.walkForwardStability} below ${SELECTION_THRESHOLDS.walkForwardStability} minimum`);
      rejected = true;
    }

    // 4. Execution realism gate
    if (s.execution.executionRealismScore >= SELECTION_THRESHOLDS.executionRealism) {
      selectionReasons.push(`Execution Realism ${s.execution.executionRealismScore} ≥ ${SELECTION_THRESHOLDS.executionRealism}`);
    } else {
      rejectionReasons.push(`Execution Realism ${s.execution.executionRealismScore} too low (< ${SELECTION_THRESHOLDS.executionRealism})`);
      rejected = true;
    }

    // 5. Research quality as evidence proxy (WF + OOS indicate sufficient validation)
    const evidenceScore = Math.round((s.research.walkForwardStability + s.research.outOfSamplePerformance) / 2);
    if (evidenceScore >= 40) {
      selectionReasons.push(`Evidence score ${evidenceScore} (WF+OOS avg) — sufficient validation`);
    } else {
      rejectionReasons.push(`Insufficient evidence: validation score ${evidenceScore} < 40`);
      rejected = true;
    }

    // 6. Sharpe check
    if (s.performance.sharpeRatio >= SELECTION_THRESHOLDS.minSharpe) {
      selectionReasons.push(`Sharpe ${s.performance.sharpeRatio} ≥ ${SELECTION_THRESHOLDS.minSharpe}`);
    } else {
      rejectionReasons.push(`Sharpe ${s.performance.sharpeRatio} below ${SELECTION_THRESHOLDS.minSharpe} minimum`);
      rejected = true;
    }

    // 7. Regime compatibility
    let regimeFitScore = 100;
    if (activeRegimes.length > 0) {
      const matchingRegimes = activeRegimes.filter(r =>
        s.compatibility.regimeSuitability.includes(r as any)
      );
      if (matchingRegimes.length > 0) {
        regimeFitScore = Math.round((matchingRegimes.length / activeRegimes.length) * 100);
        selectionReasons.push(`Regime compatible: ${matchingRegimes.join(', ')}`);
      } else {
        rejectionReasons.push(`Incompatible with active regimes: ${activeRegimes.join(', ')}`);
        regimeFitScore = 0;
        rejected = true;
      }
    }

    // 8. Per-symbol concentration (max 3 selected per symbol)
    const primarySymbol = s.compatibility.assets[0] || 'UNKNOWN';
    const symCount = selectedSymbols.get(primarySymbol) || 0;
    let correlationScore = 100;
    if (!rejected && symCount >= 3) {
      rejectionReasons.push(`Symbol concentration: already ${symCount} strategies on ${primarySymbol}`);
      correlationScore = 30;
      rejected = true;
    }

    // 9. Correlation conflict check
    if (!rejected && existingCorrelations && selectedIds.size > 0) {
      const stratCorrs = existingCorrelations.get(s.identity.id);
      if (stratCorrs) {
        for (const selId of selectedIds) {
          const corr = stratCorrs.get(selId) || 0;
          if (Math.abs(corr) > SELECTION_THRESHOLDS.maxCorrelation) {
            rejectionReasons.push(`High correlation (${corr.toFixed(2)}) with already-selected strategy`);
            correlationScore = Math.round((1 - Math.abs(corr)) * 100);
            rejected = true;
            break;
          }
        }
      }
    }

    if (!rejected) {
      selectedSymbols.set(primarySymbol, symCount + 1);
      selectedIds.add(s.identity.id);
    }

    decisions.push({
      strategy_id: s.identity.id,
      strategy_name: s.identity.name,
      decision: rejected ? 'rejected' : 'selected',
      mmc_score: s.research.mmcCompositeScore,
      regime_fit_score: regimeFitScore,
      correlation_score: correlationScore,
      execution_realism_score: s.execution.executionRealismScore,
      rank_at_time: index + 1,
      selection_reasons: selectionReasons,
      rejection_reasons: rejectionReasons,
      notes: rejected
        ? `Rejected: ${rejectionReasons[0]}`
        : `Rank #${index + 1} — passes all gates`,
    });
  });

  return decisions;
}

function computeCompositeSelectionScore(s: StrategyIntelligence, activeRegimes: string[]): number {
  let score = 0;
  score += s.research.mmcCompositeScore * 0.30;
  score += Math.max(0, 100 - s.performance.maxDrawdown * 5) * 0.20;
  score += s.research.walkForwardStability * 0.15;
  score += s.execution.executionRealismScore * 0.10;
  score += Math.min(s.performance.sharpeRatio * 20, 100) * 0.15;
  // Regime bonus
  if (activeRegimes.length > 0) {
    const regimeMatch = activeRegimes.some(r =>
      s.compatibility.regimeSuitability.includes(r as any)
    );
    score += (regimeMatch ? 100 : 0) * 0.10;
  } else {
    score += 80 * 0.10; // neutral when no regime data
  }
  return Math.round(score * 100) / 100;
}

// ═══════ Replacement Detection ═══════

export function detectReplacements(
  previousSelected: SelectionDecision[],
  currentSelected: SelectionDecision[]
): ReplacementEvent[] {
  const prevIds = new Set(previousSelected.map(d => d.strategy_id));
  const currIds = new Set(currentSelected.map(d => d.strategy_id));
  const events: ReplacementEvent[] = [];

  // Strategies that were selected before but not now
  for (const prev of previousSelected) {
    if (!currIds.has(prev.strategy_id)) {
      // Find replacement candidate (highest-ranked new entry)
      const incoming = currentSelected.find(c => !prevIds.has(c.strategy_id));
      events.push({
        outgoing_strategy_id: prev.strategy_id,
        outgoing_strategy_name: prev.strategy_name,
        incoming_strategy_id: incoming?.strategy_id,
        incoming_strategy_name: incoming?.strategy_name,
        trigger: 'degradation',
        reason: `${prev.strategy_name} no longer meets selection criteria`,
        auto_approved: false,
      });
    }
  }

  return events;
}

// ═══════ DB Persistence ═══════

export async function persistSelectionRun(
  userId: string,
  portfolioId: string | null,
  runType: SelectionRunResult['run_type'],
  decisions: SelectionDecision[],
  inputPayload?: Record<string, unknown>
): Promise<{ runId?: string; error?: string }> {
  const selected = decisions.filter(d => d.decision === 'selected');
  const rejected = decisions.filter(d => d.decision === 'rejected');

  // 1. Create run record
  const { data: run, error: runErr } = await supabase
    .from('strategy_selection_runs')
    .insert({
      created_by: userId,
      portfolio_id: portfolioId,
      run_type: runType,
      status: 'completed',
      selection_version: SELECTION_VERSION,
      total_candidates: decisions.length,
      selected_count: selected.length,
      rejected_count: rejected.length,
      input_payload: inputPayload as any,
      filters_payload: SELECTION_THRESHOLDS as any,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (runErr || !run) return { error: runErr?.message || 'Failed to create selection run' };

  // 2. Persist individual decisions
  const decisionRows = decisions.map(d => ({
    selection_run_id: run.id,
    strategy_id: d.strategy_id,
    decision: d.decision,
    mmc_score: d.mmc_score,
    regime_fit_score: d.regime_fit_score,
    correlation_score: d.correlation_score,
    execution_realism_score: d.execution_realism_score,
    rank_at_time: d.rank_at_time,
    selection_reasons: d.selection_reasons as any,
    rejection_reasons: d.rejection_reasons as any,
    notes: d.notes,
  }));

  const { error: decErr } = await supabase
    .from('strategy_selection_decisions')
    .insert(decisionRows);

  if (decErr) return { runId: run.id, error: `Run saved but decisions failed: ${decErr.message}` };

  return { runId: run.id };
}

export async function persistReplacementEvent(
  userId: string,
  event: ReplacementEvent
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('strategy_replacement_events')
    .insert({
      old_strategy_id: event.outgoing_strategy_id,
      new_strategy_id: event.incoming_strategy_id || event.outgoing_strategy_id,
      portfolio_id: 'default',
      trigger_type: event.trigger,
      action_status: event.auto_approved ? 'approved' : 'pending',
      trigger_payload: { reason: event.reason } as any,
    });

  return { error: error?.message };
}

export async function fetchSelectionHistory(
  userId: string,
  limit = 10
): Promise<any[]> {
  const { data } = await supabase
    .from('strategy_selection_runs')
    .select('*, strategy_selection_decisions(*)')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(limit) as { data: any[] | null };
  return data || [];
}

export async function fetchReplacementFeed(
  _userId: string,
  limit = 20
): Promise<any[]> {
  const { data } = await supabase
    .from('strategy_replacement_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data as any[]) || [];
}
