/**
 * Dexie IndexedDB Schema with Migrations
 * Spec: Storage Layer - Dexie / IndexedDB with migrations
 * Tables: datasets, datasetChunks, strategies, strategyVersions, 
 *         backtestRuns, results, resultTrades, settings, logs
 */

import Dexie, { type Table } from 'dexie';
import LZString from 'lz-string';

// ============= Type Definitions =============

export interface Dataset {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  tz: string;
  rowCount: number;
  columnsMap: Record<string, string>; // csv column -> mapped column
  importMeta: {
    source: string;
    importedAt: number;
    fileSize?: number;
  };
  duplicatePolicy: 'keep-first' | 'keep-last';
  missingPolicy: 'allow' | 'fill' | 'drop';
  sessionFilter?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  stats: {
    firstTs: number;
    lastTs: number;
    gaps?: number;
    duplicates?: number;
  };
  chunks: number;
  createdAt: number;
  // Symbol folder fields
  rangeFromTs: number;
  rangeToTs: number;
  sourceName?: string; // e.g. "Merged: A + B" or original filename
  fingerprint?: string; // hash for deduplication
}

export interface DatasetChunk {
  id: string;
  datasetId: string;
  index: number;
  rows: number[][]; // [[ts, o, h, l, c, v], ...]
}

export interface Strategy {
  id: string;
  name: string;
  tags: string[];
  description?: string;
  createdAt: number;
  updatedAt: number;
  currentVersionId?: string;
}

export interface StrategyVersion {
  id: string;
  strategyId: string;
  version: number;
  description: string;
  inputsSchema: Record<string, InputSchema>;
  codeOrDSL: string;
  codeType: 'mql5' | 'yaml' | 'javascript';
  params: Record<string, unknown>;
  createdAt: number;
}

export interface InputSchema {
  type: 'number' | 'boolean' | 'string' | 'select';
  label: string;
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: unknown }>;
}

export interface BacktestRun {
  id: string;
  strategyVersionId: string;
  datasetId: string;
  config: BacktestConfig;
  status: 'queued' | 'running' | 'paused' | 'canceled' | 'done' | 'error';
  progress: {
    pct: number;
    step: string;
    lastTs?: number;
    barsProcessed?: number;
    totalBars?: number;
  };
  checkpoints: Array<{ ts: number; idx: number; state?: unknown }>;
  startedAt?: number;
  endedAt?: number;
  error?: string;
  createdAt: number;
}

export interface BacktestConfig {
  slippage: number;
  commission: number;
  spread: number;
  fillModel: 'instant' | 'realistic';
  positionSizing: {
    mode: 'fixed' | 'risk-percent';
    value: number;
  };
  riskControls: {
    dailyLossCap?: number;
    maxDrawdownStop?: number;
    cooldownBars?: number;
    maxTradesPerDay?: number;
  };
  dateRange?: { start: number; end: number };
}

export interface BacktestResult {
  id: string;
  runId: string;
  metrics: BacktestMetrics;
  equity: number[];
  drawdown: number[];
  tradeCount: number;
  summaryTable: Record<string, unknown>;
  createdAt: number;
}

export interface BacktestMetrics {
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  avgHoldBars: number;
  expectancy: number;
  cagr?: number;
  recoveryFactor?: number;
}

export interface ResultTrade {
  id: string;
  runId: string;
  page: number;
  trades: Trade[];
}

export interface Trade {
  id: string;
  entryTs: number;
  exitTs: number;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  pnlPct: number;
  commission: number;
  slippage: number;
  mae: number; // max adverse excursion
  mfe: number; // max favorable excursion
  holdBars: number;
  exitReason: string;
}

