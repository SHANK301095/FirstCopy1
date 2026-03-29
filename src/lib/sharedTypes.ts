/**
 * Phase 8: Shared Types Module
 * Central type definitions used across the app
 * Avoids scattered/duplicated type declarations
 */

// ═══════ Common Identifiers ═══════
export type UUID = string;
export type Timestamp = number; // Unix ms
export type ISOString = string;

// ═══════ Trading Core ═══════
export type TradeSide = 'buy' | 'sell';
export type TradeStatus = 'open' | 'closed' | 'cancelled';
export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';
export type AssetClass = 'forex' | 'stocks' | 'crypto' | 'commodities' | 'indices' | 'options';

export interface OHLCV {
  ts: Timestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradeEntry {
  id: UUID;
  symbol: string;
  side: TradeSide;
  entryPrice: number;
  exitPrice?: number;
  entryTime: Timestamp;
  exitTime?: Timestamp;
  quantity: number;
  pnl: number;
  fees: number;
  netPnl: number;
  tags?: string[];
  grade?: TradeGrade;
}

// ═══════ Strategy ═══════
export type StrategyStatus = 'draft' | 'tested' | 'optimized' | 'live';

export interface StrategyMeta {
  id: UUID;
  name: string;
  description?: string;
  status: StrategyStatus;
  createdAt: ISOString;
  updatedAt: ISOString;
  tags: string[];
}

// ═══════ Grading ═══════
export type TradeGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface GradeDetails {
  entryTiming: number;    // 0-100
  riskReward: number;     // 0-100
  strategyMatch: number;  // 0-100
  sessionAlignment: number; // 0-100
  discipline: number;     // 0-100
  overall: TradeGrade;
}

// ═══════ Risk ═══════
export interface RiskLimits {
  maxDailyLossPct: number;
  maxPositions: number;
  maxLotSize: number;
  symbolWhitelist?: string[];
}

// ═══════ Broker ═══════
export type BrokerType = 'zerodha' | 'ibkr' | 'alpaca' | 'mt5' | 'deriv' | 'binance';
export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'expired';

// ═══════ Optimization ═══════
export type OptimizerAlgorithm = 'grid' | 'genetic' | 'bayesian' | 'pso';

export interface OptimizationResult {
  params: Record<string, number>;
  fitness: number;
  sharpe: number;
  maxDD: number;
  trades: number;
  profitFactor: number;
}

// ═══════ Results & Metrics ═══════
export interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdownPct: number;
  netPnl: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
}

// ═══════ UI State ═══════
export type ViewMode = 'grid' | 'list' | 'table';
export type SortDirection = 'asc' | 'desc';

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface FilterState {
  search: string;
  dateFrom?: ISOString;
  dateTo?: ISOString;
  tags?: string[];
  status?: string;
}

// ═══════ Feature Flags ═══════
export interface FeatureFlag {
  key: string;
  enabled: boolean;
  rolloutPct: number;
}
