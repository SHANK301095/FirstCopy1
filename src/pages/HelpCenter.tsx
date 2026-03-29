/**
 * MMC Help Center — Premium, searchable, categorized help hub
 * with Copilot integration, all topics, and world-class UX
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, HelpCircle, BookOpen, Play, Layers, FlaskConical,
  TrendingUp, BarChart3, Briefcase, WifiOff, Keyboard, Wrench,
  Shield, Brain, Settings, Target, Code, Database, Zap, Activity,
  FileText, Calculator, Globe, Users, Lock, Bot, ChevronDown,
  ChevronRight, Star, Lightbulb, ArrowRight, ExternalLink,
  Sparkles, X, MessageSquare, Send, FileSearch, PieChart,
  Terminal, Clock, Gauge, Box, Eye, RefreshCw, Cpu, Award,
  AlertTriangle, Info, CheckCircle2, Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// ─── CATEGORY DEFINITIONS ───
const categories = [
  { id: 'getting-started', icon: Play, label: 'Getting Started', desc: 'First steps & quick start', gradient: 'from-emerald-500/20 to-teal-500/10', accent: 'text-emerald-500' },
  { id: 'data', icon: Database, label: 'Data Management', desc: 'Import, quality, validation', gradient: 'from-sky-500/20 to-blue-500/10', accent: 'text-sky-500' },
  { id: 'strategies', icon: Code, label: 'Strategies', desc: 'Create, edit, version control', gradient: 'from-violet-500/20 to-purple-500/10', accent: 'text-violet-500' },
  { id: 'backtesting', icon: FlaskConical, label: 'Backtesting', desc: 'Run, configure, batch test', gradient: 'from-amber-500/20 to-orange-500/10', accent: 'text-amber-500' },
  { id: 'optimization', icon: Target, label: 'Optimization', desc: 'Parameters, walk-forward, GA', gradient: 'from-rose-500/20 to-red-500/10', accent: 'text-rose-500' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics', desc: 'Metrics, charts, reports', gradient: 'from-indigo-500/20 to-blue-500/10', accent: 'text-indigo-500' },
  { id: 'risk', icon: Shield, label: 'Risk Management', desc: 'Position sizing, stress tests', gradient: 'from-red-500/20 to-rose-500/10', accent: 'text-red-500' },
  { id: 'portfolio', icon: Briefcase, label: 'Portfolio', desc: 'Multi-strategy, allocation', gradient: 'from-cyan-500/20 to-teal-500/10', accent: 'text-cyan-500' },
  { id: 'ai', icon: Brain, label: 'AI Features', desc: 'Sentinel, Copilot, automation', gradient: 'from-purple-500/20 to-pink-500/10', accent: 'text-purple-500' },
  { id: 'collaboration', icon: Users, label: 'Collaboration', desc: 'Workspace, teams, sharing', gradient: 'from-blue-500/20 to-indigo-500/10', accent: 'text-blue-500' },
  { id: 'tools', icon: Wrench, label: 'Tools & Utilities', desc: 'Journal, exports, calculators', gradient: 'from-slate-500/20 to-zinc-500/10', accent: 'text-slate-500' },
  { id: 'shortcuts', icon: Keyboard, label: 'Keyboard Shortcuts', desc: 'Power user navigation', gradient: 'from-teal-500/20 to-emerald-500/10', accent: 'text-teal-500' },
  { id: 'offline', icon: WifiOff, label: 'Offline & Privacy', desc: 'PWA, local storage, security', gradient: 'from-zinc-500/20 to-slate-500/10', accent: 'text-zinc-500' },
  { id: 'troubleshooting', icon: AlertTriangle, label: 'Troubleshooting', desc: 'Fixes, performance, errors', gradient: 'from-orange-500/20 to-amber-500/10', accent: 'text-orange-500' },
  { id: 'admin', icon: Settings, label: 'Admin Panel', desc: 'Config, flags, audit', gradient: 'from-gray-500/20 to-slate-500/10', accent: 'text-gray-500' },
  { id: 'metrics', icon: Gauge, label: 'Metrics Encyclopedia', desc: 'All formulas & interpretation', gradient: 'from-green-500/20 to-emerald-500/10', accent: 'text-green-500' },
];

// ─── COMPREHENSIVE ARTICLE DATABASE ───
const articles: Article[] = [
  // ── GETTING STARTED ──
  { id: 'gs-1', cat: 'getting-started', title: 'Welcome to MMC — What Is It?', tags: ['intro','start','about','overview'], difficulty: 'beginner',
    content: `**MMC (Money Making Machine)** is a professional-grade algorithmic trading backtesting platform.\n\n**What you can do:**\n• Import historical market data (CSV/Excel)\n• Write or import trading strategies (MQL5, YAML DSL)\n• Run backtests with live progress tracking\n• Optimize parameters with AI algorithms (GA, PSO, Bayesian)\n• Validate with Walk-Forward Analysis & Monte Carlo\n• Build multi-strategy portfolios\n• Generate professional PDF reports\n• Collaborate with your team via workspaces\n\n**Who it's for:** Retail algo traders, quant developers, trading firms, strategy researchers.\n\n**Key differentiators:** Offline-first, 50K+ backtests/min, multi-currency (10+), enterprise security.` },
  { id: 'gs-2', cat: 'getting-started', title: 'Quick Start: Your First Backtest in 5 Minutes', tags: ['quickstart','first','tutorial','begin'], difficulty: 'beginner',
    content: `**Step 1 — Import Data**\nGo to the Workflow page → Data tab → Upload your CSV file with OHLCV columns.\nThe system auto-detects column headers (Date, Open, High, Low, Close, Volume).\n\n**Step 2 — Add Strategy**\nSwitch to Strategy tab → Paste your MQL5 EA code or pick a built-in template (MA Crossover, RSI, MACD, etc.).\n\n**Step 3 — Configure & Run**\nSet date range, initial capital, spread/commission → Click "Run Backtest".\nWatch real-time progress with live equity curve.\n\n**Step 4 — Analyze**\nView 20+ metrics: Sharpe, Sortino, Max DD, Profit Factor, Win Rate.\nExport to PDF, Excel, or CSV.\n\n**Pro Tip:** Start simple. Use a template, then iterate.` },
  { id: 'gs-3', cat: 'getting-started', title: 'Installing MMC as a Desktop/Mobile App (PWA)', tags: ['install','pwa','app','desktop','mobile'], difficulty: 'beginner',
    content: `MMC is a Progressive Web App — install it for native app experience.\n\n**Desktop:**\n• Chrome/Edge: Click install icon in address bar\n• Or use "Install App" button in navigation\n\n**Mobile:**\n• iOS Safari: Tap Share → Add to Home Screen\n• Android Chrome: Tap ⋮ menu → Install App\n\n**Benefits after install:**\n✓ Works 100% offline\n✓ Faster load times (cached)\n✓ No browser chrome (full-screen)\n✓ Background sync when online\n✓ App icon on desktop/homescreen` },
  { id: 'gs-4', cat: 'getting-started', title: 'Understanding the Navigation & Layout', tags: ['navigation','layout','sidebar','menu','ui'], difficulty: 'beginner',
    content: `**Sidebar Navigation** (collapsible):\n• Home / Dashboard — Overview & quick stats\n• Workflow — Main 4-step backtest process\n• Data Manager — Upload & manage datasets\n• Strategy Library — Store & version strategies\n• Optimizer — Parameter search & optimization\n• Analytics — Deep performance analysis\n• Portfolio — Multi-strategy allocation\n• Settings — Preferences & configuration\n\n**Header Bar:**\n• Search (Ctrl+K) — Command palette for quick access\n• Theme toggle — Dark/Light mode\n• Notifications — Alerts & updates\n• Profile — Account & workspace settings\n\n**Keyboard:** Press Ctrl+K for instant navigation.` },

  // ── DATA MANAGEMENT ──
  { id: 'dm-1', cat: 'data', title: 'CSV Import: Supported Formats & Column Mapping', tags: ['csv','import','format','columns','ohlcv','excel'], difficulty: 'beginner',
    content: `**Supported file formats:** CSV (.csv), Excel (.xlsx, .xls)\n\n**Required columns:** Date/Time, Open, High, Low, Close\n**Optional columns:** Volume, Tick Volume, Spread, Symbol\n\n**Date format auto-detection:**\n• ISO 8601: 2024-01-15T14:30:00Z\n• YYYY-MM-DD HH:mm:ss\n• DD/MM/YYYY HH:mm\n• Unix timestamp (seconds or milliseconds)\n\n**Delimiter auto-detection:** Comma, Semicolon, Tab, Pipe\n\n**Column mapping:** System auto-maps common headers. Manual override available in preview step.\n\n**Tips:**\n• Use UTC timestamps for consistency\n• Ensure no extra blank rows at end\n• Large files auto-chunked (100K rows/chunk)` },
  { id: 'dm-2', cat: 'data', title: 'Data Quality Scanner & Auto-Fix', tags: ['quality','validation','gaps','duplicates','outliers'], difficulty: 'intermediate',
    content: `**Quality checks performed:**\n1. **Gap Detection** — Missing bars between timestamps (configurable threshold)\n2. **Duplicate Detection** — Same timestamp rows\n3. **Outlier Detection** — Price spikes > 3σ from mean\n4. **Invalid Candles** — High < Low, negative prices, zero volume\n5. **Timestamp Issues** — Future dates, out-of-order, weekend data\n\n**Quality Score:**\n• Excellent (>95%) — Green\n• Good (85-95%) — Light green\n• Fair (70-85%) — Yellow\n• Poor (<70%) — Red\n\n**Auto-fix options:**\n✓ Remove duplicates\n✓ Sort by timestamp\n✓ Flag outliers for review\n✓ Skip non-trading days\n\n**Recommendation:** Always achieve >90% before running backtests.` },
  { id: 'dm-3', cat: 'data', title: 'Shared Datasets & Multi-Symbol Support', tags: ['shared','datasets','symbols','multi-asset'], difficulty: 'intermediate',
    content: `**Shared Datasets** are admin-curated data available to all users — clean, validated, ready to use.\n\n**Multi-Symbol Support:**\n• Import data for multiple symbols\n• Each dataset tagged with symbol name\n• Filter by symbol in Data Manager\n• Cross-symbol strategies supported\n\n**Dataset Organization:**\n• Auto-grouped by symbol\n• Custom tags for categorization\n• Star/favorite frequently used sets\n• Search by name, symbol, date range\n• Bulk actions: delete, tag, export` },

  // ── STRATEGIES ──
  { id: 'st-1', cat: 'strategies', title: 'Strategy Formats: MQL5 & YAML DSL', tags: ['strategy','mql5','yaml','code','format','ea'], difficulty: 'intermediate',
    content: `**MQL5 Expert Advisor Support:**\nPaste your full MQL5 EA code. System parses parameters, entry/exit logic, and money management rules.\n\n**YAML DSL (Simplified):**\n\`\`\`yaml\nname: MA Crossover\nversion: 1.0\nparameters:\n  fast_period: 10\n  slow_period: 20\nentry:\n  long: SMA(close, fast_period) > SMA(close, slow_period)\n  short: SMA(close, fast_period) < SMA(close, slow_period)\nexit:\n  long: SMA(close, fast_period) < SMA(close, slow_period)\n\`\`\`\n\n**Available Indicators:** SMA, EMA, RSI, MACD, Bollinger Bands, ATR, Stochastic, ADX, Donchian Channel, and more.\n\n**Monaco Editor Features:** Syntax highlighting, auto-complete, bracket matching, minimap, find/replace with regex.` },
  { id: 'st-2', cat: 'strategies', title: 'Strategy Version Control & Diff Viewer', tags: ['version','history','diff','rollback','git'], difficulty: 'intermediate',
    content: `**Auto-versioning:** Every significant edit creates a version.\n**Manual save:** Add version note for context.\n\n**Version History:**\n• Unlimited versions preserved\n• Timestamp + change summary\n• Parameter snapshot per version\n• Performance snapshot (if tested)\n\n**Diff Viewer:**\n• Side-by-side comparison\n• Added/removed lines highlighted\n• Compare any two versions\n\n**Restore:** One-click rollback to any version.\n**Branch:** Fork from any historical version.\n\n**Best Practice:** Add descriptive notes when saving (e.g., "Added ATR trailing stop").` },
  { id: 'st-3', cat: 'strategies', title: '15+ Built-In Strategy Templates', tags: ['template','preset','ma','rsi','macd','bollinger'], difficulty: 'beginner',
    content: `**Available Templates:**\n1. MA Crossover (SMA/EMA)\n2. RSI Overbought/Oversold\n3. MACD Signal Cross\n4. Bollinger Band Bounce\n5. Breakout (High/Low Channel)\n6. Mean Reversion\n7. Trend Following (ADX-based)\n8. Momentum\n9. Range Trading\n10. Grid Trading\n11. Martingale (with risk warnings)\n12. Anti-Martingale\n13. Dual Thrust\n14. Donchian Channel\n15. ATR Trailing Stop\n\n**How to use:**\n1. Strategy Library → Templates tab\n2. Pick template → Clone\n3. Modify parameters to your needs\n4. Save to your personal library` },

  // ── BACKTESTING ──
  { id: 'bt-1', cat: 'backtesting', title: 'Running a Backtest: Complete Config Guide', tags: ['backtest','run','config','capital','commission','slippage'], difficulty: 'beginner',
    content: `**Configuration Options:**\n• **Date Range:** Start & end dates (must be within your data)\n• **Initial Capital:** Starting balance (USD, EUR, INR, etc.)\n• **Commission:** Per-trade or percentage\n• **Slippage:** 1-2 pips typical for forex\n• **Spread:** Fixed or variable\n• **Position Sizing:** Fixed lot, % equity, or risk-based\n• **Execution Model:** Bar-close (fast) or OHLC simulation (realistic)\n\n**Running:**\n1. Select data + strategy\n2. Configure parameters above\n3. Click "Run Backtest"\n4. Watch real-time progress bar + live equity curve\n\n**Performance:** ~10K bars/second. Checkpointed every 5K bars. Runs in Web Worker (background thread).` },
  { id: 'bt-2', cat: 'backtesting', title: 'Understanding Backtest Results & Metrics', tags: ['results','metrics','equity','drawdown','sharpe'], difficulty: 'intermediate',
    content: `**Key Metrics Dashboard:**\n• Net Profit / Net Profit %\n• Win Rate & Profit Factor\n• Sharpe, Sortino, Calmar Ratios\n• Max Drawdown (% and duration)\n• Recovery Factor\n• Expectancy per trade\n\n**Visualizations:**\n• Interactive equity curve (zoomable)\n• Drawdown waterfall chart\n• Monthly returns heatmap (calendar)\n• Trade P/L histogram\n• Win/Loss streak analysis\n\n**Export:** PDF report, Excel spreadsheet, CSV trade log, JSON raw data.\n\n**Pro Tip:** Focus on risk-adjusted metrics (Sharpe, Sortino) not just total profit.` },
  { id: 'bt-3', cat: 'backtesting', title: 'Batch & Parallel Backtesting', tags: ['batch','bulk','parallel','queue','multiple'], difficulty: 'advanced',
    content: `**Batch Testing** lets you queue multiple backtests.\n\n**Use Cases:**\n• Test one strategy across 10 symbols\n• Compare 5 parameter variations\n• Run sensitivity analysis\n\n**How:**\n1. Configure base settings\n2. Add variations (different symbols, params)\n3. Queue all → system runs in parallel via Web Workers\n\n**Queue Features:**\n• Pause/resume capability\n• Priority ordering\n• Per-test progress tracking\n• Aggregate comparison view\n• Export all results as Excel` },

  // ── OPTIMIZATION ──
  { id: 'op-1', cat: 'optimization', title: 'Parameter Optimizer: Grid, Random, Genetic', tags: ['optimize','grid','random','genetic','pso','bayesian'], difficulty: 'intermediate',
    content: `**Grid Search:** Tests ALL parameter combinations. Best for small spaces (<1000 combos).\n**Random Search:** Samples random combinations. Good for large spaces.\n**Genetic Algorithm (GA):** Evolves best parameters through selection, crossover, mutation.\n**Particle Swarm (PSO):** Swarm intelligence finds optimal regions.\n**Bayesian Optimization:** Uses surrogate models to minimize evaluations.\n\n**Setup:**\n1. Select parameters to optimize\n2. Define ranges (min, max, step)\n3. Choose objective metric (Sharpe, Profit Factor, etc.)\n4. Choose algorithm → Run\n\n**Outputs:** 3D surface plot, heatmap, parameter sensitivity chart, top-N results table.\n\n**Warning:** More parameters = higher overfitting risk. Use Walk-Forward to validate.` },
  { id: 'op-2', cat: 'optimization', title: 'Walk-Forward Analysis (WFA)', tags: ['walk-forward','wfa','out-of-sample','validation','overfitting'], difficulty: 'advanced',
    content: `**What:** Divides data into rolling in-sample (IS) and out-of-sample (OOS) windows. Optimizes on IS, tests on OOS, rolls forward.\n\n**Configuration:**\n• Window size (IS period)\n• Step size (roll forward amount)\n• OOS percentage (20-30% recommended)\n• Number of windows (4-8 typical)\n\n**Interpretation:**\n• WF Efficiency = OOS return / IS return\n• 0.7-1.2 = Robust ✅\n• < 0.5 = Overfitting likely ❌\n• > 1.5 = Unusual, verify data\n\n**Modes:**\n• Anchored: IS always starts from beginning\n• Rolling: Fixed-size IS window moves forward\n\n**This is the gold standard for strategy validation before live trading.**` },
  { id: 'op-3', cat: 'optimization', title: 'Avoiding Overfitting: Red Flags & Solutions', tags: ['overfitting','robust','curve-fitting','validation'], difficulty: 'advanced',
    content: `**Red Flags of Overfitting:**\n❌ Isolated peak in optimization heatmap (no plateau)\n❌ Many parameters (>7)\n❌ WF efficiency < 0.5\n❌ Monte Carlo shows extreme variance\n❌ Strategy only works on specific dates\n❌ Results too good to be true (Sharpe > 4)\n\n**Solutions:**\n✅ Use Walk-Forward Analysis always\n✅ Keep parameters ≤ 5 ideally\n✅ Look for parameter plateaus, not peaks\n✅ Run Monte Carlo for confidence intervals\n✅ Test on different time periods\n✅ Simplify strategy logic\n✅ Use out-of-sample data reserve (20-30%)` },

  // ── ANALYTICS ──
  { id: 'an-1', cat: 'analytics', title: 'Performance Dashboard & Charts', tags: ['dashboard','equity','drawdown','heatmap','charts'], difficulty: 'beginner',
    content: `**Analytics Dashboard includes:**\n• Interactive equity curve with zoom & pan\n• Drawdown analysis with recovery time markers\n• Monthly returns heatmap (calendar grid)\n• Trade distribution histograms\n• Rolling Sharpe/Sortino over time\n• Benchmark comparison (Buy & Hold, index)\n\n**Advanced Analytics (Premium):**\n• Monte Carlo simulations (10K+ paths)\n• Confidence intervals (95%, 99%, 99.9%)\n• VaR & CVaR calculations\n• Probability of ruin\n• Bootstrap confidence intervals\n\n**Performance Attribution:**\n• Long vs Short breakdown\n• Time-of-day analysis\n• Day-of-week patterns\n• Holding period optimization` },
  { id: 'an-2', cat: 'analytics', title: 'Report Generator & PDF Export', tags: ['report','pdf','export','tearsheet','excel'], difficulty: 'beginner',
    content: `**Report Types:**\n• **Tearsheet:** One-page professional summary\n• **Full Report:** Multi-page detailed PDF (20+ pages)\n• **Custom Report:** Pick sections to include\n\n**Export Formats:**\n• PDF — Professional reports for investors\n• Excel (.xlsx) — Full data with formulas\n• CSV — Raw trade log data\n• JSON — Programmatic access\n• PNG — Charts as images\n\n**Features:**\n• White-label branding options\n• Custom logo placement\n• Risk disclosures\n• Table of contents\n• Glossary section\n\n**Location:** Results page → Export button, or Export Center (/export-center)` },

  // ── RISK MANAGEMENT ──
  { id: 'rm-1', cat: 'risk', title: 'Position Sizing Methods', tags: ['position','sizing','kelly','fixed','fractional','risk'], difficulty: 'intermediate',
    content: `**Methods Available:**\n\n**1. Fixed Fractional:** Risk fixed % of equity per trade (e.g., 2%).\n**2. Kelly Criterion:** f* = W - (1-W)/R. Optimal growth rate. Use Half-Kelly for safety.\n**3. Optimal f:** Maximize geometric growth rate.\n**4. Fixed Lot:** Same size every trade.\n**5. Percentage of Equity:** Lot size = equity × %.\n\n**Calculator:** /position-sizing page.\n• Input: Account balance, risk %, stop loss distance\n• Output: Recommended lot size, max loss amount\n\n**Rule of thumb:** Never risk more than 1-2% per trade.` },
  { id: 'rm-2', cat: 'risk', title: 'Stress Testing & Crisis Scenarios', tags: ['stress','test','crisis','crash','2008','covid'], difficulty: 'advanced',
    content: `**Built-in Crisis Scenarios:**\n• 2008 Financial Crisis\n• 2010 Flash Crash\n• 2015 CHF Black Swan\n• 2020 COVID Crash\n• Custom scenarios\n\n**Test methodology:**\n1. Apply historical volatility multipliers\n2. Simulate liquidity gaps\n3. Model correlation breakdowns\n4. Check max DD under stress\n5. Measure recovery time\n\n**Key question:** Can your strategy survive the worst conditions and still recover?` },

  // ── PORTFOLIO ──
  { id: 'pf-1', cat: 'portfolio', title: 'Portfolio Builder: Multi-Strategy Allocation', tags: ['portfolio','allocation','diversification','correlation','weight'], difficulty: 'intermediate',
    content: `**Building a Portfolio:**\n1. Add 2+ strategies with backtest results\n2. Set allocation weights (must sum to 100%)\n3. View correlation matrix\n4. Run combined backtest\n\n**Optimization Goals:**\n• Maximum Sharpe Ratio\n• Minimum Drawdown\n• Target Return\n• Risk Parity (equal risk contribution)\n\n**Correlation Matrix:**\n• Green (<0.3) — Good diversification\n• Yellow (0.3-0.7) — Moderate\n• Red (>0.7) — Redundant, consider removing one\n\n**Multi-currency support:** USD, EUR, INR, GBP, JPY, AUD, CAD, CHF, SGD, HKD` },

  // ── AI ──
  { id: 'ai-1', cat: 'ai', title: 'Sentinel AI: Your Trading Co-Pilot', tags: ['sentinel','ai','assistant','copilot','chat','nlp'], difficulty: 'beginner',
    content: `**Sentinel AI** is MMC's conversational AI assistant.\n\n**Capabilities:**\n• Explain strategy code line-by-line\n• Debug issues and suggest fixes\n• Generate strategy improvement ideas\n• Interpret metrics (Sharpe, DD, Expectancy)\n• Answer trading concept questions\n• Analyze market conditions\n\n**How to access:**\n• /sentinel page — Full chat interface\n• Help widget — Floating button (bottom-right)\n• Copilot tooltips — Context-aware hints throughout app\n\n**Language:** Supports Hinglish (Hindi+English) for natural interaction.\n\n**Note:** Premium feature. Powered by advanced LLMs.` },
  { id: 'ai-2', cat: 'ai', title: 'MMC Copilot: Contextual Help System', tags: ['copilot','help','tooltip','context','guide'], difficulty: 'beginner',
    content: `**Copilot** provides intelligent, context-aware help throughout the app.\n\n**Features:**\n• Hover tooltips on complex UI elements\n• "?" icons next to metrics with explanations\n• Inline help badges with pro tips\n• Feature-level help panels\n\n**Knowledge Base:** Trained on 200+ Q&A pairs covering:\n• All platform features\n• Financial metrics & formulas\n• Workflow best practices\n• Troubleshooting guides\n• Indian market specifics (NSE/BSE, Zerodha)\n\n**Admin Training:** Admins can add new Q&A pairs via /copilot-qa page.` },

  // ── COLLABORATION ──
  { id: 'co-1', cat: 'collaboration', title: 'Workspaces: Team Setup & Roles', tags: ['workspace','team','invite','roles','collaboration'], difficulty: 'intermediate',
    content: `**Creating a Workspace:**\n1. Workspace Dashboard → "New Workspace"\n2. Enter name & description\n3. Invite members via email\n\n**Roles:**\n• **Owner:** Full control, billing, delete workspace\n• **Admin:** Manage members, strategies, data\n• **Editor:** Create/edit strategies & data, run backtests\n• **Viewer:** Read-only access to results & reports\n\n**Features:**\n• Shared strategy library\n• Shared datasets\n• Real-time activity feed\n• Audit trail of all actions\n• Role-based access control (RBAC)\n\n**Security:** Invites are token-based with expiration. No client-side bypass.` },

  // ── TOOLS ──
  { id: 'tl-1', cat: 'tools', title: 'Trade Journal: Document Your Trading', tags: ['journal','diary','notes','psychology','emotions'], difficulty: 'beginner',
    content: `**Features:**\n• Log trades with notes & screenshots\n• Track emotional state (confident/anxious/neutral)\n• Tag trades (breakout, reversal, news-driven)\n• Lessons learned section\n\n**Analysis:**\n• Filter by tag, date, result\n• Performance by emotional state\n• Win rate by trade type\n• Weekly/monthly review summaries\n\n**Best Practice:** Record thoughts BEFORE and AFTER each trade. Review weekly.` },
  { id: 'tl-2', cat: 'tools', title: 'Export Center & Bulk Downloads', tags: ['export','download','bulk','csv','pdf','excel'], difficulty: 'beginner',
    content: `**Export Center (/export-center)** — Centralized export hub.\n\n**Exportable items:**\n• Backtest results → PDF/Excel/CSV\n• Strategy code → .mq5/.yaml file\n• Datasets → CSV/Excel\n• Equity curves → PNG/SVG\n• Trade logs → CSV\n• Reports → PDF\n• Full backup → JSON.gz\n\n**Bulk export:** Select multiple items → Export all at once.\n\n**Tearsheet:** One-page professional report. Perfect for investor presentations.` },
  { id: 'tl-3', cat: 'tools', title: 'Financial Calculators', tags: ['calculator','position','pip','margin','risk','reward'], difficulty: 'beginner',
    content: `**Available at /calculators:**\n• **Position Size Calculator** — Risk-based lot sizing\n• **Pip Value Calculator** — Pip worth per lot per pair\n• **Margin Calculator** — Required margin per position\n• **Risk/Reward Calculator** — R:R and break-even WR\n• **Compounding Calculator** — Growth projections\n• **Kelly Criterion** — Optimal bet size\n\nAll calculators work offline. Results update in real-time.` },

  // ── KEYBOARD SHORTCUTS ──
  { id: 'kb-1', cat: 'shortcuts', title: 'All Keyboard Shortcuts', tags: ['keyboard','shortcuts','hotkeys','ctrl','cmd'], difficulty: 'beginner',
    content: `**Navigation:**\n• Ctrl/Cmd + K — Command Palette (search anything)\n• Ctrl/Cmd + B — Toggle Sidebar\n• Ctrl/Cmd + / — Quick Help\n\n**Workflow:**\n• Ctrl/Cmd + Enter — Run Backtest\n• Ctrl/Cmd + S — Save Current Work\n• Ctrl/Cmd + E — Export Results\n\n**Data:**\n• Ctrl/Cmd + I — Import Data\n• Ctrl/Cmd + O — Open File\n• Ctrl/Cmd + Shift + E — Export All\n\n**Editor (Strategy page):**\n• Ctrl/Cmd + F — Find\n• Ctrl/Cmd + H — Find & Replace\n• Ctrl/Cmd + Z — Undo\n• Ctrl/Cmd + Shift + Z — Redo\n\n**General:**\n• Esc — Close any modal/dialog\n• ? — Context help for current page\n• 1-9 — Switch between main tabs` },

  // ── OFFLINE & PRIVACY ──
  { id: 'of-1', cat: 'offline', title: 'Offline Mode: How It Works', tags: ['offline','local','indexeddb','pwa','storage','cache'], difficulty: 'beginner',
    content: `**Technology Stack:**\n• Service Worker — Caches app shell & assets\n• IndexedDB (Dexie) — Stores all data locally\n• LocalStorage — Settings & preferences\n\n**What works offline (everything!):**\n✓ Data import/export\n✓ Strategy creation/editing\n✓ Running backtests\n✓ Viewing & analyzing results\n✓ PDF/CSV/Excel exports\n✓ All calculators\n\n**What needs internet:**\n• Cloud sync\n• Sentinel AI chat\n• Marketplace browsing\n• Team collaboration (real-time)\n\n**Storage:** IndexedDB usually allows several GB. Check Settings → Storage.` },
  { id: 'of-2', cat: 'offline', title: 'Data Privacy & Security', tags: ['privacy','security','encryption','gdpr','data','safe'], difficulty: 'beginner',
    content: `**Privacy Guarantees:**\n• All processing happens locally in your browser\n• No data sent to external servers (unless cloud sync ON)\n• No analytics or telemetry tracking\n• Zero-knowledge architecture\n• GDPR compliant\n\n**Security Features:**\n• AES-256 encryption for stored data\n• Browser sandbox isolation\n• No third-party data access\n• Clear all data anytime from Settings\n\n**Backup Recommendations:**\n• Weekly backup (Settings → Backup → Export All)\n• Store backups on encrypted drive\n• Test restore periodically` },

  // ── TROUBLESHOOTING ──
  { id: 'tr-1', cat: 'troubleshooting', title: 'Backtest Not Running or Frozen', tags: ['error','stuck','frozen','hang','not working'], difficulty: 'beginner',
    content: `**Check These First:**\n1. ✅ Data loaded? (Check Workflow → Data tab)\n2. ✅ Strategy selected? (Check Strategy tab)\n3. ✅ Dates within data range?\n4. ✅ No strategy syntax errors?\n\n**Common Fixes:**\n• Empty dataset → Import data first\n• Invalid YAML → Check syntax (red underlines)\n• Date range outside data → Adjust dates\n• Browser memory limit → Use smaller dataset or close other tabs\n\n**Nuclear Option:**\n1. Clear browser cache\n2. Reload app (Ctrl+Shift+R)\n3. Check /logs for error details\n4. Try Chrome (best performance)` },
  { id: 'tr-2', cat: 'troubleshooting', title: 'CSV Import Errors & Fixes', tags: ['import','error','csv','parse','format','column'], difficulty: 'beginner',
    content: `**Common Import Issues:**\n\n**"No data found":**\n• Wrong delimiter (comma vs semicolon)\n• File encoding not UTF-8\n• Hidden characters in headers\n\n**"Date parse error":**\n• Inconsistent date format in file\n• Mixed timezones\n• Non-standard format → Manual mapping\n\n**"Column not mapped":**\n• Headers don't match expected (Open, High, Low, Close)\n• Use manual column mapping in preview step\n\n**Large files slow:**\n• Files >100MB auto-chunked\n• Consider splitting by year\n• Close other tabs for memory` },
  { id: 'tr-3', cat: 'troubleshooting', title: 'App Slow or Laggy', tags: ['slow','lag','performance','memory','crash','speed'], difficulty: 'beginner',
    content: `**Quick Fixes:**\n1. Close unused browser tabs (free RAM)\n2. Clear app cache (Settings → Clear Cache)\n3. Enable hardware acceleration in browser settings\n4. Use Chrome for best Web Worker performance\n\n**Data-related slowness:**\n• Reduce active dataset count\n• Delete old backtest results you don't need\n• Use date range filters to limit data in views\n\n**If app crashes:**\n• Progress is checkpointed every 5K bars\n• Resume from last checkpoint automatically\n• Check /logs for specific error messages\n• Storage quota check: Settings → Storage` },

  // ── ADMIN ──
  { id: 'ad-1', cat: 'admin', title: 'Admin Panel Overview', tags: ['admin','panel','dashboard','manage','config'], difficulty: 'advanced',
    content: `**Admin Panel (/admin)** — System management hub.\n\n**Modules:**\n• **Overview:** KPIs (total users, strategies, datasets), quick actions\n• **Config Center:** Dynamic app settings (key-value pairs, categories)\n• **Feature Flags:** Toggle features, kill switches (disable signups, maintenance mode)\n• **Audit Trail:** Immutable log of all admin actions with search & export\n• **User Management:** View users, roles, activities\n\n**Access:** Requires admin role (user_roles table).\n\n**Security:** All changes logged to audit trail. Sensitive configs marked.` },

  // ── METRICS ENCYCLOPEDIA ──
  { id: 'me-1', cat: 'metrics', title: 'Core Metrics: Sharpe, Sortino, Calmar, Profit Factor', tags: ['sharpe','sortino','calmar','profit factor','metrics','formula'], difficulty: 'intermediate',
    content: `**Sharpe Ratio**\nFormula: (Return - Risk-Free Rate) / StdDev(Returns)\nAnnualized: × √252\n• <0: Worse than cash\n• 0-1: Sub-optimal\n• 1-2: Good ✅\n• 2-3: Excellent ⭐\n• >3: Check for overfitting ⚠️\n\n**Sortino Ratio**\nSame but uses downside deviation only → doesn't penalize upside volatility.\n\n**Calmar Ratio**\nFormula: CAGR / Max Drawdown\n• <0.5: Poor\n• 0.5-1: Decent\n• 1-2: Good\n• >2: Excellent\n\n**Profit Factor**\nFormula: Gross Profit / Gross Loss\n• <1: Losing money\n• 1-1.5: Marginal edge\n• 1.5-2: Reliable ✅\n• 2-3: Strong ⭐\n• >3: Exceptional (verify!)` },
  { id: 'me-2', cat: 'metrics', title: 'Risk Metrics: VaR, CVaR, Drawdown, Recovery Factor', tags: ['var','cvar','drawdown','recovery','risk','loss'], difficulty: 'advanced',
    content: `**Value at Risk (VaR)**\n• 95% VaR: 5% chance of losing this much in a day\n• 99% VaR: 1% chance\n• Parametric: μ - z × σ\n\n**CVaR (Expected Shortfall)**\n• Average loss when VaR is breached\n• More conservative than VaR\n\n**Maximum Drawdown**\n• Largest peak-to-trough decline\n• < 10%: Conservative\n• 10-20%: Moderate\n• 20-30%: Aggressive\n• > 30%: High risk ⚠️\n\n**Recovery Factor**\nFormula: Net Profit / Max Drawdown\n• <1: Not worth the risk\n• 1-2: Marginal\n• 2-5: Good ✅\n• >5: Excellent ⭐\n\n**Max DD Duration:** How long before equity recovers. Key for psychology.` },
  { id: 'me-3', cat: 'metrics', title: 'Trade Stats: Win Rate, Expectancy, R:R, Kelly', tags: ['win rate','expectancy','reward','risk','kelly','trade'], difficulty: 'intermediate',
    content: `**Win Rate**\n= Winners / Total Trades × 100\nContext matters:\n• 30-40%: Trend following (need high R:R)\n• 50-60%: Mean reversion\n• 70%+: Scalping (tight R:R)\n\n**Risk:Reward Ratio**\n= Average Win / Average Loss\n• 1:1 → Need >50% WR to profit\n• 2:1 → Need >33% WR\n• 3:1 → Need >25% WR\n\n**Expectancy**\n= (Win% × AvgWin) - (Loss% × AvgLoss)\nMust be positive for long-term profitability.\nExample: 55% WR, ₹100 win, ₹80 loss → E = ₹19/trade\n\n**Kelly Criterion**\nf* = W - (1-W)/R\nOptimal bet fraction. Use Half-Kelly for safety.` },
];

interface Article {
  id: string;
  cat: string;
  title: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  content: string;
}

const difficultyColors = {
  beginner: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  intermediate: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  advanced: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

export default function HelpCenter() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotQ, setCopilotQ] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search on mount
  useEffect(() => { searchRef.current?.focus(); }, []);

  const filtered = useMemo(() => {
    let list = articles;
    if (activeCat) list = list.filter(a => a.cat === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.tags.some(t => t.includes(q)) ||
        a.content.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, activeCat]);

  const activeCatInfo = categories.find(c => c.id === activeCat);
  const articleCounts = useMemo(() => {
    const map: Record<string, number> = {};
    articles.forEach(a => { map[a.cat] = (map[a.cat] || 0) + 1; });
    return map;
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            Help Center
          </h1>
          <p className="text-muted-foreground mt-1">Everything you need to master MMC — {articles.length} articles across {categories.length} topics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/guide')}>
            <Download className="h-3.5 w-3.5" />
            PDF Guide
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setCopilotOpen(!copilotOpen)}>
            <Bot className="h-3.5 w-3.5" />
            Ask Copilot
          </Button>
        </div>
      </div>

      {/* ── SEARCH ── */}
      <Card className="border-border/50 bg-muted/20">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
            <Input
              ref={searchRef}
              placeholder="Search articles, topics, metrics, shortcuts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12 text-base bg-background/60 border-border/40"
              inputSize="lg"
            />
            {search && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</Badge>
                <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── QUICK LINKS (when no filter active) ── */}
      {!search && !activeCat && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Play, label: 'Quick Start', cat: 'getting-started', accent: 'text-emerald-500' },
            { icon: Keyboard, label: 'Shortcuts', cat: 'shortcuts', accent: 'text-teal-500' },
            { icon: Gauge, label: 'Metrics Guide', cat: 'metrics', accent: 'text-green-500' },
            { icon: AlertTriangle, label: 'Troubleshooting', cat: 'troubleshooting', accent: 'text-orange-500' },
          ].map(link => (
            <button
              key={link.label}
              onClick={() => setActiveCat(link.cat)}
              className="flex items-center gap-3 p-4 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-all text-left group"
            >
              <link.icon className={cn('h-5 w-5', link.accent)} />
              <span className="text-sm font-medium group-hover:text-foreground text-muted-foreground">{link.label}</span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground/40 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ))}
        </div>
      )}

      {/* ── MAIN LAYOUT ── */}
      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar Categories */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-2 mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categories</h3>
            {activeCat && (
              <button onClick={() => setActiveCat(null)} className="text-xs text-primary hover:underline">Clear</button>
            )}
          </div>
          <ScrollArea className="max-h-[calc(100vh-320px)]">
            <div className="space-y-0.5 pr-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all text-sm',
                    activeCat === cat.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  )}
                >
                  <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center bg-gradient-to-br shrink-0', cat.gradient)}>
                    <cat.icon className={cn('h-3.5 w-3.5', cat.accent)} />
                  </div>
                  <span className="flex-1 truncate">{cat.label}</span>
                  <span className="text-[10px] text-muted-foreground/60 tabular-nums">{articleCounts[cat.id] || 0}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Content Area */}
        <div className="space-y-4 min-w-0">
          {/* Category Header */}
          {activeCatInfo && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-4 rounded-xl border border-border/40 bg-muted/20">
              <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br', activeCatInfo.gradient)}>
                <activeCatInfo.icon className={cn('h-5 w-5', activeCatInfo.accent)} />
              </div>
              <div>
                <h2 className="font-semibold">{activeCatInfo.label}</h2>
                <p className="text-sm text-muted-foreground">{activeCatInfo.desc} — {filtered.length} article{filtered.length !== 1 ? 's' : ''}</p>
              </div>
            </motion.div>
          )}

          {/* Articles */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No articles found</h3>
              <p className="text-muted-foreground mb-4">Try different keywords or browse categories</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={() => { setSearch(''); setActiveCat(null); }}>Clear Filters</Button>
                <Button size="sm" className="gap-1.5" onClick={() => setCopilotOpen(true)}>
                  <Bot className="h-3.5 w-3.5" /> Ask Copilot
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filtered.map((article, i) => (
                  <motion.div
                    key={article.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  >
                    <div
                      className={cn(
                        'border border-border/40 rounded-xl transition-all cursor-pointer',
                        expandedId === article.id ? 'bg-muted/30 border-primary/30 shadow-sm' : 'hover:bg-muted/20'
                      )}
                      onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {!activeCat && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {categories.find(c => c.id === article.cat)?.label}
                                </Badge>
                              )}
                              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border', difficultyColors[article.difficulty])}>
                                {article.difficulty}
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-sm leading-snug">{article.title}</h3>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {article.tags.slice(0, 6).map(tag => (
                                <span key={tag} className="text-[10px] text-muted-foreground/60 bg-muted/40 px-1.5 py-0.5 rounded">{tag}</span>
                              ))}
                            </div>
                          </div>
                          <ChevronDown className={cn('h-4 w-4 text-muted-foreground/40 shrink-0 mt-1 transition-transform', expandedId === article.id && 'rotate-180')} />
                        </div>

                        <AnimatePresence>
                          {expandedId === article.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <Separator className="my-3" />
                              <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
                                <div className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed font-sans">
                                  {article.content.split('\n').map((line, li) => {
                                    if (line.startsWith('**') && line.endsWith('**')) {
                                      return <p key={li} className="font-semibold text-foreground mt-2 mb-1">{line.replace(/\*\*/g, '')}</p>;
                                    }
                                    if (line.startsWith('• ') || line.startsWith('✓ ') || line.startsWith('✅ ') || line.startsWith('❌ ')) {
                                      return <p key={li} className="ml-2 text-muted-foreground">{line}</p>;
                                    }
                                    if (line.startsWith('**') && line.includes(':**')) {
                                      const parts = line.split(':**');
                                      return <p key={li}><span className="font-semibold text-foreground">{parts[0].replace(/\*\*/g, '')}:</span>{parts.slice(1).join(':**')}</p>;
                                    }
                                    if (line.startsWith('```')) return null;
                                    if (line.trim() === '') return <br key={li} />;
                                    return <p key={li}>{line}</p>;
                                  })}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ── COPILOT DRAWER ── */}
      <AnimatePresence>
        {copilotOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-4 bottom-4 top-20 w-[380px] z-50 border border-border/60 rounded-2xl bg-background/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">MMC Copilot</h3>
                  <p className="text-[10px] text-muted-foreground">Ask anything about MMC</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCopilotOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-3">
                  <p className="font-medium text-foreground mb-2">💡 Try asking:</p>
                  {['Sharpe ratio kya hota hai?', 'Walk-forward kaise setup karu?', 'CSV import fail ho raha', 'Backtest me no trades generate ho rahe'].map(q => (
                    <button
                      key={q}
                      onClick={() => { setCopilotQ(q); navigate('/sentinel'); }}
                      className="block w-full text-left text-xs text-primary hover:underline py-1"
                    >
                      → {q}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">Full chat at <button onClick={() => navigate('/sentinel')} className="text-primary hover:underline">/sentinel</button></p>
              </div>
            </ScrollArea>
            <div className="p-3 border-t border-border/40">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your question..."
                  value={copilotQ}
                  onChange={e => setCopilotQ(e.target.value)}
                  inputSize="sm"
                  onKeyDown={e => { if (e.key === 'Enter' && copilotQ.trim()) navigate('/sentinel'); }}
                />
                <Button size="sm" className="shrink-0" onClick={() => { if (copilotQ.trim()) navigate('/sentinel'); }}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