export interface AppSettings {
  id: 'app';
  slippage: number;
  commission: number;
  spread: number;
  fillModel: 'instant' | 'realistic';
  positionSizing: {
    mode: 'fixed' | 'risk-percent';
    value: number;
  };
  riskControls: {
    dailyLossCap?: number;
    maxDrawdownStop?: number;
    cooldownBars?: number;
    maxTradesPerDay?: number;
  };
  timezoneDefault: 'IST' | 'UTC' | 'Auto';
  currency: string;
  exportFolder?: string;
  storageInfo: {
    quota?: number;
    used?: number;
    lastChecked?: number;
  };
  uiPrefs: {
    basicMode: boolean;
    tableColumns: string[];
    showOnboarding: boolean;
    autoSaveResults: boolean;
  };
  assumptions: string[];
  lastUpdated: number;
}

export interface LogEntry {
  id?: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  meta?: Record<string, unknown>;
  ts: number;
}

// ============= NEW: Extended Schema for Feature Registry =============

export interface JournalEntry {
  id: string;
  date: number; // timestamp
  title: string;
  content: string; // Rich text HTML
  mood?: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  tags: string[];
  mistakeTags?: string[]; // FOMO, Revenge, Early Exit, etc.
  linkedTrades?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Snapshot {
  id: string;
  name: string;
  description?: string;
  type: 'analysis' | 'settings' | 'full';
  data: string; // JSON string of saved state
  createdAt: number;
}

export interface RulesEngineRule {
  id: string;
  name: string;
  condition: string; // JSON condition tree
  action: 'alert' | 'log' | 'highlight';
  enabled: boolean;
  priority: number;
  createdAt: number;
  updatedAt: number;
}

export interface VisualizationConfig {
  id: string;
  name: string;
  type: 'chart' | 'heatmap' | 'table' | 'custom';
  config: Record<string, unknown>;
  isDefault: boolean;
  createdAt: number;
}

export interface RecycleBinItem {
  id: string;
  itemType: 'strategy' | 'dataset' | 'result';
  itemId: string;
  itemData: string; // JSON string of the deleted item
  deletedAt: number;
  expiresAt: number; // Auto-delete after 30 days
}

export interface Checklist {
  id: string;
  name: string;
  type: 'pre-flight' | 'post-trade' | 'weekly-review';
  items: Array<{ id: string; label: string; required: boolean }>;
  createdAt: number;
}

export interface ChecklistCompletion {
  id: string;
  checklistId: string;
  completedItems: string[];
  date: number;
  notes?: string;
}

// ============= Dexie Database Class =============

class BacktestProDB extends Dexie {
  datasets!: Table<Dataset>;
  datasetChunks!: Table<DatasetChunk>;
  strategies!: Table<Strategy>;
  strategyVersions!: Table<StrategyVersion>;
  backtestRuns!: Table<BacktestRun>;
  results!: Table<BacktestResult>;
  resultTrades!: Table<ResultTrade>;
  settings!: Table<AppSettings>;
  logs!: Table<LogEntry>;

  constructor() {
    super('BacktestProDB');
    
    // Version 1: Initial schema
    this.version(1).stores({
      datasets: 'id, name, symbol, timeframe, createdAt',
      datasetChunks: 'id, datasetId, index',
      strategies: 'id, name, createdAt, updatedAt',
      strategyVersions: 'id, strategyId, version, createdAt',
      backtestRuns: 'id, strategyVersionId, datasetId, status, createdAt',
      results: 'id, runId, createdAt',
      resultTrades: 'id, runId, page',
      settings: 'id',
      logs: '++id, level, ts'
    });

    // Version 2: Add symbol folder indexes
    this.version(2).stores({
      datasets: 'id, name, symbol, timeframe, createdAt, [symbol+rangeFromTs], [symbol+rangeToTs]',
      datasetChunks: 'id, datasetId, index',
      strategies: 'id, name, createdAt, updatedAt',
      strategyVersions: 'id, strategyId, version, createdAt',
      backtestRuns: 'id, strategyVersionId, datasetId, status, createdAt',
      results: 'id, runId, createdAt',
      resultTrades: 'id, runId, page',
      settings: 'id',
      logs: '++id, level, ts'
    }).upgrade(tx => {
      // Migrate existing datasets to have rangeFromTs/rangeToTs
      return tx.table('datasets').toCollection().modify(dataset => {
        if (dataset.rangeFromTs === undefined) {
          dataset.rangeFromTs = dataset.stats?.firstTs || 0;
        }
        if (dataset.rangeToTs === undefined) {
          dataset.rangeToTs = dataset.stats?.lastTs || 0;
        }
        if (!dataset.sourceName) {
          dataset.sourceName = dataset.name;
        }
      });
    });

    // Future migrations go here:
    // this.version(2).stores({...}).upgrade(tx => {...});
  }

