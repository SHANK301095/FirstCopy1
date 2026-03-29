/**
 * Rule-Based AI Suggestions Engine
 * Phase 6: Generates actionable suggestions based on backtest results
 * 100% offline - no external API calls
 */

import { type RiskMetrics } from './riskMetrics';

export interface AISuggestion {
  id: string;
  category: 'risk' | 'performance' | 'execution' | 'position_sizing' | 'regime' | 'correlation';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
  metrics?: Record<string, number>;
}

export interface SuggestionInput {
  metrics: RiskMetrics;
  tradeCount: number;
  netProfit: number;
  initialCapital: number;
  avgHoldingBars?: number;
  consecutiveLosses?: number;
  maxConsecutiveLosses?: number;
  tradingDays?: number;
  regimePerformance?: Record<string, { winRate: number; pf: number }>;
  correlationData?: { avgCorrelation: number; maxCorrelation: number };
}

// Rule definitions
interface Rule {
  id: string;
  category: AISuggestion['category'];
  condition: (input: SuggestionInput) => boolean;
  generate: (input: SuggestionInput) => Omit<AISuggestion, 'id' | 'category'>;
}

const rules: Rule[] = [
  // Risk Management Rules
  {
    id: 'high_drawdown',
    category: 'risk',
    condition: (input) => input.metrics.maxDrawdownPercent > 25,
    generate: (input) => ({
      severity: input.metrics.maxDrawdownPercent > 40 ? 'critical' : 'warning',
      title: 'High Maximum Drawdown',
      description: `Your strategy experienced a ${input.metrics.maxDrawdownPercent.toFixed(1)}% maximum drawdown, which exceeds the recommended 20-25% threshold for most traders.`,
      recommendation: 'Consider reducing position sizes, implementing tighter stop losses, or adding a maximum daily loss cap. A 50% drawdown requires a 100% gain to recover.',
      impact: 'high',
      metrics: { maxDrawdown: input.metrics.maxDrawdownPercent }
    })
  },
  {
    id: 'negative_sharpe',
    category: 'risk',
    condition: (input) => input.metrics.sharpeRatio < 0,
    generate: (input) => ({
      severity: 'critical',
      title: 'Negative Risk-Adjusted Returns',
      description: `Sharpe Ratio of ${input.metrics.sharpeRatio.toFixed(2)} indicates returns are worse than a risk-free investment.`,
      recommendation: 'Re-evaluate the entire strategy logic. Consider paper trading with modifications before risking real capital.',
      impact: 'high',
      metrics: { sharpeRatio: input.metrics.sharpeRatio }
    })
  },
  {
    id: 'low_sharpe',
    category: 'risk',
    condition: (input) => input.metrics.sharpeRatio > 0 && input.metrics.sharpeRatio < 1,
    generate: (input) => ({
      severity: 'warning',
      title: 'Below-Average Risk-Adjusted Returns',
      description: `Sharpe Ratio of ${input.metrics.sharpeRatio.toFixed(2)} is below the institutional benchmark of 1.0.`,
      recommendation: 'Look for ways to reduce volatility or increase returns. Consider filtering trades during high-volatility regimes.',
      impact: 'medium',
      metrics: { sharpeRatio: input.metrics.sharpeRatio }
    })
  },
  {
    id: 'high_var',
    category: 'risk',
    condition: (input) => input.metrics.var95 > 3,
    generate: (input) => ({
      severity: 'warning',
      title: 'High Value at Risk',
      description: `95% VaR of ${input.metrics.var95.toFixed(2)}% means you could lose this much on 1 in 20 trading days.`,
      recommendation: 'Consider reducing leverage or position sizes. Implement intraday risk controls.',
      impact: 'medium',
      metrics: { var95: input.metrics.var95, cvar95: input.metrics.cvar95 }
    })
  },
  {
    id: 'negative_skew',
    category: 'risk',
    condition: (input) => input.metrics.skewness < -0.5,
    generate: (input) => ({
      severity: 'warning',
      title: 'Negatively Skewed Returns',
      description: `Return distribution shows negative skew (${input.metrics.skewness.toFixed(2)}), indicating more frequent large losses than gains.`,
      recommendation: 'Review stop-loss placement. Consider asymmetric profit targets or trailing stops to capture larger gains.',
      impact: 'medium',
      metrics: { skewness: input.metrics.skewness }
    })
  },
  {
    id: 'high_kurtosis',
    category: 'risk',
    condition: (input) => input.metrics.kurtosis > 3,
    generate: (input) => ({
      severity: 'info',
      title: 'Fat-Tailed Return Distribution',
      description: `Excess kurtosis of ${input.metrics.kurtosis.toFixed(2)} indicates more extreme returns than a normal distribution.`,
      recommendation: 'Standard risk models may underestimate tail risk. Consider using CVaR instead of VaR for risk limits.',
      impact: 'low',
      metrics: { kurtosis: input.metrics.kurtosis }
    })
  },
  
  // Performance Rules
  {
    id: 'low_win_rate',
    category: 'performance',
    condition: (input) => input.metrics.winRate < 40 && input.metrics.payoffRatio < 2,
    generate: (input) => ({
      severity: 'warning',
      title: 'Low Win Rate Without Compensating Payoff',
      description: `Win rate of ${input.metrics.winRate.toFixed(1)}% with payoff ratio of only ${input.metrics.payoffRatio.toFixed(2)}x is challenging to profit from.`,
      recommendation: 'Either improve entry timing to boost win rate, or let winners run longer to increase payoff ratio. You need one or the other.',
      impact: 'high',
      metrics: { winRate: input.metrics.winRate, payoffRatio: input.metrics.payoffRatio }
    })
  },
  {
    id: 'low_profit_factor',
    category: 'performance',
    condition: (input) => input.tradeCount > 20 && input.netProfit > 0 && 
      (input.metrics.avgWin * input.metrics.winRate/100) / (input.metrics.avgLoss * (100-input.metrics.winRate)/100) < 1.3,
    generate: () => ({
      severity: 'warning',
      title: 'Thin Profit Margin',
      description: 'Profit factor below 1.3 leaves little room for slippage, commissions, or market changes.',
      recommendation: 'Add buffer by improving entry/exit timing. Real trading often sees 10-20% worse results than backtests.',
      impact: 'medium'
    })
  },
  {
    id: 'excellent_sharpe',
    category: 'performance',
    condition: (input) => input.metrics.sharpeRatio > 2,
    generate: (input) => ({
      severity: 'info',
      title: 'Excellent Risk-Adjusted Returns',
      description: `Sharpe Ratio of ${input.metrics.sharpeRatio.toFixed(2)} is exceptional. Verify this isn't due to overfitting.`,
      recommendation: 'Run walk-forward analysis to validate. Consider if transaction costs and slippage are realistic.',
      impact: 'low',
      metrics: { sharpeRatio: input.metrics.sharpeRatio }
    })
  },
  {
    id: 'high_omega',
    category: 'performance',
    condition: (input) => input.metrics.omegaRatio > 2,
    generate: (input) => ({
      severity: 'info',
      title: 'Strong Omega Ratio',
      description: `Omega ratio of ${input.metrics.omegaRatio.toFixed(2)} indicates gains significantly outweigh losses.`,
      recommendation: 'Good sign! Maintain current profit-taking and stop-loss levels.',
      impact: 'low',
      metrics: { omegaRatio: input.metrics.omegaRatio }
    })
  },
  
  // Position Sizing Rules
  {
    id: 'kelly_too_high',
    category: 'position_sizing',
    condition: (input) => input.metrics.kellyFraction > 0.25,
    generate: (input) => ({
      severity: 'warning',
      title: 'Kelly Suggests Aggressive Sizing',
      description: `Full Kelly fraction of ${(input.metrics.kellyFraction * 100).toFixed(1)}% is too aggressive for real trading.`,
      recommendation: 'Use fractional Kelly (25-50% of suggested) to account for estimation error and reduce volatility.',
      impact: 'medium',
      metrics: { kellyFraction: input.metrics.kellyFraction }
    })
  },
  {
    id: 'negative_kelly',
    category: 'position_sizing',
    condition: (input) => input.metrics.kellyFraction < 0,
    generate: (input) => ({
      severity: 'critical',
      title: 'Negative Edge Detected',
      description: `Kelly fraction of ${(input.metrics.kellyFraction * 100).toFixed(1)}% suggests no positive expectancy.`,
      recommendation: 'Do not trade this strategy with real money until the edge is fixed.',
      impact: 'high',
      metrics: { kellyFraction: input.metrics.kellyFraction }
    })
  },
  
  // Execution Rules
  {
    id: 'insufficient_trades',
    category: 'execution',
    condition: (input) => input.tradeCount < 30,
    generate: (input) => ({
      severity: 'warning',
      title: 'Insufficient Sample Size',
      description: `Only ${input.tradeCount} trades in backtest. Results may not be statistically significant.`,
      recommendation: 'Extend the backtest period or use more symbols. Aim for 100+ trades for reliable statistics.',
      impact: 'high',
      metrics: { tradeCount: input.tradeCount }
    })
  },
  {
    id: 'low_recovery_factor',
    category: 'execution',
    condition: (input) => input.metrics.recoveryFactor < 3 && input.netProfit > 0,
    generate: (input) => ({
      severity: 'info',
      title: 'Low Recovery Factor',
      description: `Recovery factor of ${input.metrics.recoveryFactor.toFixed(2)} means it takes longer to recover from drawdowns.`,
      recommendation: 'Look for ways to accelerate recovery - perhaps by scaling up after drawdowns resolve.',
      impact: 'low',
      metrics: { recoveryFactor: input.metrics.recoveryFactor }
    })
  },
  {
    id: 'high_ulcer_index',
    category: 'execution',
    condition: (input) => input.metrics.ulcerIndex > 10,
    generate: (input) => ({
      severity: 'warning',
      title: 'High Ulcer Index',
      description: `Ulcer Index of ${input.metrics.ulcerIndex.toFixed(2)} indicates prolonged painful drawdowns.`,
      recommendation: 'Consider time-based exits or regime filters to avoid extended underwater periods.',
      impact: 'medium',
      metrics: { ulcerIndex: input.metrics.ulcerIndex }
    })
  },
  
  // Regime-based Rules
  {
    id: 'regime_underperformance',
    category: 'regime',
    condition: (input) => {
      if (!input.regimePerformance) return false;
      return Object.values(input.regimePerformance).some(r => r.pf < 0.8);
    },
    generate: (input) => {
      const weakRegimes = Object.entries(input.regimePerformance || {})
        .filter(([_, r]) => r.pf < 0.8)
        .map(([name]) => name);
      return {
        severity: 'warning',
        title: 'Underperformance in Specific Regimes',
        description: `Strategy struggles during: ${weakRegimes.join(', ')}`,
        recommendation: 'Consider adding regime filters to avoid trading during unfavorable market conditions.',
        impact: 'high'
      };
    }
  },
  
  // Correlation Rules
  {
    id: 'high_correlation',
    category: 'correlation',
    condition: (input) => input.correlationData?.maxCorrelation !== undefined && input.correlationData.maxCorrelation > 0.8,
    generate: (input) => ({
      severity: 'warning',
      title: 'Highly Correlated Strategies/Symbols',
      description: `Maximum correlation of ${(input.correlationData!.maxCorrelation * 100).toFixed(0)}% indicates concentration risk.`,
      recommendation: 'Reduce allocation to correlated assets or treat them as a single position for risk purposes.',
      impact: 'medium',
      metrics: { maxCorrelation: input.correlationData!.maxCorrelation }
    })
  },
  {
    id: 'low_diversification',
    category: 'correlation',
    condition: (input) => input.correlationData?.avgCorrelation !== undefined && input.correlationData.avgCorrelation > 0.5,
    generate: (input) => ({
      severity: 'info',
      title: 'Limited Diversification Benefit',
      description: `Average correlation of ${(input.correlationData!.avgCorrelation * 100).toFixed(0)}% provides limited diversification.`,
      recommendation: 'Look for uncorrelated or negatively correlated strategies to add to the portfolio.',
      impact: 'low',
      metrics: { avgCorrelation: input.correlationData!.avgCorrelation }
    })
  }
];

