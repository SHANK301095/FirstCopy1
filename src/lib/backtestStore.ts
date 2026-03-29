import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CSVColumn {
  name: string;
  mapping: 'timestamp' | 'open' | 'high' | 'low' | 'close' | 'volume' | 'symbol' | 'spread' | 'none';
}

export interface SharedDatasetSettings {
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  aggregateTo?: string;
}

export interface UploadedData {
  fileName: string;
  columns: CSVColumn[];
  rows: Record<string, string | number>[];
  symbols: string[];
  activeSymbol: string;
  timezone: string;
  validationErrors: string[];
  gapCount: number;
  nanCount: number;
  // For public library datasets
  sharedDatasetId?: string;
  sharedDatasetSettings?: SharedDatasetSettings;
}

export interface StrategyState {
  code: string;
  language: 'MQL4' | 'MQL5' | 'PineScript' | 'Pseudocode';
  isValidated: boolean;
  translationStatus: string;
  confidence: number;
}

export interface BacktestSettings {
  symbol: string;
  timeframe: string;
  dateRange: 'last1y' | 'last3y' | 'last5y' | 'last10y' | 'ytd' | 'custom';
  customStartDate: string;
  customEndDate: string;
  commissionPercent: number;
  slippageTicks: number;
  spreadPoints: number;
  riskPerTrade: number;
  maxTradesPerDay: number;
  dailyLossCap: number;
  sessionFilter: boolean;
  sessionStart: string;
  sessionEnd: string;
}

export interface Trade {
  id: string;
  entryTime: string;
  exitTime: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  commission: number;
}

export interface BacktestResult {
  id: string;
  symbol: string;
  dateRange: string;
  winRate: number;
  profitFactor: number;
  expectancyR: number;
  maxDrawdownPercent: number;
  maxDrawdownAmount: number;
  cagr: number;
  sharpeRatio: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  equityCurve: number[];
  drawdownCurve: number[];
  trades: Trade[];
  runAt: string;
}

interface BacktestWorkflowState {
  // Onboarding
  showOnboarding: boolean;
  currentStep: number;
  dismissOnboarding: () => void;
  
  // Data Tab
  uploadedData: UploadedData | null;
  setUploadedData: (data: UploadedData | null) => void;
  updateColumnMapping: (columnName: string, mapping: CSVColumn['mapping']) => void;
  setActiveSymbol: (symbol: string) => void;
  setTimezone: (tz: string) => void;
  isDataValid: () => boolean;
  
  // Strategy Tab
  strategy: StrategyState;
  setStrategyCode: (code: string) => void;
  setStrategyLanguage: (lang: StrategyState['language']) => void;
  validateStrategy: () => void;
  setTranslationStatus: (status: string, confidence: number) => void;
  isStrategyValid: () => boolean;
  
  // Backtest Tab
  settings: BacktestSettings;
  updateSettings: (updates: Partial<BacktestSettings>) => void;
  isRunning: boolean;
  progress: number;
  logs: string[];
  setRunning: (running: boolean, progress?: number) => void;
  addLog: (log: string) => void;
  clearLogs: () => void;
  
  // Results Tab
  results: BacktestResult | null;
  setResults: (results: BacktestResult | null) => void;
}

const defaultSettings: BacktestSettings = {
  symbol: '',
  timeframe: 'H1',
  dateRange: 'last1y',
  customStartDate: '',
  customEndDate: '',
  commissionPercent: 0.01,
  slippageTicks: 1,
  spreadPoints: 0,
  riskPerTrade: 1,
  maxTradesPerDay: 10,
  dailyLossCap: 5,
  sessionFilter: false,
  sessionStart: '09:15',
  sessionEnd: '15:30',
};

export const useBacktestStore = create<BacktestWorkflowState>()(
  persist(
    (set, get) => ({
      // Onboarding
      showOnboarding: true,
      currentStep: 1,
      dismissOnboarding: () => set({ showOnboarding: false }),
      
      // Data
      uploadedData: null,
      setUploadedData: (data) => set({ uploadedData: data }),
      updateColumnMapping: (columnName, mapping) => {
        const data = get().uploadedData;
        if (!data) return;
        set({
          uploadedData: {
            ...data,
            columns: data.columns.map((c) =>
              c.name === columnName ? { ...c, mapping } : c
            ),
          },
        });
      },
      setActiveSymbol: (symbol) => {
        const data = get().uploadedData;
        if (!data) return;
        set({ uploadedData: { ...data, activeSymbol: symbol } });
        set({ settings: { ...get().settings, symbol } });
      },
      setTimezone: (tz) => {
        const data = get().uploadedData;
        if (!data) return;
        set({ uploadedData: { ...data, timezone: tz } });
      },
      isDataValid: () => {
        const data = get().uploadedData;
        if (!data) return false;
        const required = ['timestamp', 'open', 'high', 'low', 'close'];
        const mappings = data.columns.map((c) => c.mapping);
        return required.every((r) => mappings.includes(r as CSVColumn['mapping']));
      },
      
      // Strategy
      strategy: {
        code: '',
        language: 'MQL5',
        isValidated: false,
        translationStatus: '',
        confidence: 0,
      },
      setStrategyCode: (code) =>
        set({ strategy: { ...get().strategy, code, isValidated: false } }),
      setStrategyLanguage: (language) =>
        set({ strategy: { ...get().strategy, language, isValidated: false } }),
      validateStrategy: () => {
        const { code } = get().strategy;
        if (code.trim().length > 50) {
          set({
            strategy: {
              ...get().strategy,
              isValidated: true,
              translationStatus: 'Translated → Python strategy',
              confidence: 0.85,
            },
          });
        }
      },
      setTranslationStatus: (status, confidence) =>
        set({ strategy: { ...get().strategy, translationStatus: status, confidence } }),
      isStrategyValid: () => get().strategy.isValidated && get().strategy.code.trim().length > 0,
      
      // Backtest
      settings: defaultSettings,
      updateSettings: (updates) =>
        set({ settings: { ...get().settings, ...updates } }),
      isRunning: false,
      progress: 0,
      logs: [],
      setRunning: (running, progress = 0) => set({ isRunning: running, progress }),
      addLog: (log) => set({ logs: [...get().logs, `[${new Date().toLocaleTimeString()}] ${log}`] }),
      clearLogs: () => set({ logs: [] }),
      
      // Results
      results: null,
      setResults: (results) => set({ results }),
    }),
    { name: 'backtest-workflow-storage' }
  )
);