  // ============= Settings Singleton =============
  
  async getSettings(): Promise<AppSettings> {
    let settings = await this.settings.get('app');
    if (!settings) {
      settings = this.getDefaultSettings();
      await this.settings.put(settings);
    }
    return settings;
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<void> {
    const current = await this.getSettings();
    await this.settings.put({
      ...current,
      ...updates,
      id: 'app',
      lastUpdated: Date.now()
    });
  }

  getDefaultSettings(): AppSettings {
    return {
      id: 'app',
      slippage: 0.1,
      commission: 0.02,
      spread: 0,
      fillModel: 'instant',
      positionSizing: { mode: 'fixed', value: 1 },
      riskControls: {},
      timezoneDefault: 'IST',
      currency: 'INR',
      storageInfo: {},
      uiPrefs: {
        basicMode: false,
        tableColumns: ['entryTs', 'exitTs', 'direction', 'pnl', 'pnlPct'],
        showOnboarding: true,
        autoSaveResults: true
      },
      assumptions: [
        'Default chunk size: 100,000 rows',
        'Optimizer Top-N results: 20',
        'Checkpoint interval: 5,000 bars',
        'Default timezone: IST (India)',
        'PDF export uses embedded fonts'
      ],
      lastUpdated: Date.now()
    };
  }

  // ============= Logging =============

  async log(level: LogEntry['level'], message: string, meta?: Record<string, unknown>): Promise<void> {
    await this.logs.add({ level, message, meta, ts: Date.now() });
    // Keep only last 1000 logs
    const count = await this.logs.count();
    if (count > 1000) {
      const oldest = await this.logs.orderBy('ts').limit(count - 1000).toArray();
      await this.logs.bulkDelete(oldest.map(l => l.id!));
    }
  }

  // ============= Storage Info =============

  async updateStorageInfo(): Promise<{ quota: number; used: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const info = {
        quota: estimate.quota || 0,
        used: estimate.usage || 0,
        lastChecked: Date.now()
      };
      await this.updateSettings({ storageInfo: info });
      return { quota: info.quota, used: info.used };
    }
    return { quota: 0, used: 0 };
  }

  // ============= Export/Import =============

  async exportAll(options: { compress?: boolean } = {}): Promise<string> {
    const exportData: Record<string, unknown[]> = {
      datasets: await this.datasets.toArray(),
      datasetChunks: [],
      strategies: await this.strategies.toArray(),
      strategyVersions: await this.strategyVersions.toArray(),
      backtestRuns: await this.backtestRuns.toArray(),
      results: await this.results.toArray(),
      resultTrades: [],
      settings: await this.settings.toArray(),
      logs: await this.logs.toArray()
    };

    // Stream large tables with pagination
    const CHUNK_SIZE = 1000;
    
    // Export datasetChunks in pages
    let offset = 0;
    while (true) {
      const chunks = await this.datasetChunks.offset(offset).limit(CHUNK_SIZE).toArray();
      if (chunks.length === 0) break;
      exportData.datasetChunks.push(...chunks);
      offset += CHUNK_SIZE;
    }

    // Export resultTrades in pages
    offset = 0;
    while (true) {
      const trades = await this.resultTrades.offset(offset).limit(CHUNK_SIZE).toArray();
      if (trades.length === 0) break;
      exportData.resultTrades.push(...trades);
      offset += CHUNK_SIZE;
    }

    const wrapper = {
      appVersion: '1.0.0',
      schemaVersion: 2, // Must match DB version
      exportedAt: Date.now(),
      data: exportData
    };

    const jsonStr = JSON.stringify(wrapper);
    
    if (options.compress) {
      return LZString.compressToUTF16(jsonStr);
    }
    
    return jsonStr;
  }

