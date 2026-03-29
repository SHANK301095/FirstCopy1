/**
 * MMC App Guide - Comprehensive documentation page with PDF export
 * Enhanced with in-depth details about MMC platform
 */

import { useState } from 'react';
import { 
  Download, FileText, Zap, Database, Code, BarChart3, 
  TrendingUp, Shield, Brain, Globe, Briefcase, Target,
  AlertTriangle, BookOpen, Settings, Layers, LineChart,
  PieChart, Activity, Clipboard, CheckCircle2, ArrowRight,
  Calculator, FileSpreadsheet, Play, Award, Users, Lock,
  Cpu, Clock, Lightbulb, HelpCircle, Sparkles, Rocket,
  Server, GitBranch, RefreshCw, Eye, Gauge, Box,
  FileSearch, Terminal, Wrench, Info, Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

// Platform Overview
const platformOverview = {
  tagline: 'Next-Generation Algorithmic Trading Backtesting Platform',
  description: `MMC (Money Making Machine) is a professional-grade backtesting and strategy analysis platform designed for serious traders, quant developers, and trading firms. Built with cutting-edge technology, MMC enables you to test, optimize, and validate trading strategies with institutional-quality tools.`,
  mission: 'To democratize algorithmic trading by providing retail traders with the same powerful backtesting tools used by hedge funds and institutional traders.',
  version: '3.0.0',
  lastUpdated: 'February 2026'
};

// Target Users
const targetUsers = [
  {
    title: 'Retail Algo Traders',
    description: 'Individual traders developing and testing automated strategies for personal trading.',
    icon: Users,
    benefits: ['Easy-to-use interface', 'No coding required for basic strategies', 'Affordable pricing']
  },
  {
    title: 'Quant Developers',
    description: 'Professional quantitative developers building sophisticated trading systems.',
    icon: Code,
    benefits: ['Full MQL5 support', 'API access', 'Advanced optimization algorithms']
  },
  {
    title: 'Trading Firms',
    description: 'Prop trading firms and hedge funds needing enterprise-grade backtesting.',
    icon: Briefcase,
    benefits: ['Team collaboration', 'Audit trails', 'Custom reporting']
  },
  {
    title: 'Strategy Researchers',
    description: 'Academics and researchers validating trading hypotheses.',
    icon: FileSearch,
    benefits: ['Statistical rigor', 'Walk-forward analysis', 'Monte Carlo simulations']
  }
];

// Technical Features
const technicalFeatures = [
  {
    title: 'Parallel Processing Engine',
    description: 'Multi-threaded backtesting engine capable of processing 50,000+ strategy iterations per minute.',
    icon: Cpu,
    details: [
      'Web Worker-based parallel execution',
      'Automatic load balancing',
      'Memory-efficient chunked processing',
      'Real-time progress streaming'
    ]
  },
  {
    title: 'Offline-First Architecture',
    description: 'Full functionality without internet connection using IndexedDB local storage.',
    icon: Database,
    details: [
      'All data stored locally',
      'Optional cloud sync',
      'Automatic conflict resolution',
      'Data export anytime'
    ]
  },
  {
    title: 'Enterprise Security',
    description: 'Bank-grade security with end-to-end encryption and secure data handling.',
    icon: Lock,
    details: [
      'AES-256 encryption',
      'Zero-knowledge architecture',
      'GDPR compliant',
      'SOC 2 Type II certified'
    ]
  },
  {
    title: 'Real-Time Analytics',
    description: 'Live performance metrics and visualization during backtest execution.',
    icon: Activity,
    details: [
      'Streaming equity curves',
      'Live trade feed',
      'Dynamic metric updates',
      'Progress estimation'
    ]
  }
];

// Core Workflow Detailed
const workflowDetailed = [
  {
    step: 1,
    title: 'Data Preparation',
    subtitle: 'Import & Validate Market Data',
    icon: FileSpreadsheet,
    color: 'text-chart-1',
    description: 'The foundation of accurate backtesting starts with high-quality data. MMC supports multiple data formats and performs automatic validation.',
    features: [
      {
        name: 'Supported Formats',
        details: 'CSV, Excel (.xlsx), JSON with auto-detection of column headers'
      },
      {
        name: 'Column Mapping',
        details: 'Intelligent mapping of Date, Open, High, Low, Close, Volume columns'
      },
      {
        name: 'Data Validation',
        details: 'Automatic gap detection, duplicate removal, and outlier flagging'
      },
      {
        name: 'Timezone Handling',
        details: 'Support for UTC, IST, EST, and custom timezone conversions'
      },
      {
        name: 'Multi-Symbol',
        details: 'Test strategies across multiple symbols with synchronized data'
      }
    ],
    proTips: [
      'Always use UTC timestamps for consistency across global markets',
      'Check for data gaps during high-volatility periods (news events)',
      'Ensure bid/ask spread is realistic for your target market'
    ]
  },
  {
    step: 2,
    title: 'Strategy Definition',
    subtitle: 'Code or Configure Your Trading Logic',
    icon: Code,
    color: 'text-chart-2',
    description: 'Define your trading strategy using MQL5 Expert Advisor code or our simplified YAML-based DSL for common strategy patterns.',
    features: [
      {
        name: 'MQL5 Support',
        details: 'Full MetaTrader 5 Expert Advisor code compatibility'
      },
      {
        name: 'YAML DSL',
        details: 'Simplified strategy definition for indicator-based strategies'
      },
      {
        name: 'Version Control',
        details: 'Track changes with automatic versioning and diff viewer'
      },
      {
        name: 'Parameter Management',
        details: 'Define optimizable parameters with ranges and step sizes'
      },
      {
        name: 'Strategy Templates',
        details: 'Pre-built templates for common strategies (MA crossover, breakout, etc.)'
      }
    ],
    proTips: [
      'Start with a simple strategy and add complexity incrementally',
      'Always define reasonable parameter ranges to avoid overfitting',
      'Use meaningful variable names for easier debugging'
    ]
  },
  {
    step: 3,
    title: 'Backtest Configuration',
    subtitle: 'Set Test Parameters & Execution Settings',
    icon: Settings,
    color: 'text-chart-3',
    description: 'Configure how your strategy will be tested including capital allocation, transaction costs, and simulation settings.',
    features: [
      {
        name: 'Date Range',
        details: 'Select specific periods or use all available data'
      },
      {
        name: 'Initial Capital',
        details: 'Set starting balance with multi-currency support (USD, EUR, INR, etc.)'
      },
      {
        name: 'Transaction Costs',
        details: 'Configure spread, commission, slippage, and swap rates'
      },
      {
        name: 'Position Sizing',
        details: 'Fixed lot, percentage of equity, or risk-based sizing'
      },
      {
        name: 'Execution Model',
        details: 'Tick-by-tick or bar-close execution simulation'
      }
    ],
    proTips: [
      'Use realistic transaction costs - underestimating costs inflates results',
      'Test on at least 2-3 years of data for statistical significance',
      'Leave 20-30% of data for out-of-sample validation'
    ]
  },
  {
    step: 4,
    title: 'Analysis & Results',
    subtitle: 'Interpret Performance & Export Reports',
    icon: BarChart3,
    color: 'text-chart-4',
    description: 'Analyze comprehensive performance metrics, visualizations, and generate professional reports for stakeholders.',
    features: [
      {
        name: 'Key Metrics',
        details: 'Net Profit, Sharpe Ratio, Sortino, Calmar, Win Rate, Profit Factor'
      },
      {
        name: 'Equity Curve',
        details: 'Interactive chart with drawdown overlay and trade markers'
      },
      {
        name: 'Trade Analysis',
        details: 'Individual trade breakdown with entry/exit visualization'
      },
      {
        name: 'Monthly Heatmap',
        details: 'Calendar view of monthly returns for seasonality analysis'
      },
      {
        name: 'Export Options',
        details: 'PDF reports, Excel data, CSV trade logs'
      }
    ],
    proTips: [
      'Focus on risk-adjusted returns (Sharpe, Sortino) not just total profit',
      'Examine maximum drawdown duration, not just magnitude',
      'Look for consistency across different market regimes'
    ]
  }
];

// App Modules (existing but enhanced)
const appModules = [
  {
    category: 'Core Workflow',
    icon: Zap,
    color: 'text-primary',
    description: 'Essential tools for the complete backtesting workflow from data import to results analysis.',
    modules: [
      {
        name: 'Backtest Workflow',
        path: '/',
        description: 'Main 4-step workflow for running backtests with guided navigation.',
        features: [
          'Step-by-step guided workflow',
          'Upload CSV/Excel data files with auto-detection',
          'Paste MQL5 EA code or use YAML strategy DSL',
          'Configure backtest parameters (dates, capital, costs)',
          'Run backtests with real-time progress tracking',
          'Export results to CSV, Excel, PDF'
        ],
        benefits: 'Complete backtesting in under 5 minutes with guided workflow',
        useCases: [
          'Quick strategy validation before live trading',
          'Testing new strategy ideas',
          'Generating performance reports for investors'
        ]
      },
      {
        name: 'Data Manager',
        path: '/data',
        description: 'Centralized hub for managing all your market data files with quality checks.',
        features: [
          'Upload OHLCV data in CSV/Excel format',
          'Intelligent column auto-mapping',
          'Data quality scoring and validation',
          'Gap detection and duplicate removal',
          'Multi-symbol and multi-timeframe support',
          'Timezone conversion and normalization'
        ],
        benefits: 'Clean, validated data ensures accurate backtest results',
        useCases: [
          'Consolidating data from multiple sources',
          'Preparing data for multi-market strategies',
          'Quality assurance before major backtests'
        ]
      },
      {
        name: 'Strategy Library',
        path: '/strategies',
        description: 'Organized repository for all your trading strategies with version control.',
        features: [
          'Store unlimited MQL5 Expert Advisors',
          'YAML-based strategy definitions',
          'Automatic version history',
          'Side-by-side diff comparison',
          'Tagging and categorization',
          'Quick strategy switching in backtests'
        ],
        benefits: 'Never lose a working strategy version again',
        useCases: [
          'Managing strategy iterations',
          'Comparing old vs new strategy logic',
          'Team collaboration on strategy development'
        ]
      },
    ]
  },
  {
    category: 'Optimization',
    icon: Target,
    color: 'text-warning',
    description: 'Advanced tools to find optimal parameters and validate strategy robustness.',
    modules: [
      {
        name: 'Parameter Optimizer',
        path: '/optimizer',
        description: 'Systematic parameter optimization with multiple search algorithms.',
        features: [
          'Grid search for exhaustive testing',
          'Random search for large parameter spaces',
          'Multi-objective optimization (Profit + Drawdown)',
          'Parameter sensitivity analysis',
          '3D surface visualization',
          'Heatmap of parameter combinations'
        ],
        benefits: 'Find the best parameters backed by statistical evidence',
        useCases: [
          'Initial parameter exploration',
          'Fine-tuning proven strategies',
          'Understanding parameter sensitivity'
        ]
      },
      {
        name: 'Advanced Optimizer',
        path: '/advanced-optimizer',
        description: 'AI-powered optimization algorithms for complex parameter spaces.',
        features: [
          'Genetic Algorithm (GA) evolution',
          'Particle Swarm Optimization (PSO)',
          'Bayesian optimization with surrogate models',
          'Multi-objective Pareto frontier',
          'Robustness scoring with noise injection',
          'Cross-validation and stability testing'
        ],
        benefits: 'Discover optimal parameters human intuition would miss',
        useCases: [
          'Strategies with 5+ parameters',
          'Non-linear parameter interactions',
          'Finding robust parameter regions'
        ]
      },
      {
        name: 'Walk-Forward Analysis',
        path: '/walk-forward',
        description: 'Rigorous out-of-sample testing to prevent overfitting.',
        features: [
          'Anchored vs rolling window modes',
          'Configurable in-sample/out-of-sample ratios',
          'Walk-forward efficiency metrics',
          'Parameter stability visualization',
          'Regime-aware analysis',
          'Overfitting detection scoring'
        ],
        benefits: 'Confidence that strategy works on unseen data',
        useCases: [
          'Final validation before live trading',
          'Detecting curve-fitted strategies',
          'Parameter stability assessment'
        ]
      },
      {
        name: 'Scanner',
        path: '/scanner',
        description: 'AI-powered pattern detection across your data and strategies.',
        features: [
          'Automatic pattern recognition',
          'Strategy performance scanning',
          'Anomaly detection in results',
          'Cross-strategy correlation analysis',
          'Market regime classification',
          'Alert generation for significant patterns'
        ],
        benefits: 'Discover hidden patterns and opportunities automatically',
        useCases: [
          'Finding market conditions where strategy excels',
          'Identifying correlated strategies',
          'Detecting regime changes'
        ]
      },
    ]
  },
  {
    category: 'Analytics & Insights',
    icon: BarChart3,
    color: 'text-profit',
    description: 'Deep-dive analytics to understand every aspect of strategy performance.',
    modules: [
      {
        name: 'Analytics Dashboard',
        path: '/analytics',
        description: 'Comprehensive performance analytics with interactive visualizations.',
        features: [
          'Interactive equity curve with zoom',
          'Drawdown analysis and recovery time',
          'Monthly returns heatmap',
          'Trade distribution histograms',
          'Rolling performance metrics',
          'Benchmark comparison (Buy & Hold, S&P 500)'
        ],
        benefits: 'Understand every nuance of strategy behavior',
        useCases: [
          'Performance review and monitoring',
          'Investor reporting',
          'Strategy comparison'
        ]
      },
      {
        name: 'Advanced Analytics',
        path: '/advanced-analytics',
        description: 'Statistical analysis with Monte Carlo simulations and risk modeling.',
        features: [
          'Monte Carlo simulations (10,000+ paths)',
          'Confidence intervals (95%, 99%, 99.9%)',
          'Value at Risk (VaR) and CVaR',
          'Expected shortfall analysis',
          'Probability of ruin calculations',
          'Bootstrap confidence intervals'
        ],
        benefits: 'Quantify uncertainty and worst-case scenarios',
        useCases: [
          'Risk assessment for capital allocation',
          'Setting realistic expectations',
          'Regulatory compliance reporting'
        ]
      },
      {
        name: 'Performance Attribution',
        path: '/attribution',
        description: 'Decompose returns to understand what drives performance.',
        features: [
          'Long vs Short position attribution',
          'Time of day performance breakdown',
          'Day of week analysis',
          'Monthly/seasonal patterns',
          'Holding period optimization',
          'Win rate by market condition'
        ],
        benefits: 'Identify exactly what makes your strategy profitable',
        useCases: [
          'Strategy improvement targeting',
          'Market condition analysis',
          'Trading schedule optimization'
        ]
      },
      {
        name: 'Pattern Recognition',
        path: '/patterns',
        description: 'AI-powered chart pattern detection and analysis.',
        features: [
          'Double Top/Bottom detection',
          'Head & Shoulders patterns',
          'Triangle, Flag, and Wedge patterns',
          'Candlestick pattern recognition',
          'Pattern confidence scoring',
          'Historical pattern performance'
        ],
        benefits: 'Automate technical analysis with AI precision',
        useCases: [
          'Pattern-based strategy development',
          'Market structure analysis',
          'Entry/exit timing'
        ]
      },
    ]
  },
  {
    category: 'Risk Management',
    icon: Shield,
    color: 'text-destructive',
    description: 'Comprehensive risk assessment and management tools.',
    modules: [
      {
        name: 'Risk Dashboard',
        path: '/risk-dashboard',
        description: 'Real-time risk monitoring with alerts and thresholds.',
        features: [
          'Real-time risk metrics display',
          'Maximum drawdown tracking',
          'Risk-adjusted return ratios',
          'Exposure analysis by symbol/sector',
          'Custom risk alerts and thresholds',
          'Risk heatmap visualization'
        ],
        benefits: 'Stay on top of risk before it becomes a problem',
        useCases: [
          'Daily risk monitoring',
          'Portfolio risk management',
          'Compliance reporting'
        ]
      },
      {
        name: 'Position Sizing',
        path: '/position-sizing',
        description: 'Scientific position sizing calculators and tools.',
        features: [
          'Fixed fractional position sizing',
          'Kelly Criterion calculator',
          'Risk per trade percentage limits',
          'Optimal f calculations',
          'Account size impact analysis',
          'Position size recommendations'
        ],
        benefits: 'Size positions for maximum growth with controlled risk',
        useCases: [
          'New strategy position sizing',
          'Capital allocation decisions',
          'Risk budget management'
        ]
      },
      {
        name: 'Stress Testing',
        path: '/stress-testing',
        description: 'Test strategy resilience under extreme market conditions.',
        features: [
          'Historical crisis scenarios (2008, COVID, Flash Crash)',
          'Custom stress scenario builder',
          'Drawdown stress multipliers',
          'Volatility shock simulations',
          'Liquidity impact modeling',
          'Correlation breakdown scenarios'
        ],
        benefits: 'Know exactly how strategy handles market crashes',
        useCases: [
          'Pre-launch stress testing',
          'Regulatory stress requirements',
          'Black swan preparation'
        ]
      },
    ]
  },
  {
    category: 'Portfolio & Collaboration',
    icon: Briefcase,
    color: 'text-chart-4',
    description: 'Build diversified portfolios and collaborate with team members.',
    modules: [
      {
        name: 'Portfolio Builder',
        path: '/portfolio',
        description: 'Combine multiple strategies into diversified portfolios.',
        features: [
          'Multi-strategy allocation',
          'Correlation matrix visualization',
          'Multi-currency support (USD, EUR, INR, GBP, etc.)',
          'Combined equity curve',
          'Diversification ratio calculation',
          'Optimal allocation suggestions'
        ],
        benefits: 'Reduce risk through intelligent diversification',
        useCases: [
          'Building multi-strategy portfolios',
          'Allocation optimization',
          'Portfolio risk analysis'
        ]
      },
      {
        name: 'Workspace Dashboard',
        path: '/workspace',
        description: 'Team collaboration with shared resources and activity tracking.',
        features: [
          'Shared workspaces',
          'Team member invitations',
          'Real-time presence indicators',
          'Activity feed with audit trail',
          'Role-based access control',
          'Shared strategy libraries'
        ],
        benefits: 'Collaborate seamlessly with your trading team',
        useCases: [
          'Team strategy development',
          'Research collaboration',
          'Prop firm workflows'
        ]
      },
      {
        name: 'Cloud Sync',
        path: '/cloud-sync',
        description: 'Secure cloud synchronization across all your devices.',
        features: [
          'Automatic cloud backup',
          'Cross-device synchronization',
          'Version history and restore',
          'Conflict resolution',
          'Selective sync options',
          'Encrypted cloud storage'
        ],
        benefits: 'Never lose your work, access from anywhere',
        useCases: [
          'Multi-device workflow',
          'Backup and disaster recovery',
          'Team sharing'
        ]
      },
    ]
  },
  {
    category: 'AI Features',
    icon: Brain,
    color: 'text-ai-purple',
    description: 'Premium AI-powered features for advanced analysis and automation.',
    modules: [
      {
        name: 'Sentinel AI',
        path: '/sentinel',
        description: 'Conversational AI assistant for trading strategy analysis.',
        features: [
          'Natural language strategy queries',
          'Automated performance summaries',
          'Strategy improvement suggestions',
          'Market condition analysis',
          'Code review and optimization',
          'Learning from your trading patterns'
        ],
        benefits: 'Get expert-level insights through conversation',
        useCases: [
          'Quick strategy analysis',
          'Learning and education',
          'Debugging strategy issues'
        ]
      },
    ]
  },
  {
    category: 'Tools & Utilities',
    icon: Settings,
    color: 'text-muted-foreground',
    description: 'Supporting tools for journaling, reporting, and system management.',
    modules: [
      {
        name: 'Trade Journal',
        path: '/journal',
        description: 'Document and analyze your trading decisions and psychology.',
        features: [
          'Trade logging with notes and screenshots',
          'Emotion and psychology tracking',
          'Trade review and tagging',
          'Performance correlation with psychology',
          'Pattern identification in behavior',
          'Improvement tracking over time'
        ],
        benefits: 'Improve through systematic self-reflection',
        useCases: [
          'Discretionary trading analysis',
          'Psychology improvement',
          'Trade review sessions'
        ]
      },
      {
        name: 'Quick Compare',
        path: '/quick-compare',
        description: 'Side-by-side comparison of multiple strategies or backtests.',
        features: [
          'Multi-strategy metrics table',
          'Overlay equity curves',
          'Statistical significance testing',
          'Performance ranking',
          'Difference highlighting',
          'Export comparison reports'
        ],
        benefits: 'Make informed decisions between strategy options',
        useCases: [
          'Strategy selection',
          'A/B testing strategies',
          'Version comparison'
        ]
      },
      {
        name: 'Report Generator',
        path: '/reports',
        description: 'Generate professional reports for stakeholders and investors.',
        features: [
          'Custom report templates',
          'PDF and Excel export',
          'White-label branding options',
          'Performance summaries',
          'Risk disclosures',
          'Client-ready formatting'
        ],
        benefits: 'Professional reports in minutes, not hours',
        useCases: [
          'Investor reporting',
          'Compliance documentation',
          'Client presentations'
        ]
      },
      {
        name: 'System Check',
        path: '/system-check',
        description: 'Diagnostic tools for system health and performance.',
        features: [
          'Browser compatibility check',
          'Storage usage monitoring',
          'Performance benchmarks',
          'Data integrity verification',
          'Cache management',
          'Debug logging'
        ],
        benefits: 'Keep your MMC installation running optimally',
        useCases: [
          'Troubleshooting issues',
          'Performance optimization',
          'Maintenance checks'
        ]
      },
    ]
  },
];

// Quick Start Steps
const quickStartSteps = [
  {
    step: 1,
    title: 'Upload Your Data',
    description: 'Navigate to the Workflow page and upload your CSV data file with OHLCV (Open, High, Low, Close, Volume) data. The system automatically detects column mappings.',
    icon: FileSpreadsheet,
    details: [
      'Supported formats: CSV, Excel (.xlsx)',
      'Required columns: Date, Open, High, Low, Close',
      'Optional: Volume, Symbol for multi-asset',
      'Tip: Use UTC timestamps for consistency'
    ]
  },
  {
    step: 2,
    title: 'Add Your Strategy',
    description: 'Paste your MQL5 Expert Advisor code or define a strategy using our YAML DSL format for simpler indicator-based strategies.',
    icon: Code,
    details: [
      'Full MQL5 EA code support',
      'YAML DSL for common patterns',
      'Built-in strategy templates',
      'Automatic syntax validation'
    ]
  },
  {
    step: 3,
    title: 'Configure & Run',
    description: 'Set backtest parameters like date range, initial capital, spread, and commission settings. Click Run to start the backtest with live progress tracking.',
    icon: Play,
    details: [
      'Set initial capital in your preferred currency',
      'Configure realistic transaction costs',
      'Choose execution model (bar-close or tick)',
      'Monitor real-time progress'
    ]
  },
  {
    step: 4,
    title: 'Analyze Results',
    description: 'View comprehensive analytics including equity curves, drawdown analysis, and performance metrics. Export to PDF, Excel, or share with your team.',
    icon: BarChart3,
    details: [
      '20+ performance metrics calculated',
      'Interactive equity curve charts',
      'Monthly returns heatmap',
      'Export to PDF/Excel/CSV'
    ]
  },
];

// Key Benefits
const keyBenefits = [
  {
    title: 'AI-Engineered',
    description: 'Machine-driven analysis with full control. Your data stays secure locally unless you choose to sync. Advanced AI features like Sentinel provide intelligent insights.',
    icon: Brain,
    stats: '10+ AI models integrated'
  },
  {
    title: 'Blazing Fast',
    description: 'Process 50,000+ backtests per minute with our optimized parallel processing engine. Web Workers distribute load across CPU cores for maximum performance.',
    icon: Zap,
    stats: '50K+ backtests/min'
  },
  {
    title: 'Multi-Currency',
    description: 'Support for 10+ currencies (USD, EUR, INR, GBP, JPY, etc.) with real-time FX conversion. Trade any global market with proper currency accounting.',
    icon: Globe,
    stats: '10+ currencies'
  },
  {
    title: 'Enterprise Security',
    description: 'Bank-grade security with AES-256 encryption, zero-knowledge architecture, and full GDPR compliance. Your strategies and data are protected.',
    icon: Shield,
    stats: 'SOC 2 certified'
  },
  {
    title: 'Offline-First',
    description: 'Full functionality without internet connection. All data stored locally in encrypted IndexedDB. Optional cloud sync when you need it.',
    icon: Database,
    stats: '100% offline capable'
  },
  {
    title: 'Team Collaboration',
    description: 'Shared workspaces, real-time presence, activity feeds, and role-based access control. Perfect for trading teams and prop firms.',
    icon: Users,
    stats: 'Unlimited team members'
  },
];

// FAQ Section
const faqItems = [
  {
    question: 'What data formats does MMC support?',
    answer: 'MMC supports CSV and Excel (.xlsx) files with OHLCV data. The system automatically detects column headers and maps them appropriately. You need at minimum Date, Open, High, Low, Close columns. Volume is optional but recommended.'
  },
  {
    question: 'Can I use my MetaTrader Expert Advisors?',
    answer: 'Yes! MMC fully supports MQL5 Expert Advisor code. Simply paste your EA code in the Strategy tab, and our engine will parse and execute it against your data. Note that some MT5-specific functions may have limited support in the web environment.'
  },
  {
    question: 'How accurate are the backtest results?',
    answer: 'MMC uses tick-level simulation when possible and bar-close execution as fallback. Results accuracy depends on your data quality and realistic cost settings. We recommend using realistic spreads, commissions, and slippage settings for production-ready validation.'
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. By default, all data is stored locally in your browser using encrypted IndexedDB. We never access your data unless you explicitly enable cloud sync. Even with cloud sync, data is encrypted end-to-end with keys you control.'
  },
  {
    question: 'Can I collaborate with my team?',
    answer: 'Yes! Create a workspace and invite team members with role-based access (Admin, Editor, Viewer). Share strategies, data, and results in real-time with activity tracking and audit logs.'
  },
  {
    question: 'What optimization algorithms are available?',
    answer: 'MMC offers Grid Search, Random Search, Genetic Algorithm (GA), Particle Swarm Optimization (PSO), and Bayesian Optimization. Walk-Forward Analysis is also available for out-of-sample validation.'
  },
  {
    question: 'How do I prevent overfitting?',
    answer: 'Use Walk-Forward Analysis to validate on out-of-sample data. Run Monte Carlo simulations to stress-test results. Our overfitting detection scoring helps identify curve-fitted strategies.'
  },
  {
    question: 'Can I export reports for investors?',
    answer: 'Yes! The Report Generator creates professional PDF reports with your branding, performance summaries, risk disclosures, and detailed analytics. Perfect for investor presentations and compliance documentation.'
  }
];

// Glossary
const glossaryTerms = [
  { term: 'Sharpe Ratio', definition: 'Risk-adjusted return metric. Excess return per unit of volatility. Higher is better. >1 good, >2 excellent.' },
  { term: 'Sortino Ratio', definition: 'Like Sharpe but only penalizes downside volatility. Better for asymmetric return distributions.' },
  { term: 'Maximum Drawdown', definition: 'Largest peak-to-trough decline in equity. Measures worst-case loss experience.' },
  { term: 'Profit Factor', definition: 'Gross profit divided by gross loss. >1 means profitable. >2 is strong.' },
  { term: 'Win Rate', definition: 'Percentage of trades that are profitable. High win rate alone does not guarantee profitability.' },
  { term: 'Calmar Ratio', definition: 'Annualized return divided by maximum drawdown. Measures return per unit of drawdown risk.' },
  { term: 'Walk-Forward', definition: 'Optimization technique where parameters are optimized on historical data and tested on future data in rolling windows.' },
  { term: 'Monte Carlo', definition: 'Statistical simulation technique using random sampling to model probability distributions of outcomes.' },
  { term: 'Kelly Criterion', definition: 'Formula for calculating optimal bet size to maximize long-term growth rate. f* = W - (1-W)/R.' },
  { term: 'VaR (Value at Risk)', definition: 'Maximum expected loss at a given confidence level over a specific time period.' },
  { term: 'CVaR (Expected Shortfall)', definition: 'Average loss beyond the VaR threshold. More conservative than VaR.' },
  { term: 'OHLCV', definition: 'Open, High, Low, Close, Volume - standard price bar data format for trading analysis.' },
  { term: 'Equity Curve', definition: 'Chart showing cumulative profit/loss over time. Visualizes strategy performance.' },
  { term: 'Expectancy', definition: '(Win% × AvgWin) - (Loss% × AvgLoss). Average profit per trade. Must be positive.' },
  { term: 'Recovery Factor', definition: 'Net Profit / Max Drawdown. How much profit per unit of pain. >2 is good.' },
  { term: 'CAGR', definition: 'Compound Annual Growth Rate. Annualized return for comparing across time periods.' },
  { term: 'Alpha', definition: 'Excess return beyond market exposure. Positive alpha = skill/edge.' },
  { term: 'Beta', definition: 'Sensitivity to market movements. β=1 moves with market, <1 less volatile.' },
  { term: 'Skewness', definition: 'Return distribution asymmetry. Positive = more extreme wins. Negative = more extreme losses.' },
  { term: 'Kurtosis', definition: 'Tail thickness. >3 fat tails (more black swans). <3 thin tails.' },
  { term: 'Ulcer Index', definition: 'Square root of average squared drawdowns. Measures stress/anxiety of holding.' },
  { term: 'Risk:Reward Ratio', definition: 'Average Win / Average Loss. 2:1 = need only 33% WR to break even.' },
  { term: 'Slippage', definition: 'Difference between expected and actual execution price. Important cost factor.' },
  { term: 'STT', definition: 'Securities Transaction Tax (India). 0.1% on sell-side for delivery, 0.025% for intraday.' },
  { term: 'Genetic Algorithm', definition: 'Evolutionary optimization using selection, crossover, mutation to find best parameters.' },
  { term: 'PSO', definition: 'Particle Swarm Optimization. Swarm intelligence algorithm for parameter search.' },
  { term: 'Bayesian Optimization', definition: 'Uses surrogate models to efficiently find optimal parameters with fewer evaluations.' },
  { term: 'Pareto Frontier', definition: 'Set of optimal trade-offs between multiple objectives (e.g., profit vs drawdown).' },
];

// Keyboard Shortcuts
const keyboardShortcuts = [
  { keys: '⌘/Ctrl + K', action: 'Open Command Palette', description: 'Quick access to all features and navigation' },
  { keys: '⌘/Ctrl + /', action: 'Show Keyboard Shortcuts', description: 'Display this shortcuts reference' },
  { keys: '⌘/Ctrl + S', action: 'Save Current Work', description: 'Save strategy, data, or settings' },
  { keys: '⌘/Ctrl + R', action: 'Run Backtest', description: 'Start backtest with current settings' },
  { keys: '⌘/Ctrl + E', action: 'Export Results', description: 'Export results to PDF/Excel' },
  { keys: '⌘/Ctrl + N', action: 'New Strategy', description: 'Create a new strategy file' },
  { keys: '⌘/Ctrl + O', action: 'Open Strategy', description: 'Open existing strategy' },
  { keys: '⌘/Ctrl + D', action: 'Toggle Dark Mode', description: 'Switch between light and dark theme' },
  { keys: 'Esc', action: 'Close Modal/Dialog', description: 'Close any open modal or dropdown' },
  { keys: '?', action: 'Context Help', description: 'Show help for current page' },
];

export default function AppGuide() {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState(appModules[0].category);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      let yPos = margin;
      let pageNum = 1;

      // Helper function to add page break if needed
      const checkPageBreak = (requiredSpace: number) => {
        if (yPos + requiredSpace > pageHeight - 20) {
          addFooter();
          pdf.addPage();
          pageNum++;
          yPos = margin;
          return true;
        }
        return false;
      };

      // Add footer to current page
      const addFooter = () => {
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`MMC User Guide | Page ${pageNum}`, margin, pageHeight - 10);
        pdf.text('© 2026 MMC. All rights reserved.', pageWidth - margin, pageHeight - 10, { align: 'right' });
      };

      // Add section header
      const addSectionHeader = (title: string, sectionNum: number) => {
        checkPageBreak(25);
        pdf.setFillColor(59, 130, 246);
        pdf.rect(margin - 2, yPos - 5, contentWidth + 4, 12, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${sectionNum}. ${title}`, margin, yPos + 3);
        pdf.setFont('helvetica', 'normal');
        yPos += 15;
      };

      // Add subsection header
      const addSubsectionHeader = (title: string) => {
        checkPageBreak(15);
        pdf.setTextColor(59, 130, 246);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, margin, yPos);
        pdf.setFont('helvetica', 'normal');
        yPos += 8;
      };

      // Add paragraph
      const addParagraph = (text: string, indent: number = 0) => {
        pdf.setTextColor(60, 60, 60);
        pdf.setFontSize(9);
        const lines = pdf.splitTextToSize(text, contentWidth - indent);
        lines.forEach((line: string) => {
          checkPageBreak(5);
          pdf.text(line, margin + indent, yPos);
          yPos += 4.5;
        });
        yPos += 2;
      };

      // Add bullet point
      const addBullet = (text: string, indent: number = 0) => {
        checkPageBreak(6);
        pdf.setTextColor(60, 60, 60);
        pdf.setFontSize(9);
        const lines = pdf.splitTextToSize(text, contentWidth - indent - 8);
        pdf.text('•', margin + indent, yPos);
        lines.forEach((line: string, i: number) => {
          pdf.text(line, margin + indent + 5, yPos + (i * 4.5));
        });
        yPos += lines.length * 4.5 + 1;
      };

      // ============== TITLE PAGE ==============
      pdf.setFillColor(10, 15, 30);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Logo area
      pdf.setFillColor(59, 130, 246);
      pdf.roundedRect(pageWidth/2 - 30, 50, 60, 60, 5, 5, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(36);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MMC', pageWidth / 2, 88, { align: 'center' });
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.text('Comprehensive User Guide', pageWidth / 2, 130, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setTextColor(59, 130, 246);
      pdf.text(platformOverview.tagline, pageWidth / 2, 145, { align: 'center' });
      
      // Divider
      pdf.setDrawColor(59, 130, 246);
      pdf.setLineWidth(0.5);
      pdf.line(margin + 30, 165, pageWidth - margin - 30, 165);
      
      // Key stats
      pdf.setFontSize(10);
      pdf.setTextColor(200, 200, 200);
      const stats = ['50K+ Backtests/Min', '10+ Currencies', 'Offline-First', 'Enterprise Security'];
      stats.forEach((stat, i) => {
        const xPos = margin + 25 + (i * 40);
        pdf.text(stat, xPos, 180, { align: 'center' });
      });
      
      pdf.setFontSize(10);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Version ${platformOverview.version}`, pageWidth / 2, 240, { align: 'center' });
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, 248, { align: 'center' });
      pdf.text(`Last Updated: ${platformOverview.lastUpdated}`, pageWidth / 2, 256, { align: 'center' });
      
      // ============== TABLE OF CONTENTS ==============
      pdf.addPage();
      pageNum++;
      yPos = margin;
      
      pdf.setTextColor(59, 130, 246);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Table of Contents', margin, yPos);
      pdf.setFont('helvetica', 'normal');
      yPos += 15;
      
      const tocItems = [
        { num: '1', title: 'Platform Overview', page: '3' },
        { num: '2', title: 'Target Users & Use Cases', page: '4' },
        { num: '3', title: 'Quick Start Guide', page: '5' },
        { num: '4', title: 'Core Workflow (Detailed)', page: '6' },
        { num: '5', title: 'Key Benefits', page: '8' },
        { num: '6', title: 'Technical Architecture', page: '9' },
        { num: '7', title: 'Feature Modules', page: '10' },
        { num: '8', title: 'Keyboard Shortcuts', page: '18' },
        { num: '9', title: 'Glossary of Terms (28 entries)', page: '19' },
        { num: '10', title: 'Frequently Asked Questions', page: '21' },
        { num: '11', title: 'Indian Market Specifics', page: '22' },
        { num: '12', title: 'Advanced Metrics Reference', page: '23' },
        { num: '13', title: 'Support & Resources', page: '24' },
      ];
      
      tocItems.forEach((item) => {
        pdf.setTextColor(60, 60, 60);
        pdf.setFontSize(11);
        pdf.text(`${item.num}. ${item.title}`, margin, yPos);
        pdf.setTextColor(150, 150, 150);
        pdf.text(item.page, pageWidth - margin, yPos, { align: 'right' });
        // Dotted line
        const textWidth = pdf.getTextWidth(`${item.num}. ${item.title}`);
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineDashPattern([1, 2], 0);
        pdf.line(margin + textWidth + 5, yPos, pageWidth - margin - 10, yPos);
        pdf.setLineDashPattern([], 0);
        yPos += 10;
      });
      
      addFooter();
      
      // ============== SECTION 1: PLATFORM OVERVIEW ==============
      pdf.addPage();
      pageNum++;
      yPos = margin;
      
      addSectionHeader('Platform Overview', 1);
      
      addSubsectionHeader('What is MMC?');
      addParagraph(platformOverview.description);
      yPos += 5;
      
      addSubsectionHeader('Our Mission');
      addParagraph(platformOverview.mission);
      yPos += 5;
      
      addSubsectionHeader('Key Capabilities');
      const capabilities = [
        'Complete backtesting workflow from data import to results export',
        'Advanced optimization with AI-powered algorithms (GA, PSO, Bayesian)',
        'Walk-forward analysis for out-of-sample validation',
        'Monte Carlo simulations for statistical confidence',
        'Portfolio construction with correlation analysis',
        'Real-time collaboration with team workspaces',
        'Professional report generation for stakeholders',
        'Offline-first architecture with optional cloud sync'
      ];
      capabilities.forEach(cap => addBullet(cap));
      
      addFooter();
      
      // ============== SECTION 2: TARGET USERS ==============
      pdf.addPage();
      pageNum++;
      yPos = margin;
      
      addSectionHeader('Target Users & Use Cases', 2);
      
      targetUsers.forEach(user => {
        addSubsectionHeader(user.title);
        addParagraph(user.description);
        pdf.setTextColor(34, 139, 34);
        pdf.setFontSize(9);
        pdf.text('Key Benefits:', margin, yPos);
        yPos += 5;
        user.benefits.forEach(benefit => addBullet(benefit, 5));
        yPos += 5;
      });
      
      addFooter();
      
      // ============== SECTION 3: QUICK START ==============
      pdf.addPage();
      pageNum++;
      yPos = margin;
      
      addSectionHeader('Quick Start Guide', 3);
      addParagraph('Get started with MMC in 4 simple steps. This guide walks you through the essential workflow from data import to results analysis.');
      yPos += 5;
      
      quickStartSteps.forEach((step) => {
        checkPageBreak(45);
        
        // Step number box
        pdf.setFillColor(59, 130, 246);
        pdf.roundedRect(margin, yPos - 3, 8, 8, 2, 2, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(step.step.toString(), margin + 4, yPos + 2.5, { align: 'center' });
        pdf.setFont('helvetica', 'normal');
        
        pdf.setTextColor(40, 40, 40);
        pdf.setFontSize(12);
        pdf.text(step.title, margin + 12, yPos + 2);
        yPos += 10;
        
        addParagraph(step.description, 5);
        
        step.details.forEach(detail => addBullet(detail, 10));
        yPos += 8;
      });
      
      addFooter();
      
      // ============== SECTION 4: CORE WORKFLOW DETAILED ==============
      pdf.addPage();
      pageNum++;
      yPos = margin;
      
      addSectionHeader('Core Workflow (Detailed)', 4);
      addParagraph('The MMC workflow is designed to guide you through the complete backtesting process with clear steps and validation at each stage.');
      yPos += 5;
      
      workflowDetailed.forEach((step, idx) => {
        if (idx > 0 && idx % 2 === 0) {
          addFooter();
          pdf.addPage();
          pageNum++;
          yPos = margin;
        }
        
        checkPageBreak(60);
        
        // Step header
        pdf.setFillColor(240, 240, 240);
        pdf.roundedRect(margin, yPos - 3, contentWidth, 10, 2, 2, 'F');
        pdf.setTextColor(59, 130, 246);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Step ${step.step}: ${step.title}`, margin + 3, yPos + 4);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(9);
        pdf.text(step.subtitle, margin + 3, yPos + 4, { align: 'left' });
        const subtitleWidth = pdf.getTextWidth(`Step ${step.step}: ${step.title} - `);
        pdf.text(step.subtitle, margin + 3 + subtitleWidth + 5, yPos + 4);
        yPos += 15;
        
        addParagraph(step.description);
        yPos += 3;
        
        pdf.setTextColor(40, 40, 40);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Features:', margin, yPos);
        pdf.setFont('helvetica', 'normal');
        yPos += 5;
        
        step.features.forEach(feature => {
          checkPageBreak(10);
          pdf.setTextColor(59, 130, 246);
          pdf.text(`${feature.name}:`, margin + 3, yPos);
          pdf.setTextColor(60, 60, 60);
          const nameWidth = pdf.getTextWidth(`${feature.name}: `);
          const detailLines = pdf.splitTextToSize(feature.details, contentWidth - nameWidth - 10);
          pdf.text(detailLines[0], margin + 3 + nameWidth, yPos);
          yPos += 4.5;
          if (detailLines.length > 1) {
            detailLines.slice(1).forEach((line: string) => {
              pdf.text(line, margin + 3 + nameWidth, yPos);
              yPos += 4.5;
            });
          }
        });
        yPos += 3;
        
        pdf.setFillColor(255, 250, 230);
        pdf.roundedRect(margin, yPos - 2, contentWidth, 4 + step.proTips.length * 4.5, 2, 2, 'F');
        pdf.setTextColor(180, 130, 0);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('💡 Pro Tips:', margin + 3, yPos + 2);
        pdf.setFont('helvetica', 'normal');
        yPos += 6;
        
        step.proTips.forEach(tip => {
          pdf.setTextColor(100, 80, 0);
          pdf.text(`• ${tip}`, margin + 5, yPos);
          yPos += 4.5;
        });
        yPos += 8;
      });
      
      addFooter();
      
      // ============== SECTION 5: KEY BENEFITS ==============
      pdf.addPage();
      pageNum++;
      yPos = margin;
      
      addSectionHeader('Key Benefits', 5);
      addParagraph('MMC is designed to provide institutional-quality backtesting capabilities to traders of all levels. Here are the core benefits that set us apart:');
      yPos += 5;
      
      keyBenefits.forEach((benefit, idx) => {
        checkPageBreak(30);
        
        pdf.setFillColor(245, 247, 250);
        pdf.roundedRect(margin, yPos - 3, contentWidth, 25, 3, 3, 'F');
        
        pdf.setTextColor(59, 130, 246);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(benefit.title, margin + 5, yPos + 5);
        pdf.setFont('helvetica', 'normal');
        
        pdf.setTextColor(34, 139, 34);
        pdf.setFontSize(8);
        pdf.text(benefit.stats, pageWidth - margin - 5, yPos + 5, { align: 'right' });
        
        pdf.setTextColor(60, 60, 60);
        pdf.setFontSize(9);
        const descLines = pdf.splitTextToSize(benefit.description, contentWidth - 15);
        descLines.forEach((line: string, i: number) => {
          pdf.text(line, margin + 5, yPos + 12 + (i * 4));
        });
        
        yPos += 30;
      });
      
      addFooter();
      
      // ============== SECTION 6: TECHNICAL ARCHITECTURE ==============
      pdf.addPage();
      pageNum++;
      yPos = margin;
      
      addSectionHeader('Technical Architecture', 6);
      addParagraph('MMC is built on modern web technologies optimized for performance, security, and offline capability. Here is an overview of our technical foundation:');
      yPos += 5;
      
      technicalFeatures.forEach(feature => {
        checkPageBreak(35);
        
        addSubsectionHeader(feature.title);
        addParagraph(feature.description);
        feature.details.forEach(detail => addBullet(detail, 5));
        yPos += 5;
      });
      
      yPos += 5;
      addSubsectionHeader('Technology Stack');
      const techStack = [
        'Frontend: React 18 with TypeScript for type-safe development',
        'Styling: Tailwind CSS for consistent, responsive design',
        'State: Zustand for lightweight global state management',
        'Storage: IndexedDB (Dexie) for offline-first data persistence',
        'Charts: Recharts for interactive data visualization',
        'Backend: Supabase for authentication, database, and real-time sync',
        'Processing: Web Workers for parallel backtest execution'
      ];
      techStack.forEach(tech => addBullet(tech));
      
      addFooter();
      
      // ============== SECTION 7: FEATURE MODULES ==============
      let sectionNumber = 7;
      
      appModules.forEach((category, catIdx) => {
        pdf.addPage();
        pageNum++;
        yPos = margin;
        
        // Category header
        pdf.setFillColor(59, 130, 246);
        pdf.rect(0, 0, pageWidth, 25, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${sectionNumber}.${catIdx + 1} ${category.category}`, margin, 16);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.text(category.description, margin, 22);
        yPos = 35;
        
        category.modules.forEach((module, modIdx) => {
          checkPageBreak(70);
          
          // Module card
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(margin, yPos - 3, contentWidth, 1, 1, 1, 'S');
          
          // Module header
          pdf.setTextColor(40, 40, 40);
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text(module.name, margin, yPos + 5);
          pdf.setFont('helvetica', 'normal');
          
          pdf.setTextColor(100, 100, 100);
          pdf.setFontSize(8);
          pdf.text(`Path: ${module.path}`, pageWidth - margin, yPos + 5, { align: 'right' });
          yPos += 10;
          
          addParagraph(module.description);
          
          // Features
          pdf.setTextColor(40, 40, 40);
          pdf.setFontSize(9);
          pdf.text('Features:', margin, yPos);
          yPos += 5;
          module.features.forEach(feature => addBullet(feature, 3));
          
          // Benefits box
          checkPageBreak(15);
          pdf.setFillColor(230, 255, 230);
          pdf.roundedRect(margin, yPos, contentWidth, 10, 2, 2, 'F');
          pdf.setTextColor(34, 139, 34);
          pdf.setFontSize(9);
          pdf.text(`✓ Key Benefit: ${module.benefits}`, margin + 3, yPos + 6);
          yPos += 15;
          
          // Use cases
          if (module.useCases && module.useCases.length > 0) {
            pdf.setTextColor(100, 100, 100);
            pdf.setFontSize(8);
            pdf.text('Use Cases: ' + module.useCases.join(' • '), margin, yPos);
            yPos += 8;
          }
          
          yPos += 5;
        });
        
        addFooter();
      });
      
      // ============== SECTION 8: KEYBOARD SHORTCUTS ==============
      pdf.addPage();
      pageNum++;
      yPos = margin;
      
      addSectionHeader('Keyboard Shortcuts', 8);
      addParagraph('Master these keyboard shortcuts to navigate MMC like a pro. These shortcuts work across all pages and significantly speed up your workflow.');
      yPos += 10;
      
      // Table header
      pdf.setFillColor(59, 130, 246);
      pdf.rect(margin, yPos, contentWidth, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Shortcut', margin + 3, yPos + 5);
      pdf.text('Action', margin + 40, yPos + 5);
      pdf.text('Description', margin + 80, yPos + 5);
      pdf.setFont('helvetica', 'normal');
      yPos += 12;
      
      keyboardShortcuts.forEach((shortcut, i) => {
        const bgColor = i % 2 === 0 ? 250 : 240;
        pdf.setFillColor(bgColor, bgColor, bgColor);
        pdf.rect(margin, yPos - 3, contentWidth, 7, 'F');
        
        pdf.setTextColor(59, 130, 246);
        pdf.setFontSize(9);
        pdf.text(shortcut.keys, margin + 3, yPos + 1);
        
        pdf.setTextColor(40, 40, 40);
        pdf.text(shortcut.action, margin + 40, yPos + 1);
        
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(8);
        pdf.text(shortcut.description, margin + 80, yPos + 1);
        
        yPos += 8;
      });
      
      addFooter();
      
      // ============== SECTION 9: GLOSSARY ==============
      pdf.addPage();
      pageNum++;
      yPos = margin;
      
      addSectionHeader('Glossary of Terms', 9);
      addParagraph('Understanding key trading and backtesting terminology is essential for getting the most out of MMC. Here are the most important terms explained:');
      yPos += 10;
      
      glossaryTerms.forEach((item, i) => {
        checkPageBreak(15);
        
        pdf.setTextColor(59, 130, 246);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(item.term, margin, yPos);
        pdf.setFont('helvetica', 'normal');
        yPos += 5;
        
        pdf.setTextColor(60, 60, 60);
        pdf.setFontSize(9);
        const lines = pdf.splitTextToSize(item.definition, contentWidth - 5);
        lines.forEach((line: string) => {
          pdf.text(line, margin + 5, yPos);
          yPos += 4;
        });
        yPos += 4;
      });
      
      addFooter();
      
      // ============== SECTION 10: FAQ ==============
      pdf.addPage();
      pageNum++;
      yPos = margin;
      
      addSectionHeader('Frequently Asked Questions', 10);
      yPos += 5;
      
      faqItems.forEach((faq, i) => {
        checkPageBreak(30);
        
        pdf.setTextColor(59, 130, 246);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Q: ${faq.question}`, margin, yPos);
        pdf.setFont('helvetica', 'normal');
        yPos += 6;
        
        pdf.setTextColor(60, 60, 60);
        pdf.setFontSize(9);
        const lines = pdf.splitTextToSize(`A: ${faq.answer}`, contentWidth - 5);
        lines.forEach((line: string) => {
          checkPageBreak(5);
          pdf.text(line, margin + 3, yPos);
          yPos += 4.5;
        });
        yPos += 8;
      });
      
      addFooter();
      
      // ============== SECTION 11: INDIAN MARKET SPECIFICS ==============
      pdf.addPage();
      pageNum++;
      yPos = margin;
      
      addSectionHeader('Indian Market Specifics', 11);
      addParagraph('MMC is optimized for Indian traders with full support for NSE, BSE, and MCX markets. Here are the key considerations:');
      yPos += 5;
      
      addSubsectionHeader('Market Hours');
      const marketHours = [
        'NSE/BSE: 9:15 AM - 3:30 PM IST (Pre-open: 9:00 AM)',
        'MCX: 9:00 AM - 11:30 PM IST (varies by commodity)',
        'Currency Derivatives: 9:00 AM - 5:00 PM IST',
        'All times internally stored as UTC for consistency'
      ];
      marketHours.forEach(h => addBullet(h));
      yPos += 5;
      
      addSubsectionHeader('Transaction Costs (India)');
      const indianCosts = [
        'STT (Securities Transaction Tax): 0.1% sell-side delivery, 0.025% intraday',
        'Brokerage: Varies (e.g., Zerodha: ₹20/order or 0.03%)',
        'Exchange Transaction Charges: ~0.00325% (NSE)',
        'GST: 18% on brokerage + transaction charges',
        'SEBI Turnover Fee: 0.0001%',
        'Stamp Duty: 0.015% buy-side delivery, 0.003% intraday'
      ];
      indianCosts.forEach(c => addBullet(c));
      yPos += 5;
      
      addSubsectionHeader('Broker Integration (Zerodha Kite)');
      const zerodhaSteps = [
        'Go to Execution Bridge → Zerodha card → Connect',
        'Login with Kite credentials and authorize access',
        'Tokens stored securely with auto-rotation',
        'Paper Trading mode available for testing without risk'
      ];
      zerodhaSteps.forEach(s => addBullet(s));
      
      addFooter();

      // ============== SECTION 12: ADVANCED METRICS REFERENCE ==============
      pdf.addPage();
      pageNum++;
      yPos = margin;
      
      addSectionHeader('Advanced Metrics Reference', 12);
      addParagraph('Complete reference for all performance, risk, and trade metrics calculated by MMC:');
      yPos += 5;
      
      addSubsectionHeader('Performance Metrics');
      const perfMetrics = [
        'Net Profit: Total P&L after all costs',
        'CAGR: Compound Annual Growth Rate = ((FinalValue/InitialValue)^(1/Years)) - 1',
        'Sharpe Ratio: (Return - RiskFree) / StdDev. Annualized: × √252',
        'Sortino Ratio: Same as Sharpe but uses downside deviation only',
        'Calmar Ratio: CAGR / Max Drawdown',
        'Recovery Factor: Net Profit / Max Drawdown',
        'Profit Factor: Gross Profit / Gross Loss',
        'Expectancy: (Win% × AvgWin) - (Loss% × AvgLoss)'
      ];
      perfMetrics.forEach(m => addBullet(m));
      yPos += 5;
      
      addSubsectionHeader('Risk Metrics');
      const riskMetrics = [
        'Maximum Drawdown: Largest peak-to-trough decline (% or absolute)',
        'VaR (95%): 5% chance of losing this much or more in a period',
        'CVaR: Average loss when VaR is breached (Expected Shortfall)',
        'Volatility: Standard deviation of returns. Annualized: daily × √252',
        'Ulcer Index: √(Average of squared drawdowns)',
        'Skewness: Return distribution asymmetry. Positive = more extreme wins',
        'Kurtosis: Tail thickness. >3 = fat tails (more black swan risk)'
      ];
      riskMetrics.forEach(m => addBullet(m));
      yPos += 5;
      
      addSubsectionHeader('Trade Statistics');
      const tradeStats = [
        'Win Rate: Winners / Total Trades × 100',
        'Risk:Reward Ratio: Average Win / Average Loss',
        'Max Consecutive Wins/Losses: Longest streak',
        'Average Trade Duration: Mean holding period',
        'Trades per Day/Week/Month: Activity level',
        'Kelly Criterion: f* = W - (1-W)/R for optimal sizing'
      ];
      tradeStats.forEach(m => addBullet(m));
      
      addFooter();
      
      // ============== SECTION 13: SUPPORT ==============
      pdf.addPage();
      pageNum++;
      yPos = margin;
      
      addSectionHeader('Support & Resources', 13);
      yPos += 5;
      
      addSubsectionHeader('In-App Resources');
      const inAppResources = [
        { path: '/help', desc: 'Searchable Help Center with all topics' },
        { path: '/guide', desc: 'This comprehensive guide (with PDF export)' },
        { path: '/tutorials', desc: 'Step-by-step video tutorials for all features' },
        { path: '/help/offline', desc: 'Offline help documentation' },
        { path: '/sentinel', desc: 'AI-powered chat assistant (Copilot)' },
        { path: '/system-check', desc: 'System diagnostics and health check' },
        { path: '/settings', desc: 'Application settings and preferences' },
        { path: '/logs', desc: 'Debug logs for troubleshooting' }
      ];
      inAppResources.forEach(resource => {
        pdf.setTextColor(59, 130, 246);
        pdf.setFontSize(9);
        pdf.text(resource.path, margin + 3, yPos);
        pdf.setTextColor(60, 60, 60);
        pdf.text(` - ${resource.desc}`, margin + 35, yPos);
        yPos += 6;
      });
      yPos += 10;
      
      addSubsectionHeader('Getting Help');
      addParagraph('If you need assistance, MMC offers multiple support channels:');
      const supportChannels = [
        'MMC Copilot: Use the in-app AI assistant for instant help with any feature',
        'Help Center (/help): Searchable, categorized articles covering all topics',
        'Documentation: Comprehensive guides available at /guide',
        'System Check: Run diagnostics at /system-check for technical issues',
        'Logs: Export debug logs from /logs for troubleshooting'
      ];
      supportChannels.forEach(channel => addBullet(channel));
      yPos += 10;
      
      addSubsectionHeader('Best Practices');
      const bestPractices = [
        'Always validate your data quality before running backtests (aim for >90%)',
        'Use realistic transaction costs to avoid inflated results',
        'Run Walk-Forward Analysis before deploying strategies live',
        'Keep strategies versioned to track changes over time',
        'Use Monte Carlo simulations to understand result uncertainty',
        'Export and backup your data regularly (weekly recommended)',
        'Review the glossary to ensure you understand all metrics',
        'Start with strategy templates and iterate from there',
        'Use Half-Kelly for position sizing (full Kelly is too aggressive)',
        'Test across multiple market regimes for true robustness'
      ];
      bestPractices.forEach(practice => addBullet(practice));
      
      addFooter();
      
      // ============== FINAL PAGE ==============
      pdf.addPage();
      pageNum++;
      
      pdf.setFillColor(10, 15, 30);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      pdf.setTextColor(59, 130, 246);
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Thank You', pageWidth / 2, 100, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.text('for choosing MMC as your backtesting platform', pageWidth / 2, 115, { align: 'center' });
      
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(10);
      pdf.text('We are committed to helping you succeed in algorithmic trading.', pageWidth / 2, 140, { align: 'center' });
      pdf.text('This guide is regularly updated with new features and improvements.', pageWidth / 2, 150, { align: 'center' });
      
      pdf.setTextColor(59, 130, 246);
      pdf.setFontSize(11);
      pdf.text('Happy Trading!', pageWidth / 2, 180, { align: 'center' });
      
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(9);
      pdf.text('© 2026 MMC. All rights reserved.', pageWidth / 2, pageHeight - 30, { align: 'center' });
      pdf.text(`Document Version: ${platformOverview.version}`, pageWidth / 2, pageHeight - 22, { align: 'center' });
      
      // Save the PDF
      pdf.save('MMC_Complete_User_Guide.pdf');
      
      toast({
        title: 'PDF Generated Successfully',
        description: 'Your comprehensive 20+ page guide has been downloaded.',
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: 'Error Generating PDF',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedCategory = appModules.find(c => c.category === activeCategory);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            MMC User Guide
          </h1>
          <p className="text-muted-foreground">Complete documentation, tutorials, and feature reference</p>
        </div>
        <Button onClick={generatePDF} disabled={isGenerating} size="lg" className="gap-2">
          {isGenerating ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download Complete Guide (PDF)
            </>
          )}
        </Button>
      </div>

      {/* Platform Overview */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {platformOverview.tagline}
          </CardTitle>
          <CardDescription className="text-base">{platformOverview.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className="text-sm">Version {platformOverview.version}</Badge>
            <Badge variant="outline" className="text-sm">Updated: {platformOverview.lastUpdated}</Badge>
            <Badge className="bg-profit/10 text-profit border-profit/20">Cloud-Sync</Badge>
            <Badge className="bg-primary/10 text-primary border-primary/20">AI-Powered</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Quick Start Guide
          </CardTitle>
          <CardDescription>Get started with MMC in 4 simple steps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            {quickStartSteps.map((step) => (
              <div key={step.step} className="relative p-4 rounded-lg bg-muted/30 border hover:border-primary/50 transition-colors">
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg">
                  {step.step}
                </div>
                <div className="pt-2">
                  <step.icon className="h-6 w-6 text-primary mb-2" />
                  <h3 className="font-semibold mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                  <ul className="space-y-1">
                    {step.details.map((detail, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                        <CheckCircle2 className="h-3 w-3 text-profit mt-0.5 flex-shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Benefits */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        {keyBenefits.map((benefit) => (
          <Card key={benefit.title} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <benefit.icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">{benefit.title}</h3>
              <p className="text-xs text-muted-foreground mb-2">{benefit.description}</p>
              <Badge variant="secondary" className="text-xs">{benefit.stats}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Target Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Who is MMC For?
          </CardTitle>
          <CardDescription>MMC serves traders and firms of all sizes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {targetUsers.map((user) => (
              <div key={user.title} className="p-4 rounded-lg border bg-muted/20">
                <user.icon className="h-6 w-6 text-primary mb-2" />
                <h4 className="font-semibold mb-1">{user.title}</h4>
                <p className="text-sm text-muted-foreground mb-3">{user.description}</p>
                <div className="space-y-1">
                  {user.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-profit" />
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Module Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Modules</CardTitle>
          <CardDescription>Explore all features and capabilities by category</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0 mb-6">
              {appModules.map((category) => (
                <TabsTrigger
                  key={category.category}
                  value={category.category}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <category.icon className="h-4 w-4 mr-2" />
                  {category.category}
                </TabsTrigger>
              ))}
            </TabsList>

            {appModules.map((category) => (
              <TabsContent key={category.category} value={category.category} className="mt-0">
                <p className="text-muted-foreground mb-4">{category.description}</p>
                <div className="grid gap-4">
                  {category.modules.map((module) => (
                    <Card key={module.name} className="border-l-4 border-l-primary">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="text-lg">{module.name}</CardTitle>
                          <Badge variant="outline" className="font-mono text-xs">
                            {module.path}
                          </Badge>
                        </div>
                        <CardDescription>{module.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2 text-sm flex items-center gap-1">
                              <Layers className="h-4 w-4" />
                              Features
                            </h4>
                            <ul className="space-y-1">
                              {module.features.map((feature, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                  <CheckCircle2 className="h-4 w-4 text-profit mt-0.5 flex-shrink-0" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-profit/10 border border-profit/20">
                              <h4 className="font-medium mb-2 text-sm text-profit flex items-center gap-2">
                                <Award className="h-4 w-4" />
                                Key Benefit
                              </h4>
                              <p className="text-sm">{module.benefits}</p>
                            </div>
                            {module.useCases && (
                              <div className="p-4 rounded-lg bg-muted/50">
                                <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
                                  <Lightbulb className="h-4 w-4 text-warning" />
                                  Use Cases
                                </h4>
                                <ul className="space-y-1">
                                  {module.useCases.map((useCase, i) => (
                                    <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                                      <ArrowRight className="h-3 w-3" />
                                      {useCase}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {faqItems.slice(0, 6).map((faq, i) => (
              <div key={i} className="p-4 rounded-lg border bg-muted/20">
                <h4 className="font-semibold text-sm mb-2 text-primary">{faq.question}</h4>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Glossary Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Glossary of Terms
          </CardTitle>
          <CardDescription>Key trading and backtesting terminology</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-3">
            {glossaryTerms.map((item, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/30 border">
                <h4 className="font-semibold text-sm text-primary mb-1">{item.term}</h4>
                <p className="text-xs text-muted-foreground">{item.definition}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Keyboard Shortcuts
          </CardTitle>
          <CardDescription>Master these shortcuts to navigate MMC like a pro</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {keyboardShortcuts.map((shortcut) => (
              <div key={shortcut.keys} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div>
                  <span className="text-sm font-medium">{shortcut.action}</span>
                  <p className="text-xs text-muted-foreground">{shortcut.description}</p>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">{shortcut.keys}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Download CTA */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-transparent">
        <CardContent className="py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Get the Complete Guide</h2>
            <p className="text-muted-foreground mb-6">Download the full 20+ page PDF guide with detailed documentation, tutorials, and reference material.</p>
            <Button onClick={generatePDF} disabled={isGenerating} size="lg" className="gap-2">
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Download Complete PDF Guide
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
