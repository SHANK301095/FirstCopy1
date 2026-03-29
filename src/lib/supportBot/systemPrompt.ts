import { MMC_COPILOT_SYSTEM_PROMPT } from '@/lib/copilotConfig';

export const CONTACT_URL = "/contact";

// Re-export for easy access
export { MMC_COPILOT_SYSTEM_PROMPT };

// Feature states for product awareness
export const FEATURE_STATES = {
  // Implemented features
  implemented: [
    'csv_import', 'data_manager', 'strategy_library', 'backtesting', 'results_view',
    'analytics', 'equity_chart', 'monthly_heatmap', 'export_excel', 'export_pdf',
    'settings', 'theme_toggle', 'keyboard_shortcuts', 'command_palette',
    'risk_dashboard', 'position_sizing', 'trade_journal',
    'portfolio_builder', 'correlation_matrix', 'monte_carlo', 'walk_forward',
    'cloud_sync', 'offline_support', 'backup_restore',
    // NEW FEATURES
    'dataset_quality', 'quality_scan', 'bulk_quality_scan', 'quality_report',
    'scanner', 'screener', 'rule_builder', 'signal_export',
    'trade_explorer', 'trade_filters', 'trade_export',
    'tearsheet', 'performance_report', 'pdf_export',
    'presets_manager', 'cost_model_presets', 'session_presets',
    'collapsible_sidebar', 'sidebar_animations'
  ],
  // Coming soon features
  comingSoon: [
    'tradingview_auto_import', 'mt5_desktop_module', 'live_trading_bridge',
    'broker_api_integration', 'mobile_app', 'strategy_marketplace_paid',
    'ai_strategy_suggestions', 'social_trading', 'copy_trading',
    'alerts', 'push_notifications', 'realtime_alerts',
    'backtest_from_signals', 'advanced_risk_models'
  ],
  // Not available / out of scope
  notAvailable: [
    'trading_signals', 'buy_sell_calls', 'portfolio_recommendations',
    'market_predictions', 'stock_tips', 'crypto_advice'
  ]
} as const;

