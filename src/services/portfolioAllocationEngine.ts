/**
 * Portfolio Allocation Engine — Production-grade allocation with
 * inverse-drawdown weighting, diversification gates, and constraint enforcement
 */
import { supabase } from '@/integrations/supabase/client';
import type { PortfolioAllocation, PortfolioConstraints, RebalanceRun } from '@/types/quant';

// ═══════ Configuration ═══════

const DEFAULT_CONSTRAINTS: PortfolioConstraints = {
  max_per_strategy_pct: 12,
  max_per_symbol_pct: 25,
  max_per_family_pct: 35,
  max_concentration_pct: 40,
  max_correlation: 0.7,
  max_turnover_pct: 30,
  max_drawdown_budget_pct: 15,
};

const DIVERSIFICATION_GATES = {
  max_strategies_per_symbol: 3,
  max_strategies_per_category: 4,
  max_correlated_pairs: 2, // max same-symbol highly-correlated strategies
};

// ═══════ Core Types ═══════

export interface StrategyCandidate {
  id: string;
  name: string;
  symbol: string;
  category: string;
  max_drawdown_pct: number;
  sharpe: number;
  expected_return_pct: number;
  correlation_vector?: number[]; // pairwise correlations with other candidates
  role?: 'champion' | 'challenger' | 'reserve';
  regime_compatible: boolean;
}

export interface AllocationResult {
  allocations: PortfolioAllocation[];
  rejected: Array<{ strategy_id: string; reason: string }>;
  total_weight: number;
  portfolio_expected_dd: number;
  portfolio_expected_return: number;
  diversification_score: number;
  warnings: string[];
}

// ═══════ Inverse-Drawdown Allocation ═══════

export function computeInverseDrawdownWeights(
  candidates: StrategyCandidate[],
  constraints: PortfolioConstraints = DEFAULT_CONSTRAINTS
): AllocationResult {
  const warnings: string[] = [];
  const rejected: Array<{ strategy_id: string; reason: string }> = [];

  // Step 1: Apply diversification gates
  const gated = applyDiversificationGates(candidates, rejected);

  // Step 2: Filter regime-incompatible
  const compatible = gated.filter(c => {
    if (!c.regime_compatible) {
      rejected.push({ strategy_id: c.id, reason: 'Incompatible with active market regime' });
      return false;
    }
    return true;
  });

  if (compatible.length === 0) {
    return {
      allocations: [], rejected, total_weight: 0,
      portfolio_expected_dd: 0, portfolio_expected_return: 0,
      diversification_score: 0, warnings: ['No eligible strategies after filtering'],
    };
  }

  // Step 3: Compute raw inverse-drawdown weights
  const invDD = compatible.map(c => {
    const dd = Math.max(c.max_drawdown_pct, 0.5); // floor at 0.5% to avoid infinity
    return 1 / dd;
  });
  const sumInvDD = invDD.reduce((a, b) => a + b, 0);
  let rawWeights = invDD.map(w => (w / sumInvDD) * 100);

  // Step 4: Apply per-strategy cap
  rawWeights = rawWeights.map(w => Math.min(w, constraints.max_per_strategy_pct));

  // Step 5: Apply per-symbol cap
  const symbolGroups = new Map<string, number[]>();
  compatible.forEach((c, i) => {
    const arr = symbolGroups.get(c.symbol) || [];
    arr.push(i);
    symbolGroups.set(c.symbol, arr);
  });
  for (const [symbol, indices] of symbolGroups) {
    const totalSymbolWeight = indices.reduce((s, i) => s + rawWeights[i], 0);
    if (totalSymbolWeight > constraints.max_per_symbol_pct) {
      const scale = constraints.max_per_symbol_pct / totalSymbolWeight;
      indices.forEach(i => { rawWeights[i] *= scale; });
      warnings.push(`Symbol ${symbol} capped at ${constraints.max_per_symbol_pct}%`);
    }
  }

  // Step 6: Renormalize to 100%
  const sumAfterCaps = rawWeights.reduce((a, b) => a + b, 0);
  const normalizedWeights = rawWeights.map(w => (w / sumAfterCaps) * 100);

  // Step 7: Build allocations with role assignment
  const allocations: PortfolioAllocation[] = compatible.map((c, i) => ({
    strategy_id: c.id,
    strategy_name: c.name,
    weight_pct: Math.round(normalizedWeights[i] * 100) / 100,
    role: assignRole(normalizedWeights[i], i, compatible.length),
    symbol: c.symbol,
    expected_return: c.expected_return_pct,
    expected_drawdown: c.max_drawdown_pct,
    correlation_with_portfolio: c.correlation_vector ? avgCorrelation(c.correlation_vector) : 0,
  }));

  // Sort by weight desc
  allocations.sort((a, b) => b.weight_pct - a.weight_pct);

  const portfolioDD = allocations.reduce((s, a) => s + (a.weight_pct / 100) * a.expected_drawdown, 0);
  const portfolioReturn = allocations.reduce((s, a) => s + (a.weight_pct / 100) * a.expected_return, 0);

  // Diversification score: 1 - HHI (Herfindahl-Hirschman Index)
  const hhi = allocations.reduce((s, a) => s + Math.pow(a.weight_pct / 100, 2), 0);
  const diversificationScore = Math.round((1 - hhi) * 100);

  return {
    allocations,
    rejected,
    total_weight: Math.round(allocations.reduce((s, a) => s + a.weight_pct, 0) * 100) / 100,
    portfolio_expected_dd: Math.round(portfolioDD * 100) / 100,
    portfolio_expected_return: Math.round(portfolioReturn * 100) / 100,
    diversification_score: diversificationScore,
    warnings,
  };
}

