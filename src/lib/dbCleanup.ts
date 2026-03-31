/**
 * IndexedDB Cleanup Utilities
 * Prunes old data based on configurable retention policies
 */

import { db } from '@/db/index';
import { formatBytes } from '@/lib/utils';

export interface CleanupConfig {
  maxLogsAge: number; // Days to keep logs
  maxRunsAge: number; // Days to keep old runs
  maxDatasetChunksAge: number; // Days to keep orphan chunks
  maxStoragePercent: number; // Max storage usage percentage
}

export interface CleanupResult {
  logsDeleted: number;
  runsDeleted: number;
  chunksDeleted: number;
  storageFreed: number;
  errors: string[];
}

const DEFAULT_CONFIG: CleanupConfig = {
  maxLogsAge: 30,
  maxRunsAge: 90,
  maxDatasetChunksAge: 7,
  maxStoragePercent: 80,
};

const STORAGE_KEY = 'mmc-cleanup-config';

/**
 * Load cleanup configuration
 */
export function loadCleanupConfig(): CleanupConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch {
    // Ignore parse errors
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * Save cleanup configuration
 */
export function saveCleanupConfig(config: CleanupConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * Calculate age cutoff timestamp
 */
function getAgeCutoff(days: number): number {
  return Date.now() - (days * 24 * 60 * 60 * 1000);
}

/**
 * Run cleanup based on configuration
 */
export async function runCleanup(
  config: CleanupConfig = loadCleanupConfig(),
  onProgress?: (phase: string, progress: number) => void
): Promise<CleanupResult> {
  const result: CleanupResult = {
    logsDeleted: 0,
    runsDeleted: 0,
    chunksDeleted: 0,
    storageFreed: 0,
    errors: [],
  };

  const storageBefore = await getStorageUsage();

  try {
    onProgress?.('Cleaning logs...', 10);
    
    // 1. Delete old logs
    const logsCutoff = getAgeCutoff(config.maxLogsAge);
    const oldLogs = await db.logs.where('ts').below(logsCutoff).toArray();
    if (oldLogs.length > 0) {
      await db.logs.bulkDelete(oldLogs.map(l => l.id!).filter(Boolean));
      result.logsDeleted = oldLogs.length;
    }

    onProgress?.('Cleaning old runs...', 30);

    // 2. Delete old backtest runs (keep results, just clear run records)
    const runsCutoff = getAgeCutoff(config.maxRunsAge);
    const oldRuns = await db.backtestRuns
      .where('createdAt')
      .below(runsCutoff)
      .toArray();
    
    // Only delete runs that have completed or errored
    const deletableRuns = oldRuns.filter(r => 
      r.status === 'done' || r.status === 'error' || r.status === 'canceled'
    );
    
    if (deletableRuns.length > 0) {
      await db.backtestRuns.bulkDelete(deletableRuns.map(r => r.id));
      result.runsDeleted = deletableRuns.length;
    }

    onProgress?.('Cleaning orphan chunks...', 50);

    // 3. Find and delete orphan dataset chunks
    const allDatasetIds = new Set((await db.datasets.toArray()).map(d => d.id));
    const allChunks = await db.datasetChunks.toArray();
    const orphanChunks = allChunks.filter(c => !allDatasetIds.has(c.datasetId));
    
    if (orphanChunks.length > 0) {
      await db.datasetChunks.bulkDelete(orphanChunks.map(c => c.id));
      result.chunksDeleted = orphanChunks.length;
    }

    onProgress?.('Checking storage...', 80);

    // 4. Check storage usage and warn if high
    const storageAfter = await getStorageUsage();
    result.storageFreed = storageBefore.used - storageAfter.used;

    if (storageAfter.quota > 0) {
      const usagePercent = (storageAfter.used / storageAfter.quota) * 100;
      if (usagePercent > config.maxStoragePercent) {
        result.errors.push(
          `Storage usage is ${usagePercent.toFixed(1)}% which exceeds ${config.maxStoragePercent}% threshold`
        );
      }
    }

    onProgress?.('Complete', 100);

  } catch (err) {
    result.errors.push(`Cleanup error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Get current storage usage
 */
export async function getStorageUsage(): Promise<{ quota: number; used: number; percent: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota || 0;
    const used = estimate.usage || 0;
    return {
      quota,
      used,
      percent: quota > 0 ? (used / quota) * 100 : 0,
    };
  }
  return { quota: 0, used: 0, percent: 0 };
}

export { formatBytes };

/**
 * Get cleanup statistics
 */
export async function getCleanupStats(): Promise<{
  logsCount: number;
  runsCount: number;
  chunksCount: number;
  datasetsCount: number;
  storageUsed: number;
  storageQuota: number;
}> {
  const [logsCount, runsCount, chunksCount, datasetsCount, storage] = await Promise.all([
    db.logs.count(),
    db.backtestRuns.count(),
    db.datasetChunks.count(),
    db.datasets.count(),
    getStorageUsage(),
  ]);

  return {
    logsCount,
    runsCount,
    chunksCount,
    datasetsCount,
    storageUsed: storage.used,
    storageQuota: storage.quota,
  };
}
