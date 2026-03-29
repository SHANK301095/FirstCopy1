/**
 * Bulk Tester Store
 * Manages queue state, processing, and results for bulk testing
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { db, type BacktestResult } from '@/db';
import { listEAs, listPresets } from '@/desktop/mt5/ea-store';
import type { Priority } from '@/desktop/components/PriorityQueue';
import type { EAInfo, EAPreset } from '@/types/electron-api';

// ============= Types =============

export type BulkTestStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';
export type FailPolicy = 'continue' | 'stop' | 'retry';
export type ExportFormat = 'excel' | 'csv' | 'json';

export interface BulkTestConfig {
  batchSize: number;
  concurrency: number;
  failPolicy: FailPolicy;
  maxRetries: number;
  timeout: number;
  autoExport: boolean;
  exportFormat: ExportFormat;
  cachePreviousResults: boolean;
  priorityMode: boolean;
}

export interface BulkTestItem {
  id: string;
  eaId: string;
  eaName: string;
  presetId?: string;
  presetName?: string;
  symbol: string;
  timeframe: string;
  dateRange: { from: string; to: string };
  priority: Priority;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cached';
  progress: number;
  retryCount: number;
  result?: {
    runId: string;
    netProfit: number;
    profitFactor: number;
    winRate: number;
    maxDrawdown: number;
    maxDrawdownPct: number;
    totalTrades: number;
    sharpeRatio: number;
  };
  error?: string;
  duration?: number;
  startedAt?: number;
  completedAt?: number;
  cacheHash?: string;
}

export interface BulkTestSession {
  id: string;
  name: string;
  createdAt: number;
  completedAt?: number;
  config: BulkTestConfig;
  itemCount: number;
  completedCount: number;
  failedCount: number;
  cachedCount: number;
  status: BulkTestStatus;
}

interface BulkTesterState {
  // Queue state
  items: BulkTestItem[];
  status: BulkTestStatus;
  currentPage: number;
  
  // Timing
  batchStartedAt: number | null;
  batchPausedAt: number | null;
  totalPausedTime: number;
  
  // Configuration
  config: BulkTestConfig;
  
  // Session tracking
  currentSession: BulkTestSession | null;
  sessions: BulkTestSession[];
  
  // EA Library cache
  availableEAs: EAInfo[];
  
  // Actions
  loadEAs: () => Promise<void>;
  addItems: (items: Omit<BulkTestItem, 'id' | 'status' | 'progress' | 'retryCount'>[]) => void;
  removeItem: (id: string) => void;
  clearQueue: () => void;
  clearCompleted: () => void;
  updateItemPriority: (id: string, priority: Priority) => void;
  reorderItems: (items: BulkTestItem[]) => void;
  retryItem: (id: string) => void;
  
  // Queue operations
  startBatch: () => Promise<void>;
  pauseBatch: () => void;
  resumeBatch: () => void;
  stopBatch: () => void;
  
  // Configuration
  updateConfig: (updates: Partial<BulkTestConfig>) => void;
  setPage: (page: number) => void;
  
  // Session management
  saveSession: (name: string) => Promise<void>;
  loadSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  
  // Results
  getCompletedResults: () => BulkTestItem[];
  exportResults: () => Promise<Uint8Array>;
}

// ============= Default Config =============

const defaultConfig: BulkTestConfig = {
  batchSize: 20,
  concurrency: 2,
  failPolicy: 'continue',
  maxRetries: 3,
  timeout: 300,
  autoExport: true,
  exportFormat: 'excel',
  cachePreviousResults: true,
  priorityMode: true,
};

// ============= Store =============

export const useBulkTesterStore = create<BulkTesterState>()(
  persist(
    (set, get) => ({
      items: [],
      status: 'idle',
      currentPage: 1,
      batchStartedAt: null,
      batchPausedAt: null,
      totalPausedTime: 0,
      config: defaultConfig,
      currentSession: null,
      sessions: [],
      availableEAs: [],

      // Load EAs from store
      loadEAs: async () => {
        try {
          const eas = await listEAs();
          set({ availableEAs: eas });
        } catch (error) {
          console.error('Failed to load EAs:', error);
        }
      },

      // Add items to queue
      addItems: (newItems) => {
        const items: BulkTestItem[] = newItems.map(item => ({
          ...item,
          id: uuidv4(),
          status: 'queued',
          progress: 0,
          retryCount: 0,
        }));
        set(state => ({ items: [...state.items, ...items] }));
      },

      // Remove single item
      removeItem: (id) => {
        set(state => ({ items: state.items.filter(item => item.id !== id) }));
      },

      // Clear all items
      clearQueue: () => {
        set({ items: [], status: 'idle', currentSession: null });
      },

      // Clear completed items
      clearCompleted: () => {
        set(state => ({
          items: state.items.filter(item => 
            item.status !== 'completed' && item.status !== 'failed' && item.status !== 'cached'
          )
        }));
      },

      // Update priority
      updateItemPriority: (id, priority) => {
        set(state => ({
          items: state.items.map(item =>
            item.id === id ? { ...item, priority } : item
          )
        }));
      },

      // Reorder items
      reorderItems: (items) => {
        set({ items });
      },

      // Retry failed item
      retryItem: (id) => {
        set(state => ({
          items: state.items.map(item =>
            item.id === id ? { ...item, status: 'queued', error: undefined, progress: 0 } : item
          )
        }));
      },

      // Start batch processing
      startBatch: async () => {
        const { items, config } = get();
        if (items.length === 0) return;

        // Create new session
        const session: BulkTestSession = {
          id: uuidv4(),
          name: `Batch ${new Date().toLocaleString()}`,
          createdAt: Date.now(),
          config,
          itemCount: items.length,
          completedCount: 0,
          failedCount: 0,
          cachedCount: 0,
          status: 'running',
        };

        set({ 
          status: 'running', 
          currentSession: session,
          batchStartedAt: Date.now(),
          batchPausedAt: null,
          totalPausedTime: 0,
        });

        // Process queue
        await processQueue(get, set);
      },

      // Pause batch
      pauseBatch: () => {
        set(state => ({ 
          status: 'paused',
          batchPausedAt: Date.now(),
        }));
      },

      // Resume batch
      resumeBatch: async () => {
        set(state => {
          const pausedDuration = state.batchPausedAt 
            ? Date.now() - state.batchPausedAt 
            : 0;
          return { 
            status: 'running',
            batchPausedAt: null,
            totalPausedTime: state.totalPausedTime + pausedDuration,
          };
        });
        await processQueue(get, set);
      },

      // Stop batch
      stopBatch: () => {
        set(state => ({
          status: 'idle',
          batchStartedAt: null,
          batchPausedAt: null,
          totalPausedTime: 0,
          items: state.items.map(item =>
            item.status === 'running' ? { ...item, status: 'queued', progress: 0 } : item
          ),
          currentSession: state.currentSession 
            ? { ...state.currentSession, status: 'idle' }
            : null,
        }));
      },

      // Update config
      updateConfig: (updates) => {
        set(state => ({ config: { ...state.config, ...updates } }));
      },

      // Set current page
      setPage: (page) => {
        set({ currentPage: page });
      },

      // Save session
      saveSession: async (name) => {
        const { currentSession, sessions } = get();
        if (!currentSession) return;

        const savedSession = { ...currentSession, name };
        set({ sessions: [...sessions, savedSession] });
      },

      // Load session
      loadSession: (sessionId) => {
        const { sessions } = get();
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
          set({ config: session.config });
        }
      },

      // Delete session
      deleteSession: (sessionId) => {
        set(state => ({
          sessions: state.sessions.filter(s => s.id !== sessionId)
        }));
      },

      // Get completed results
      getCompletedResults: () => {
        return get().items.filter(item => 
          item.status === 'completed' || item.status === 'cached'
        );
      },

      // Export results
      exportResults: async () => {
        const { items, config, currentSession } = get();
        const completedItems = items.filter(i => i.status === 'completed' || i.status === 'cached');
        
        // Dynamic import for Excel export
        const { generateExcelReport } = await import('@/desktop/excel/excel-export');
        
        // Convert to expected format
        const runs = completedItems.map(item => ({
          success: item.status === 'completed' || item.status === 'cached',
          runId: item.result?.runId || item.id,
          reportPath: '',
          metrics: item.result ? {
            netProfit: item.result.netProfit,
            grossProfit: item.result.netProfit * 1.5,
            grossLoss: item.result.netProfit * 0.5,
            profitFactor: item.result.profitFactor,
            recoveryFactor: 1.5,
            sharpeRatio: item.result.sharpeRatio,
            maxDrawdown: item.result.maxDrawdown,
            maxDrawdownPct: item.result.maxDrawdownPct,
            totalTrades: item.result.totalTrades,
            winningTrades: Math.round(item.result.totalTrades * item.result.winRate / 100),
            losingTrades: Math.round(item.result.totalTrades * (1 - item.result.winRate / 100)),
            winRate: item.result.winRate,
            avgWin: 100,
            avgLoss: 50,
            largestWin: 500,
            largestLoss: 200,
            avgHoldTime: 3600,
            profitPerMonth: item.result.netProfit / 12,
            expectedPayoff: 50,
          } : undefined,
          equity: [],
          drawdown: [],
          trades: [],
          duration: item.duration || 0,
          cached: item.status === 'cached',
        }));

        const eaInfos: Record<string, any> = {};
        completedItems.forEach(item => {
          eaInfos[item.eaId] = {
            id: item.eaId,
            name: item.eaName,
            path: '',
            version: '1.0',
            compiled: true,
            tags: [],
            presets: [],
          };
        });

        const buffer = await generateExcelReport({
          bulkSetName: currentSession?.name || 'Bulk Test',
          runs,
          eaInfos,
          includeDataQuality: true,
          includeSettings: true,
        });

        return buffer;
      },
    }),
    {
      name: 'bulk-tester-storage',
      partialize: (state) => ({
        config: state.config,
        sessions: state.sessions,
      }),
    }
  )
);

// ============= Queue Processor =============

async function processQueue(
  get: () => BulkTesterState,
  set: (partial: Partial<BulkTesterState> | ((state: BulkTesterState) => Partial<BulkTesterState>)) => void
) {
  const { config } = get();
  const concurrency = config.concurrency;
  
  while (true) {
    const state = get();
    
    // Check if we should stop
    if (state.status !== 'running') break;
    
    // Get queued items
    const queuedItems = state.items.filter(i => i.status === 'queued');
    if (queuedItems.length === 0) {
      // All done
      set(s => ({
        status: 'completed',
        currentSession: s.currentSession 
          ? { ...s.currentSession, status: 'completed', completedAt: Date.now() }
          : null,
      }));
      break;
    }
    
    // Sort by priority
    const sortedItems = [...queuedItems].sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    // Take next batch
    const batch = sortedItems.slice(0, concurrency);
    
    // Mark as running
    set(s => ({
      items: s.items.map(item =>
        batch.find(b => b.id === item.id)
          ? { ...item, status: 'running', startedAt: Date.now() }
          : item
      )
    }));
    
    // Process batch in parallel
    await Promise.all(batch.map(item => processItem(item, get, set)));
  }
}

async function processItem(
  item: BulkTestItem,
  get: () => BulkTesterState,
  set: (partial: Partial<BulkTesterState> | ((state: BulkTesterState) => Partial<BulkTesterState>)) => void
) {
  const { config } = get();
  const startTime = Date.now();
  
  try {
    // Check if running in Electron desktop mode with MT5 available
    const inDesktopMode = typeof window !== 'undefined' && 'electronAPI' in window;
    
    if (inDesktopMode && window.electronAPI) {
      // Real MT5 backtest execution
      await processMT5Backtest(item, get, set, startTime);
    } else {
      // Web mode - use simulated backtest for demo/testing
      await processSimulatedBacktest(item, get, set, startTime);
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check retry policy
    if (config.failPolicy === 'retry' && item.retryCount < config.maxRetries) {
      set(s => ({
        items: s.items.map(i =>
          i.id === item.id 
            ? { ...i, status: 'queued', retryCount: i.retryCount + 1, progress: 0 }
            : i
        )
      }));
    } else {
      set(s => ({
        items: s.items.map(i =>
          i.id === item.id 
            ? { ...i, status: 'failed', error: errorMessage, duration, completedAt: Date.now() }
            : i
        ),
        currentSession: s.currentSession
          ? { ...s.currentSession, failedCount: s.currentSession.failedCount + 1 }
          : null,
      }));
      
      // Stop if policy is 'stop'
      if (config.failPolicy === 'stop') {
        set({ status: 'paused' });
      }
    }
  }
}

/**
 * Process real MT5 backtest via Electron IPC
 */
