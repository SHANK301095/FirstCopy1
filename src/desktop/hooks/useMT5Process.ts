/**
 * React hook for MT5 process management
 * Provides reactive state for backtest processes
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ProcessInfo,
  TesterProgress,
  startTesterProcess,
  cancelProcess,
  getAllProcesses,
  onProgress,
  formatDuration,
} from '../mt5/process-manager';
import { generateTesterINI, createRunId, getReportPath, parseReportFile } from '../mt5/runner';
import type { TesterConfig, TesterRunResult } from '@/types/electron-api';

export interface UseMT5ProcessOptions {
  onComplete?: (result: TesterRunResult) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: TesterProgress) => void;
}

export interface UseMT5ProcessReturn {
  // State
  isRunning: boolean;
  processes: ProcessInfo[];
  currentProgress: TesterProgress | null;
  lastResult: TesterRunResult | null;
  error: string | null;

  // Actions
  startBacktest: (config: TesterConfig, workerId?: string) => Promise<TesterRunResult | null>;
  cancelBacktest: (workerId: string) => Promise<void>;
  clearHistory: () => void;

  // Helpers
  formatTime: (ms: number) => string;
}

export function useMT5Process(options: UseMT5ProcessOptions = {}): UseMT5ProcessReturn {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [currentProgress, setCurrentProgress] = useState<TesterProgress | null>(null);
  const [lastResult, setLastResult] = useState<TesterRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Subscribe to progress updates
  useEffect(() => {
    const unsubscribe = onProgress((progress) => {
      setCurrentProgress(progress);
      optionsRef.current.onProgress?.(progress);
    });

    return unsubscribe;
  }, []);

  // Refresh process list periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setProcesses(getAllProcesses());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const isRunning = processes.some(
    p => p.status === 'running' || p.status === 'starting'
  );

  const startBacktest = useCallback(async (
    config: TesterConfig,
    workerId: string = 'A'
  ): Promise<TesterRunResult | null> => {
    if (!window.electronAPI) {
      setError('Desktop mode required');
      return null;
    }

    setError(null);
    setCurrentProgress(null);

    try {
      const runId = createRunId(config.expert);
      const reportPath = getReportPath(runId, workerId);
      
      // Generate INI content
      const iniContent = generateTesterINI({ ...config, reportPath }, workerId);
      
      // Write INI file
      const iniPath = `%APPDATA%/MMC/MT5Workers/Worker-${workerId}/tester.ini`;
      await window.electronAPI.writeFile(iniPath, iniContent);

      // Start the process
      const processInfo = await startTesterProcess(
        iniPath,
        workerId,
        runId,
        (progress, currentDate) => {
          setCurrentProgress({
            runId,
            workerId,
            progress,
            currentDate: currentDate || '',
            elapsedMs: Date.now() - processInfo.startTime,
          });
        }
      );

      setProcesses(getAllProcesses());

      if (processInfo.status === 'completed') {
        // Parse the report
        const report = await parseReportFile(reportPath);
        const result: TesterRunResult = {
          success: true,
          runId,
          reportPath,
          duration: processInfo.endTime! - processInfo.startTime,
          ...report,
        };

        setLastResult(result);
        optionsRef.current.onComplete?.(result);
        return result;
      } else {
        throw new Error(processInfo.error || 'Backtest failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      optionsRef.current.onError?.(err instanceof Error ? err : new Error(errorMessage));
      return null;
    }
  }, []);

  const cancelBacktest = useCallback(async (workerId: string): Promise<void> => {
    await cancelProcess(workerId);
    setProcesses(getAllProcesses());
  }, []);

  const clearHistory = useCallback(() => {
    setLastResult(null);
    setError(null);
    setCurrentProgress(null);
  }, []);

  return {
    isRunning,
    processes,
    currentProgress,
    lastResult,
    error,
    startBacktest,
    cancelBacktest,
    clearHistory,
    formatTime: formatDuration,
  };
}
