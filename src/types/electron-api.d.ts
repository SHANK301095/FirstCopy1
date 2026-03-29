/**
 * Electron API type definitions for optional desktop integration.
 * All usage must be optional-chained: window.electronAPI?.methodName()
 * Web build must compile without Electron present.
 * Spec: Phase 2 - Windows Desktop MT5 EA Bulk Runner
 */

// ============= System Types =============

export interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  isPackaged: boolean;
  nodeVersion: string;
}

export interface BackendStatus {
  running: boolean;
  online?: boolean;
  port?: number;
  version?: string;
  cpu_percent?: number;
  memory_available_gb?: number;
  memory_total_gb?: number;
}

export interface AppPaths {
  userData: string;
  documents: string;
  exports: string;
  temp: string;
}

// ============= MT5 Types =============

export interface MT5Paths {
  metaeditor: string | null;
  terminal: string | null;
  dataFolder: string | null;
  detected: boolean;
}

export interface CompileResult {
  success: boolean;
  eaPath: string;
  exePath?: string;
  errors: CompileError[];
  warnings: CompileWarning[];
  logContent: string;
  duration: number;
}

export interface CompileError {
  line: number;
  column?: number;
  message: string;
  file: string;
}

export interface CompileWarning {
  line: number;
  message: string;
  file: string;
}

export interface TesterConfig {
  expert: string;
  expertParameters: string;
  symbol: string;
  period: string;
  fromDate: string;
  toDate: string;
  deposit: number;
  leverage: number;
  model: 'EveryTick' | 'OHLC1Minute' | 'OpenPrices' | 'MathCalculations';
  optimization: 'Disabled' | 'Complete' | 'Genetic' | 'AllSymbols';
  reportPath: string;
}

export interface TesterRunResult {
  success: boolean;
  runId: string;
  reportPath: string;
  metrics?: MT5Metrics;
  equity?: number[];
  drawdown?: number[];
  trades?: MT5Trade[];
  error?: string;
  duration: number;
  cached?: boolean;
}

export interface MT5Metrics {
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  recoveryFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  avgHoldTime: number;
  profitPerMonth: number;
  expectedPayoff: number;
}

export interface MT5Trade {
  ticket: number;
  openTime: number;
  closeTime: number;
  type: 'buy' | 'sell';
  lots: number;
  symbol: string;
  openPrice: number;
  closePrice: number;
  sl: number;
  tp: number;
  profit: number;
  commission: number;
  swap: number;
  comment: string;
}

export interface WorkerDirectory {
  id: string;
  path: string;
  status: 'idle' | 'busy' | 'error';
  currentRunId?: string;
}

// ============= EA Manager Types =============

export interface EAInfo {
  id: string;
  name: string;
  path: string;
  version: string;
  compiled: boolean;
  lastCompiled?: number;
  tags: string[];
  presets: EAPreset[];
  inputsSchema?: Record<string, EAInput>;
}

export interface EAPreset {
  id: string;
  name: string;
  setFilePath: string;
  params: Record<string, unknown>;
  createdAt: number;
}

export interface EAInput {
  name: string;
  type: 'int' | 'double' | 'bool' | 'string' | 'enum';
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

// ============= Excel Export Types =============

export interface ExcelExportOptions {
  filePath: string;
  bulkSetName: string;
  runs: TesterRunResult[];
  eaInfos: Record<string, EAInfo>;
  includeDataQuality?: boolean;
  includeSettings?: boolean;
}

export interface ExcelExportResult {
  success: boolean;
  path: string;
  fallbackUsed: boolean;
  originalPath?: string;
  error?: string;
}

// ============= Electron API Interface =============

export interface ElectronAPI {
  // Platform info
  getPlatform: () => Promise<string>;
  getVersion: () => Promise<string>;
  getSystemInfo: () => Promise<SystemInfo>;
  getPaths: () => Promise<AppPaths>;
  
  // Backend status
  getBackendStatus: () => Promise<BackendStatus>;
  
  // File system operations
  selectExportFolder: () => Promise<string | null>;
  selectFolderDialog: () => Promise<string | null>;
  selectFile: (options?: {
    filters?: Array<{ name: string; extensions: string[] }>;
    multiple?: boolean;
  }) => Promise<string[] | null>;
  
  // File read/write
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  copyFile: (src: string, dest: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  exists: (path: string) => Promise<boolean>;
  mkdir: (path: string) => Promise<void>;
  readDir: (path: string) => Promise<string[]>;
  
  // System operations
  openExternal: (url: string) => Promise<void>;
  showItemInFolder: (path: string) => Promise<void>;
  openPath: (path: string) => Promise<void>;
  
  // App lifecycle
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  
  // ============= MT5 Operations (Phase 2) =============
  
  // MT5 Path Detection
  detectMT5Paths: () => Promise<MT5Paths>;
  setMT5Paths: (paths: Partial<MT5Paths>) => Promise<void>;
  
  // Worker Directory Management
  getWorkerDirectories: () => Promise<WorkerDirectory[]>;
  initializeWorkers: (count: number) => Promise<WorkerDirectory[]>;
  cleanupWorker: (workerId: string) => Promise<void>;
  
  // EA Management
  importEA: (sourcePath: string, eaName: string) => Promise<EAInfo>;
  listEAs: () => Promise<EAInfo[]>;
  deleteEA: (eaId: string) => Promise<void>;
  
  // EA Compilation
  compileEA: (eaPath: string) => Promise<CompileResult>;
  compileAllEAs: () => Promise<CompileResult[]>;
  
  // Preset Management
  importPreset: (eaId: string, setFilePath: string) => Promise<EAPreset>;
  listPresets: (eaId: string) => Promise<EAPreset[]>;
  deletePreset: (eaId: string, presetId: string) => Promise<void>;
  
  // Strategy Tester
  generateTesterINI: (config: TesterConfig, workerId: string) => Promise<string>;
  runTester: (iniPath: string, workerId: string, runId: string) => Promise<TesterRunResult>;
  cancelTesterRun: (workerId: string) => Promise<void>;
  parseReport: (reportPath: string) => Promise<TesterRunResult>;
  
  // Excel Export
  exportToExcel: (options: ExcelExportOptions) => Promise<ExcelExportResult>;
  
  // Debug Bundle
  createDebugBundle: () => Promise<string>;

  // Event Listeners
  onTesterProgress: (callback: (data: { runId: string; progress: number; currentDate: string }) => void) => () => void;
  onMenuOpenCSV: (callback: () => void) => () => void;
  
  // Auto-updater
  checkForUpdates: () => Promise<{ success: boolean; result?: unknown; error?: string }>;
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  installUpdate: () => Promise<{ success: boolean }>;
  getUpdateStatus: () => Promise<{ updateAvailable: boolean; downloadProgress: number }>;
  onUpdateStatus: (callback: (data: { status: string; message: string; data?: unknown }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

/**
 * Helper function to safely access Electron API with type safety.
 * Returns undefined if not running in Electron environment.
 */
export function getElectronAPI(): ElectronAPI | undefined {
  return typeof window !== 'undefined' ? window.electronAPI : undefined;
}

/**
 * Check if running in Electron desktop environment
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}