async function processMT5Backtest(
  item: BulkTestItem,
  get: () => BulkTesterState,
  set: (partial: Partial<BulkTesterState> | ((state: BulkTesterState) => Partial<BulkTesterState>)) => void,
  startTime: number
) {
  const { config } = get();
  
  // Import MT5 runner dynamically
  const { runStrategyTester, parseHTMLReport } = await import('@/desktop/mt5/runner');
  
  // Prepare tester config
  const testerConfig = {
    expert: item.eaName,
    expertParameters: item.presetName || 'default',
    symbol: item.symbol,
    period: item.timeframe,
    fromDate: item.dateRange.from.replace(/-/g, '.'),
    toDate: item.dateRange.to.replace(/-/g, '.'),
    deposit: 10000,
    leverage: 100,
    model: 'EveryTick' as const,
    optimization: 'Disabled' as const,
    reportPath: '',
  };
  
  // Get worker ID based on item position
  const runningItems = get().items.filter(i => i.status === 'running');
  const workerIndex = runningItems.findIndex(i => i.id === item.id);
  const workerId = ['A', 'B', 'C', 'D'][workerIndex % config.concurrency];
  
  // Run the strategy tester
  const result = await runStrategyTester(testerConfig, workerId, (progress) => {
    // Update progress
    set(s => ({
      items: s.items.map(i =>
        i.id === item.id ? { ...i, progress } : i
      )
    }));
  });
  
  const duration = Date.now() - startTime;
  
  if (result.success && result.metrics) {
    const metrics = result.metrics;
    const testResult = {
      runId: result.runId || uuidv4(),
      netProfit: metrics.netProfit,
      profitFactor: metrics.profitFactor,
      winRate: metrics.winRate,
      maxDrawdown: metrics.maxDrawdown,
      maxDrawdownPct: metrics.maxDrawdownPct,
      totalTrades: metrics.totalTrades,
      sharpeRatio: metrics.sharpeRatio,
    };
    
    // Update item with result
    set(s => ({
      items: s.items.map(i =>
        i.id === item.id 
          ? { 
              ...i, 
              status: 'completed', 
              progress: 100, 
              result: testResult,
              duration,
              completedAt: Date.now(),
            } 
          : i
      ),
      currentSession: s.currentSession
        ? { ...s.currentSession, completedCount: s.currentSession.completedCount + 1 }
        : null,
    }));
    
    // Save result to database
    await saveResultToDatabase(item, testResult, result.equity, result.drawdown);
  } else {
    throw new Error(result.error || 'MT5 backtest failed');
  }
}

