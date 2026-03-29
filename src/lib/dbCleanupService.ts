/**
 * IndexedDB Cleanup Service
 * Prune old data to manage storage
 */

import { db } from '@/db/index';
import { secureLogger } from '@/lib/secureLogger';

const STORAGE_KEY = 'mmc-cleanup-settings';

export interface CleanupSettings {
  enabled: boolean;
  maxAgeDays: number; // Days to keep data
  lastCleanup: number; // Timestamp
  autoCleanOnStartup: boolean;
}

const DEFAULT_SETTINGS: CleanupSettings = {
  enabled: true,
  maxAgeDays: 30,
  lastCleanup: 0,
  autoCleanOnStartup: false,
};

export function getCleanupSettings(): CleanupSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore
  }
  return DEFAULT_SETTINGS;
}

export function saveCleanupSettings(settings: CleanupSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export interface CleanupResult {
  success: boolean;
  deletedChunks: number;
  deletedRuns: number;
  deletedResults: number;
  deletedLogs: number;
  freedSpaceEstimate: number; // bytes
  duration: number; // ms
  error?: string;
}

/**
 * Run cleanup to delete old data
 */
export async function runCleanup(maxAgeDays?: number): Promise<CleanupResult> {
  const startTime = Date.now();
  const settings = getCleanupSettings();
  const days = maxAgeDays ?? settings.maxAgeDays;
  const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  secureLogger.info('cleanup', 'Starting cleanup', { maxAgeDays: days, cutoffTime: new Date(cutoffTime).toISOString() });
  
  let deletedChunks = 0;
  let deletedRuns = 0;
  let deletedResults = 0;
  let deletedLogs = 0;
  let freedSpaceEstimate = 0;

  try {
    // 1. Find old datasets and delete their chunks
    const oldDatasets = await db.datasets
      .filter(d => d.createdAt < cutoffTime)
      .toArray();
    
    for (const dataset of oldDatasets) {
      const chunks = await db.datasetChunks
        .where('datasetId')
        .equals(dataset.id)
        .toArray();
      
      // Estimate size (rough: rows * 48 bytes per row)
      for (const chunk of chunks) {
        freedSpaceEstimate += chunk.rows.length * 48;
        deletedChunks++;
      }
      
      await db.datasetChunks.where('datasetId').equals(dataset.id).delete();
      await db.datasets.delete(dataset.id);
    }

    // 2. Delete old backtest runs
    const oldRuns = await db.backtestRuns
      .filter(r => r.createdAt < cutoffTime)
      .toArray();
    
    for (const run of oldRuns) {
      // Delete associated results
      await db.results.where('runId').equals(run.id).delete();
      await db.resultTrades.where('runId').equals(run.id).delete();
      deletedRuns++;
    }
    
    await db.backtestRuns.filter(r => r.createdAt < cutoffTime).delete();

    // 3. Delete old results without runs
    const orphanResults = await db.results
      .filter(r => r.createdAt < cutoffTime)
      .toArray();
    
    deletedResults = orphanResults.length;
    await db.results.filter(r => r.createdAt < cutoffTime).delete();

    // 4. Delete old logs (keep last 500)
    const logCount = await db.logs.count();
    if (logCount > 500) {
      const logsToDelete = await db.logs.orderBy('ts').limit(logCount - 500).toArray();
      await db.logs.bulkDelete(logsToDelete.map(l => l.id!));
      deletedLogs = logsToDelete.length;
    }

    // Update last cleanup time
    saveCleanupSettings({
      ...settings,
      lastCleanup: Date.now(),
    });

    const result: CleanupResult = {
      success: true,
      deletedChunks,
      deletedRuns,
      deletedResults,
      deletedLogs,
      freedSpaceEstimate,
      duration: Date.now() - startTime,
    };

    secureLogger.info('cleanup', 'Cleanup complete', { deletedChunks, deletedRuns, deletedResults, deletedLogs });
    return result;

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    secureLogger.error('cleanup', 'Cleanup failed', { error: errMsg });
    
    return {
      success: false,
      deletedChunks,
      deletedRuns,
      deletedResults,
      deletedLogs,
      freedSpaceEstimate,
      duration: Date.now() - startTime,
      error: errMsg,
    };
  }
}

/**
 * Get storage usage stats
 */
export async function getStorageStats(): Promise<{
  datasetsCount: number;
  chunksCount: number;
  runsCount: number;
  resultsCount: number;
  logsCount: number;
  estimatedSize: number;
  quotaUsed: number;
  quotaTotal: number;
}> {
  const [datasetsCount, chunksCount, runsCount, resultsCount, logsCount] = await Promise.all([
    db.datasets.count(),
    db.datasetChunks.count(),
    db.backtestRuns.count(),
    db.results.count(),
    db.logs.count(),
  ]);

  // Get browser storage estimate
  let quotaUsed = 0;
  let quotaTotal = 0;
  
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    quotaUsed = estimate.usage || 0;
    quotaTotal = estimate.quota || 0;
  }

  // Rough estimate: chunks * avg rows * 48 bytes
  const estimatedSize = chunksCount * 50000 * 48;

  return {
    datasetsCount,
    chunksCount,
    runsCount,
    resultsCount,
    logsCount,
    estimatedSize,
    quotaUsed,
    quotaTotal,
  };
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
