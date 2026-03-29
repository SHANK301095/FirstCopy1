/**
 * Queue Engine for MT5 Backtesting
 * Spec: Crash-safe queue with pause/resume/cancel and caching
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '@/db';
import type {
  QueueItem,
  QueueState,
  QueueCheckpoint,
  BulkRunConfig,
  CacheEntry,
  CacheHashInputs,
  QueueItemStatus,
} from './types';

// Checkpoint interval
const CHECKPOINT_INTERVAL_MS = 5000;

/**
 * Generate reproducibility hash for caching
 */
export function generateCacheHash(inputs: CacheHashInputs): string {
  const str = JSON.stringify({
    eaVersion: inputs.eaVersion,
    params: Object.keys(inputs.presetParams).sort().reduce((acc, key) => {
      acc[key] = inputs.presetParams[key];
      return acc;
    }, {} as Record<string, unknown>),
    symbol: inputs.symbol,
    period: inputs.period,
    from: inputs.fromDate,
    to: inputs.toDate,
    deposit: inputs.deposit,
    leverage: inputs.leverage,
    model: inputs.model,
    spread: inputs.spread,
    commission: inputs.commission,
    slippage: inputs.slippage,
  });
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Queue Engine class
 */
export class QueueEngine {
  private state: QueueState;
  private workers: Map<string, string> = new Map(); // workerId -> currentItemId
  private cacheEntries: Map<string, CacheEntry> = new Map();
  private checkpointTimer: ReturnType<typeof setInterval> | null = null;
  private onProgress?: (state: QueueState) => void;
  private onComplete?: (state: QueueState) => void;
  private onError?: (error: Error, itemId?: string) => void;

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): QueueState {
    return {
      mode: 'single',
      items: [],
      status: 'idle',
      currentPage: 1,
      totalItems: 0,
      completedItems: 0,
      failedItems: 0,
      reusedItems: 0,
    };
  }

  /**
   * Initialize queue from persisted state (crash recovery)
   */
  async initialize(): Promise<void> {
    try {
      const settings = await db.getSettings();
      const savedState = localStorage.getItem('mt5-queue-state');
      
      if (savedState) {
        const parsed = JSON.parse(savedState) as QueueState;
        
        // If there's an incomplete run, restore it
        if (parsed.status === 'running' || parsed.status === 'paused') {
          this.state = {
            ...parsed,
            status: 'paused', // Auto-pause on recovery
          };
          
          // Mark any running items as queued
          this.state.items = this.state.items.map(item => ({
            ...item,
            status: item.status === 'running' ? 'queued' : item.status,
            workerId: undefined,
          }));
          
          await db.log('info', 'Queue restored from crash recovery', {
            totalItems: this.state.totalItems,
            completedItems: this.state.completedItems,
          });
        }
      }
      
      // Load cache entries
      await this.loadCacheEntries();
    } catch {
      // Queue initialization failed - use fresh state
      this.state = this.getInitialState();
    }
  }

  private async loadCacheEntries(): Promise<void> {
    try {
      const cached = localStorage.getItem('mt5-cache-entries');
      if (cached) {
        const entries = JSON.parse(cached) as CacheEntry[];
        entries.forEach(entry => {
          this.cacheEntries.set(entry.hash, entry);
        });
      }
    } catch {
      // Cache load failed - start fresh
    }
  }

  private async saveCacheEntries(): Promise<void> {
    const entries = Array.from(this.cacheEntries.values());
    localStorage.setItem('mt5-cache-entries', JSON.stringify(entries));
  }

  /**
   * Configure bulk run
   */
  configureBulkRun(config: BulkRunConfig): void {
    this.state = {
      ...this.getInitialState(),
      mode: 'bulk',
      bulkConfig: config,
      items: [],
    };
  }

  /**
   * Add items to queue
   */
  addItems(items: Omit<QueueItem, 'id' | 'status' | 'progress'>[]): void {
    const newItems: QueueItem[] = items.map(item => ({
      ...item,
      id: uuidv4(),
      status: 'queued' as QueueItemStatus,
      progress: 0,
    }));

    // Check cache for each item
    newItems.forEach(item => {
      if (item.cacheHash) {
        const cached = this.cacheEntries.get(item.cacheHash);
        if (cached) {
          item.status = 'reused';
          item.reusedFromId = cached.runId;
          item.resultId = cached.resultId;
          item.progress = 100;
        }
      }
    });

    this.state.items = [...this.state.items, ...newItems];
    this.state.totalItems = this.state.items.length;
    this.state.reusedItems = this.state.items.filter(i => i.status === 'reused').length;
    
    this.persistState();
    this.notifyProgress();
  }

  /**
   * Start queue processing
   */
  async start(
    runItem: (item: QueueItem, workerId: string) => Promise<{ success: boolean; resultId?: string; error?: string }>,
    workerIds: string[]
  ): Promise<void> {
    if (this.state.status === 'running') return;

    this.state.status = 'running';
    this.state.startedAt = Date.now();
    
    // Start checkpoint timer
    this.startCheckpointTimer();
    
    await db.log('info', 'Queue started', {
      totalItems: this.state.totalItems,
      concurrency: workerIds.length,
    });

    // Process queue
    await this.processQueue(runItem, workerIds);
  }

  private async processQueue(
    runItem: (item: QueueItem, workerId: string) => Promise<{ success: boolean; resultId?: string; error?: string }>,
    workerIds: string[]
  ): Promise<void> {
    const concurrency = workerIds.length;
    const processing = new Set<string>();

    while (this.state.status === 'running') {
      // Get next queued items up to concurrency limit
      const pending = this.state.items.filter(
        item => item.status === 'queued' && !processing.has(item.id)
      );

      if (pending.length === 0 && processing.size === 0) {
        // All done
        break;
      }

      // Assign items to available workers
      const availableWorkers = workerIds.filter(wid => !this.workers.has(wid));
      const toProcess = pending.slice(0, Math.min(availableWorkers.length, concurrency - processing.size));

      const promises = toProcess.map(async (item, idx) => {
        const workerId = availableWorkers[idx];
        if (!workerId) return;

        processing.add(item.id);
        this.workers.set(workerId, item.id);
        
        // Update item status
        this.updateItemStatus(item.id, 'running', { workerId });

        try {
          const result = await runItem(item, workerId);
          
          if (result.success) {
            this.updateItemStatus(item.id, 'done', {
              resultId: result.resultId,
              endedAt: Date.now(),
            });
            this.state.completedItems++;
            
            // Add to cache
            if (item.cacheHash && result.resultId) {
              this.addCacheEntry(item, result.resultId);
            }
          } else {
            this.updateItemStatus(item.id, 'error', {
              error: result.error,
              endedAt: Date.now(),
            });
            this.state.failedItems++;
            
            // Check fail policy
            if (this.state.bulkConfig?.failPolicy === 'stop') {
              this.state.status = 'error';
              await db.log('error', 'Queue stopped due to fail policy', { itemId: item.id });
            }
          }
        } catch (error) {
          this.updateItemStatus(item.id, 'error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            endedAt: Date.now(),
          });
          this.state.failedItems++;
          this.onError?.(error instanceof Error ? error : new Error(String(error)), item.id);
        } finally {
          processing.delete(item.id);
          this.workers.delete(workerId);
          this.notifyProgress();
        }
      });

      await Promise.race([
        Promise.all(promises),
        new Promise(resolve => setTimeout(resolve, 100)), // Yield for pause/cancel
      ]);

      // Check for pause
      const checkPause = async () => {
        while ((this.state as QueueState).status === 'paused') {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      };
      await checkPause();
    }

    // Cleanup
    this.stopCheckpointTimer();
    
    if (this.state.status !== 'error') {
      this.state.status = 'completed';
      this.state.completedAt = Date.now();
    }
    
    this.persistState();
    this.onComplete?.(this.state);
    
    await db.log('info', 'Queue completed', {
      completed: this.state.completedItems,
      failed: this.state.failedItems,
      reused: this.state.reusedItems,
    });
  }

  private updateItemStatus(
    itemId: string,
    status: QueueItemStatus,
    updates: Partial<QueueItem> = {}
  ): void {
    this.state.items = this.state.items.map(item =>
      item.id === itemId
        ? { ...item, status, ...updates, startedAt: status === 'running' ? Date.now() : item.startedAt }
        : item
    );
    this.notifyProgress();
  }

  private addCacheEntry(item: QueueItem, resultId: string): void {
    if (!item.cacheHash) return;
    
    const entry: CacheEntry = {
      hash: item.cacheHash,
      runId: item.id,
      eaId: item.eaId,
      eaVersion: '', // Would be populated from EA info
      presetParams: {},
      testerConfig: {} as any,
      resultId,
      createdAt: Date.now(),
    };
    
    this.cacheEntries.set(item.cacheHash, entry);
    this.saveCacheEntries();
  }

  /**
   * Pause queue
   */
  pause(): void {
    if (this.state.status !== 'running') return;
    
    this.state.status = 'paused';
    this.state.pausedAt = Date.now();
    this.persistState();
    this.notifyProgress();
    
    db.log('info', 'Queue paused');
  }

  /**
   * Resume queue
   */
  resume(): void {
    if (this.state.status !== 'paused') return;
    
    this.state.status = 'running';
    this.persistState();
    this.notifyProgress();
    
    db.log('info', 'Queue resumed');
  }

  /**
   * Cancel queue
   */
  async cancel(): Promise<void> {
    this.state.status = 'idle';
    
    // Mark running items as canceled
    this.state.items = this.state.items.map(item => ({
      ...item,
      status: item.status === 'running' || item.status === 'queued' ? 'canceled' : item.status,
      workerId: undefined,
    }));
    
    this.workers.clear();
    this.stopCheckpointTimer();
    this.persistState();
    this.notifyProgress();
    
    await db.log('info', 'Queue canceled');
  }

  /**
   * Reset queue
   */
  reset(): void {
    this.state = this.getInitialState();
    this.workers.clear();
    this.stopCheckpointTimer();
    localStorage.removeItem('mt5-queue-state');
    this.notifyProgress();
  }

  /**
   * Get current state
   */
  getState(): QueueState {
    return { ...this.state };
  }

  /**
   * Get items for current page (20-20 slots)
   */
  getPagedItems(pageSize: number = 20): { items: QueueItem[]; totalPages: number } {
    const start = (this.state.currentPage - 1) * pageSize;
    const items = this.state.items.slice(start, start + pageSize);
    const totalPages = Math.ceil(this.state.items.length / pageSize);
    return { items, totalPages };
  }

  /**
   * Set current page
   */
  setPage(page: number): void {
    this.state.currentPage = page;
    this.notifyProgress();
  }

  /**
   * Register callbacks
   */
  onStateChange(callback: (state: QueueState) => void): void {
    this.onProgress = callback;
  }

  onQueueComplete(callback: (state: QueueState) => void): void {
    this.onComplete = callback;
  }

  onQueueError(callback: (error: Error, itemId?: string) => void): void {
    this.onError = callback;
  }

  // ============= Private Methods =============

  private persistState(): void {
    localStorage.setItem('mt5-queue-state', JSON.stringify(this.state));
  }

  private notifyProgress(): void {
    this.onProgress?.(this.getState());
  }

  private startCheckpointTimer(): void {
    this.checkpointTimer = setInterval(() => {
      this.saveCheckpoint();
    }, CHECKPOINT_INTERVAL_MS);
  }

  private stopCheckpointTimer(): void {
    if (this.checkpointTimer) {
      clearInterval(this.checkpointTimer);
      this.checkpointTimer = null;
    }
  }

  private saveCheckpoint(): void {
    const checkpoint: QueueCheckpoint = {
      timestamp: Date.now(),
      completedIds: this.state.items.filter(i => i.status === 'done').map(i => i.id),
      currentItemId: this.state.items.find(i => i.status === 'running')?.id,
      currentItemProgress: this.state.items.find(i => i.status === 'running')?.progress || 0,
      workerStates: Object.fromEntries(this.workers),
    };
    
    this.state.lastCheckpoint = checkpoint;
    this.persistState();
  }
}

// Singleton instance
export const queueEngine = new QueueEngine();