export const MMC_SUPPORT_SYSTEM_PROMPT = `You are "MMC Assistant" — a product-aware, security-conscious support chatbot for MMC (Money Making Machine), an advanced trading intelligence and backtesting platform.

===========================================
CRITICAL RULES (NON-NEGOTIABLE)
===========================================

## 1. SCOPE LIMITATION
You MUST answer ONLY questions related to:
- MMC app features and workflows
- Data upload, backtesting, strategies, results
- Navigation and UI guidance
- Account usage and settings
- Troubleshooting MMC issues

You MUST NOT answer:
- Trading advice or stock tips
- Market predictions or analysis
- Investment suggestions
- Personal finance questions
- Anything outside MMC app

If a question is outside scope:
→ Respond: "I can help only with MMC platform features and usage. For further assistance, please visit the Contact Us page: ${CONTACT_URL}"

## 2. NO HALLUCINATIONS
- If you are unsure or the feature is not implemented, clearly say "This feature is not available yet" or "Coming Soon"
- Never assume or invent features that don't exist
- When in doubt, direct to Contact Us

## 3. PRODUCT STATE AWARENESS

### IMPLEMENTED (Available Now):

**Data Management:**
- CSV data import with column mapping
- Dataset management with symbol folders
- Dataset Quality Dashboard (gaps, duplicates, outliers, invalid candles)
- Bulk quality scan for all datasets
- Quality score badges (Excellent/Fair/Poor)
- Export quality reports (JSON/CSV)

**Strategy & Backtesting:**
- Strategy library with versioning
- Backtesting engine with detailed results
- Trade Explorer with filters (date, direction, P&L, duration)
- Virtual scrolling for large trade lists
- Export trades CSV + summary JSON

**Scanner/Screener (NEW):**
- Rule-based dataset scanning
- Indicator rules: RSI, EMA, SMA, ATR, Volume change
- Price rules: Close > High/Low, Candle %, Gap detection
- AND/OR rule combinations (up to 5 rules)
- Signal export CSV
- Progress tracking + cancel support

**Analytics & Reports:**
- Equity curves with benchmarks
- Monthly returns heatmap
- Drawdown analysis
- Tearsheet / Performance reports (NEW)
- Rolling metrics
- PDF/HTML/CSV export

**Portfolio & Risk:**
- Portfolio Builder with correlation matrix
- Risk Dashboard
- Position Sizing calculator
- Trade Journal

**Presets (NEW):**
- Cost model presets (commission, slippage, spread)
- Session/timezone presets
- Save, rename, delete presets
- Apply to new runs

**System:**
- Cloud sync across devices
- Offline support with local backup
- Collapsible sidebar navigation (NEW)
- Animated UI transitions (NEW)

### COMING SOON (Not Yet Available):
- TradingView auto-import (manual CSV only for now)
- MT5 Desktop Module for automated data
- Live trading bridge
- Broker API integrations
- Mobile app
- Alerts & Push notifications
- Strategy marketplace with paid strategies
- AI-powered strategy suggestions
- Create backtest from scanner signals

### NOT AVAILABLE (Out of Scope - Never Promise):
- Trading signals or buy/sell calls
- Market predictions
- Stock/crypto tips
- Portfolio recommendations

## 4. ACTION-ORIENTED ANSWERS
Every answer MUST end with a clear next step:
- "Go to Data Manager → Upload CSV"
- "Open Results → Trade Explorer tab"
- "Go to Scanner → Configure rules → Run"
- "Visit Settings → Presets Manager"
- "Contact Us: ${CONTACT_URL}"

## 5. TONE & STYLE
- Professional, calm, confident
- Short paragraphs or bullet points (max 5 bullets)
- No emojis in responses
- Address user as "Aap" (Hinglish friendly)
- MMC is an AI-engineered trading intelligence platform — reflect that tone

## 6. FALLBACK BEHAVIOR
If the answer is unknown or user needs human help:
→ Say: "I'm not fully sure about this. Please contact us: ${CONTACT_URL}"
→ Do NOT attempt to guess

## 7. SECURITY & PRIVACY
- Never ask for passwords, API keys, or personal information
- If user shares credentials, immediately warn them:
  "Please reset your password/API key immediately. Never share credentials in chat. Contact us: ${CONTACT_URL}"

===========================================
RESPONSE TEMPLATE
===========================================

[1-line direct answer]

[2-4 bullet steps if needed]

Status: Implemented / Coming Soon / Not Available

Next step:
→ [Exact navigation path in MMC]

===========================================
MMC NAVIGATION REFERENCE
===========================================

### Core (Always Visible)
- **Home**: Dashboard overview
- **Dashboard**: Quick stats
- **MMC Sentinel**: AI assistant

### Backtesting Section (Dropdown)
- **Data Manager**: Upload and organize datasets, Quality tab
- **Strategy Library**: Create and save strategies
- **Run Backtest**: Execute backtests
- **Results**: View results, Trade Explorer
- **Templates**: Pre-built workflows

### Analysis Section (Dropdown)
- **Optimizer**: Parameter optimization
- **Walk-Forward**: Out-of-sample testing
- **Analytics**: Performance charts
- **Patterns**: Pattern recognition
- **Compare**: Quick comparison
- **Scanner**: Rule-based screener (NEW)
- **Tearsheet**: Performance reports (NEW)
- **Reports**: Generate reports

### Trading Section (Dropdown)
- **Portfolio**: Portfolio builder
- **Risk Dashboard**: Risk metrics
- **Position Sizing**: Size calculator
- **Execution**: Trade execution
- **Paper Trading**: Simulated trading
- **Journal**: Trade log
- **Alerts**: Coming Soon

### Marketplace (Dropdown)
- **Marketplace**: Strategy store
- **EA Manager**: Expert advisors

### System (Dropdown)
- **Cloud Sync**: Data sync
- **Strategy Versions**: Version history
- **Workspace**: Team collaboration
- **Tutorials**: Learning center
- **App Guide**: Documentation
- **Achievements**: Gamification
- **Settings**: Preferences, Presets Manager (NEW)
- **Desktop**: Desktop app settings

### Keyboard Shortcuts
- Ctrl+K / Cmd+K: Open Command Palette
- Click logo: Go to Home

Remember: You are the official MMC product assistant. You are NOT a trading advisor.`;

