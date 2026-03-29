/**
 * MMC Feature Capabilities Map
 * Single source of truth for feature states
 */

export type FeatureState = 'implemented' | 'comingSoon' | 'notAvailable';

export interface FeatureInfo {
  key: string;
  name: string;
  state: FeatureState;
  description?: string;
  navigation?: string;
  desktopOnly?: boolean;
}

export const CAPABILITIES: Record<string, FeatureInfo> = {
  // Data Management
  dataImport: {
    key: 'dataImport',
    name: 'Data Import (CSV)',
    state: 'implemented',
    description: 'Upload CSV files with OHLCV data',
    navigation: 'Data Manager → Import Dataset',
  },
  dataManager: {
    key: 'dataManager',
    name: 'Data Manager',
    state: 'implemented',
    description: 'Organize datasets by symbol folders',
    navigation: 'Data Manager',
  },
  columnMapping: {
    key: 'columnMapping',
    name: 'Column Mapping',
    state: 'implemented',
    description: 'Map CSV columns to OHLCV format',
    navigation: 'Data Manager → Import → Column Mapping',
  },
  
  // Strategy
  strategyLibrary: {
    key: 'strategyLibrary',
    name: 'Strategy Library',
    state: 'implemented',
    description: 'Create and save trading strategies',
    navigation: 'Strategy Library',
  },
  strategyVersioning: {
    key: 'strategyVersioning',
    name: 'Strategy Versioning',
    state: 'implemented',
    description: 'Track changes to strategies over time',
    navigation: 'Strategy Library → View Versions',
  },
  strategyMarketplace: {
    key: 'strategyMarketplace',
    name: 'Strategy Marketplace',
    state: 'comingSoon',
    description: 'Buy/sell strategies from other users',
  },
  
  // Backtesting
  backtesting: {
    key: 'backtesting',
    name: 'Backtesting',
    state: 'implemented',
    description: 'Run backtests on historical data',
    navigation: 'Backtests → Run Backtest',
  },
  resultsView: {
    key: 'resultsView',
    name: 'Results View',
    state: 'implemented',
    description: 'View detailed backtest results',
    navigation: 'Backtests → Results',
  },
  batchBacktests: {
    key: 'batchBacktests',
    name: 'Batch Backtests',
    state: 'implemented',
    description: 'Run multiple backtests at once',
    navigation: 'Batches',
    desktopOnly: true,
  },
  
  // Analytics
  analytics: {
    key: 'analytics',
    name: 'Analytics',
    state: 'implemented',
    description: 'Performance charts and metrics',
    navigation: 'Analytics',
  },
  equityChart: {
    key: 'equityChart',
    name: 'Equity Chart',
    state: 'implemented',
    description: 'Visualize equity curve over time',
    navigation: 'Analytics → Equity Curve',
  },
  monthlyHeatmap: {
    key: 'monthlyHeatmap',
    name: 'Monthly Heatmap',
    state: 'implemented',
    description: 'Monthly returns visualization',
    navigation: 'Analytics → Monthly Heatmap',
  },
  monteCarlo: {
    key: 'monteCarlo',
    name: 'Monte Carlo Simulation',
    state: 'implemented',
    description: 'Risk simulation with random sampling',
    navigation: 'Monte Carlo',
  },
  walkForward: {
    key: 'walkForward',
    name: 'Walk Forward Analysis',
    state: 'implemented',
    description: 'Out-of-sample testing',
    navigation: 'Walk Forward',
  },
  
  // Export
  exportExcel: {
    key: 'exportExcel',
    name: 'Export to Excel',
    state: 'implemented',
    description: 'Download results as Excel file',
    navigation: 'Results → Export → Excel',
  },
  exportPdf: {
    key: 'exportPdf',
    name: 'Export to PDF',
    state: 'implemented',
    description: 'Generate PDF report',
    navigation: 'Results → Export → PDF',
  },
  
  // Risk & Portfolio
  riskDashboard: {
    key: 'riskDashboard',
    name: 'Risk Dashboard',
    state: 'implemented',
    description: 'Risk metrics and position sizing',
    navigation: 'Risk Dashboard',
  },
  positionSizing: {
    key: 'positionSizing',
    name: 'Position Sizing',
    state: 'implemented',
    description: 'Calculate optimal position sizes',
    navigation: 'Position Sizing',
  },
  portfolioBuilder: {
    key: 'portfolioBuilder',
    name: 'Portfolio Builder',
    state: 'implemented',
    description: 'Combine multiple strategies',
    navigation: 'Portfolio Builder',
  },
  correlationMatrix: {
    key: 'correlationMatrix',
    name: 'Correlation Matrix',
    state: 'implemented',
    description: 'Analyze strategy correlations',
    navigation: 'Portfolio Builder → Correlation',
  },
  
  // Cloud & Sync
  cloudSync: {
    key: 'cloudSync',
    name: 'Cloud Sync',
    state: 'implemented',
    description: 'Sync data across devices',
    navigation: 'Automatic when logged in',
  },
  offlineSupport: {
    key: 'offlineSupport',
    name: 'Offline Support',
    state: 'implemented',
    description: 'Work without internet',
    navigation: 'Automatic',
  },
  backupRestore: {
    key: 'backupRestore',
    name: 'Backup & Restore',
    state: 'implemented',
    description: 'Local data backup',
    navigation: 'Settings → Backup',
  },
  
  // External Integrations (Coming Soon)
  tradingviewAutoImport: {
    key: 'tradingviewAutoImport',
    name: 'TradingView Auto-Import',
    state: 'comingSoon',
    description: 'Automatic data import from TradingView',
  },
  mt5DesktopModule: {
    key: 'mt5DesktopModule',
    name: 'MT5 Desktop Module',
    state: 'comingSoon',
    description: 'Run backtests using MT5 on desktop',
    desktopOnly: true,
  },
  liveTradingBridge: {
    key: 'liveTradingBridge',
    name: 'Live Trading Bridge',
    state: 'comingSoon',
    description: 'Connect to live trading',
  },
  brokerApiIntegration: {
    key: 'brokerApiIntegration',
    name: 'Broker API Integration',
    state: 'comingSoon',
    description: 'Connect to broker APIs',
  },
  
  // Not Available (Out of Scope)
  tradingSignals: {
    key: 'tradingSignals',
    name: 'Trading Signals',
    state: 'notAvailable',
    description: 'MMC does not provide trading signals',
  },
  buySellCalls: {
    key: 'buySellCalls',
    name: 'Buy/Sell Calls',
    state: 'notAvailable',
    description: 'MMC does not give buy/sell advice',
  },
  marketPredictions: {
    key: 'marketPredictions',
    name: 'Market Predictions',
    state: 'notAvailable',
    description: 'MMC does not predict markets',
  },
  portfolioRecommendations: {
    key: 'portfolioRecommendations',
    name: 'Portfolio Recommendations',
    state: 'notAvailable',
    description: 'MMC does not recommend portfolios',
  },
};

// Helper to get capability by key
export function getCapability(key: string): FeatureInfo | null {
  return CAPABILITIES[key] || null;
}

// Helper to get all capabilities by state
export function getCapabilitiesByState(state: FeatureState): FeatureInfo[] {
  return Object.values(CAPABILITIES).filter(c => c.state === state);
}

// Check if message contains credential patterns
export function containsCredentials(message: string): boolean {
  const lower = message.toLowerCase();
  const patterns = [
    /password\s*[:=]\s*\S+/i,
    /api[_\s]?key\s*[:=]\s*\S+/i,
    /secret\s*[:=]\s*\S+/i,
    /token\s*[:=]\s*\S+/i,
    /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\s*[:]\s*\S+/i, // email:password pattern
  ];
  
  return patterns.some(p => p.test(message));
}

// Security warning response
export const CREDENTIAL_WARNING = `**Security Warning**

Please do NOT share passwords, API keys, or credentials in chat.

If you've shared sensitive information:
1. Immediately change your password/API key
2. Revoke any exposed tokens
3. Contact support for assistance

For account help:
→ Go to Settings → Account → Change Password

Contact us: /contact`;
