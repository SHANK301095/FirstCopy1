/**
 * Merge History Store
 * Persists merge operations for lineage tracking
 */

export interface MergeHistoryEntry {
  id: string;
  createdAt: number;
  outputDatasetId: string;
  outputName: string;
  sourceDatasets: Array<{
    id: string;
    name: string;
    symbol: string;
    rowCount: number;
    rangeFrom: number;
    rangeTo: number;
  }>;
  mergeMode: 'append' | 'stitch';
  overlapPolicy: 'keep-first' | 'keep-last' | 'drop-duplicates';
  stats: {
    totalInputRows: number;
    outputRows: number;
    duplicatesRemoved: number;
    gapsDetected: number;
    gapLocations?: number[]; // Timestamps where gaps were found
  };
  duration: number; // ms
  status: 'completed' | 'failed';
  error?: string;
}

export interface DatasetLineage {
  datasetId: string;
  datasetName: string;
  parents: DatasetLineage[];
  mergeInfo?: {
    mergedAt: number;
    mode: 'append' | 'stitch';
    policy: string;
  };
}

const STORAGE_KEY = 'mmc_merge_history';
const MAX_ENTRIES = 100;

// Get all merge history entries
export function getMergeHistory(): MergeHistoryEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Add a new merge history entry
export function addMergeHistoryEntry(entry: MergeHistoryEntry): void {
  const history = getMergeHistory();
  history.unshift(entry); // Add to beginning
  
  // Limit entries
  if (history.length > MAX_ENTRIES) {
    history.pop();
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

// Get merge history for a specific dataset
export function getDatasetMergeHistory(datasetId: string): MergeHistoryEntry[] {
  return getMergeHistory().filter(
    e => e.outputDatasetId === datasetId || 
         e.sourceDatasets.some(s => s.id === datasetId)
  );
}

// Build lineage tree for a dataset
export function buildDatasetLineage(datasetId: string, datasetName: string): DatasetLineage {
  const history = getMergeHistory();
  
  // Find if this dataset was created by a merge
  const mergeEntry = history.find(e => e.outputDatasetId === datasetId);
  
  if (!mergeEntry) {
    // No merge history - this is a root dataset
    return {
      datasetId,
      datasetName,
      parents: [],
    };
  }
  
  // Recursively build lineage for source datasets
  const parents = mergeEntry.sourceDatasets.map(src => 
    buildDatasetLineage(src.id, src.name)
  );
  
  return {
    datasetId,
    datasetName,
    parents,
    mergeInfo: {
      mergedAt: mergeEntry.createdAt,
      mode: mergeEntry.mergeMode,
      policy: mergeEntry.overlapPolicy,
    },
  };
}

// Delete merge history entries for deleted datasets
export function cleanupMergeHistory(existingDatasetIds: Set<string>): number {
  const history = getMergeHistory();
  const cleaned = history.filter(e => existingDatasetIds.has(e.outputDatasetId));
  const removed = history.length - cleaned.length;
  
  if (removed > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  }
  
  return removed;
}

// Clear all merge history
export function clearMergeHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Get gap analysis summary from merge history
export function getGapAnalysis(datasetId: string): {
  totalGaps: number;
  gapLocations: number[];
  estimatedMissingBars: number;
} | null {
  const entry = getMergeHistory().find(e => e.outputDatasetId === datasetId);
  if (!entry) return null;
  
  return {
    totalGaps: entry.stats.gapsDetected,
    gapLocations: entry.stats.gapLocations || [],
    estimatedMissingBars: entry.stats.gapsDetected * 5, // Rough estimate
  };
}