// Generate suggestions based on input
export function generateSuggestions(input: SuggestionInput): AISuggestion[] {
  const suggestions: AISuggestion[] = [];
  
  for (const rule of rules) {
    try {
      if (rule.condition(input)) {
        const suggestion = rule.generate(input);
        suggestions.push({
          id: rule.id,
          category: rule.category,
          ...suggestion
        });
      }
    } catch {
      // Rule evaluation failed - skip this rule
    }
  }
  
  // Sort by severity (critical first) then impact
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const impactOrder = { high: 0, medium: 1, low: 2 };
  
  suggestions.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return impactOrder[a.impact] - impactOrder[b.impact];
  });
  
  return suggestions;
}

// Get category icon
export function getCategoryIcon(category: AISuggestion['category']): string {
  const icons: Record<AISuggestion['category'], string> = {
    risk: '⚠️',
    performance: '📈',
    execution: '⚡',
    position_sizing: '💰',
    regime: '🌡️',
    correlation: '🔗'
  };
  return icons[category];
}

// Get severity color class
export function getSeverityClass(severity: AISuggestion['severity']): string {
  const classes: Record<AISuggestion['severity'], string> = {
    critical: 'text-destructive border-destructive/50 bg-destructive/10',
    warning: 'text-warning border-warning/50 bg-warning/10',
    info: 'text-primary border-primary/50 bg-primary/10'
  };
  return classes[severity];
}
