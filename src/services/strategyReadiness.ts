/**
 * Strategy Readiness State Machine
 * Derives readiness from actual evidence — no static labels
 */

export type ReadinessState = 
  | 'experimental'
  | 'research-ready'
  | 'paper-ready'
  | 'deployable'
  | 'review-required'
  | 'quarantined'
  | 'retired';

export interface ReadinessEvidence {
  backtestCount: number;
  avgSharpe: number;
  maxDrawdownPct: number;
  walkForwardPassed: boolean;
  walkForwardDegradation: number;
  monteCarloRuinPct: number;
  paperTradeDays: number;
  paperTradeCount: number;
  recentDegradation: boolean;
  quarantineFlag: boolean;
  retiredFlag: boolean;
}

export interface ReadinessResult {
  state: ReadinessState;
  reasons: string[];
  score: number; // 0-100
  blockers: string[];
  nextAction: string;
}

/**
 * Derive readiness state from evidence
 */
export function computeReadiness(evidence: ReadinessEvidence): ReadinessResult {
  const reasons: string[] = [];
  const blockers: string[] = [];

  // Hard overrides
  if (evidence.retiredFlag) {
    return { state: 'retired', reasons: ['Strategy marked as retired'], score: 0, blockers: [], nextAction: 'Archive or clone for new version' };
  }
  if (evidence.quarantineFlag) {
    return { state: 'quarantined', reasons: ['Strategy quarantined due to risk concerns'], score: 10, blockers: ['Quarantine must be lifted'], nextAction: 'Review and resolve quarantine reason' };
  }
  if (evidence.recentDegradation) {
    reasons.push('Recent performance degradation detected');
    return { state: 'review-required', reasons, score: 30, blockers: ['Performance review needed'], nextAction: 'Run fresh walk-forward analysis' };
  }

  // Experimental: < 3 backtests
  if (evidence.backtestCount < 3) {
    reasons.push(`Only ${evidence.backtestCount} backtests completed`);
    blockers.push('Run at least 3 backtests');
    return { state: 'experimental', reasons, score: 15, blockers, nextAction: 'Run more backtests with different configs' };
  }

  // Research-ready: ≥3 backtests, decent metrics, but no WF/MC/paper
  const hasGoodMetrics = evidence.avgSharpe >= 0.5 && evidence.maxDrawdownPct <= 25;
  if (!hasGoodMetrics) {
    reasons.push(`Sharpe ${evidence.avgSharpe.toFixed(2)}, DD ${evidence.maxDrawdownPct.toFixed(1)}%`);
    blockers.push('Improve Sharpe ≥0.5 and MaxDD ≤25%');
    return { state: 'experimental', reasons, score: 25, blockers, nextAction: 'Optimize parameters or refine strategy logic' };
  }

  if (!evidence.walkForwardPassed) {
    reasons.push('Walk-forward validation not passed');
    if (evidence.walkForwardDegradation > 0) {
      reasons.push(`Degradation ratio: ${(evidence.walkForwardDegradation * 100).toFixed(0)}%`);
    }
    blockers.push('Pass walk-forward analysis');
    return { state: 'research-ready', reasons, score: 45, blockers, nextAction: 'Run walk-forward analysis' };
  }

  if (evidence.monteCarloRuinPct > 10) {
    reasons.push(`Monte Carlo ruin probability: ${evidence.monteCarloRuinPct.toFixed(1)}%`);
    blockers.push('Reduce ruin probability below 10%');
    return { state: 'research-ready', reasons, score: 50, blockers, nextAction: 'Run Monte Carlo with more simulations or adjust risk' };
  }

  // Paper-ready: passed WF + MC, but not enough paper trading
  if (evidence.paperTradeDays < 5 || evidence.paperTradeCount < 20) {
    reasons.push(`Paper: ${evidence.paperTradeDays} days, ${evidence.paperTradeCount} trades`);
    blockers.push('Complete ≥5 days and ≥20 trades in paper mode');
    return { state: 'paper-ready', reasons, score: 70, blockers, nextAction: 'Run paper trading for validation' };
  }

  // Deployable
  reasons.push(`Sharpe ${evidence.avgSharpe.toFixed(2)}, MaxDD ${evidence.maxDrawdownPct.toFixed(1)}%`);
  reasons.push('Walk-forward passed, Monte Carlo acceptable');
  reasons.push(`Paper validated: ${evidence.paperTradeDays} days, ${evidence.paperTradeCount} trades`);

  const score = Math.min(100, Math.round(
    50 + evidence.avgSharpe * 10 + (25 - evidence.maxDrawdownPct) + (evidence.walkForwardDegradation > 0.7 ? 10 : 0)
  ));

  return { state: 'deployable', reasons, score, blockers: [], nextAction: 'Ready for live deployment' };
}

/**
 * Get display config for readiness state
 */
export function getReadinessDisplay(state: ReadinessState) {
  const map: Record<ReadinessState, { label: string; color: string; bgClass: string }> = {
    'experimental': { label: 'Experimental', color: 'text-slate-400', bgClass: 'bg-slate-500/10 border-slate-500/30' },
    'research-ready': { label: 'Research Ready', color: 'text-blue-400', bgClass: 'bg-blue-500/10 border-blue-500/30' },
    'paper-ready': { label: 'Paper Ready', color: 'text-purple-400', bgClass: 'bg-purple-500/10 border-purple-500/30' },
    'deployable': { label: 'Deployable', color: 'text-emerald-400', bgClass: 'bg-emerald-500/10 border-emerald-500/30' },
    'review-required': { label: 'Review Required', color: 'text-amber-400', bgClass: 'bg-amber-500/10 border-amber-500/30' },
    'quarantined': { label: 'Quarantined', color: 'text-red-400', bgClass: 'bg-red-500/10 border-red-500/30' },
    'retired': { label: 'Retired', color: 'text-gray-500', bgClass: 'bg-gray-500/10 border-gray-500/30' },
  };
  return map[state];
}
