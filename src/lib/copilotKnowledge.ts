// MMC Copilot App Knowledge and Evaluation Scorecard
// COMPREHENSIVE platform documentation - Makes Copilot an EXPERT on every feature
// This is injected into assistant context at runtime (system/developer level)
// NOT shown to normal users

export const MMC_COPILOT_APP_KNOWLEDGE_AND_SCORECARD = `MMC APP CONTEXT (WEB-ONLY) - EXPERT KNOWLEDGE BASE

===========================================
APP IDENTITY & MISSION
===========================================

- Full Name: Money Making Machine (MMC)
- Version: 3.0.0 | Last Updated: January 2026
- Tagline: "Build your edge. Own your process."
- Mission: To democratize algorithmic trading by providing retail traders with the same powerful backtesting tools used by hedge funds and institutional traders.
- Purpose: Professional-grade trading strategy development, backtesting, and optimization platform
- Target Users: Algo traders, quant traders, discretionary traders looking to systematize
- Design Philosophy: Finance-grade, calm-dark fintech aesthetic with Inter font family

===========================================
CORE USER JOURNEY
===========================================

Primary Flow: Data → Strategy → Backtest → Results → Optimize → Validate → Deploy

Detailed Steps:
1. IMPORT DATA: Upload CSV with OHLCV → Column mapping → Quality scan
2. CREATE/SELECT STRATEGY: Use template or paste MQL5/Pine code → Validate
3. CONFIGURE BACKTEST: Set params, costs, date range → Run
4. ANALYZE RESULTS: Equity curve, trades, metrics → Export tearsheet
5. OPTIMIZE PARAMS: Grid/Genetic/PSO → Find best params
6. VALIDATE ROBUSTNESS: Walk-Forward + Monte Carlo → Check overfitting
7. DEPLOY: Paper Trading → Live (Zerodha Kite)

===========================================
COMPLETE FEATURE DOCUMENTATION
===========================================

## 1. DATA MANAGEMENT (/data, /import)

### CSV Import
- Auto-detection of columns: Date/Time, Open, High, Low, Close, Volume
- Supported formats: CSV, Excel (.xlsx), MT5 HTML reports, broker statements
- Column mapping modal with preview (first 20 rows)
- Date format detection: ISO 8601, YYYY-MM-DD HH:mm:ss, DD/MM/YYYY, Unix timestamps
- Timezone handling: Source timezone → Target (UTC recommended)
- Merge modes: Append, Replace, Smart merge (detect overlaps)

### Dataset Quality Scanner
- Gap detection: Missing bars between timestamps
- Duplicate detection: Same timestamp rows
- Outlier detection: Price spikes > 3 std dev
- Invalid candles: High < Low, negative prices
- Quality score: Excellent (>90%), Fair (70-90%), Poor (<70%)
- Fix suggestions panel with auto-repair options

### Dataset Management
- Symbol folders organization
- Coverage heatmap: Visual data availability
- Bulk actions: Multi-select delete, tag, export
- Dataset tags: Custom labels for organization
- Dataset comparison: Side-by-side metrics
- Preview modal: First 100 rows with stats
- Lineage tracking: Track data sources and transforms

### Troubleshooting Data Issues
- "Import failed": Check column mapping, date format, delimiter (comma/semicolon)
- "Data empty after import": Check date range filter, timezone offset
- "Gaps detected": Re-download missing periods or interpolate
- "Duplicates found": Auto-remove keeps first occurrence

## 2. STRATEGY LIBRARY (/strategies, /strategy-library)

### Code Editor
- Monaco Editor with syntax highlighting
- Supported languages: MQL5, MQL4, PineScript, Pseudo-code
- Real-time syntax validation
- Auto-complete for common functions
- Code folding and minimap

### Version Control
- Save versions with change notes
- Visual diff viewer (side-by-side)
- Restore any previous version
- Version comparison
- Change history timeline

### Templates
- 15+ pre-built templates:
  - Moving Average Crossover (SMA, EMA)
  - RSI Overbought/Oversold
  - MACD Signal Cross
  - Bollinger Band Bounce
  - Breakout Strategy
  - Mean Reversion
  - Trend Following
  - Grid Trading
  - Martingale (with risk warnings)
  - And more...

### Strategy Parameters
- Define input parameters with:
  - Name, type (int/double/string/bool)
  - Default value
  - Min/Max range for optimization
  - Step size
- Parameter validation
- Presets save/load

### Sharing & Collaboration
- Generate shareable links
- Export strategy as file
- Publish to marketplace
- Private/Public visibility

## 3. BACKTESTING (/workflow, /backtests)

### Backtest Configuration
- Dataset selection: Filter by symbol, timeframe
- Strategy selection: From library
- Date range: Custom or preset (YTD, 1Y, 3Y, Max)
- Initial capital: Multi-currency support
- Cost model:
  - Spread (fixed or variable)
  - Commission (per lot or per trade)
  - Slippage (fixed pips)
  - Swap rates (optional)

### Execution Models
- Bar-close execution (default, faster)
- OHLC simulation (more accurate)
- Tick-level (if tick data available)

### Live Progress
- Real-time equity curve during run
- Progress percentage and ETA
- Trade count live update
- Cancel button for long runs

### Background Processing
- Queue multiple backtests
- Run in Web Workers (non-blocking)
- Auto-recovery after browser crash
- Batch queue for param combinations

### Parameter Presets
- Save/load cost model presets
- Session/timezone presets
- Quick apply to new runs

### Troubleshooting Backtests
- "Backtest slow": Reduce date range, use less data, enable Web Workers
- "No trades generated": Check entry/exit conditions, data range
- "Results blank": Check RLS, network response, date filters
- "Engine timeout": Large dataset - try chunking

## 4. RESULTS & ANALYTICS (/saved-results, /analytics)

### Trade Explorer
- Filter trades by:
  - Date range
  - Direction (Long/Short)
  - Weekday
  - Hour of day
  - P/L (profit/loss)
  - Duration
- Sort by any column
- Virtual scrolling for large lists
- Export trades CSV

### Equity Chart
- Interactive with zoom/pan
- Annotations support
- Benchmark comparison (Buy & Hold)
- Drawdown overlay
- Multiple result overlay

### Drawdown Analysis
- Max drawdown depth
- Max drawdown duration
- Recovery time
- Underwater chart
- Drawdown distribution

### Monthly Heatmap
- Returns by month/year
- Color-coded (green profit, red loss)
- Hover for exact values
- Export as image

### Streak Visualization
- Win/loss streak identification
- Longest winning streak
- Longest losing streak
- Streak distribution chart

### Trade Notes
- Add notes to individual trades
- Tag trades for review
- Export with notes

### Key Metrics Calculated
- Net Profit / Net Profit %
- Gross Profit / Gross Loss
- Profit Factor
- Win Rate / Loss Rate
- Average Win / Average Loss
- Max Consecutive Wins/Losses
- Max Drawdown ($ and %)
- Sharpe Ratio
- Sortino Ratio
- Calmar Ratio
- Recovery Factor
- Expectancy
- CAGR
- Total Trades
- Average Trade Duration

## 5. ADVANCED ANALYTICS (/advanced-analytics)

### Monte Carlo Simulation
- Iterations: 1000 to 10000
- Confidence bands: 90%, 95%, 99%
- Outputs:
  - Expected return distribution
  - Drawdown probability distribution
  - Ruin probability
  - Best/Worst/Median equity paths
- Interpretation: If 95% worst-case DD > tolerance → reduce size

### Walk-Forward Analysis
- Configurable IS/OOS split (60/40, 70/30, 80/20)
- Rolling windows (4 to 12)
- Per-window metrics comparison
- Efficiency ratio: OOS/IS (close to 1 = robust)
- Overfitting detection scoring
- Anchored vs Rolling modes

### Regime Detection
- Market state identification:
  - Trending Up
  - Trending Down
  - Ranging/Sideways
  - High Volatility
- Per-regime performance breakdown
- Regime filter recommendations
- Auto-detection algorithms

### Distribution Charts
- Return distribution histogram
- P/L distribution
- Duration distribution
- Entry time distribution
- Exit time distribution

## 6. OPTIMIZATION (/optimizer, /advanced-optimizer)

### Algorithms
- Grid Search: Exhaustive sweep, best for <1000 combinations
- Random Search: Fast sampling, good for exploration
- Genetic Algorithm (GA): Evolution-based, 500-5000 generations
- Particle Swarm (PSO): Swarm intelligence, fast convergence
- Bayesian Optimization: Smart sampling, fewer iterations
- Multi-Objective: Pareto-optimal (e.g., Max Sharpe + Min DD)

### Optimization Heatmap
- 2D parameter landscape
- Color = metric value
- Click point for details
- Identify robust regions (not isolated peaks)

### Parameter Importance
- Feature sensitivity ranking
- Which params matter most
- Helps reduce dimensionality

### Convergence Chart
- Fitness over generations
- Identify premature convergence
- Plateau detection

### Best Practices
- Start with wide ranges, narrow down
- Use genetic for large spaces (>1000 combos)
- Validate with Walk-Forward
- Avoid isolated peaks (overfitting)
- Prefer robust plateaus

## 7. PORTFOLIO TOOLS (/portfolio-builder, /portfolio)

### Portfolio Composer
- Combine 2-20 strategies
- Weight allocation (equal, custom, optimized)
- Combined equity curve
- Blended metrics

### Correlation Matrix
- Strategy return correlations
- Heatmap visualization
- Green = low correlation = good diversification
- Red = high correlation = redundant

### Portfolio Optimization
- Objectives:
  - Maximum Sharpe
  - Minimum Variance
  - Risk Parity
  - Maximum Diversification
- Constraint: Max weight per strategy
- Efficient frontier visualization

### Rebalancing Simulator
- Frequencies: Monthly, Quarterly, Annually
- Rebalance impact on returns
- Transaction cost modeling

## 8. RISK MANAGEMENT (/risk-dashboard, /position-sizing, /calculators)

### Risk Dashboard
- VaR (Value at Risk): 95%, 99%
- CVaR / Expected Shortfall
- Beta to benchmark
- Max Drawdown tracker
- Sharpe/Sortino/Calmar
- Volatility (daily, annualized)

### Position Sizing Calculator
- Methods:
  - Fixed Fractional (1-2% risk recommended)
  - Kelly Criterion (optimal growth)
  - Optimal f
  - Fixed Lot
- Inputs: Account balance, risk %, stop loss pips
- Output: Lot size, risk amount
- Formula (Fixed): Position = (Account × Risk%) / |Entry - SL|
- Formula (Kelly): f* = (WinRate × AvgWin/Loss - LossRate) / AvgWin/Loss

### Drawdown Alerts
- Set max DD threshold
- In-app notification
- Email alert (if enabled)

## 8A. FINANCIAL CALCULATORS (/calculators, Quick Access Floating Button)

### Quick Access Calculator Slider
- Floating calculator button (bottom-right of screen)
- Opens side panel with 4 essential calculators
- No page navigation required - available everywhere

### Position Size Calculator
- Fixed Fractional: Standard risk-based sizing
- Kelly Criterion: Mathematically optimal for growth
- Inputs: Account size, Risk %, Entry price, Stop loss, Win rate, Win/Loss ratio
- Output: Position size, Risk amount, Kelly fraction
- Tip: Use Half-Kelly (Kelly/2) for safer sizing

### Risk of Ruin Calculator
- Calculates probability of total account loss
- Inputs: Win rate, Risk per trade, Win/Loss ratio, Max acceptable drawdown
- Output: Edge per trade, Trades to ruin, Risk of Ruin %
- Interpretation:
  - RoR < 5%: Low risk, sustainable trading
  - RoR 5-20%: Moderate risk, monitor closely
  - RoR > 20%: High risk, reduce position size or improve edge

### Compound Interest Calculator
- Projects future investment growth
- Inputs: Initial investment, Annual rate %, Years, Monthly contribution (SIP)
- Output: Future value, Total interest earned, Growth percentage
- Supports monthly compounding with recurring contributions

### Break-Even Calculator
- Calculates price needed to cover all costs
- Inputs: Entry price, Quantity, Commission (entry+exit), Spread cost per unit
- Output: Total costs, Break-even price, Required move %
- Tip: Include ALL costs for accuracy (commission, spread, swap)

### Fibonacci Calculator (Full Page)
- Calculates retracement and extension levels
- Inputs: High price, Low price, Trend direction
- Output: 23.6%, 38.2%, 50%, 61.8%, 78.6% levels
- Extension levels: 127.2%, 161.8%, 261.8%

### Pivot Point Calculator (Full Page)
- Methods: Standard, Woodie, Camarilla
- Inputs: Previous day High, Low, Close
- Output: Pivot, Support 1-3, Resistance 1-3

### Other Calculators (Full Page /calculators)
- Pip Value Calculator
- Margin Requirement Calculator
- ATR-based Stop Loss Calculator
- Dollar Cost Averaging Simulator

## 9. AI FEATURES (/sentinel, /pattern-recognition, /ai-features)

### Sentinel AI Chat
- Strategy explanation
- Code debugging help
- Improvement suggestions
- Generate strategy ideas
- Explain metrics/concepts
- Conversational interface

### Pattern Recognition
- Candlestick patterns detection:
  - Doji, Hammer, Engulfing
  - Morning/Evening Star
  - Three White Soldiers
  - And 20+ more patterns
- Chart pattern detection (Head & Shoulders, Triangles)
- AI-powered pattern scoring

### AI Insights
- Automated trade analysis
- Anomaly detection in results
- Performance attribution
- Regime-aware recommendations

### Copilot (This Assistant)
- App navigation guidance
- Feature explanations
- Troubleshooting help
- Workflow recommendations
- Hinglish support

## 10. SCANNING (/scanner)

### Rule Builder
- Indicator rules:
  - RSI: Overbought/Oversold thresholds
  - EMA/SMA: Crossovers, price position
  - ATR: Volatility filter
  - Volume: Above/below average
  - MACD: Signal crossover
- Price rules:
  - Close > High of X bars
  - Gap detection
  - Candle size %
- Combine with AND/OR logic (up to 5 rules)

### Scan Execution
- Multi-dataset scanning
- Progress tracking
- Cancel support
- Signal export CSV

### Alert Configuration
- Coming Soon: Push notifications, email alerts

## 11. BROKER INTEGRATION (/execution-bridge)

### Zerodha Kite Connect
- OAuth authentication
- Portfolio sync (live holdings)
- Order placement panel
- Position monitoring
- Token refresh handling

### Paper Trading
- Simulated execution mode
- Virtual portfolio
- No real money risk
- Full feature parity

### Order Types
- Market order
- Limit order
- Stop loss
- Stop limit

## 12. COLLABORATION (/workspace-dashboard, /workspace)

### Workspaces
- Team containers
- Shared strategies, data, results
- Activity feed (who did what)
- Real-time presence indicators

### Role-Based Access
- Owner: Full control, delete workspace
- Admin: Manage members, edit all
- Editor: Create/edit content
- Viewer: Read-only access

### Invite Members
- Email-based invites
- Secure token links
- Expiry: 7 days
- Revoke capability

### Activity Feed
- Team actions log
- Filter by member, action type
- Timestamp tracking

## 13. MARKETPLACE (/strategy-marketplace)

### Browse Strategies
- Filter by category, price, rating
- Featured/verified badges
- Preview before download
- Author profiles

### Publishing
- Set price (free or paid)
- Category selection
- Description, tags
- Preview image
- Moderation queue (if enabled)

### Ratings & Reviews
- 1-5 star rating
- Written reviews
- Helpful votes
- Author responses

## 14. REPORTS & EXPORTS (/report-generator, /tearsheet, /export-center)

### Report Builder
- Custom section selection
- Branding (logo, colors)
- Template save/load
- Batch generation

### Professional Tearsheet
- One-page PDF summary
- Key metrics
- Equity curve
- Drawdown chart
- Trade summary
- Risk metrics

### Export Options
- PDF: Professional reports
- Excel: Full data with formulas
- CSV: Raw trade data
- JSON: Programmatic access
- PNG: Charts as images

### Export Presets
- Save export configurations
- Quick apply

## 15. TRADING DASHBOARD (/trading-dashboard)

### Customizable Widget Dashboard
- 19+ toggleable widgets via Dashboard Customizer
- Widget categories: Core Analytics, Advanced Analytics, AI Features, New Features
- State persisted in localStorage
- Widgets: KPI Cards, Equity Curve, P&L Heatmap, Risk Budget, Tilt Detection,
  Drawdown Analyzer, Session Heatmap, AI Playbook, Period Comparison, Tag Analysis,
  Slippage Tracker, Portfolio Heat Map, Market Regime Detector, Win Probability Meter,
  AI Trade Replay, AI Insights Hub, Mentor Mode, Trade Templates, TradingView Embed,
  Multi-Account Switcher

### AI Trade Copilot (/ai-copilot)
- Conversational AI analyzing real trade data
- Quick prompt suggestions (auto-send on click)
- Markdown rendering for formatted AI responses
- Hinglish tone, data-driven insights
- Trade context: P&L, win rate, symbols, patterns, recent trades

### Slippage Tracker (Widget)
- Monitors execution quality: planned vs actual entry/exit
- Visual chart of slippage over time

### Portfolio Heat Map (Widget)
- Symbol-level P&L and win rate visualization
- Color-coded by profitability

### Market Regime Detector (Widget)
- Identifies Trending/Ranging/Volatile phases
- Performance breakdown per regime

### Win Probability Meter (Widget)
- Circular gauge showing win probability from recent history

### AI Insights Hub (Widget)
- AI-powered: Weekly Report, Position Sizing, Risk Alerts, Exit Advisor, Pattern Discovery
- Uses Lovable AI (gemini-3-flash-preview)

### Mentor Mode (Widget)
- Gamified challenge system with 6 levels and XP tracking

### Trade Templates
- Save/load common trade setups as reusable templates

### TradingView Embed (Widget)
- Live chart with symbol and timeframe selectors

### Multi-Account Switcher (Widget)
- Switch between connected broker accounts

### AI Trade Replay (Widget)
- Step through trade history with AI commentary

### Prop Firm Challenge Tracker
- Monitor prop firm challenges: balance, DD limits, profit targets
- Phase tracking and rules configuration

## 16. SETTINGS & SYSTEM (/settings, /logs, /system-check)

### Theme & Appearance
- Light/Dark mode toggle
- System preference auto-detect
- Font size options

### Keyboard Shortcuts
- Command palette: Ctrl/Cmd + K
- Navigate: G then D (Data), G then S (Strategy), G then B (Backtest)
- Toggle sidebar: Ctrl/Cmd + B
- Help: Ctrl/Cmd + /

### Backup & Restore
- Export all data (JSON/ZIP)
- Import from backup
- Cloud sync (Supabase)

### Logs Viewer
- Debug, Info, Warn, Error levels
- Filter and search
- Copy log entries
- Clear logs

### System Check
- Health diagnostics
- Service status
- Version info
- Performance metrics

### Presets Manager
- Cost model presets
- Session presets
- Export presets

===========================================
PLATFORM SUPPORT
===========================================

- Web App: Chrome, Firefox, Safari, Edge (latest 2 versions)
- PWA: Installable, offline-capable, push notifications (coming soon)
- Desktop App: Electron-based (Windows, Mac, Linux)
- Mobile: Responsive design, touch gestures, pull-to-refresh

===========================================
TECH STACK
===========================================

- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- State Management: Zustand + React Query
- Local Database: Dexie (IndexedDB wrapper)
- Backend: Supabase (PostgreSQL + Auth + Edge Functions + Realtime)
- Charts: Recharts
- Code Editor: Monaco Editor
- Animations: Framer Motion
- Icons: Lucide React
- UI Components: shadcn/ui (Radix primitives)

===========================================
DATA RULES
===========================================

- CSV expects: Date/Time + OHLC (+ optional Volume)
- Supported datetime formats: ISO 8601, YYYY-MM-DD HH:mm:ss, DD/MM/YYYY, Unix timestamps
- Internal handling: UTC recommended
- If user uses IST/local, convert at import boundary
- Validation checklist:
  - Missing rows / gaps > 1 bar
  - Duplicate timestamps
  - Timezone offsets
  - Column mapping correctness
  - Min recommended: 1000 bars for backtest, 5000+ for optimization

===========================================
NAVIGATION SHORTCUTS
===========================================

- Ctrl/Cmd + K: Command palette
- Ctrl/Cmd + /: Help
- Ctrl/Cmd + B: Toggle sidebar
- G then D: Go to Data
- G then S: Go to Strategy
- G then B: Go to Backtest
- G then R: Go to Results
- G then O: Go to Optimizer
- Esc: Close modal/drawer

===========================================
COMMON TROUBLESHOOTING
===========================================

### Data Issues
- "Import failed" → Check column mapping, date format, delimiter
- "Data empty after import" → Check date range filter, timezone offset
- "Gaps detected" → Re-download or interpolate
- "Quality score poor" → Fix gaps, remove duplicates, check outliers

### Backtest Issues
- "No trades generated" → Check strategy logic, data coverage, entry conditions
- "Results blank" → Check network tab, RLS policies, date filters
- "Slow backtest" → Reduce data range, enable Web Workers
- "Engine timeout" → Large dataset, try chunking

### Strategy Issues
- "Syntax error" → Check Monaco editor red underlines
- "Version not saving" → Check storage quota, refresh page
- "Parameters not showing" → Define input variables properly

### Optimization Issues
- "Too slow" → Reduce param ranges, use Genetic instead of Grid
- "No improvement" → Check objective metric, expand ranges
- "Overfitting detected" → Simplify strategy, run Walk-Forward

### Connection Issues
- "Zerodha auth failed" → Re-authenticate, check API key
- "Cloud sync failed" → Check internet, login status
- "Offline mode not working" → Reinstall PWA

===========================================
SECURITY RULES (NON-NEGOTIABLE)
===========================================

1. Never store or request secrets (API keys, tokens, service_role)
2. No client-side auth bypass for invites/secure operations
3. File path handling must block traversal (allowlists + generated IDs)
4. Enforce RLS and server-side validation
5. Client should not directly query sensitive tables
6. Encrypt sensitive tokens in database
7. Log security events (login, invite accept, etc.)
8. If user shares credentials, warn to rotate immediately

===========================================
UX STYLE RULES
===========================================

- Premium, sleek, calm-dark fintech aesthetic
- Inter font family throughout
- Grid-based layout, generous padding
- Consistent border radius (rounded-lg default)
- No horizontal scroll; responsive + virtualization
- Clear empty states with single CTA
- Skeleton loaders for async content
- Toast notifications for actions
- Modals for destructive actions (confirm delete)
- Semantic color tokens (not hardcoded colors)

===========================================
KEY METRICS GLOSSARY
===========================================

- Sharpe Ratio: Risk-adjusted returns. (Return - RiskFree) / StdDev. >1 decent, >2 excellent
- Sortino Ratio: Like Sharpe but only downside volatility
- Profit Factor: Gross profit / Gross loss. >1 profitable, >1.5 reliable
- Max Drawdown: Largest peak-to-trough decline
- Win Rate: % of winning trades
- Expectancy: Average $ per trade = (WinRate × AvgWin) - (LossRate × AvgLoss)
- Recovery Factor: Net profit / Max DD
- Calmar Ratio: CAGR / Max DD
- VaR (Value at Risk): Max expected loss at confidence level
- CVaR: Expected loss beyond VaR threshold
- Kelly Criterion: Optimal bet size for growth = W - (1-W)/R

===========================================
RESPONSE FORMAT FOR COPILOT
===========================================

- Title (short, descriptive)
- What's happening (1–2 lines explanation)
- Next actions (numbered 1–3 steps)
- If debugging: Hypotheses + Fix plan (minimal diffs) + Regression checklist
- Assumptions (only if needed)
- Status: Implemented / Coming Soon / Not Available

Language: Hinglish; address user as "Aap".

===========================================
MMC COPILOT EVALUATION SCORECARD (0–2 each)
===========================================

A) Correctness & Honesty
[ ] 0=hallucinates, 1=some assumptions unclear, 2=no invention; assumptions explicit
[ ] Gives evidence-based guidance (logs/requests) when needed

B) Real-Data Orientation
[ ] Avoids mock data for core flows
[ ] Provides clear "Coming Soon" + setup steps if backend missing

C) Minimal Questions
[ ] Asks only blockers
[ ] Otherwise proceeds with defaults + lists Assumptions

D) Debugging Discipline
[ ] Starts read-only investigation
[ ] Provides 2–3 hypotheses
[ ] Minimal-diff fix plan + regression checklist

E) Security & Privacy
[ ] Never asks for secrets or exposes sensitive info
[ ] Recommends server-side validation + RLS for sensitive ops
[ ] Flags path traversal / client-side auth bypass risks

F) UX Helpfulness
[ ] Next actions are concrete (1–3 steps)
[ ] Uses consistent UI language (cards/drawers/toasts/empty states)
[ ] Avoids long essays; stays practical

PASS CRITERIA:
- Total score ≥ 20/24 for "production-ready"
- Any fail in Security/Secrets = immediate reject`;

