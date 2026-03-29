/**
 * MT5 Desktop Module Types
 * Spec: Phase 2 - Windows Desktop MT5 EA Bulk Runner
 */

// ============= Queue Types =============

export type QueueItemStatus = 
  | 'queued' 
  | 'running' 
  | 'paused' 
  | 'canceled' 
  | 'done' 
  | 'error' 
  | 'reused';

export type FailPolicy = 'continue' | 'stop';

export type RunOrder = 'sequential' | 'name';

export interface QueueItem {
  id: string;
  eaId: string;
  eaName: string;
  presetId?: string;
  presetName?: string;
  status: QueueItemStatus;
  progress: number;
  workerId?: string;
  startedAt?: number;
  endedAt?: number;
  error?: string;
  resultId?: string;
  cacheHash?: string;
  reusedFromId?: string;
}

export interface BulkRunConfig {
  id: string;
  name: string;
  eaIds: string[];
  presetIds?: Record<string, string[]>; // eaId -> presetIds
  batchSize: 10 | 20 | 50;
  concurrency: 1 | 2 | 3 | 4;
  runOrder: RunOrder;
  failPolicy: FailPolicy;
  testerConfig: Partial<TesterConfigBase>;
  createdAt: number;
}

export interface TesterConfigBase {
  symbol: string;
  period: string;
  fromDate: string;
  toDate: string;
  deposit: number;
  leverage: number;
  model: 'EveryTick' | 'OHLC1Minute' | 'OpenPrices' | 'MathCalculations';
  spread: number;
  commission: number;
  slippage: number;
}

export interface QueueState {
  mode: 'single' | 'bulk';
  bulkConfig?: BulkRunConfig;
  items: QueueItem[];
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentPage: number;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  reusedItems: number;
  startedAt?: number;
  pausedAt?: number;
  completedAt?: number;
  lastCheckpoint?: QueueCheckpoint;
}

export interface QueueCheckpoint {
  timestamp: number;
  completedIds: string[];
  currentItemId?: string;
  currentItemProgress: number;
  workerStates: Record<string, string>; // workerId -> itemId
}

// ============= Cache Types =============

export interface CacheEntry {
  hash: string;
  runId: string;
  eaId: string;
  eaVersion: string;
  presetParams: Record<string, unknown>;
  testerConfig: TesterConfigBase;
  resultId: string;
  createdAt: number;
}

export interface CacheHashInputs {
  eaVersion: string;
  presetParams: Record<string, unknown>;
  symbol: string;
  period: string;
  fromDate: string;
  toDate: string;
  deposit: number;
  leverage: number;
  model: string;
  spread: number;
  commission: number;
  slippage: number;
}

// ============= Excel Types =============

export interface ExcelOverviewRow {
  rank: number;
  eaName: string;
  presetName: string;
  netProfit: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  profitFactor: number;
  sharpeRatio: number;
  totalTrades: number;
  winRate: number;
  status: 'PASS' | 'FAIL' | 'REUSED';
  errorText?: string;
  duration: number;
  timestamp: number;
}

export interface ExcelRankingRow {
  rank: number;
  eaName: string;
  presetName: string;
  value: number;
  category: string;
}

export interface ExcelTradeRow {
  ticket: number;
  openTime: string;
  closeTime: string;
  type: string;
  lots: number;
  symbol: string;
  openPrice: number;
  closePrice: number;
  profit: number;
  commission: number;
  swap: number;
  reason: string;
}

// ============= Settings Types =============

export interface DesktopSettings {
  mt5Paths: {
    metaeditor: string;
    terminal: string;
    dataFolder: string;
    autoDetect: boolean;
  };
  workers: {
    count: number;
    baseDir: string;
  };
  exports: {
    folder: string;
    includeDataQuality: boolean;
    includeSettings: boolean;
  };
  performance: {
    mode: 'fast' | 'accurate';
    cacheEnabled: boolean;
    cacheMaxAge: number; // days
  };
  backup: {
    enabled: boolean;
    schedule: 'daily' | 'weekly';
    keepCount: number;
    folder: string;
  };
  defaults: {
    batchSize: 10 | 20 | 50;
    concurrency: 1 | 2 | 3 | 4;
    failPolicy: FailPolicy;
    symbol: string;
    period: string;
    deposit: number;
    leverage: number;
    model: string;
  };
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export const DEFAULT_DESKTOP_SETTINGS: DesktopSettings = {
  mt5Paths: {
    metaeditor: '',
    terminal: '',
    dataFolder: '',
    autoDetect: true,
  },
  workers: {
    count: 2,
    baseDir: '',
  },
  exports: {
    folder: '',
    includeDataQuality: true,
    includeSettings: true,
  },
  performance: {
    mode: 'fast',
    cacheEnabled: true,
    cacheMaxAge: 30,
  },
  backup: {
    enabled: true,
    schedule: 'daily',
    keepCount: 7,
    folder: '',
  },
  defaults: {
    batchSize: 20,
    concurrency: 2,
    failPolicy: 'continue',
    symbol: 'EURUSD',
    period: 'H1',
    deposit: 10000,
    leverage: 100,
    model: 'EveryTick',
  },
  logLevel: 'info',
};
