/**
 * Strategy Intelligence Types
 * Hedge-fund grade metadata schema for strategy research database
 */

// ── Identity ──
export interface StrategyIdentity {
  id: string;
  name: string;
  type: StrategyType;
  description: string;
  status: 'active' | 'paused' | 'deprecated' | 'experimental';
}

export type StrategyType =
  | 'trend_following'
  | 'mean_reversion'
  | 'breakout'
  | 'scalping'
  | 'grid'
  | 'martingale'
  | 'hedging'
  | 'momentum'
  | 'volatility'
  | 'statistical_arbitrage';

export const STRATEGY_TYPE_LABELS: Record<StrategyType, string> = {
  trend_following: 'Trend Following',
  mean_reversion: 'Mean Reversion',
  breakout: 'Breakout',
  scalping: 'Scalping',
  grid: 'Grid',
  martingale: 'Martingale',
  hedging: 'Hedging',
  momentum: 'Momentum',
  volatility: 'Volatility',
  statistical_arbitrage: 'Statistical Arbitrage',
};

// ── Compatibility ──
export interface StrategyCompatibility {
  markets: MarketType[];
  assets: string[];
  timeframes: string[];
  sessionDependency: SessionType;
  regimeSuitability: RegimeType[];
}

export type MarketType = 'forex' | 'indices' | 'commodities' | 'crypto' | 'stocks';
export type SessionType = 'any' | 'london' | 'newyork' | 'tokyo' | 'sydney' | 'overlap_only';
export type RegimeType = 'trending' | 'ranging' | 'volatile' | 'low_volatility' | 'choppy' | 'breakout';

export const MARKET_LABELS: Record<MarketType, string> = {
  forex: 'Forex',
  indices: 'Indices',
  commodities: 'Commodities',
  crypto: 'Crypto',
  stocks: 'Stocks',
};

export const SESSION_LABELS: Record<SessionType, string> = {
  any: 'Any Session',
  london: 'London',
  newyork: 'New York',
  tokyo: 'Tokyo',
  sydney: 'Sydney',
  overlap_only: 'Overlap Only',
};

export const REGIME_LABELS: Record<RegimeType, string> = {
  trending: 'Trending',
  ranging: 'Ranging',
  volatile: 'High Volatility',
  low_volatility: 'Low Volatility',
  choppy: 'Choppy',
  breakout: 'Breakout',
};

// ── Performance ──
export interface StrategyPerformance {
  winRate: number;
  profitFactor: number;
  expectancy: number;
  cagr: number;
  avgTradeDuration: string;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  ulcerIndex: number;
  consecutiveLossCount: number;
}

// ── Execution Characteristics ──
export interface StrategyExecution {
  volatilitySensitivity: SensitivityLevel;
  spreadSensitivity: SensitivityLevel;
  slippageSensitivity: SensitivityLevel;
  newsSensitivity: SensitivityLevel;
  executionRealismScore: number; // 0..100
}

export type SensitivityLevel = 'low' | 'medium' | 'high' | 'critical';

// ── Research Quality ──
export interface StrategyResearch {
  walkForwardStability: number; // 0..100
  outOfSamplePerformance: number; // 0..100
  parameterRobustness: number; // 0..100
  recoveryEfficiency: number; // 0..100
  mmcCompositeScore: number; // 0..100
}

// ── Tags ──
export type StrategyTag =
  | 'high_win_rate'
  | 'low_drawdown'
  | 'prop_safe'
  | 'trend_only'
  | 'range_only'
  | 'high_volatility'
  | 'low_volatility'
  | 'news_sensitive'
  | 'robust'
  | 'stable'
  | 'aggressive'
  | 'defensive';

export const TAG_CONFIG: Record<StrategyTag, { label: string; colorClass: string }> = {
  high_win_rate: { label: 'High Win Rate', colorClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  low_drawdown: { label: 'Low Drawdown', colorClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  prop_safe: { label: 'Prop Safe', colorClass: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  trend_only: { label: 'Trend Only', colorClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  range_only: { label: 'Range Only', colorClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  high_volatility: { label: 'High Volatility', colorClass: 'bg-red-500/15 text-red-400 border-red-500/30' },
  low_volatility: { label: 'Low Volatility', colorClass: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  news_sensitive: { label: 'News Sensitive', colorClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  robust: { label: 'Robust', colorClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  stable: { label: 'Stable', colorClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  aggressive: { label: 'Aggressive', colorClass: 'bg-red-500/15 text-red-400 border-red-500/30' },
  defensive: { label: 'Defensive', colorClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
};

// ── Equity / Chart Data ──
export interface StrategyChartData {
  equityCurve: { date: string; value: number }[];
  drawdownCurve: { date: string; value: number }[];
  monthlyReturns: { month: string; return: number }[];
  distributionBuckets: { range: string; count: number }[];
}

// ── Composite: Full Strategy Intelligence Record ──
export interface StrategyIntelligence {
  identity: StrategyIdentity;
  compatibility: StrategyCompatibility;
  performance: StrategyPerformance;
  execution: StrategyExecution;
  research: StrategyResearch;
  tags: StrategyTag[];
  charts: StrategyChartData;
  notes: string;
  methodology: string;
  deploymentReadiness: 'ready' | 'needs_review' | 'not_ready';
  lastUpdated: string;
  createdAt: string;
}

// ── Sort Options ──
export type StrategySortKey =
  | 'mmcScore'
  | 'winRate'
  | 'sharpe'
  | 'drawdown'
  | 'profitFactor'
  | 'cagr'
  | 'stability';

export const SORT_LABELS: Record<StrategySortKey, string> = {
  mmcScore: 'MMC Composite Score',
  winRate: 'Win Rate',
  sharpe: 'Sharpe Ratio',
  drawdown: 'Max Drawdown',
  profitFactor: 'Profit Factor',
  cagr: 'CAGR',
  stability: 'Walk-Forward Stability',
};

// ── MMC Composite Score Weights ──
export const MMC_SCORE_WEIGHTS = {
  riskAdjustedReturn: 0.25,
  drawdownControl: 0.20,
  consistency: 0.15,
  oosStability: 0.15,
  regimeRobustness: 0.10,
  executionRealism: 0.10,
  recoveryEfficiency: 0.05,
};