// Config key for database storage (if needed)
export const APP_KNOWLEDGE_CONFIG_KEY = 'MMC_COPILOT_APP_KNOWLEDGE_AND_SCORECARD';

// Scorecard categories for programmatic access
export const SCORECARD_CATEGORIES = [
  {
    id: 'correctness',
    label: 'A) Correctness & Honesty',
    criteria: [
      '0=hallucinates, 1=some assumptions unclear, 2=no invention; assumptions explicit',
      'Gives evidence-based guidance (logs/requests) when needed'
    ]
  },
  {
    id: 'real_data',
    label: 'B) Real-Data Orientation',
    criteria: [
      'Avoids mock data for core flows',
      'Provides clear "Coming Soon" + setup steps if backend missing'
    ]
  },
  {
    id: 'minimal_questions',
    label: 'C) Minimal Questions',
    criteria: [
      'Asks only blockers',
      'Otherwise proceeds with defaults + lists Assumptions'
    ]
  },
  {
    id: 'debugging',
    label: 'D) Debugging Discipline',
    criteria: [
      'Starts read-only investigation',
      'Provides 2–3 hypotheses',
      'Minimal-diff fix plan + regression checklist'
    ]
  },
  {
    id: 'security',
    label: 'E) Security & Privacy',
    criteria: [
      'Never asks for secrets or exposes sensitive info',
      'Recommends server-side validation + RLS for sensitive ops',
      'Flags path traversal / client-side auth bypass risks'
    ]
  },
  {
    id: 'ux',
    label: 'F) UX Helpfulness',
    criteria: [
      'Next actions are concrete (1–3 steps)',
      'Uses consistent UI language (cards/drawers/toasts/empty states)',
      'Avoids long essays; stays practical'
    ]
  }
] as const;

