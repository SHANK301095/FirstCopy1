/**
 * Backtest Notification Service
 * Triggers in-app toast and browser notifications on backtest completion
 */

import { toast } from 'sonner';
import { sendBrowserNotification } from '@/store/notificationSettingsStore';
import { secureLogger } from '@/lib/secureLogger';

export type BacktestOutcome = 'success' | 'error' | 'canceled';

interface NotifyBacktestCompleteOptions {
  runId: string;
  outcome: BacktestOutcome;
  strategyName?: string;
  datasetName?: string;
  metrics?: {
    netProfit?: number;
    winRate?: number;
    totalTrades?: number;
  };
  errorMessage?: string;
}

/**
 * Notify user that a backtest has completed
 * Always shows in-app toast, optionally shows browser notification
 */
export function notifyBacktestComplete(options: NotifyBacktestCompleteOptions): void {
  const { outcome, strategyName, datasetName, metrics, errorMessage, runId } = options;
  
  const label = strategyName 
    ? `${strategyName}${datasetName ? ` on ${datasetName}` : ''}`
    : 'Backtest';

  if (outcome === 'success') {
    const description = metrics
      ? `P&L: ${metrics.netProfit?.toFixed(2) ?? 'N/A'} | Win: ${metrics.winRate?.toFixed(1) ?? 'N/A'}% | ${metrics.totalTrades ?? 0} trades`
      : 'Run completed successfully';
    
    // In-app toast
    toast.success(`${label} completed`, {
      description,
      duration: 5000,
    });
    
    // Browser notification
    sendBrowserNotification(`${label} completed`, {
      body: description,
      tag: `backtest-${runId}`,
    });
    
    secureLogger.info('backtest', `Backtest completed: ${label}`);
  } else if (outcome === 'error') {
    const description = errorMessage || 'An error occurred during the backtest';
    
    toast.error(`${label} failed`, {
      description,
      duration: 8000,
    });
    
    sendBrowserNotification(`${label} failed`, {
      body: description,
      tag: `backtest-${runId}`,
    });
    
    secureLogger.error('backtest', `Backtest failed: ${label}`, { error: errorMessage });
  } else if (outcome === 'canceled') {
    toast.info(`${label} canceled`, {
      description: 'The backtest was stopped by user',
      duration: 3000,
    });
    
    secureLogger.info('backtest', `Backtest canceled: ${label}`);
  }
}

/**
 * Notify user that an optimizer run has completed
 */
export function notifyOptimizerComplete(options: {
  outcome: BacktestOutcome;
  strategyName?: string;
  totalIterations?: number;
  bestResult?: { profitFactor?: number; winRate?: number };
  errorMessage?: string;
}): void {
  const { outcome, strategyName, totalIterations, bestResult, errorMessage } = options;
  const label = strategyName ? `Optimizer: ${strategyName}` : 'Optimization';

  if (outcome === 'success') {
    const description = bestResult
      ? `Best PF: ${bestResult.profitFactor?.toFixed(2) ?? 'N/A'} | ${totalIterations ?? 0} iterations`
      : `Completed ${totalIterations ?? 0} iterations`;
    
    toast.success(`${label} finished`, {
      description,
      duration: 5000,
    });
    
    sendBrowserNotification(`${label} finished`, {
      body: description,
      tag: 'optimizer-complete',
    });
  } else if (outcome === 'error') {
    toast.error(`${label} failed`, {
      description: errorMessage || 'Optimization encountered an error',
      duration: 8000,
    });
    
    sendBrowserNotification(`${label} failed`, {
      body: errorMessage || 'Optimization encountered an error',
      tag: 'optimizer-error',
    });
  }
}
