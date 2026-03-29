# Local Data Model Documentation

## Overview

MMC uses Dexie.js (IndexedDB wrapper) for all local data persistence. This ensures 100% offline capability with no external network calls.

## Database Schema (Version 2)

### Core Tables

#### `datasets`
Stores imported trading data (OHLCV).
```typescript
{
  id: string;           // UUID
  name: string;         // User-friendly name
  symbol: string;       // e.g., "NIFTY", "BANKNIFTY"
  timeframe: string;    // e.g., "1H", "15M", "D"
  tz: string;           // Timezone
  rowCount: number;     // Total bars
  columnsMap: Record<string, string>; // Column mappings
  importMeta: { source, importedAt, fileSize };
  duplicatePolicy: 'keep-first' | 'keep-last';
  missingPolicy: 'allow' | 'fill' | 'drop';
  stats: { firstTs, lastTs, gaps, duplicates };
  chunks: number;       // Number of data chunks
  createdAt: number;    // Unix timestamp
}
```

#### `datasetChunks`
Stores actual OHLCV data in chunks for efficient loading.
```typescript
{
  id: string;
  datasetId: string;    // FK to datasets
  index: number;        // Chunk order
  rows: number[][];     // [[ts, o, h, l, c, v], ...]
}
```

#### `strategies`
Trading strategy metadata.
```typescript
{
  id: string;
  name: string;
  tags: string[];
  description?: string;
  createdAt: number;
  updatedAt: number;
  currentVersionId?: string;
}
```

#### `strategyVersions`
Version history for strategies.
```typescript
{
  id: string;
  strategyId: string;   // FK
  version: number;
  description: string;
  inputsSchema: Record<string, InputSchema>;
  codeOrDSL: string;
  codeType: 'mql5' | 'yaml' | 'javascript';
  params: Record<string, unknown>;
  createdAt: number;
}
```

#### `backtestRuns`
Backtest execution records.
```typescript
{
  id: string;
  strategyVersionId: string;
  datasetId: string;
  config: BacktestConfig;
  status: 'queued' | 'running' | 'paused' | 'canceled' | 'done' | 'error';
  progress: { pct, step, lastTs, barsProcessed, totalBars };
  checkpoints: Array<{ ts, idx, state }>;
  startedAt?: number;
  endedAt?: number;
  error?: string;
  createdAt: number;
}
```

#### `results`
Backtest result summaries.
```typescript
{
  id: string;
  runId: string;        // FK
  metrics: BacktestMetrics;
  equity: number[];
  drawdown: number[];
  tradeCount: number;
  summaryTable: Record<string, unknown>;
  createdAt: number;
}
```

#### `resultTrades`
Individual trade records (paginated).
```typescript
{
  id: string;
  runId: string;
  page: number;
  trades: Trade[];
}
```

#### `settings`
Application settings (singleton).
```typescript
{
  id: 'app';
  slippage: number;
  commission: number;
  spread: number;
  fillModel: 'instant' | 'realistic';
  positionSizing: { mode, value };
  riskControls: { dailyLossCap, maxDrawdownStop, ... };
  timezoneDefault: 'IST' | 'UTC' | 'Auto';
  currency: string;
  exportFolder?: string;
  storageInfo: { quota, used, lastChecked };
  uiPrefs: { basicMode, tableColumns, showOnboarding, autoSaveResults };
  assumptions: string[];
  lastUpdated: number;
}
```

#### `logs`
Application logs (auto-pruned to 1000).
```typescript
{
  id?: number;          // Auto-increment
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  meta?: Record<string, unknown>;
  ts: number;
}
```

### Extended Tables (v2)

#### `journalEntries`
Trade journal with rich text.
```typescript
{
  id: string;
  date: number;
  title: string;
  content: string;      // HTML
  mood?: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  tags: string[];
  mistakeTags?: string[];
  linkedTrades?: string[];
  createdAt: number;
  updatedAt: number;
}
```

#### `snapshots`
Analysis state snapshots.
```typescript
{
  id: string;
  name: string;
  description?: string;
  type: 'analysis' | 'settings' | 'full';
  data: string;         // JSON
  createdAt: number;
}
```

#### `recycleBin`
Soft-deleted items (30-day retention).
```typescript
{
  id: string;
  itemType: 'strategy' | 'dataset' | 'result';
  itemId: string;
  itemData: string;     // JSON backup
  deletedAt: number;
  expiresAt: number;
}
```

## Storage Utilities

### Export/Import
```typescript
// Full database export (optionally compressed)
const backup = await db.exportAll({ compress: true });

// Import with merge or replace
await db.importAll(backup, { mode: 'merge', compressed: true });
```

### Storage Info
```typescript
const { quota, used } = await db.updateStorageInfo();
// Returns bytes available and used
```

### Logging
```typescript
await db.log('info', 'Backtest completed', { runId: '...' });
// Auto-prunes to last 1000 entries
```

## Best Practices

1. **Chunked Data**: Large datasets are split into chunks for efficient loading
2. **Compression**: Use LZ-String for exports to reduce file size
3. **Migrations**: Schema changes use Dexie's version().upgrade() pattern
4. **Indexes**: Compound indexes on [symbol+rangeFromTs] for fast range queries
5. **Pagination**: ResultTrades are paginated (page field) for large trade lists

## Feature Flags

Feature availability is controlled via localStorage:
```typescript
import { isFeatureEnabled } from '@/lib/featureFlags';

if (isFeatureEnabled('monteCarloSimulation')) {
  // Show Monte Carlo UI
}
```