export const PASS_THRESHOLD = 20;
export const MAX_SCORE = 24;

// Feature list for quick reference
export const MMC_FEATURE_LIST = [
  { category: 'Data', features: ['CSV Import', 'Quality Scanner', 'Coverage Heatmap', 'Bulk Actions', 'Tags', 'Comparison View'] },
  { category: 'Strategy', features: ['Monaco Editor', 'Version Control', 'Diff Viewer', 'Templates', 'Share', 'Parameters'] },
  { category: 'Backtest', features: ['Web Engine', 'Live Progress', 'Background Processing', 'Auto-Recovery', 'Batch Queue', 'Presets'] },
  { category: 'Analytics', features: ['Monte Carlo', 'Walk-Forward', 'Regime Detection', 'Distribution Charts', 'Tearsheet'] },
  { category: 'Optimization', features: ['Grid Search', 'Genetic Algorithm', 'PSO', 'Multi-Objective', 'Heatmap', 'Convergence'] },
  { category: 'Portfolio', features: ['Composer', 'Correlation Matrix', 'Optimization', 'Rebalancing'] },
  { category: 'Risk', features: ['Dashboard', 'Position Sizing', 'VaR', 'Drawdown Alerts'] },
  { category: 'Calculators', features: ['Position Size', 'Kelly Criterion', 'Risk of Ruin', 'Compound Interest', 'Break-Even', 'Fibonacci', 'Pivot Points'] },
  { category: 'Simulators', features: ['Monte Carlo', 'What-If Analysis', 'Equity Curve Simulator', 'Stress Testing'] },
  { category: 'AI', features: ['Sentinel Chat', 'Pattern Recognition', 'Insights', 'Copilot', 'AI Trade Copilot', 'AI Insights Hub', 'AI Trade Replay', 'AI Weekly Report', 'AI Position Sizing', 'AI Risk Alerts', 'AI Exit Advisor', 'AI Pattern Discovery'] },
  { category: 'Integration', features: ['Zerodha/Kite', 'Paper Trading', 'Cloud Sync', 'TradingView Embed', 'Multi-Account Switcher'] },
  { category: 'Collaboration', features: ['Workspaces', 'Roles', 'Activity Feed', 'Marketplace'] },
  { category: 'Dev Tools', features: ['JSON Editor', 'Regex Tester', 'LocalStorage Viewer', 'Timestamp Converter', 'Base64 Tool'] },
  { category: 'Trading Dashboard', features: ['KPI Cards', 'Equity Curve', 'P&L Heatmap', 'Risk Budget', 'Tilt Detection', 'Drawdown Analyzer', 'Session Heatmap', 'AI Playbook', 'Period Comparison', 'Tag Analysis', 'Dashboard Customizer'] },
  { category: 'New Analytics', features: ['Slippage Tracker', 'Portfolio Heat Map', 'Market Regime Detector', 'Win Probability Meter'] },
  { category: 'New Features', features: ['Trade Templates', 'Mentor Mode', 'Prop Firm Tracker', 'AI Trade Replay', 'TradingView Embed', 'Multi-Account Switcher'] }
] as const;