/**
 * Process simulated backtest for web mode
 */
async function processSimulatedBacktest(
  item: BulkTestItem,
  get: () => BulkTesterState,
  set: (partial: Partial<BulkTesterState> | ((state: BulkTesterState) => Partial<BulkTesterState>)) => void,
  startTime: number
) {
  // Simulate progress updates
  for (let progress = 0; progress <= 100; progress += 5) {
    // Check if paused or stopped
    if (get().status !== 'running') return;
    
    set(s => ({
      items: s.items.map(i =>
        i.id === item.id ? { ...i, progress } : i
      )
    }));
    
    // Simulate processing time (faster than before for demo)
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  }
  
  // Generate simulated result
  const result = generateSimulatedResult(item);
  const duration = Date.now() - startTime;
  
  // Update item with result
  set(s => ({
    items: s.items.map(i =>
      i.id === item.id 
        ? { 
            ...i, 
            status: 'completed', 
            progress: 100, 
            result,
            duration,
            completedAt: Date.now(),
          } 
        : i
    ),
    currentSession: s.currentSession
      ? { ...s.currentSession, completedCount: s.currentSession.completedCount + 1 }
      : null,
  }));
  
  // Save result to database
  await saveResultToDatabase(item, result);
}

/**
 * Generate simulated result for web mode demo
 */