// Intent-based fallback responses for offline/no-AI mode
export const INTENT_RESPONSES: Record<string, string> = {
  quality: `**Dataset Quality Help**

The Quality Dashboard analyzes your datasets for issues:

1. Go to Data Manager from sidebar
2. Select a dataset
3. Click on "Quality" tab
4. Click "Scan Now" to analyze

Quality checks include:
- Gaps (time discontinuities)
- Duplicate timestamps
- Invalid candles (missing OHLCV)
- Outliers detection
- Quality score badge

For bulk scan: Quality tab → "Scan All" button

Status: Implemented

Next step:
→ Go to Data Manager → Select Dataset → Quality tab

Still need help? Contact us: ${CONTACT_URL}`,

  scanner: `**Scanner/Screener Help**

Build rule-based scans on your data:

1. Go to Scanner from sidebar (Analysis section)
2. Select a dataset
3. Set date range
4. Add rules (up to 5):
   - RSI, EMA, SMA, ATR, Volume
   - Price conditions, Gaps
5. Choose AND/OR logic
6. Click "Run Scan"

Export results as CSV for further analysis.

Status: Implemented

Next step:
→ Go to Scanner → Configure Rules → Run

Still need help? Contact us: ${CONTACT_URL}`,

  tearsheet: `**Tearsheet / Reports Help**

Generate professional performance reports:

1. Go to Tearsheet from sidebar (Analysis section)
2. Select a backtest result
3. View: Equity curve, Drawdown, Monthly heatmap
4. See key stats: Return, Max DD, Win rate, Profit factor
5. Export as PDF, HTML, or CSV

Status: Implemented

Next step:
→ Go to Tearsheet → Select Result → Export

Still need help? Contact us: ${CONTACT_URL}`,

  trade_explorer: `**Trade Explorer Help**

Analyze individual trades from backtest results:

1. Go to Results from sidebar
2. Select a backtest result
3. Click "Trade Explorer" tab
4. Use filters:
   - Date range
   - Long/Short direction
   - Weekday
   - P&L (profit/loss)
   - Duration
5. Sort by any column
6. Export trades as CSV

Status: Implemented

Next step:
→ Go to Results → Select Backtest → Trade Explorer

Still need help? Contact us: ${CONTACT_URL}`,

  presets: `**Presets Manager Help**

Save and manage configuration presets:

1. Go to Settings from sidebar
2. Find "Presets Manager" section
3. Available presets:
   - Cost Model: Commission, slippage, spread
   - Session/Timezone settings
   - Risk Model (Coming Soon)
4. Save, rename, delete presets
5. Apply to new backtest runs

Status: Implemented

Next step:
→ Go to Settings → Presets Manager

Still need help? Contact us: ${CONTACT_URL}`,

  import: `**Data Import Help**

1. Go to Data Manager from sidebar
2. Click "Import Dataset" button
3. Select your CSV file
4. Map columns (timestamp, open, high, low, close, volume)
5. Choose symbol folder and save

Status: Implemented

Supported formats: CSV, Excel, MT4/MT5 reports

Next step:
→ Go to Data Manager → Import Dataset

Still need help? Contact us: ${CONTACT_URL}`,

  backtest: `**Backtest Help**

1. Go to "Run Backtest" from sidebar
2. Select a saved dataset from dropdown
3. Select a saved strategy from dropdown
4. Set parameters (date range, initial capital)
5. Click "Run Backtest"

Status: Implemented

Note: Dataset and strategy must be saved first.

Next step:
→ Go to Run Backtest → Select Dataset → Select Strategy → Run

Still need help? Contact us: ${CONTACT_URL}`,

  export: `**Export Help**

1. Go to Results page
2. Click "Export" button (top-right)
3. Choose format: Excel, PDF, or CSV
4. Select what to include
5. Click Download

Status: Implemented

For export presets: Settings → Export Options

Next step:
→ Go to Results → Export

Still need help? Contact us: ${CONTACT_URL}`,

  settings: `**Settings Help**

Go to Settings from sidebar:

- General: Theme, language, display preferences
- Presets Manager: Cost model, session, risk presets (NEW)
- Export: Export presets and formats
- Account: Profile and password
- Backup: Local data backup/restore

Status: Implemented

Next step:
→ Go to Settings

Still need help? Contact us: ${CONTACT_URL}`,

  strategy: `**Strategy Help**

1. Go to Strategy Library from sidebar
2. Click "Create Strategy" or select existing
3. Configure parameters (entry/exit rules)
4. Save your strategy
5. Use it in backtests

Status: Implemented

Next step:
→ Go to Strategy Library → Create Strategy

Still need help? Contact us: ${CONTACT_URL}`,

  analytics: `**Analytics Help**

Go to Analytics from sidebar:

- Equity curves and performance charts
- Drawdown analysis
- Monthly returns heatmap
- Win/loss statistics
- Trade distribution

For tearsheet reports: Go to Tearsheet page

Status: Implemented

Next step:
→ Go to Analytics

Still need help? Contact us: ${CONTACT_URL}`,

  alerts: `**Alerts Feature**

Status: Coming Soon

The Alerts feature is currently in development and will include:
- Drawdown threshold alerts
- Equity curve notifications
- Push notifications
- Email alerts

This feature is not yet available.

Next step:
→ Check back soon for updates

Still need help? Contact us: ${CONTACT_URL}`,

  sidebar: `**Sidebar Navigation Help**

The sidebar has been updated with a new design:

- **Core section**: Always visible (Home, Dashboard, Sentinel)
- **Other sections**: Collapsible with dropdown arrows
- Click section header to expand/collapse
- Active page's section auto-expands
- Smooth animations on open/close

Sections: Backtesting, Analysis, Trading, Marketplace, System

Status: Implemented

Next step:
→ Click any section header to expand/collapse

Still need help? Contact us: ${CONTACT_URL}`,

  tradingview: `**TradingView Data Import**

Status: Coming Soon (Auto-import not available)

Current options:
1. Manual CSV export from TradingView (paid plan required)
2. Upload broker/NSE data CSV directly
3. MT5 Desktop Module (coming soon)

TradingView does not provide reliable automated bulk export. We recommend using broker data or manual CSV export.

Next step:
→ Go to Data Manager → Import CSV manually

Still need help? Contact us: ${CONTACT_URL}`,

  sync: `**Cloud Sync Help**

Your data syncs automatically across devices when logged in.

If data not appearing:
1. Check you're logged in with same account
2. Wait for sync to complete (check sync indicator)
3. Pull-to-refresh or reload page
4. Check internet connection

Status: Implemented

Next step:
→ Logout and login again to force sync

Still need help? Contact us: ${CONTACT_URL}`,

  missing_data: `**Dataset Not Visible - Troubleshooting**

Possible reasons:
1. Not logged in (data saved locally only)
2. Cloud sync pending (wait for completion)
3. Dataset filter active (check filters)
4. Wrong symbol folder selected

Steps to fix:
1. Ensure you're logged in
2. Check sync status indicator
3. Clear all filters
4. Refresh the page

Status: This is a sync issue, feature is Implemented

Next step:
→ Go to Data Manager → Check filters → Refresh

Still need help? Contact us: ${CONTACT_URL}`,

  bug: `**Bug Report**

Please share:
1. Which page/screen? (e.g., Backtests, Results)
2. Exact error text? (copy-paste if possible)
3. What were you trying to do? (1 sentence)

Basic troubleshooting:
- Refresh the page (F5)
- Clear browser cache
- Re-login to the app
- Check internet connection

Next step:
→ Contact us with details: ${CONTACT_URL}`,

  password: `**Security Warning**

Please do NOT share passwords, OTPs, or API keys in chat.

If you've shared sensitive info:
1. Immediately change your password
2. Reset any API keys
3. Contact support for help

For password help:
→ Go to Settings → Account → Change Password

Contact us: ${CONTACT_URL}`,

  trading_advice: `**Out of Scope**

I can help only with MMC platform features and usage.

I cannot provide:
- Trading advice or signals
- Stock/crypto recommendations
- Market predictions
- Investment suggestions

For trading decisions, please consult a qualified financial advisor.

For MMC app help, I'm here for you.

Contact us: ${CONTACT_URL}`,

  help: `**MMC App Help**

Main features:
- Data Manager: Upload datasets, Quality scans (NEW)
- Strategy Library: Create trading strategies
- Backtests: Run and analyze backtests
- Trade Explorer: Detailed trade analysis (NEW)
- Scanner: Rule-based screener (NEW)
- Tearsheet: Performance reports (NEW)
- Analytics: Charts and metrics
- Risk Dashboard: Risk management
- Presets: Save configurations (NEW)
- Settings: App configuration

Quick navigation: Press Ctrl+K or Cmd+K

Next step:
→ What would you like help with?

Contact us: ${CONTACT_URL}`,

  default: `I'm here to help with MMC app questions only.

Common topics:
- Data import/export and quality scans
- Running backtests and trade analysis
- Scanner/screener configuration
- Tearsheet and reports
- Strategy configuration
- Analytics and performance
- Presets and settings

What would you like help with?

For other queries, contact us: ${CONTACT_URL}`,
};

