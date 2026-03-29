/**
 * Merge Worker
 * Performs k-way merge of datasets in streaming fashion
 * Handles overlap policies: keep-first, keep-last, drop-duplicates
 */

import Dexie from 'dexie';
import { v4 as uuidv4 } from 'uuid';

// Lightweight DB access for worker
class WorkerDB extends Dexie {
  datasetChunks!: Dexie.Table<DatasetChunk>;
  datasets!: Dexie.Table<Dataset>;
  
  constructor() {
    super('BacktestProDB');
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
    });
  }
}

interface Dataset {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  rowCount: number;
  chunks: number;
  rangeFromTs: number;
  rangeToTs: number;
  [key: string]: unknown;
}

interface DatasetChunk {
  id: string;
  datasetId: string;
  index: number;
  rows: number[][]; // [[ts, o, h, l, c, v], ...]
}

interface MergeRequest {
  type: 'merge';
  datasetIds: string[];
  outputName: string;
  mergeMode: 'append' | 'stitch';
  overlapPolicy: 'keep-first' | 'keep-last' | 'drop-duplicates';
  gapPolicy: 'allow' | 'warn' | 'block';
  deleteSources: boolean;
  chunkSize: number;
}

function timeframeToMs(tf: string): number {
  const map: Record<string, number> = {
    'M1': 60_000,
    'M5': 300_000,
    'M15': 900_000,
    'M30': 1_800_000,
    'H1': 3_600_000,
    'H4': 14_400_000,
    'D1': 86_400_000,
    'W1': 604_800_000,
  };
  return map[tf] ?? 0;
}

interface MergeProgress {
  type: 'progress';
  pct: number;
  message: string;
}

interface MergeResult {
  type: 'result';
  success: boolean;
  datasetId?: string;
  error?: string;
  stats?: {
    totalRows: number;
    duplicatesRemoved: number;
    gaps: number;
    rangeFromTs: number;
    rangeToTs: number;
  };
}

// K-way merge using a min-heap based on timestamp
class MinHeap {
  private heap: { ts: number; row: number[]; sourceIdx: number }[] = [];
  
  push(item: { ts: number; row: number[]; sourceIdx: number }) {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }
  
  pop(): { ts: number; row: number[]; sourceIdx: number } | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0 && last) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }
  
  peek(): { ts: number; row: number[]; sourceIdx: number } | undefined {
    return this.heap[0];
  }
  
  get size(): number {
    return this.heap.length;
  }
  
  private bubbleUp(idx: number) {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.heap[parent].ts <= this.heap[idx].ts) break;
      [this.heap[parent], this.heap[idx]] = [this.heap[idx], this.heap[parent]];
      idx = parent;
    }
  }
  
  private bubbleDown(idx: number) {
    const len = this.heap.length;
    while (true) {
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      let smallest = idx;
      if (left < len && this.heap[left].ts < this.heap[smallest].ts) smallest = left;
      if (right < len && this.heap[right].ts < this.heap[smallest].ts) smallest = right;
      if (smallest === idx) break;
      [this.heap[smallest], this.heap[idx]] = [this.heap[idx], this.heap[smallest]];
      idx = smallest;
    }
  }
}

// Chunk iterator - reads chunks lazily
class ChunkIterator {
  private db: WorkerDB;
  private datasetId: string;
  private totalChunks: number;
  private currentChunkIdx = 0;
  private currentRowIdx = 0;
  private currentChunk: number[][] | null = null;
  private exhausted = false;
  
  constructor(db: WorkerDB, datasetId: string, totalChunks: number) {
    this.db = db;
    this.datasetId = datasetId;
    this.totalChunks = totalChunks;
  }
  
  async next(): Promise<number[] | null> {
    if (this.exhausted) return null;
    
    // Load chunk if needed
    if (!this.currentChunk || this.currentRowIdx >= this.currentChunk.length) {
      if (this.currentChunkIdx >= this.totalChunks) {
        this.exhausted = true;
        return null;
      }
      
      const chunk = await this.db.datasetChunks
        .where({ datasetId: this.datasetId, index: this.currentChunkIdx })
        .first();
      
      if (!chunk) {
        this.exhausted = true;
        return null;
      }
      
      this.currentChunk = chunk.rows;
      this.currentRowIdx = 0;
      this.currentChunkIdx++;
    }
    
    const row = this.currentChunk[this.currentRowIdx];
    this.currentRowIdx++;
    return row;
  }
}

const db = new WorkerDB();