function generateSimulatedResult(item: BulkTestItem) {
  // Use EA name hash to generate consistent but varied results
  const hash = item.eaName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const seed = (hash % 100) / 100;
  
  const isProfit = seed > 0.3;
  const netProfit = isProfit 
    ? Math.round(1000 + seed * 10000)
    : Math.round(-500 - seed * 3000);
  
  return {
    runId: uuidv4(),
    netProfit,
    profitFactor: isProfit ? 1.2 + seed * 1.5 : 0.5 + seed * 0.4,
    winRate: 40 + seed * 30,
    maxDrawdown: 500 + seed * 2000,
    maxDrawdownPct: 5 + seed * 15,
    totalTrades: 50 + Math.floor(seed * 200),
    sharpeRatio: isProfit ? 0.5 + seed * 2 : -0.5 - seed,
  };
}

/**
 * Save result to database
 */
async function saveResultToDatabase(
  item: BulkTestItem, 
  result: BulkTestItem['result'],
  equity?: number[],
  drawdown?: number[]
) {
  if (!result) return;
  
  try {
    const dbResult: BacktestResult = {
      id: result.runId,
      runId: item.id,
      metrics: {
        netProfit: result.netProfit,
        grossProfit: result.netProfit > 0 ? result.netProfit * 1.3 : 0,
        grossLoss: result.netProfit < 0 ? Math.abs(result.netProfit) * 0.7 : result.netProfit * 0.3,
        maxDrawdown: result.maxDrawdown,
        maxDrawdownPct: result.maxDrawdownPct,
        sharpeRatio: result.sharpeRatio,
        sortinoRatio: result.sharpeRatio * 1.2,
        winRate: result.winRate,
        profitFactor: result.profitFactor,
        totalTrades: result.totalTrades,
        winningTrades: Math.round(result.totalTrades * result.winRate / 100),
        losingTrades: Math.round(result.totalTrades * (1 - result.winRate / 100)),
        avgWin: 100,
        avgLoss: 50,
        avgHoldBars: 24,
        expectancy: result.netProfit / result.totalTrades,
      },
      equity: equity || [],
      drawdown: drawdown || [],
      tradeCount: result.totalTrades,
      summaryTable: {
        symbol: item.symbol,
        timeframe: item.timeframe,
        eaName: item.eaName,
      },
      createdAt: Date.now(),
    };
    
    await db.results.put(dbResult);
    await db.log('info', 'Bulk test result saved', { runId: result.runId, eaName: item.eaName });
  } catch (error) {
    console.error('Failed to save result:', error);
  }
}

// ============= Utility Functions =============

export function getQueueStats(items: BulkTestItem[]) {
  return {
    total: items.length,
    queued: items.filter(i => i.status === 'queued').length,
    running: items.filter(i => i.status === 'running').length,
    completed: items.filter(i => i.status === 'completed').length,
    failed: items.filter(i => i.status === 'failed').length,
    cached: items.filter(i => i.status === 'cached').length,
  };
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
