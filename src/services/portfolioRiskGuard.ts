/**
 * Portfolio-Level Risk Guard — Extends riskEnforcementService with portfolio checks
 * Enforces concentration, correlation, drawdown-budget, and turnover limits
 */
import { supabase } from '@/integrations/supabase/client';
import type { PortfolioAllocation, PortfolioConstraints } from '@/types/quant';

export interface PortfolioRiskCheckResult {
  passed: boolean;
  breaches: PortfolioConstraintBreach[];
  timestamp: string;
}

export interface PortfolioConstraintBreach {
  constraint: string;
  current_value: number;
  limit_value: number;
  severity: 'warning' | 'violation';
  detail: string;
}

const DEFAULT_CONSTRAINTS: PortfolioConstraints = {
  max_per_strategy_pct: 12,
  max_per_symbol_pct: 25,
  max_per_family_pct: 35,
  max_concentration_pct: 40,
  max_correlation: 0.7,
  max_turnover_pct: 30,
  max_drawdown_budget_pct: 15,
};

/**
 * Run portfolio-level constraint checks against proposed allocations
 */
export function runPortfolioRiskCheck(
  allocations: PortfolioAllocation[],
  constraints: PortfolioConstraints = DEFAULT_CONSTRAINTS,
  previousAllocations?: PortfolioAllocation[]
): PortfolioRiskCheckResult {
  const breaches: PortfolioConstraintBreach[] = [];

  // 1. Per-strategy concentration
  for (const alloc of allocations) {
    if (alloc.weight_pct > constraints.max_per_strategy_pct) {
      breaches.push({
        constraint: 'max_per_strategy',
        current_value: alloc.weight_pct,
        limit_value: constraints.max_per_strategy_pct,
        severity: 'violation',
        detail: `${alloc.strategy_name} at ${alloc.weight_pct}% exceeds ${constraints.max_per_strategy_pct}% cap`,
      });
    }
  }

  // 2. Per-symbol concentration
  const symbolTotals = new Map<string, number>();
  for (const alloc of allocations) {
    symbolTotals.set(alloc.symbol, (symbolTotals.get(alloc.symbol) || 0) + alloc.weight_pct);
  }
  for (const [symbol, total] of symbolTotals) {
    if (total > constraints.max_per_symbol_pct) {
      breaches.push({
        constraint: 'max_per_symbol',
        current_value: total,
        limit_value: constraints.max_per_symbol_pct,
        severity: 'violation',
        detail: `Symbol ${symbol} total ${total}% exceeds ${constraints.max_per_symbol_pct}% cap`,
      });
    }
  }

  // 3. Top-N concentration (HHI-style)
  const sorted = [...allocations].sort((a, b) => b.weight_pct - a.weight_pct);
  const topWeight = sorted.slice(0, 2).reduce((s, a) => s + a.weight_pct, 0);
  if (topWeight > constraints.max_concentration_pct) {
    breaches.push({
      constraint: 'max_concentration',
      current_value: topWeight,
      limit_value: constraints.max_concentration_pct,
      severity: 'warning',
      detail: `Top-2 strategies hold ${topWeight}% — high concentration risk`,
    });
  }

  // 4. Correlation limit check
  for (const alloc of allocations) {
    if (alloc.correlation_with_portfolio > constraints.max_correlation) {
      breaches.push({
        constraint: 'max_correlation',
        current_value: alloc.correlation_with_portfolio,
        limit_value: constraints.max_correlation,
        severity: 'warning',
        detail: `${alloc.strategy_name} has ${(alloc.correlation_with_portfolio * 100).toFixed(0)}% correlation with portfolio`,
      });
    }
  }

  // 5. Portfolio drawdown budget
  const portfolioDD = allocations.reduce((s, a) => s + (a.weight_pct / 100) * a.expected_drawdown, 0);
  if (portfolioDD > constraints.max_drawdown_budget_pct) {
    breaches.push({
      constraint: 'max_drawdown_budget',
      current_value: portfolioDD,
      limit_value: constraints.max_drawdown_budget_pct,
      severity: 'violation',
      detail: `Expected portfolio DD ${portfolioDD.toFixed(1)}% exceeds ${constraints.max_drawdown_budget_pct}% budget`,
    });
  }

  // 6. Turnover check (if previous allocations exist)
  if (previousAllocations && previousAllocations.length > 0) {
    let turnover = 0;
    const allIds = new Set([
      ...allocations.map(a => a.strategy_id),
      ...previousAllocations.map(a => a.strategy_id),
    ]);
    for (const id of allIds) {
      const prev = previousAllocations.find(a => a.strategy_id === id)?.weight_pct || 0;
      const curr = allocations.find(a => a.strategy_id === id)?.weight_pct || 0;
      turnover += Math.abs(curr - prev);
    }
    turnover /= 2; // one-way turnover
    if (turnover > constraints.max_turnover_pct) {
      breaches.push({
        constraint: 'max_turnover',
        current_value: turnover,
        limit_value: constraints.max_turnover_pct,
        severity: 'warning',
        detail: `Rebalance turnover ${turnover.toFixed(1)}% exceeds ${constraints.max_turnover_pct}% limit`,
      });
    }
  }

  const hasViolation = breaches.some(b => b.severity === 'violation');

  return {
    passed: !hasViolation,
    breaches,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Persist portfolio constraint breach to DB for auditability
 */
export async function persistPortfolioBreaches(
  userId: string,
  portfolioId: string,
  breaches: PortfolioConstraintBreach[]
) {
  if (breaches.length === 0) return;

  const rows = breaches.map(b => ({
    portfolio_id: portfolioId,
    breach_type: b.constraint,
    current_value: b.current_value,
    threshold_value: b.limit_value,
    severity: b.severity,
    resolution_notes: b.detail,
  }));

  await supabase.from('portfolio_constraint_breaches').insert(rows);
}