// Function to detect intent from message
export function detectIntent(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Security check first
  if (
    lowerMessage.includes('password') ||
    lowerMessage.includes('otp') ||
    lowerMessage.includes('api key') ||
    lowerMessage.includes('secret') ||
    lowerMessage.includes('credential')
  ) {
    return 'password';
  }

  // Out of scope: trading advice
  if (
    lowerMessage.includes('which stock') ||
    lowerMessage.includes('buy or sell') ||
    lowerMessage.includes('should i invest') ||
    lowerMessage.includes('market prediction') ||
    lowerMessage.includes('stock tip') ||
    lowerMessage.includes('crypto tip') ||
    lowerMessage.includes('trading signal')
  ) {
    return 'trading_advice';
  }

  // NEW FEATURES - check first
  if (lowerMessage.includes('quality') || lowerMessage.includes('scan') || lowerMessage.includes('gaps') || lowerMessage.includes('duplicate') || lowerMessage.includes('outlier')) {
    return 'quality';
  }
  if (lowerMessage.includes('scanner') || lowerMessage.includes('screener') || lowerMessage.includes('rule') || lowerMessage.includes('signal')) {
    return 'scanner';
  }
  if (lowerMessage.includes('tearsheet') || lowerMessage.includes('report') || lowerMessage.includes('pdf')) {
    return 'tearsheet';
  }
  if (lowerMessage.includes('trade explorer') || lowerMessage.includes('trades') || lowerMessage.includes('trade filter')) {
    return 'trade_explorer';
  }
  if (lowerMessage.includes('preset') || lowerMessage.includes('cost model') || lowerMessage.includes('slippage') || lowerMessage.includes('commission')) {
    return 'presets';
  }
  if (lowerMessage.includes('sidebar') || lowerMessage.includes('navigation') || lowerMessage.includes('menu') || lowerMessage.includes('collapse') || lowerMessage.includes('dropdown')) {
    return 'sidebar';
  }
  if (lowerMessage.includes('alert') || lowerMessage.includes('notification')) {
    return 'alerts';
  }

  // TradingView specific
  if (lowerMessage.includes('tradingview') || lowerMessage.includes('trading view')) {
    return 'tradingview';
  }

  // Sync/visibility issues
  if (
    lowerMessage.includes('not visible') ||
    lowerMessage.includes('not showing') ||
    lowerMessage.includes('missing') ||
    lowerMessage.includes('disappeared') ||
    lowerMessage.includes('can\'t see') ||
    lowerMessage.includes('cannot see')
  ) {
    return 'missing_data';
  }

  // Sync
  if (lowerMessage.includes('sync') || lowerMessage.includes('cloud') || lowerMessage.includes('device')) {
    return 'sync';
  }
  
  // Intent matching
  if (lowerMessage.includes('import') || lowerMessage.includes('csv') || lowerMessage.includes('upload') || lowerMessage.includes('data')) {
    return 'import';
  }
  if (lowerMessage.includes('backtest') || lowerMessage.includes('run') || lowerMessage.includes('test') || lowerMessage.includes('queue')) {
    return 'backtest';
  }
  if (lowerMessage.includes('export') || lowerMessage.includes('excel') || lowerMessage.includes('download')) {
    return 'export';
  }
  if (lowerMessage.includes('setting') || lowerMessage.includes('config')) {
    return 'settings';
  }
  if (lowerMessage.includes('strategy') || lowerMessage.includes('parameter')) {
    return 'strategy';
  }
  if (lowerMessage.includes('analytics') || lowerMessage.includes('chart') || lowerMessage.includes('graph') || lowerMessage.includes('performance')) {
    return 'analytics';
  }
  if (lowerMessage.includes('bug') || lowerMessage.includes('error') || lowerMessage.includes('crash') || lowerMessage.includes('problem') || lowerMessage.includes('issue')) {
    return 'bug';
  }
  if (lowerMessage.includes('help') || lowerMessage.includes('how') || lowerMessage.includes('what') || lowerMessage.includes('kaise') || lowerMessage.includes('kya')) {
    return 'help';
  }
  
  return 'default';
}

// Check if a feature is available
export function getFeatureStatus(featureKey: string): 'implemented' | 'comingSoon' | 'notAvailable' | 'unknown' {
  if (FEATURE_STATES.implemented.includes(featureKey as any)) return 'implemented';
  if (FEATURE_STATES.comingSoon.includes(featureKey as any)) return 'comingSoon';
  if (FEATURE_STATES.notAvailable.includes(featureKey as any)) return 'notAvailable';
  return 'unknown';
}
