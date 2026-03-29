export interface Project {
  id: string;
  name: string;
  broker: string;
  timezone: string;
  defaultSymbols: string[];
  defaultTimeframes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EA {
  id: string;
  projectId: string;
  name: string;
  fileName?: string;
  version: string;
  strategyNotes: string;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  allowedSymbols: string[];
  magicNumber?: number;
  createdAt: string;
}

export interface BatchSettings {
  symbols: string[];
  timeframes: string[];
  spreadMode: 'current' | 'fixed';
  fixedSpread?: number;
  modelingMode: 'every_tick' | 'ohlc_1min' | 'open_prices';
  startDate: string;
  endDate: string;
  initialDeposit: number;
  leverage: number;
  optimizationMode: boolean;
  parameterRanges?: string;
  maxParallelTerminals: number;
  delayBetweenLaunches: number;
}

export interface Batch {
  id: string;
  projectId: string;
  name: string;
  eaIds: string[];
  settings: BatchSettings;
  status: 'pending' | 'ready' | 'running' | 'completed';
  createdAt: string;
  completedAt?: string;
}

export interface BacktestResult {
  id: string;
  batchId: string;
  eaId: string;
  jobId: string;
  symbol: string;
  timeframe: string;
  netProfit: number;
  profitFactor: number;
  expectedPayoff: number;
  absoluteDrawdown: number;
  relativeDrawdown: number;
  recoveryFactor: number;
  totalTrades: number;
  winRate: number;
  avgTrade: number;
  sharpeRatio?: number;
  equityCurve?: number[];
  drawdownCurve?: number[];
  monthlyReturns?: Record<string, number>;
  /** Indicates source of equity/drawdown curves: 'real_trades', 'summary_approximation', or 'unavailable' */
  curveSource?: 'real_trades' | 'summary_approximation' | 'unavailable';
  importedAt: string;
}

export interface Job {
  id: string;
  batchId: string;
  eaId: string;
  symbol: string;
  timeframe: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  resultId?: string;
}

export type RankingPreset = 'low_dd' | 'high_pf' | 'consistent' | 'aggressive';

export interface LeaderboardFilter {
  symbol?: string;
  timeframe?: string;
  dateRange?: { start: string; end: string };
  tags?: string[];
  rankingPreset?: RankingPreset;
}