async function performMerge(request: MergeRequest): Promise<void> {
  const { datasetIds, outputName, overlapPolicy, deleteSources, chunkSize } = request;
  
  try {
    // Load dataset metadata
    const datasets: Dataset[] = [];
    for (const id of datasetIds) {
      const ds = await db.datasets.get(id);
      if (!ds) throw new Error(`Dataset ${id} not found`);
      datasets.push(ds as Dataset);
    }
    
    // Validate: same symbol
    const symbols = new Set(datasets.map(d => d.symbol));
    if (symbols.size > 1) {
      self.postMessage({ type: 'result', success: false, error: 'Datasets must have the same symbol' } as MergeResult);
      return;
    }
    
    // Validate: same timeframe
    const timeframes = new Set(datasets.map(d => d.timeframe));
    if (timeframes.size > 1) {
      self.postMessage({ type: 'result', success: false, error: 'Datasets must have the same timeframe' } as MergeResult);
      return;
    }
    
    const symbol = datasets[0].symbol;
    const timeframe = datasets[0].timeframe;
    
    // Sort datasets by rangeFromTs for deterministic ordering
    datasets.sort((a, b) => a.rangeFromTs - b.rangeFromTs);
    
    // Initialize iterators
    const iterators: ChunkIterator[] = datasets.map(
      d => new ChunkIterator(db, d.id, d.chunks)
    );
    
    // Initialize min-heap with first row from each dataset
    const heap = new MinHeap();
    for (let i = 0; i < iterators.length; i++) {
      const row = await iterators[i].next();
      if (row) {
        heap.push({ ts: row[0], row, sourceIdx: i });
      }
    }
    
    // Calculate total rows for progress
    const totalRows = datasets.reduce((sum, d) => sum + d.rowCount, 0);
    let processedRows = 0;
    let outputRows = 0;
    let duplicatesRemoved = 0;
    let gapsDetected = 0;
    let prevTs: number | null = null;
    
    // Output storage
    const outputDatasetId = uuidv4();
    let currentOutputChunk: number[][] = [];
    let chunkIndex = 0;
    let lastTs: number | null = null;
    let rangeFromTs = 0;
    let rangeToTs = 0;
    
    // Process rows via k-way merge
    while (heap.size > 0) {
      const item = heap.pop()!;
      processedRows++;
      
      // Handle duplicates based on policy
      const isDuplicate = lastTs === item.ts;
      
      if (isDuplicate) {
        if (overlapPolicy === 'drop-duplicates') {
          duplicatesRemoved++;
          // Skip this row but still fetch next from source
        } else if (overlapPolicy === 'keep-first') {
          duplicatesRemoved++;
          // Skip this row (we already have the first one)
        } else if (overlapPolicy === 'keep-last') {
          // Replace the last row
          if (currentOutputChunk.length > 0) {
            currentOutputChunk.pop();
            outputRows--;
          }
          currentOutputChunk.push(item.row);
          outputRows++;
          rangeToTs = item.ts;
        }
      } else {
        // Not a duplicate, add to output
        currentOutputChunk.push(item.row);
        outputRows++;
        
        if (rangeFromTs === 0) rangeFromTs = item.ts;
        rangeToTs = item.ts;
        
        // Detect gap when timestamp jump is greater than 2x expected interval
        if (prevTs !== null) {
          const expectedIntervalMs = timeframeToMs(timeframe);
          const actualGap = item.ts - prevTs;
          if (expectedIntervalMs > 0 && actualGap > expectedIntervalMs * 2) {
            gapsDetected++;
          }
        }
        prevTs = item.ts;
        lastTs = item.ts;
        
        // Write chunk if full
        if (currentOutputChunk.length >= chunkSize) {
          await db.datasetChunks.put({
            id: uuidv4(),
            datasetId: outputDatasetId,
            index: chunkIndex,
            rows: currentOutputChunk,
          });
          chunkIndex++;
          currentOutputChunk = [];
        }
      }
      
      // Fetch next row from the same source
      const nextRow = await iterators[item.sourceIdx].next();
      if (nextRow) {
        heap.push({ ts: nextRow[0], row: nextRow, sourceIdx: item.sourceIdx });
      }
      
      // Report progress every 10000 rows
      if (processedRows % 10000 === 0) {
        const pct = Math.round((processedRows / totalRows) * 100);
        self.postMessage({ type: 'progress', pct, message: `Merging: ${processedRows.toLocaleString()} / ${totalRows.toLocaleString()} rows` } as MergeProgress);
      }
    }
    
    // Write remaining rows
    if (currentOutputChunk.length > 0) {
      await db.datasetChunks.put({
        id: uuidv4(),
        datasetId: outputDatasetId,
        index: chunkIndex,
        rows: currentOutputChunk,
      });
      chunkIndex++;
    }
    
    // Create output dataset record
    const sourceNames = datasets.map(d => d.name).join(' + ');
    const outputDataset = {
      id: outputDatasetId,
      name: outputName,
      symbol,
      timeframe,
      tz: (datasets[0] as unknown as { tz: string }).tz || 'Asia/Kolkata',
      rowCount: outputRows,
      columnsMap: (datasets[0] as unknown as { columnsMap: Record<string, string> }).columnsMap || {},
      importMeta: {
        source: 'merge',
        importedAt: Date.now(),
      },
      duplicatePolicy: 'keep-last' as const,
      missingPolicy: 'allow' as const,
      stats: {
        firstTs: rangeFromTs,
        lastTs: rangeToTs,
        duplicates: duplicatesRemoved,
      },
      chunks: chunkIndex,
      createdAt: Date.now(),
      rangeFromTs,
      rangeToTs,
      sourceName: `Merged: ${sourceNames}`,
      fingerprint: `merge-${Date.now()}`,
    };
    
    await db.datasets.put(outputDataset);
    
    // Delete source datasets if requested
    if (deleteSources) {
      for (const ds of datasets) {
        await db.datasetChunks.where('datasetId').equals(ds.id).delete();
        await db.datasets.delete(ds.id);
      }
    }
    
    self.postMessage({
      type: 'result',
      success: true,
      datasetId: outputDatasetId,
      stats: {
        totalRows: outputRows,
        duplicatesRemoved,
        gaps: gapsDetected,
        rangeFromTs,
        rangeToTs,
      }
    } as MergeResult);
    
  } catch (error) {
    self.postMessage({
      type: 'result',
      success: false,
      error: error instanceof Error ? error.message : String(error)
    } as MergeResult);
  }
}

// Worker message handler
self.onmessage = async (e: MessageEvent<MergeRequest>) => {
  if (e.data.type === 'merge') {
    await performMerge(e.data);
  }
};

export {};