// Page routes for navigation help
export const MMC_PAGE_ROUTES = {
  dashboard: '/',
  data: '/data',
  import: '/import',
  strategyLibrary: '/strategy-library',
  strategies: '/strategies',
  backtests: '/backtests',
  workflow: '/workflow',
  savedResults: '/saved-results',
  analytics: '/analytics',
  advancedAnalytics: '/advanced-analytics',
  optimizer: '/optimizer',
  advancedOptimizer: '/advanced-optimizer',
  walkForward: '/walk-forward',
  portfolioBuilder: '/portfolio-builder',
  portfolio: '/portfolio',
  attribution: '/attribution',
  riskDashboard: '/risk-dashboard',
  riskTools: '/risk-tools',
  positionSizing: '/position-sizing',
  calculators: '/calculators',
  simulators: '/simulators',
  stressTesting: '/stress-testing',
  devTools: '/dev-tools',
  featureRegistry: '/feature-registry',
  scanner: '/scanner',
  sentinel: '/sentinel',
  patternRecognition: '/pattern-recognition',
  patterns: '/patterns',
  executionBridge: '/execution-bridge',
  execution: '/execution',
  paperTrading: '/paper-trading',
  workspaceDashboard: '/workspace-dashboard',
  workspace: '/workspace',
  workspaceSettings: '/workspace-settings',
  marketplace: '/strategy-marketplace',
  reportGenerator: '/report-generator',
  reports: '/reports',
  tearsheet: '/tearsheet',
  exportCenter: '/export-center',
  settings: '/settings',
  profile: '/profile',
  logs: '/logs',
  featureGuide: '/feature-guide',
  appGuide: '/app-guide',
  guide: '/guide',
  journal: '/journal',
  alerts: '/alerts',
  tradingDashboard: '/trading-dashboard',
  aiCopilot: '/ai-copilot',
  aiInsights: '/ai',
  propFirm: '/prop-firm',
  mt5Hub: '/mt5-hub',
  mt5Sync: '/mt5-sync',
  runners: '/runners',
  runConsole: '/run-console',
  eaManager: '/ea-manager',
  notebook: '/notebook',
  trades: '/trades',
  diagnostics: '/diagnostics',
  preTrade: '/pre-trade-check',
  playbook: '/playbook',
  growthRoadmap: '/growth-roadmap',
  liveTracker: '/live-tracker',
  achievements: '/achievements',
  leaderboard: '/leaderboard',
  premium: '/premium',
  pricing: '/pricing',
  bulkTester: '/bulk-tester',
  quickCompare: '/quick-compare',
  cloudSync: '/cloud-sync',
  cloudDashboard: '/cloud-dashboard',
  strategyVersions: '/strategy-versions',
  parity: '/parity',
  brokerDirectory: '/broker-directory',
  referral: '/referral',
  affiliateDashboard: '/affiliate/dashboard',
  investorGoal: '/investor/goal',
  investorRecommendations: '/investor/recommendations',
  investorStrategyDetail: '/investor/strategy-detail',
  investorConsole: '/investor/console',
  investorReports: '/investor/reports',
  tradeReports: '/trade-reports',
  systemCheck: '/system-check',
  helpCenter: '/help',
  helpOffline: '/help/offline',
  tutorials: '/tutorials',
  copilotQA: '/copilot-qa',
  aiFeatures: '/ai-features',
  desktopSettings: '/desktop-settings',
} as const;
