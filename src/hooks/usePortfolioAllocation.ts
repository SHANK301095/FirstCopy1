/**
 * Hook for portfolio allocation — connects UI to the allocation engine + risk guard
 */
import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStrategyIntelligence } from '@/hooks/useStrategyIntelligence';
import { useRegimeSnapshots } from '@/hooks/useRegimeSnapshots';
import {
  computeInverseDrawdownWeights,
  computeRebalanceDiff,
  persistRebalanceRun,
  type StrategyCandidate,
  type AllocationResult,
} from '@/services/portfolioAllocationEngine';
import {
  runPortfolioRiskCheck,
  persistPortfolioBreaches,
  type PortfolioRiskCheckResult,
} from '@/services/portfolioRiskGuard';
import { logQuantAudit } from '@/services/quantAuditService';
import type { PortfolioAllocation } from '@/types/quant';

export function usePortfolioAllocation() {
  const { user } = useAuth();
  const { strategies, loading: stratLoading } = useStrategyIntelligence();
  const { latestBySymbol: latestSnapshots, loading: regimeLoading } = useRegimeSnapshots();

  const [result, setResult] = useState<AllocationResult | null>(null);
  const [riskCheck, setRiskCheck] = useState<PortfolioRiskCheckResult | null>(null);
  const [previousAllocations, setPreviousAllocations] = useState<PortfolioAllocation[]>([]);
  const [computing, setComputing] = useState(false);

  // Derive active regimes from latest snapshots
  const activeRegimes = useMemo(() => {
    return latestSnapshots
      .filter(s => s.confidence >= 0.6)
      .map(s => s.regime);
  }, [latestSnapshots]);

  // Build candidates from strategy intelligence
  const candidates: StrategyCandidate[] = useMemo(() => {
    return strategies.map(s => ({
      id: s.identity.id,
      name: s.identity.name,
      symbol: s.compatibility.assets[0] || 'UNKNOWN',
      category: s.identity.type,
      max_drawdown_pct: s.performance.maxDrawdown,
      sharpe: s.performance.sharpeRatio,
      expected_return_pct: s.performance.cagr,
      regime_compatible: activeRegimes.length === 0 ||
        activeRegimes.some(r => s.compatibility.regimeSuitability.includes(r as any)),
    }));
  }, [strategies, activeRegimes]);

  const runAllocation = useCallback(async () => {
    if (!user || candidates.length === 0) return;
    setComputing(true);

    try {
      // Step 1: Compute allocations
      const allocationResult = computeInverseDrawdownWeights(candidates);
      setResult(allocationResult);

      // Step 2: Run portfolio risk check
      const riskResult = runPortfolioRiskCheck(
        allocationResult.allocations,
        undefined,
        previousAllocations
      );
      setRiskCheck(riskResult);

      // Step 3: Persist breaches if any
      if (riskResult.breaches.length > 0) {
        await persistPortfolioBreaches(user.id, 'default', riskResult.breaches);
      }

      // Step 4: If previous exists, persist rebalance run
      if (previousAllocations.length > 0) {
        const diffs = computeRebalanceDiff(previousAllocations, allocationResult.allocations);
        await persistRebalanceRun(user.id, 'default', 'manual', previousAllocations, allocationResult.allocations, diffs);
      }

      // Step 5: Audit log
      await logQuantAudit(
        user.id,
        'portfolio_allocation_computed',
        'portfolio',
        'default',
        `${allocationResult.allocations.length} strategies allocated, diversification ${allocationResult.diversification_score}%`,
        undefined,
        { allocations: allocationResult.allocations, risk_passed: riskResult.passed } as any
      );

      // Save current as previous for next rebalance
      setPreviousAllocations(allocationResult.allocations);
    } finally {
      setComputing(false);
    }
  }, [user, candidates, previousAllocations]);

  return {
    candidates,
    result,
    riskCheck,
    computing,
    loading: stratLoading || regimeLoading,
    activeRegimes,
    runAllocation,
  };
}