  async importAll(
    data: string,
    options: { 
      mode: 'replace' | 'merge';
      compressed?: boolean;
    } = { mode: 'replace' }
  ): Promise<{
    success: boolean;
    counts: Record<string, number>;
    conflicts: string[];
    skipped: number;
  }> {
    let jsonStr = data;
    if (options.compressed) {
      const decompressed = LZString.decompressFromUTF16(data);
      if (!decompressed) {
        throw new Error('Failed to decompress backup data');
      }
      jsonStr = decompressed;
    }

    const wrapper = JSON.parse(jsonStr) as {
      appVersion: string;
      schemaVersion: number;
      exportedAt: number;
      data: Record<string, unknown[]>;
    };

    // Validate schema version
    if (wrapper.schemaVersion > 2) {
      throw new Error(`Unsupported schema version: ${wrapper.schemaVersion}`);
    }

    const counts: Record<string, number> = {};
    const conflicts: string[] = [];
    let skipped = 0;

    await this.transaction('rw', 
      [this.datasets, this.datasetChunks, this.strategies, this.strategyVersions,
       this.backtestRuns, this.results, this.resultTrades, this.settings, this.logs],
      async () => {
        if (options.mode === 'replace') {
          // Clear all tables including settings
          await Promise.all([
            this.datasets.clear(),
            this.datasetChunks.clear(),
            this.strategies.clear(),
            this.strategyVersions.clear(),
            this.backtestRuns.clear(),
            this.results.clear(),
            this.resultTrades.clear(),
            this.settings.clear(), // IMPORTANT: was missing
            this.logs.clear()
          ]);
        }

        // Import each table
        const tableMap: Record<string, Table<unknown>> = {
          datasets: this.datasets,
          datasetChunks: this.datasetChunks,
          strategies: this.strategies,
          strategyVersions: this.strategyVersions,
          backtestRuns: this.backtestRuns,
          results: this.results,
          resultTrades: this.resultTrades,
          settings: this.settings,
          logs: this.logs
        };

        for (const [tableName, records] of Object.entries(wrapper.data)) {
          if (!records || !Array.isArray(records)) continue;
          
          const table = tableMap[tableName];
          if (!table) continue;

          if (options.mode === 'merge') {
            // Check for conflicts
            for (const record of records) {
              const rec = record as { id?: string | number };
              if (rec.id) {
                const existing = await table.get(rec.id);
                if (existing) {
                  conflicts.push(`${tableName}:${rec.id}`);
                  skipped++;
                  continue;
                }
              }
              await table.put(record);
            }
          } else {
            await table.bulkPut(records);
          }
          
          counts[tableName] = records.length;
        }
      }
    );

    await this.log('info', 'Database import completed', { counts, mode: options.mode });

    return { success: true, counts, conflicts, skipped };
  }

  async previewImport(data: string, compressed?: boolean): Promise<Record<string, number>> {
    let jsonStr = data;
    if (compressed) {
      const decompressed = LZString.decompressFromUTF16(data);
      if (!decompressed) {
        throw new Error('Failed to decompress backup data');
      }
      jsonStr = decompressed;
    }

    const wrapper = JSON.parse(jsonStr) as {
      data: Record<string, unknown[]>;
    };

    const counts: Record<string, number> = {};
    for (const [tableName, records] of Object.entries(wrapper.data)) {
      if (Array.isArray(records)) {
        counts[tableName] = records.length;
      }
    }
    return counts;
  }

  // ============= Clear All Data =============

  async clearAll(): Promise<void> {
    await Promise.all([
      this.datasets.clear(),
      this.datasetChunks.clear(),
      this.strategies.clear(),
      this.strategyVersions.clear(),
      this.backtestRuns.clear(),
      this.results.clear(),
      this.resultTrades.clear(),
      this.logs.clear()
    ]);
    await this.settings.put(this.getDefaultSettings());
    await this.log('info', 'All data cleared');
  }
}

// Export singleton instance
export const db = new BacktestProDB();
