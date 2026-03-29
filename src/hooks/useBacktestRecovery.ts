/**
 * Backtest Recovery Hook
 * Spec: Detect running backtests on load, show recovery banner
 */

import { useState, useEffect, useCallback } from 'react';
import { db, type BacktestRun } from '@/db';

export interface RecoveryState {
  hasRecoverableRuns: boolean;
  recoverableRuns: BacktestRun[];
  isRecovering: boolean;
}

export function useBacktestRecovery() {
  const [state, setState] = useState<RecoveryState>({
    hasRecoverableRuns: false,
    recoverableRuns: [],
    isRecovering: false,
  });

  // Check for recoverable runs on mount
  useEffect(() => {
    const checkRecoverableRuns = async () => {
      try {
        // Find all runs that were "running" when app closed
        const runningRuns = await db.backtestRuns
          .where('status')
          .equals('running')
          .toArray();

        if (runningRuns.length > 0) {
          // Mark them as paused with recovery flag
          await db.transaction('rw', db.backtestRuns, async () => {
            for (const run of runningRuns) {
              await db.backtestRuns.update(run.id, {
                status: 'paused',
                progress: {
                  ...run.progress,
                  step: 'Recovered from crash',
                },
              });
            }
          });

          // Fetch updated runs
          const pausedRuns = await db.backtestRuns
            .where('id')
            .anyOf(runningRuns.map(r => r.id))
            .toArray();

          setState({
            hasRecoverableRuns: true,
            recoverableRuns: pausedRuns,
            isRecovering: false,
          });

          await db.log('info', 'Found recoverable backtest runs', {
            count: pausedRuns.length,
            runIds: pausedRuns.map(r => r.id),
          });
        }
      } catch (error) {
        await db.log('error', 'Failed to check recoverable runs', { error: String(error) });
      }
    };

    checkRecoverableRuns();
  }, []);

  // Resume a recovered run
  const resumeRun = useCallback(async (runId: string): Promise<{ resumeFromIndex: number } | null> => {
    setState(s => ({ ...s, isRecovering: true }));

    try {
      const run = await db.backtestRuns.get(runId);
      if (!run) {
        throw new Error('Run not found');
      }

      // Find last checkpoint
      const lastCheckpoint = run.checkpoints?.length > 0
        ? run.checkpoints[run.checkpoints.length - 1]
        : null;

      // Update run status to running
      await db.backtestRuns.update(runId, {
        status: 'running',
        progress: {
          ...run.progress,
          step: lastCheckpoint ? 'Resuming from checkpoint...' : 'Restarting...',
        },
      });

      // Remove from recovery list
      setState(s => ({
        hasRecoverableRuns: s.recoverableRuns.length > 1,
        recoverableRuns: s.recoverableRuns.filter(r => r.id !== runId),
        isRecovering: false,
      }));

      await db.log('info', 'Resuming backtest run', {
        runId,
        resumeFromIndex: lastCheckpoint?.idx || 0,
      });

      return {
        resumeFromIndex: lastCheckpoint?.idx || 0,
      };
    } catch (error) {
      setState(s => ({ ...s, isRecovering: false }));
      await db.log('error', 'Failed to resume run', { error: String(error) });
      return null;
    }
  }, []);

  // Cancel a recovered run
  const cancelRun = useCallback(async (runId: string): Promise<void> => {
    try {
      await db.backtestRuns.update(runId, {
        status: 'canceled',
        endedAt: Date.now(),
      });

      setState(s => ({
        hasRecoverableRuns: s.recoverableRuns.length > 1,
        recoverableRuns: s.recoverableRuns.filter(r => r.id !== runId),
        isRecovering: false,
      }));

      await db.log('info', 'Canceled recovered run', { runId });
    } catch (error) {
      await db.log('error', 'Failed to cancel run', { error: String(error) });
    }
  }, []);

  // Cancel all recovered runs
  const cancelAll = useCallback(async (): Promise<void> => {
    try {
      const runIds = state.recoverableRuns.map(r => r.id);

      await db.transaction('rw', db.backtestRuns, async () => {
        for (const runId of runIds) {
          await db.backtestRuns.update(runId, {
            status: 'canceled',
            endedAt: Date.now(),
          });
        }
      });

      setState({
        hasRecoverableRuns: false,
        recoverableRuns: [],
        isRecovering: false,
      });

      await db.log('info', 'Canceled all recovered runs', { count: runIds.length });
    } catch (error) {
      await db.log('error', 'Failed to cancel all runs', { error: String(error) });
    }
  }, [state.recoverableRuns]);

  // Dismiss recovery banner without action
  const dismissRecovery = useCallback(() => {
    setState({
      hasRecoverableRuns: false,
      recoverableRuns: [],
      isRecovering: false,
    });
  }, []);

  return {
    ...state,
    resumeRun,
    cancelRun,
    cancelAll,
    dismissRecovery,
  };
}