// ═══════ Diversification Gates ═══════

function applyDiversificationGates(
  candidates: StrategyCandidate[],
  rejected: Array<{ strategy_id: string; reason: string }>
): StrategyCandidate[] {
  const symbolCount = new Map<string, number>();
  const categoryCount = new Map<string, number>();
  const passed: StrategyCandidate[] = [];

  // Sort by sharpe desc so best strategies pass the gates first
  const sorted = [...candidates].sort((a, b) => b.sharpe - a.sharpe);

  for (const c of sorted) {
    const symC = (symbolCount.get(c.symbol) || 0);
    const catC = (categoryCount.get(c.category) || 0);

    if (symC >= DIVERSIFICATION_GATES.max_strategies_per_symbol) {
      rejected.push({ strategy_id: c.id, reason: `Max ${DIVERSIFICATION_GATES.max_strategies_per_symbol} strategies per symbol (${c.symbol})` });
      continue;
    }
    if (catC >= DIVERSIFICATION_GATES.max_strategies_per_category) {
      rejected.push({ strategy_id: c.id, reason: `Max ${DIVERSIFICATION_GATES.max_strategies_per_category} strategies per category (${c.category})` });
      continue;
    }

    symbolCount.set(c.symbol, symC + 1);
    categoryCount.set(c.category, catC + 1);
    passed.push(c);
  }

  return passed;
}

// ═══════ Role Assignment ═══════

function assignRole(weightPct: number, index: number, total: number): 'champion' | 'challenger' | 'reserve' {
  if (weightPct >= 5 && index < Math.ceil(total * 0.6)) return 'champion';
  if (index < Math.ceil(total * 0.8)) return 'challenger';
  return 'reserve';
}

function avgCorrelation(vec: number[]): number {
  if (vec.length === 0) return 0;
  return vec.reduce((a, b) => a + b, 0) / vec.length;
}

// ═══════ Rebalance Diff ═══════

export function computeRebalanceDiff(
  before: PortfolioAllocation[],
  after: PortfolioAllocation[]
): RebalanceRun['diffs'] {
  const allIds = new Set([...before.map(a => a.strategy_id), ...after.map(a => a.strategy_id)]);
  const diffs: RebalanceRun['diffs'] = [];

  for (const id of allIds) {
    const fromPct = before.find(a => a.strategy_id === id)?.weight_pct || 0;
    const toPct = after.find(a => a.strategy_id === id)?.weight_pct || 0;
    let action: 'increase' | 'decrease' | 'add' | 'remove' | 'unchanged';

    if (fromPct === 0 && toPct > 0) action = 'add';
    else if (fromPct > 0 && toPct === 0) action = 'remove';
    else if (Math.abs(fromPct - toPct) < 0.5) action = 'unchanged';
    else action = toPct > fromPct ? 'increase' : 'decrease';

    diffs.push({ strategy_id: id, from_pct: fromPct, to_pct: toPct, action });
  }

  return diffs.filter(d => d.action !== 'unchanged');
}

// ═══════ Persistence ═══════

export async function persistRebalanceRun(
  userId: string,
  portfolioId: string,
  trigger: RebalanceRun['trigger'],
  before: PortfolioAllocation[],
  proposed: PortfolioAllocation[],
  diffs: RebalanceRun['diffs']
) {
  const { data, error } = await supabase
    .from('portfolio_rebalance_runs')
    .insert({
      portfolio_id: portfolioId,
      trigger_type: trigger,
      before_state: before as any,
      proposed_state: proposed as any,
      changes: diffs as any,
      status: 'proposed',
    })
    .select('id')
    .single();
  return { id: data?.id, error: error?.message };
}

export async function fetchRebalanceHistory(userId: string, portfolioId: string, limit = 20) {
  const { data } = await supabase
    .from('portfolio_rebalance_runs')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('created_at', { ascending: false })
    .limit(limit) as { data: any[] | null };
  return data || [];
}
