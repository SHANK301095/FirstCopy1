/**
 * Comprehensive Help Center
 * Full in-app documentation with search and categories
 */

import { useState, useMemo } from 'react';
import { 
  Search,
  HelpCircle, 
  Wifi, 
  WifiOff, 
  Database, 
  Download, 
  Upload,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Shield,
  Smartphone,
  BookOpen,
  Play,
  Settings,
  BarChart3,
  TrendingUp,
  FlaskConical,
  Briefcase,
  FileText,
  Zap,
  Terminal,
  Keyboard,
  MousePointer,
  Layers,
  Clock,
  Target,
  Bell,
  ScrollText,
  Bot,
  PieChart,
  ArrowRight,
  ChevronDown,
  ExternalLink,
  Lightbulb,
  Wrench,
  AlertCircle,
  Info,
  Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { cn } from '@/lib/utils';

// Comprehensive help content database
const helpCategories = [
  {
    id: 'getting-started',
    icon: Play,
    title: 'Getting Started',
    description: 'Quick start guide and first steps',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'workflow',
    icon: Layers,
    title: 'Workflow',
    description: 'Data import, strategy setup, backtesting',
    color: 'from-blue-500 to-cyan-600',
  },
  {
    id: 'strategies',
    icon: BookOpen,
    title: 'Strategies',
    description: 'Creating and managing trading strategies',
    color: 'from-purple-500 to-pink-600',
  },
  {
    id: 'backtesting',
    icon: FlaskConical,
    title: 'Backtesting',
    description: 'Running and analyzing backtests',
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'optimization',
    icon: TrendingUp,
    title: 'Optimization',
    description: 'Parameter optimization and walk-forward',
    color: 'from-rose-500 to-red-600',
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Analytics',
    description: 'Reports, metrics, and visualizations',
    color: 'from-indigo-500 to-violet-600',
  },
  {
    id: 'portfolio',
    icon: Briefcase,
    title: 'Portfolio',
    description: 'Portfolio building and management',
    color: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'offline',
    icon: WifiOff,
    title: 'Offline Mode',
    description: 'Working offline and data privacy',
    color: 'from-slate-500 to-zinc-600',
  },
  {
    id: 'shortcuts',
    icon: Keyboard,
    title: 'Keyboard Shortcuts',
    description: 'Speed up your workflow',
    color: 'from-teal-500 to-emerald-600',
  },
  {
    id: 'troubleshooting',
    icon: Wrench,
    title: 'Troubleshooting',
    description: 'Common issues and solutions',
    color: 'from-orange-500 to-amber-600',
  },
];

const helpArticles = [
  // Getting Started
  {
    id: 'gs-1',
    category: 'getting-started',
    title: 'Welcome to MMC',
    keywords: ['start', 'begin', 'intro', 'welcome', 'first', 'new'],
    content: `MMC is a powerful AI-engineered trading intelligence platform designed to build, test, execute, automate, and optimize trading systems with precision. Here's what makes it special:

**Key Features:**
• AI-Engineered: Machine-driven analysis with full control over your data
• Fast Processing: Web Workers for parallel backtest execution
• Privacy-Focused: No data sent to external servers
• Multi-Asset: Supports stocks, forex, crypto, and futures
• Professional Tools: Walk-forward analysis, Monte Carlo, portfolio optimization

**First Steps:**
1. Import your historical data (CSV format)
2. Create or import a trading strategy
3. Run your first backtest
4. Analyze results with built-in analytics`
  },
  {
    id: 'gs-2',
    category: 'getting-started',
    title: 'Importing Your First Dataset',
    keywords: ['import', 'csv', 'data', 'upload', 'file', 'dataset', 'ohlc'],
    content: `**Supported Formats:**
• CSV files with OHLC data
• Multiple broker formats auto-detected
• Custom column mapping available

**Required Columns:**
• Date/Time (various formats supported)
• Open, High, Low, Close prices
• Volume (optional but recommended)

**How to Import:**
1. Go to Workflow → Data tab
2. Click "Import CSV" or drag & drop file
3. Preview and confirm column mapping
4. Data is stored locally in IndexedDB

**Tips:**
• Large files are automatically chunked (100K rows)
• Data persists across browser sessions
• Export/backup supported for portability`
  },
  {
    id: 'gs-3',
    category: 'getting-started',
    title: 'Installing the App (PWA)',
    keywords: ['install', 'pwa', 'app', 'desktop', 'mobile', 'download'],
    content: `MMC is a Progressive Web App (PWA) that can be installed on any device.

**Desktop Installation:**
• Chrome/Edge: Click the install icon in the address bar
• Or use the "Install App" button in the navigation

**Mobile Installation:**
• iOS Safari: Tap Share → Add to Home Screen
• Android Chrome: Tap menu → Install App

**Benefits of Installing:**
• Works fully offline
• Faster loading times
• Native app-like experience
• No browser UI clutter
• Background sync when online`
  },
  // Workflow
  {
    id: 'wf-1',
    category: 'workflow',
    title: 'Understanding the Workflow',
    keywords: ['workflow', 'process', 'steps', 'flow', 'pipeline'],
    content: `The MMC workflow follows a logical progression:

**Step 1: Data**
Import and manage your market data. Supports multiple symbols and timeframes.

**Step 2: Strategy**
Select or create your trading strategy. YAML format for easy editing.

**Step 3: Backtest**
Configure backtest parameters (dates, capital, commission) and run.

**Step 4: Results**
View detailed performance metrics, equity curves, and trade logs.

**Saving Progress:**
All work is automatically saved to local storage. Use templates to save complete workflow configurations for reuse.`
  },
  {
    id: 'wf-2',
    category: 'workflow',
    title: 'Using Workflow Templates',
    keywords: ['template', 'save', 'load', 'preset', 'configuration'],
    content: `Templates save your complete workflow configuration for quick reuse.

**What Templates Save:**
• Selected dataset and symbol
• Strategy configuration
• Backtest parameters
• Optimization settings

**Creating Templates:**
1. Configure your workflow as desired
2. Go to Templates page
3. Click "Save Current Workflow"
4. Name and describe your template

**Loading Templates:**
1. Browse available templates
2. Click to preview settings
3. Load to apply configuration

**Template Categories:**
• Quick Start: Basic configurations
• Advanced: Complex multi-strategy setups
• Custom: Your saved templates`
  },
  // Strategies
  {
    id: 'st-1',
    category: 'strategies',
    title: 'Strategy Format (YAML)',
    keywords: ['strategy', 'yaml', 'format', 'syntax', 'code', 'rules'],
    content: `Strategies are defined in YAML format for readability and version control.

**Basic Structure:**
\`\`\`yaml
name: My Strategy
version: 1.0
description: A simple moving average crossover

parameters:
  fast_period: 10
  slow_period: 20

entry:
  long: SMA(close, fast_period) > SMA(close, slow_period)
  short: SMA(close, fast_period) < SMA(close, slow_period)

exit:
  long: SMA(close, fast_period) < SMA(close, slow_period)
  short: SMA(close, fast_period) > SMA(close, slow_period)
\`\`\`

**Available Indicators:**
SMA, EMA, RSI, MACD, Bollinger Bands, ATR, Stochastic, ADX, and more.`
  },
  {
    id: 'st-2',
    category: 'strategies',
    title: 'Strategy Parameters',
    keywords: ['parameters', 'variables', 'optimize', 'inputs'],
    content: `Parameters allow you to define adjustable values in your strategy.

**Defining Parameters:**
\`\`\`yaml
parameters:
  lookback: 14
  threshold: 0.5
  stop_loss: 2.0
\`\`\`

**Parameter Types:**
• Integer: Whole numbers (periods, bars)
• Float: Decimal numbers (percentages, ratios)
• Boolean: True/False flags

**Optimization Ranges:**
When optimizing, specify ranges for each parameter:
• Start value, end value, step size
• The optimizer tests all combinations`
  },
  {
    id: 'st-3',
    category: 'strategies',
    title: 'EA Manager (MetaTrader)',
    keywords: ['ea', 'metatrader', 'mt4', 'mt5', 'expert advisor', 'mql'],
    content: `Import and manage Expert Advisors from MetaTrader 4/5.

**Supported Files:**
• .mq4 / .mq5 source files
• .ex4 / .ex5 compiled EAs

**Import Process:**
1. Go to EA Manager
2. Upload your EA file
3. System extracts parameters
4. Configure and run backtests

**Features:**
• Automatic parameter detection
• Version tracking
• Performance comparison
• Batch testing support`
  },
  // Backtesting
  {
    id: 'bt-1',
    category: 'backtesting',
    title: 'Running a Backtest',
    keywords: ['backtest', 'run', 'test', 'execute', 'simulate'],
    content: `Execute backtests to simulate your strategy on historical data.

**Configuration Options:**
• Date Range: Start and end dates for testing
• Initial Capital: Starting account balance
• Commission: Per-trade costs
• Slippage: Execution price deviation
• Position Sizing: Fixed or percentage-based

**Running:**
1. Select data and strategy
2. Configure parameters
3. Click "Run Backtest"
4. Monitor progress in real-time

**Performance:**
• Tests ~10,000 bars/second
• Progress checkpointed every 5,000 bars
• Runs in background Web Worker`
  },
  {
    id: 'bt-2',
    category: 'backtesting',
    title: 'Understanding Backtest Results',
    keywords: ['results', 'metrics', 'performance', 'statistics', 'report'],
    content: `Analyze your backtest results with comprehensive metrics.

**Key Metrics:**
• Net Profit: Total P&L after costs
• Win Rate: Percentage of winning trades
• Profit Factor: Gross profit / gross loss
• Sharpe Ratio: Risk-adjusted returns
• Max Drawdown: Largest peak-to-trough decline

**Visualizations:**
• Equity Curve: Account balance over time
• Drawdown Chart: Underwater equity
• Monthly Returns: Calendar heatmap
• Trade Distribution: Win/loss histogram

**Export Options:**
• PDF Report: Professional summary
• CSV: Raw trade data
• JSON: Full results for further analysis`
  },
  {
    id: 'bt-3',
    category: 'backtesting',
    title: 'Batch Backtesting',
    keywords: ['batch', 'bulk', 'multiple', 'queue', 'parallel'],
    content: `Run multiple backtests efficiently with batch processing.

**Use Cases:**
• Test strategy across multiple symbols
• Compare different parameter sets
• Run sensitivity analysis

**How to Use:**
1. Configure base backtest settings
2. Add variations (symbols, parameters)
3. Queue all tests
4. System runs in parallel

**Queue Features:**
• Pause/resume capability
• Priority ordering
• Progress tracking per test
• Aggregate comparison view`
  },
  // Optimization
  {
    id: 'op-1',
    category: 'optimization',
    title: 'Parameter Optimization',
    keywords: ['optimize', 'optimization', 'parameters', 'best', 'tune'],
    content: `Find optimal parameter values for your strategy.

**Optimization Methods:**
• Grid Search: Test all combinations
• Random Search: Sample random combinations
• Genetic Algorithm: Evolutionary optimization

**Setting Up:**
1. Select parameters to optimize
2. Define ranges (min, max, step)
3. Choose optimization metric
4. Run optimizer

**Best Practices:**
• Start with wide ranges, then narrow
• Use out-of-sample validation
• Avoid over-optimization (curve fitting)
• Consider transaction costs`
  },
  {
    id: 'op-2',
    category: 'optimization',
    title: 'Walk-Forward Analysis',
    keywords: ['walk-forward', 'wfa', 'validation', 'robust', 'oos'],
    content: `Validate strategy robustness with walk-forward testing.

**What is Walk-Forward:**
• Divides data into in-sample and out-of-sample periods
• Optimizes on in-sample, tests on out-of-sample
• Rolls forward and repeats

**Configuration:**
• Window Size: In-sample period length
• Step Size: How far to roll forward
• Out-of-Sample %: Validation period

**Interpretation:**
• Consistent OOS performance = robust strategy
• Degraded OOS performance = possible overfitting
• Efficiency Ratio: OOS profit / IS profit`
  },
  {
    id: 'op-3',
    category: 'optimization',
    title: 'Monte Carlo Simulation',
    keywords: ['monte carlo', 'simulation', 'random', 'probability', 'risk'],
    content: `Assess strategy risk with Monte Carlo analysis.

**What it Does:**
• Randomizes trade order/outcomes
• Runs thousands of simulations
• Shows range of possible results

**Outputs:**
• Confidence intervals (95%, 99%)
• Probability of ruin
• Expected drawdown distribution
• Risk of goal shortfall

**Use Cases:**
• Position sizing decisions
• Risk assessment
• Setting realistic expectations
• Stress testing`
  },
  // Analytics
  {
    id: 'an-1',
    category: 'analytics',
    title: 'Performance Metrics Explained',
    keywords: ['metrics', 'statistics', 'performance', 'ratios', 'analysis'],
    content: `Understanding key performance metrics:

**Return Metrics:**
• Net Profit: Total gains minus losses
• CAGR: Compound Annual Growth Rate
• Return on Capital: Profit / Starting Capital

**Risk Metrics:**
• Max Drawdown: Largest decline from peak
• Sharpe Ratio: Return / Standard Deviation
• Sortino Ratio: Return / Downside Deviation
• Calmar Ratio: CAGR / Max Drawdown

**Trade Metrics:**
• Win Rate: Winners / Total Trades
• Profit Factor: Gross Profit / Gross Loss
• Average Win/Loss Ratio
• Expectancy: Average profit per trade`
  },
  {
    id: 'an-2',
    category: 'analytics',
    title: 'Advanced Analytics Features',
    keywords: ['advanced', 'regime', 'correlation', 'attribution'],
    content: `Deep dive analysis tools:

**Regime Analysis:**
• Detects market regimes (trending, ranging)
• Shows strategy performance by regime
• Identifies optimal market conditions

**Correlation Analysis:**
• Strategy vs benchmark correlation
• Rolling correlation windows
• Diversification opportunities

**Performance Attribution:**
• Entry vs exit timing contribution
• Long vs short performance
• Time-based analysis (day, month, year)

**AI Suggestions:**
• Pattern recognition
• Improvement recommendations
• Similar strategy comparison`
  },
  // Portfolio
  {
    id: 'pf-1',
    category: 'portfolio',
    title: 'Portfolio Builder',
    keywords: ['portfolio', 'allocation', 'diversification', 'combine'],
    content: `Combine multiple strategies into a portfolio.

**Features:**
• Multi-strategy allocation
• Correlation-based weighting
• Rebalancing rules
• Combined equity analysis

**Building a Portfolio:**
1. Select strategies to include
2. Set allocation weights
3. Configure rebalancing
4. Run portfolio backtest

**Optimization Goals:**
• Maximum Sharpe Ratio
• Minimum Drawdown
• Target Return
• Risk Parity`
  },
  {
    id: 'pf-2',
    category: 'portfolio',
    title: 'Live Tracker',
    keywords: ['live', 'tracker', 'positions', 'real-time', 'monitor'],
    content: `Monitor live trading positions and performance.

**Dashboard Features:**
• Current positions summary
• Real-time P&L tracking
• Alert notifications
• Performance vs backtest comparison

**Adding Positions:**
• Manual entry
• Broker sync (where supported)
• CSV import

**Alerts:**
• Price targets
• Drawdown limits
• Profit goals
• Time-based reminders`
  },
  {
    id: 'pf-3',
    category: 'portfolio',
    title: 'Trade Journal',
    keywords: ['journal', 'notes', 'diary', 'log', 'trades'],
    content: `Keep detailed records of your trading.

**Journal Features:**
• Trade notes and tags
• Screenshots/charts
• Emotional tracking
• Lessons learned

**Analysis Tools:**
• Filter by tag/date/result
• Pattern recognition
• Performance by tag
• Export for review

**Best Practices:**
• Record before and after thoughts
• Note market conditions
• Track emotional state
• Review regularly`
  },
  // Offline
  {
    id: 'of-1',
    category: 'offline',
    title: 'How Offline Mode Works',
    keywords: ['offline', 'local', 'storage', 'indexeddb', 'pwa'],
    content: `MMC is designed to work entirely offline.

**Storage Technology:**
• IndexedDB for large datasets
• LocalStorage for settings
• Service Worker for app caching

**What Works Offline:**
• All data import/export
• Strategy creation/editing
• Running backtests
• Viewing results
• PDF/CSV exports

**Sync Behavior:**
• No cloud sync required
• Manual backup/restore
• Export files for transfer`
  },
  {
    id: 'of-2',
    category: 'offline',
    title: 'Backup and Restore',
    keywords: ['backup', 'restore', 'export', 'import', 'transfer'],
    content: `Protect your data with regular backups.

**Creating Backups:**
1. Go to Settings → Backup & Restore
2. Click "Export All Data"
3. Save the .json.gz file securely

**Restoring Data:**
1. Go to Settings → Backup & Restore
2. Click "Import Backup"
3. Select your backup file
4. Confirm restoration

**Backup Contents:**
• All datasets
• Strategies and versions
• Backtest results
• Templates and settings
• Trade journal entries`
  },
  {
    id: 'of-3',
    category: 'offline',
    title: 'Data Privacy',
    keywords: ['privacy', 'security', 'data', 'local', 'safe'],
    content: `Your data stays private and secure.

**Privacy Guarantees:**
• All processing happens locally
• No data sent to external servers
• No analytics or telemetry
• No user tracking

**Security Features:**
• Data stored in browser sandbox
• No cloud exposure
• You control all exports
• Clear data anytime

**Recommendations:**
• Regular backups
• Secure backup storage
• Use device encryption
• Clear data when switching devices`
  },
  // Shortcuts
  {
    id: 'kb-1',
    category: 'shortcuts',
    title: 'Global Keyboard Shortcuts',
    keywords: ['keyboard', 'shortcuts', 'hotkeys', 'keys', 'quick'],
    content: `Speed up your workflow with keyboard shortcuts.

**Navigation:**
• Ctrl/Cmd + K: Command Palette
• Ctrl/Cmd + /: Toggle Help
• Ctrl/Cmd + B: Toggle Sidebar

**Workflow:**
• Ctrl/Cmd + Enter: Run Backtest
• Ctrl/Cmd + S: Save Current Work
• Ctrl/Cmd + E: Export Results

**Data:**
• Ctrl/Cmd + I: Import Data
• Ctrl/Cmd + O: Open File
• Ctrl/Cmd + Shift + E: Export All

**Views:**
• 1-9: Switch main tabs
• Tab: Next field
• Escape: Close modal/dialog`
  },
  {
    id: 'kb-2',
    category: 'shortcuts',
    title: 'Command Palette',
    keywords: ['command', 'palette', 'search', 'quick', 'actions'],
    content: `Access any feature instantly with the command palette.

**Opening:**
• Press Ctrl/Cmd + K
• Or click search icon in header

**Features:**
• Fuzzy search all commands
• Quick navigation to any page
• Recent actions history
• Contextual suggestions

**Available Commands:**
• Run backtest
• Create new strategy
• Import data
• Export results
• Open settings
• View help
• And more...`
  },
  // Troubleshooting
  {
    id: 'tr-1',
    category: 'troubleshooting',
    title: 'Backtest Not Running',
    keywords: ['error', 'stuck', 'not working', 'frozen', 'hang'],
    content: `If backtests aren't running:

**Check These First:**
1. Is data loaded? (Check Data tab)
2. Is strategy selected? (Check Strategy tab)
3. Are dates valid? (Within data range)

**Common Issues:**
• Empty dataset → Import data first
• Invalid strategy syntax → Check YAML format
• Date range outside data → Adjust dates
• Browser memory limit → Use smaller dataset

**Still Stuck?**
• Clear browser cache
• Reload the app
• Check browser console for errors
• Try a different browser`
  },
  {
    id: 'tr-2',
    category: 'troubleshooting',
    title: 'Data Import Errors',
    keywords: ['import', 'error', 'csv', 'parse', 'format'],
    content: `Fixing data import problems:

**File Format Issues:**
• Ensure CSV format (not Excel)
• Check delimiter (comma, semicolon)
• Remove special characters in headers
• Ensure consistent date format

**Column Mapping:**
• Required: Date, Open, High, Low, Close
• Optional: Volume, Symbol
• Map columns in preview screen

**Large Files:**
• Files are chunked automatically
• Very large files may take time
• Consider splitting into smaller files

**Encoding Issues:**
• Save as UTF-8
• Remove non-ASCII characters
• Check for hidden characters`
  },
  {
    id: 'tr-3',
    category: 'troubleshooting',
    title: 'Performance Issues',
    keywords: ['slow', 'lag', 'performance', 'memory', 'crash'],
    content: `Improving app performance:

**Slow Backtests:**
• Use smaller date ranges for testing
• Reduce bar count if possible
• Close other browser tabs
• Use Chrome for best performance

**Memory Issues:**
• Limit active datasets
• Delete old backtest results
• Clear unused strategies
• Restart browser periodically

**App Crashes:**
• Progress is checkpointed
• Resume from last checkpoint
• Clear cache if persistent
• Check storage quota`
  },
  {
    id: 'tr-4',
    category: 'troubleshooting',
    title: 'Storage Full',
    keywords: ['storage', 'full', 'quota', 'space', 'limit'],
    content: `Managing storage space:

**Check Usage:**
• Go to Settings → Storage
• View breakdown by category
• Identify large items

**Free Up Space:**
• Delete old backtest results
• Remove unused datasets
• Clear strategy versions
• Export and delete old work

**Storage Limits:**
• IndexedDB: Usually 50% of disk
• Varies by browser
• Chrome most generous
• Safari more restrictive`
  },
];

const faqItems = [
  {
    question: 'What works offline?',
    answer: 'Everything! CSV data import, running backtests, viewing results, exporting reports, strategy management, and all settings work without internet.'
  },
  {
    question: 'How do I install the app?',
    answer: 'Look for the "Install App" button in the navigation or address bar. Once installed, it runs independently with its own window and works fully offline.'
  },
  {
    question: 'How do I backup my data?',
    answer: 'Go to Settings → Backup & Restore → Export All Data. This creates a compressed JSON file with all your datasets, strategies, and results.'
  },
  {
    question: 'What happens if a backtest crashes?',
    answer: 'Progress is checkpointed every 5,000 bars. If the app crashes, you can resume from the last checkpoint. The queue tracks all runs.'
  },
  {
    question: 'How much storage can I use?',
    answer: 'IndexedDB typically allows several GB (varies by browser). Check Settings → Storage to see usage. Large datasets are chunked efficiently.'
  },
  {
    question: 'Can I use this on mobile?',
    answer: 'Yes! MMC is a PWA that works on mobile browsers. Install from Safari (iOS) or Chrome (Android) for the best experience.'
  },
  {
    question: 'Is my data secure?',
    answer: 'All data stays on your device. Nothing is sent to external servers. No analytics or telemetry is collected. You have full control.'
  },
  {
    question: 'How do I export results?',
    answer: 'From any results view, click Export. Choose PDF for reports, CSV for raw data, or JSON for full programmatic access.'
  },
];

export default function HelpOffline() {
  const { isOnline, isInstalled } = usePWAInstall();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  // Search and filter articles
  const filteredArticles = useMemo(() => {
    let articles = helpArticles;
    
    if (selectedCategory) {
      articles = articles.filter(a => a.category === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      articles = articles.filter(a => 
        a.title.toLowerCase().includes(query) ||
        a.keywords.some(k => k.toLowerCase().includes(query)) ||
        a.content.toLowerCase().includes(query)
      );
    }
    
    return articles;
  }, [searchQuery, selectedCategory]);

  const selectedCategoryInfo = helpCategories.find(c => c.id === selectedCategory);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
            Help Center
          </h1>
          <p className="text-muted-foreground mt-1">Everything you need to master MMC</p>
        </div>
        
        {/* Status Badges */}
        <div className="flex items-center gap-3">
          <Badge variant={isOnline ? 'success' : 'warning'} className="gap-1.5">
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
          <Badge variant={isInstalled ? 'default' : 'outline'} className="gap-1.5">
            <Smartphone className="h-3 w-3" />
            {isInstalled ? 'App Installed' : 'Browser Mode'}
          </Badge>
        </div>
      </div>

      {/* Search Bar */}
      <Card variant="glass" className="p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search help articles, keywords, or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base bg-background/50"
          />
          {searchQuery && (
            <Badge className="absolute right-4 top-1/2 -translate-y-1/2">
              {filteredArticles.length} results
            </Badge>
          )}
        </div>
      </Card>

      {/* Quick Links */}
      {!searchQuery && !selectedCategory && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { icon: Play, label: 'Quick Start', category: 'getting-started' },
            { icon: Keyboard, label: 'Shortcuts', category: 'shortcuts' },
            { icon: WifiOff, label: 'Offline Mode', category: 'offline' },
            { icon: Wrench, label: 'Troubleshooting', category: 'troubleshooting' },
            { icon: HelpCircle, label: 'FAQ', action: 'faq' },
          ].map((link) => (
            <Button
              key={link.label}
              variant="ghost"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => link.action === 'faq' ? setSelectedCategory(null) : setSelectedCategory(link.category)}
            >
              <link.icon className="h-5 w-5 text-primary" />
              <span className="text-sm">{link.label}</span>
            </Button>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Categories Sidebar */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-2">Categories</h3>
          <div className="space-y-1">
            {helpCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200",
                  selectedCategory === category.id
                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center bg-gradient-to-br",
                  category.color
                )}>
                  <category.icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{category.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{category.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {/* Category Header */}
          {selectedCategoryInfo && (
            <Card variant="stat" className="p-5">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
                  selectedCategoryInfo.color
                )}>
                  <selectedCategoryInfo.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedCategoryInfo.title}</h2>
                  <p className="text-muted-foreground">{selectedCategoryInfo.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setSelectedCategory(null)}
                >
                  Clear
                </Button>
              </div>
            </Card>
          )}

          {/* Search Results / Articles */}
          {(searchQuery || selectedCategory) && (
            <div className="space-y-3">
              {filteredArticles.length === 0 ? (
                <Card className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No articles found</h3>
                  <p className="text-muted-foreground mb-4">Try different keywords or browse categories</p>
                  <Button variant="outline" onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}>
                    Clear Filters
                  </Button>
                </Card>
              ) : (
                filteredArticles.map((article) => (
                  <Card
                    key={article.id}
                    variant="stat"
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      expandedArticle === article.id && "ring-1 ring-primary/30"
                    )}
                    onClick={() => setExpandedArticle(expandedArticle === article.id ? null : article.id)}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {helpCategories.find(c => c.id === article.category)?.title}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-lg">{article.title}</h3>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {article.keywords.slice(0, 5).map((kw) => (
                              <span key={kw} className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                        <ChevronDown className={cn(
                          "h-5 w-5 text-muted-foreground transition-transform duration-200",
                          expandedArticle === article.id && "rotate-180"
                        )} />
                      </div>
                      
                      {expandedArticle === article.id && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <div className="prose prose-sm prose-invert max-w-none">
                            <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed">
                              {article.content}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* FAQ Section (default view) */}
          {!searchQuery && !selectedCategory && (
            <>
              <Card variant="stat">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-warning" />
                    Frequently Asked Questions
                  </CardTitle>
                  <CardDescription>Quick answers to common questions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {faqItems.map((faq, index) => (
                      <AccordionItem key={index} value={`faq-${index}`}>
                        <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground">{faq.answer}</p>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>

              {/* Tips Card */}
              <Card variant="stat" className="border-warning/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="h-5 w-5 text-warning" />
                    Pro Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {[
                      'Use Ctrl/Cmd + K to quickly access any feature',
                      'Save workflow templates to speed up your testing',
                      'Regular backups protect your valuable data',
                      'Walk-forward testing validates strategy robustness',
                      'Monte Carlo shows realistic risk scenarios',
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Default Assumptions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Info className="h-5 w-5 text-primary" />
                    Default Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      'Chunk size: 100,000 rows',
                      'Optimizer Top-N: 20 results',
                      'Checkpoint: 5,000 bars',
                      'Timezone: IST (India)',
                      'Currency: INR',
                      'Commission: 0.01%/side',
                      'Slippage: 1 tick',
                      'PDF: Embedded fonts',
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}