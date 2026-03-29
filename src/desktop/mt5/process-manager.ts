/**
 * MT5 Process Manager
 * Handles terminal spawning, process monitoring, and graceful termination
 */

import { v4 as uuidv4 } from 'uuid';

export interface ProcessInfo {
  id: string;
  workerId: string;
  runId: string;
  pid?: number;
  status: 'starting' | 'running' | 'completed' | 'error' | 'canceled';
  progress: number;
  currentDate?: string;
  startTime: number;
  endTime?: number;
  error?: string;
}

export interface TesterProgress {
  runId: string;
  workerId: string;
  progress: number;
  currentDate: string;
  elapsedMs: number;
  estimatedRemainingMs?: number;
}

// Active processes tracked by workerId
const activeProcesses = new Map<string, ProcessInfo>();

// Progress listeners
const progressListeners = new Set<(progress: TesterProgress) => void>();

/**
 * Register a progress listener
 */
export function onProgress(callback: (progress: TesterProgress) => void): () => void {
  progressListeners.add(callback);
  return () => progressListeners.delete(callback);
}

/**
 * Emit progress to all listeners
 */
function emitProgress(progress: TesterProgress): void {
  progressListeners.forEach(listener => {
    try {
      listener(progress);
    } catch (e) {
      console.error('Progress listener error:', e);
    }
  });
}

/**
 * Get process info for a worker
 */
export function getProcessInfo(workerId: string): ProcessInfo | undefined {
  return activeProcesses.get(workerId);
}

/**
 * Get all active processes
 */
export function getAllProcesses(): ProcessInfo[] {
  return Array.from(activeProcesses.values());
}

/**
 * Check if any process is running
 */
export function hasActiveProcess(): boolean {
  return Array.from(activeProcesses.values()).some(
    p => p.status === 'running' || p.status === 'starting'
  );
}

/**
 * Start MT5 Strategy Tester for a specific run
 */
export async function startTesterProcess(
  iniPath: string,
  workerId: string,
  runId: string,
  onProgressUpdate?: (progress: number, currentDate?: string) => void
): Promise<ProcessInfo> {
  // Check if Electron is available
  if (!window.electronAPI) {
    const errorProcess: ProcessInfo = {
      id: uuidv4(),
      workerId,
      runId,
      status: 'error',
      progress: 0,
      startTime: Date.now(),
      error: 'Desktop mode required for MT5 operations',
    };
    return errorProcess;
  }

  // Check if worker is already busy
  const existing = activeProcesses.get(workerId);
  if (existing && (existing.status === 'running' || existing.status === 'starting')) {
    throw new Error(`Worker ${workerId} is already running a process`);
  }

  // Create process info
  const processInfo: ProcessInfo = {
    id: uuidv4(),
    workerId,
    runId,
    status: 'starting',
    progress: 0,
    startTime: Date.now(),
  };

  activeProcesses.set(workerId, processInfo);

  try {
    // Start progress listener if available
    let unsubscribe: (() => void) | undefined;
    
    // Check for onTesterProgress on the window object (comes from preload)
    const api = window.electronAPI as typeof window.electronAPI & {
      onTesterProgress?: (callback: (data: { runId: string; progress: number; currentDate: string }) => void) => () => void;
    };
    
    if (api?.onTesterProgress) {
      unsubscribe = api.onTesterProgress((data) => {
        if (data.runId === runId) {
          const process = activeProcesses.get(workerId);
          if (process) {
            process.progress = data.progress;
            process.currentDate = data.currentDate;
            process.status = 'running';
            activeProcesses.set(workerId, process);
            
            // Emit progress
            emitProgress({
              runId,
              workerId,
              progress: data.progress,
              currentDate: data.currentDate,
              elapsedMs: Date.now() - process.startTime,
              estimatedRemainingMs: data.progress > 0 
                ? ((Date.now() - process.startTime) / data.progress) * (100 - data.progress)
                : undefined,
            });
            
            onProgressUpdate?.(data.progress, data.currentDate);
          }
        }
      });
    }

    // Mark as running
    processInfo.status = 'running';
    activeProcesses.set(workerId, processInfo);

    // Run the tester
    const result = await window.electronAPI.runTester(iniPath, workerId, runId);

    // Cleanup listener
    unsubscribe?.();

    // Update process info
    processInfo.endTime = Date.now();
    processInfo.progress = 100;
    processInfo.status = result.success ? 'completed' : 'error';
    if (!result.success && result.error) {
      processInfo.error = result.error;
    }

    activeProcesses.set(workerId, processInfo);

    return processInfo;
  } catch (error) {
    processInfo.status = 'error';
    processInfo.endTime = Date.now();
    processInfo.error = error instanceof Error ? error.message : 'Unknown error';
    activeProcesses.set(workerId, processInfo);
    throw error;
  }
}

/**
 * Cancel a running process (best effort)
 */
export async function cancelProcess(workerId: string): Promise<boolean> {
  const process = activeProcesses.get(workerId);
  if (!process || (process.status !== 'running' && process.status !== 'starting')) {
    return false;
  }

  // Note: MT5 terminal doesn't have a clean cancel mechanism
  // We mark it as canceled but the terminal may continue
  process.status = 'canceled';
  process.endTime = Date.now();
  activeProcesses.set(workerId, process);

  // Try to cancel via Electron API if available
  if (window.electronAPI?.cancelTesterRun) {
    try {
      await window.electronAPI.cancelTesterRun(workerId);
    } catch {
      // Ignore cancel errors
    }
  }

  return true;
}

/**
 * Clear completed/errored processes
 */
export function clearCompletedProcesses(): void {
  for (const [workerId, process] of activeProcesses) {
    if (process.status === 'completed' || process.status === 'error' || process.status === 'canceled') {
      activeProcesses.delete(workerId);
    }
  }
}

/**
 * Reset all process state
 */
export function resetProcessManager(): void {
  activeProcesses.clear();
  progressListeners.clear();
}

/**
 * Estimate remaining time based on progress
 */
export function estimateRemainingTime(process: ProcessInfo): number | undefined {
  if (process.progress <= 0 || process.progress >= 100) {
    return undefined;
  }

  const elapsed = Date.now() - process.startTime;
  const rate = process.progress / elapsed;
  const remaining = (100 - process.progress) / rate;

  return Math.round(remaining);
}

/**
 * Format duration in human readable format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
