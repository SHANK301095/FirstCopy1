import { Upload, Play, Search, AlertTriangle, HelpCircle, TrendingUp, BarChart3, Calculator, Shield, Settings, BookOpen, Zap, LineChart, Target, Brain, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopilotQuickChipsProps {
  onChipClick: (message: string) => void;
  disabled?: boolean;
  className?: string;
  currentRoute?: string;
}

interface QuickChip {
  icon: React.ElementType;
  label: string;
  message: string;
}

// Route-specific chips for contextual suggestions
const routeChips: Record<string, QuickChip[]> = {
  '/data': [
    { icon: Upload, label: 'Import CSV', message: 'CSV import kaise karu?' },
    { icon: Search, label: 'Quality Scan', message: 'Dataset quality scan kaise karu?' },
    { icon: Zap, label: 'Merge Data', message: 'Multiple datasets merge kaise karu?' },
    { icon: AlertTriangle, label: 'Fix Gaps', message: 'Data me gaps kaise fix karu?' },
  ],
  '/strategies': [
    { icon: BookOpen, label: 'Templates', message: 'Strategy template se start kaise karu?' },
    { icon: Play, label: 'Validate Code', message: 'Strategy code validate kaise karu?' },
    { icon: Settings, label: 'Parameters', message: 'Strategy parameters kaise define karu?' },
    { icon: TrendingUp, label: 'Version History', message: 'Strategy version restore kaise karu?' },
  ],
  '/workflow': [
    { icon: Play, label: 'Run Backtest', message: 'Backtest kaise run karu?' },
    { icon: Settings, label: 'Cost Model', message: 'Slippage aur commission kaise set karu?' },
    { icon: AlertTriangle, label: 'No Trades', message: 'Backtest me no trades generate ho rahe' },
    { icon: HelpCircle, label: 'Config Help', message: 'Backtest configuration best practices batao' },
  ],
  '/saved-results': [
    { icon: BarChart3, label: 'Explain Results', message: 'Backtest results interpret kaise karu?' },
    { icon: LineChart, label: 'Equity Curve', message: 'Equity curve download kaise karu?' },
    { icon: Search, label: 'Trade Explorer', message: 'Trade explorer kaise use karu?' },
    { icon: TrendingUp, label: 'Compare', message: 'Backtests compare kaise karu?' },
  ],
  '/analytics': [
    { icon: BarChart3, label: 'Metrics', message: 'Key performance metrics explain karo' },
    { icon: Gauge, label: 'Sharpe Ratio', message: 'Sharpe ratio kya hota hai?' },
    { icon: TrendingUp, label: 'Monthly Heatmap', message: 'Monthly returns heatmap explain karo' },
    { icon: AlertTriangle, label: 'Drawdown', message: 'Maximum drawdown kaise interpret karu?' },
  ],
  '/advanced-analytics': [
    { icon: Brain, label: 'Monte Carlo', message: 'Monte Carlo analysis kaise interpret karu?' },
    { icon: Target, label: 'Walk-Forward', message: 'Walk-forward analysis kya hai?' },
    { icon: Gauge, label: 'Regime', message: 'Regime detection kya karta hai?' },
    { icon: BarChart3, label: 'Distribution', message: 'Return distribution kaise read karu?' },
  ],
  '/optimizer': [
    { icon: Zap, label: 'Grid vs Genetic', message: 'Grid vs Genetic optimization me kya difference?' },
    { icon: AlertTriangle, label: 'Slow Fix', message: 'Optimizer bahut slow chal raha' },
    { icon: Target, label: 'Overfitting', message: 'Overfitting kaise detect karu?' },
    { icon: BarChart3, label: 'Heatmap', message: 'Optimization heatmap kaise read karu?' },
  ],
  '/advanced-optimizer': [
    { icon: Brain, label: 'Bayesian', message: 'Bayesian optimization kya hai aur kab use karu?' },
    { icon: Target, label: 'Multi-Objective', message: 'Multi-objective optimization me Pareto kya hai?' },
    { icon: Zap, label: 'PSO', message: 'PSO vs Genetic kya use karu?' },
    { icon: BarChart3, label: 'Convergence', message: 'Convergence chart kaise read karu?' },
  ],
  '/walk-forward': [
    { icon: HelpCircle, label: 'WF Explained', message: 'Walk-forward analysis kya hai?' },
    { icon: Settings, label: 'IS/OOS Split', message: 'IS vs OOS percentage kya rakhein?' },
    { icon: Target, label: 'Efficiency', message: 'Walk-forward efficiency interpret kaise karu?' },
    { icon: Shield, label: 'Robustness', message: 'Strategy robustness kaise check karu?' },
  ],
  '/trading-dashboard': [
    { icon: LineChart, label: 'Widgets', message: 'Dashboard widgets kaise customize karu?' },
    { icon: Brain, label: 'Tilt Detection', message: 'Tilt detection kaise kaam karta hai?' },
    { icon: Target, label: 'AI Playbook', message: 'AI Playbook patterns explain karo' },
    { icon: Calculator, label: 'Risk Budget', message: 'Risk budget calculator kaise use karu?' },
  ],
  '/mt5-hub': [
    { icon: Zap, label: 'Connect MT5', message: 'MT5 connect kaise karu?' },
    { icon: AlertTriangle, label: 'Sync Issues', message: 'MT5 sync fail ho raha hai' },
    { icon: Shield, label: 'Circuit Breaker', message: 'Circuit breaker kya karta hai?' },
    { icon: Settings, label: 'Risk Config', message: 'MT5 risk config kaise set karu?' },
  ],
  '/mt5-sync': [
    { icon: Zap, label: 'Setup Wizard', message: 'MT5 setup wizard kaise use karu?' },
    { icon: Shield, label: 'Sync V3', message: 'MT5 sync V3 me kya naya hai?' },
    { icon: AlertTriangle, label: 'Sync Fail', message: 'MT5 sync fail ho raha hai' },
    { icon: Settings, label: 'Watermark', message: 'Watermark persistence kya hai?' },
  ],
  '/runners': [
    { icon: Zap, label: 'Register Runner', message: 'Runner register kaise karu?' },
    { icon: Settings, label: 'Add Terminal', message: 'Terminal kaise add karu?' },
    { icon: AlertTriangle, label: 'Offline', message: 'Runner offline dikha raha hai' },
    { icon: Shield, label: 'Health Check', message: 'Runner health monitoring kaise kaam karta hai?' },
  ],
  '/run-console': [
    { icon: Play, label: 'Start Run', message: 'Run kaise start karu headless MT5 pe?' },
    { icon: AlertTriangle, label: 'Stop Run', message: 'Run stop kaise karu?' },
    { icon: Shield, label: 'Panic Stop', message: 'Panic stop kya karta hai?' },
    { icon: Settings, label: 'Risk Limits', message: 'Risk limits run me kaise set karu?' },
  ],
  '/ea-manager': [
    { icon: Upload, label: 'Upload EA', message: 'EA library me EA upload kaise karu?' },
    { icon: Settings, label: 'Presets', message: 'EA preset kya hota hai?' },
    { icon: Search, label: 'Search', message: 'EA library me search kaise karu?' },
    { icon: Shield, label: 'Risk Tier', message: 'EA risk tier kya hota hai?' },
  ],
  '/prop-firm': [
    { icon: Target, label: 'Add Challenge', message: 'Prop firm challenge add kaise karu?' },
    { icon: Gauge, label: 'DD Limits', message: 'Daily DD vs Total DD me kya difference?' },
    { icon: Shield, label: 'Rules', message: 'Prop firm rules configure kaise karu?' },
    { icon: BarChart3, label: 'Progress', message: 'Challenge progress track kaise karu?' },
  ],
  '/risk-dashboard': [
    { icon: Shield, label: 'VaR', message: 'Value at Risk kya hai?' },
    { icon: Gauge, label: 'Position Size', message: 'Position sizing calculate kaise karu?' },
    { icon: AlertTriangle, label: 'DD Alert', message: 'Drawdown alert kaise set karu?' },
    { icon: Calculator, label: 'Risk of Ruin', message: 'Risk of ruin kya hai?' },
  ],
  '/calculators': [
    { icon: Calculator, label: 'Position Size', message: 'Position size calculate kaise karu?' },
    { icon: Target, label: 'Kelly', message: 'Kelly criterion kaise use karu?' },
    { icon: TrendingUp, label: 'Compound', message: 'Compound interest calculate karna hai' },
    { icon: BarChart3, label: 'Fibonacci', message: 'Fibonacci levels calculate kaise karu?' },
  ],
  '/settings': [
    { icon: Settings, label: 'Backup', message: 'Data backup kaise lu?' },
    { icon: Shield, label: 'Password', message: 'Password change kaise karu?' },
    { icon: Zap, label: 'Presets', message: 'Cost model presets kaise save karu?' },
    { icon: HelpCircle, label: 'Dark Mode', message: 'Dark mode enable kaise karu?' },
  ],
  '/journal': [
    { icon: BookOpen, label: 'New Entry', message: 'Journal entry kaise banau?' },
    { icon: Brain, label: 'Mood Track', message: 'Mood tracker kaise use karu?' },
    { icon: Target, label: 'Link Trades', message: 'Journal entry me trade link kaise?' },
    { icon: TrendingUp, label: 'Patterns', message: 'Trading psychology tips do' },
  ],
  '/notebook': [
    { icon: BookOpen, label: 'New Note', message: 'Notebook me note kaise banau?' },
    { icon: Search, label: 'Search', message: 'Notes me search kaise karu?' },
    { icon: Settings, label: 'Categories', message: 'Notebook me categories kaunsi hain?' },
    { icon: Zap, label: 'Pin Note', message: 'Note pin kaise karu?' },
  ],
  '/alerts': [
    { icon: AlertTriangle, label: 'DD Alert', message: 'Mujhe alerts chahiye jab drawdown exceed ho' },
    { icon: Settings, label: 'Settings', message: 'Notifications settings kahan hain?' },
    { icon: Zap, label: 'Custom Alert', message: 'Custom alert kaise banau?' },
    { icon: Shield, label: 'Risk Alert', message: 'Risk alerts kaise kaam karte hain?' },
  ],
  '/portfolio': [
    { icon: TrendingUp, label: 'Add Strategy', message: 'Portfolio me strategies kaise add karu?' },
    { icon: BarChart3, label: 'Correlation', message: 'Correlation matrix kya batata hai?' },
    { icon: Target, label: 'Optimize', message: 'Portfolio optimization kaise karu?' },
    { icon: Gauge, label: 'Rebalance', message: 'Portfolio rebalancing kitni baar?' },
  ],
  '/attribution': [
    { icon: BarChart3, label: 'Long vs Short', message: 'Performance attribution kaise use karu?' },
    { icon: TrendingUp, label: 'Time Analysis', message: 'Time of day performance analysis kaise karu?' },
    { icon: Target, label: 'Regime', message: 'Regime-wise performance breakdown kaise dekhu?' },
    { icon: Brain, label: 'Factors', message: 'Return decomposition factors kya hain?' },
  ],
  '/sentinel': [
    { icon: Brain, label: 'Ask AI', message: 'Sentinel AI kya kar sakta hai?' },
    { icon: Zap, label: 'Debug', message: 'Strategy code me error aa rahi' },
    { icon: BookOpen, label: 'Explain', message: 'Mujhe pura workflow samjhao start se end tak' },
    { icon: Target, label: 'Improve', message: 'Strategy performance improve kaise karu?' },
  ],
  '/ai-copilot': [
    { icon: Brain, label: 'Analyze', message: 'Meri trading performance analyze karo' },
    { icon: Target, label: 'Best Symbol', message: 'Mera best performing symbol kaunsa hai?' },
    { icon: AlertTriangle, label: 'Overtrading', message: 'Kya main overtrade kar raha hoon?' },
    { icon: Gauge, label: 'Risk Review', message: 'Mera risk management kaisa hai?' },
  ],
  '/ai': [
    { icon: Brain, label: 'Insights', message: 'AI Insights drilldown page pe kya milta hai?' },
    { icon: Target, label: 'Patterns', message: 'AI ne kya patterns detect kiye?' },
    { icon: Zap, label: 'Unread', message: 'Unread AI insights dikhao' },
    { icon: BarChart3, label: 'Priority', message: 'High priority insights kaunse hain?' },
  ],
  '/execution': [
    { icon: Zap, label: 'Connect Broker', message: 'Execution bridge me kya kya options hain?' },
    { icon: Shield, label: 'Zerodha', message: 'Zerodha connect kaise karu?' },
    { icon: Play, label: 'Paper Trade', message: 'Paper trading mode kaise enable karu?' },
    { icon: Settings, label: 'Deriv', message: 'Deriv broker connect kaise karu?' },
  ],
  '/marketplace': [
    { icon: Search, label: 'Browse', message: 'Marketplace me strategy browse kaise karu?' },
    { icon: Upload, label: 'Publish', message: 'Marketplace me strategy publish kaise karu?' },
    { icon: TrendingUp, label: 'Review', message: 'Marketplace me review kaise du?' },
    { icon: BarChart3, label: 'Download', message: 'Strategy marketplace se download kaise karu?' },
  ],
  '/reports': [
    { icon: BookOpen, label: 'New Report', message: 'Report template kaise banau?' },
    { icon: BarChart3, label: 'Preview', message: 'PDF preview kaise dekhu?' },
    { icon: Upload, label: 'Export', message: 'Export me kya options hain?' },
    { icon: Settings, label: 'Branding', message: 'PDF me logo add karna hai' },
  ],
  '/tearsheet': [
    { icon: BookOpen, label: 'Generate', message: 'Tearsheet generate kaise karu?' },
    { icon: Settings, label: 'Custom', message: 'Tearsheet me custom metrics add kar sakte?' },
    { icon: Upload, label: 'Download', message: 'Tearsheet PDF download kaise karu?' },
    { icon: BarChart3, label: 'Sections', message: 'Tearsheet me kya kya sections hote hain?' },
  ],
  '/export-center': [
    { icon: Upload, label: 'Batch Export', message: 'Batch export kaise karu?' },
    { icon: BarChart3, label: 'Formats', message: 'Export me kya options hain?' },
    { icon: Settings, label: 'Excel', message: 'Excel export me formulas chahiye' },
    { icon: BookOpen, label: 'Presets', message: 'Export presets kaise save karu?' },
  ],
  '/simulators': [
    { icon: Brain, label: 'Monte Carlo', message: 'Monte Carlo simulator kaise use karu?' },
    { icon: TrendingUp, label: 'What-If', message: 'What-if analysis kaise use karu?' },
    { icon: LineChart, label: 'Equity Sim', message: 'Equity curve simulator kaise kaam karta hai?' },
    { icon: HelpCircle, label: 'All Tools', message: 'Simulators me kya kya hai?' },
  ],
  '/stress-testing': [
    { icon: AlertTriangle, label: 'Run Test', message: 'Stress testing kaise karu?' },
    { icon: Settings, label: 'Custom', message: 'Custom stress scenario kaise banau?' },
    { icon: Shield, label: 'Survive', message: 'Strategy crash me survive karegi?' },
    { icon: BarChart3, label: 'Presets', message: 'Preset crash scenarios kaunse hain?' },
  ],
  '/position-sizing': [
    { icon: Calculator, label: 'Calculate', message: 'Position sizing calculate kaise karu?' },
    { icon: Target, label: 'Kelly', message: 'Kelly criterion kaise use karu?' },
    { icon: Gauge, label: 'Optimal f', message: 'Optimal f kya hai?' },
    { icon: Shield, label: 'Risk %', message: 'Risk per trade 5% hai theek hai?' },
  ],
  '/risk-tools': [
    { icon: Shield, label: 'VaR', message: 'Value at Risk kya hai?' },
    { icon: Calculator, label: 'Risk of Ruin', message: 'Risk of ruin kya hai?' },
    { icon: Gauge, label: 'DD Simulator', message: 'Drawdown simulate kaise karu?' },
    { icon: Target, label: 'Correlation', message: 'Correlation matrix kya batata hai?' },
  ],
  '/diagnostics': [
    { icon: Brain, label: 'Overtrading', message: 'Behavioral diagnostics me kya kya check hota hai?' },
    { icon: AlertTriangle, label: 'Tilt Check', message: 'Tilt detection kaise kaam karta hai?' },
    { icon: Gauge, label: 'Consistency', message: 'Consistency score kaise improve karu?' },
    { icon: TrendingUp, label: 'Patterns', message: 'Trading behavior patterns dikhao' },
  ],
  '/pre-trade-check': [
    { icon: Shield, label: 'Check Setup', message: 'Pre-trade check kaise kaam karta hai?' },
    { icon: Target, label: 'History', message: 'Is setup ka historical win rate kya hai?' },
    { icon: Brain, label: 'AI Verdict', message: 'AI trade recommendation kya hai?' },
    { icon: AlertTriangle, label: 'Failed', message: 'Pre-trade check fail hua kya karu?' },
  ],
  '/growth-roadmap': [
    { icon: TrendingUp, label: 'Progress', message: 'Growth roadmap kaise use karu?' },
    { icon: Target, label: 'Next Step', message: 'Mera agla milestone kya hai?' },
    { icon: Zap, label: 'Achievements', message: 'Achievement unlock kaise karu?' },
    { icon: BookOpen, label: 'Guide', message: 'Learning path suggest karo' },
  ],
  '/live-tracker': [
    { icon: LineChart, label: 'Positions', message: 'Live tracker me kya kya dikh sakta hai?' },
    { icon: Gauge, label: 'P&L', message: 'Live P&L tracking kaise kaam karta hai?' },
    { icon: AlertTriangle, label: 'Risk', message: 'Live risk monitoring kaise dekhu?' },
    { icon: Settings, label: 'Broker', message: 'Broker connection required hai?' },
  ],
  '/investor/goal': [
    { icon: Target, label: 'Setup', message: 'Investor goal wizard kaise use karu?' },
    { icon: Shield, label: 'Risk Level', message: 'Risk level kaise decide karu?' },
    { icon: Calculator, label: 'Capital', message: 'Kitna capital se start karu?' },
    { icon: HelpCircle, label: 'Explain', message: 'Investor mode kya hai?' },
  ],
  '/investor/recommendations': [
    { icon: Brain, label: 'AI Match', message: 'Investor recommendations kaise kaam karta hai?' },
    { icon: BarChart3, label: 'Compare', message: 'Strategies compare kaise karu?' },
    { icon: Target, label: 'Select', message: 'Strategy choose kaise karu?' },
    { icon: Gauge, label: 'Scores', message: 'Confidence scores kya dikhate hain?' },
  ],
  '/investor/console': [
    { icon: LineChart, label: 'Monitor', message: 'Investor console me kya monitor hota hai?' },
    { icon: Shield, label: 'Risk', message: 'Risk ruleset kya hai?' },
    { icon: Play, label: 'Mode', message: 'Paper se live kaise switch karu?' },
    { icon: AlertTriangle, label: 'Red Flags', message: 'Red flags ka kya matlab hai?' },
  ],
  '/investor/reports': [
    { icon: BookOpen, label: 'Daily Report', message: 'Investor daily report me kya aata hai?' },
    { icon: BarChart3, label: 'Performance', message: 'Return % kaise calculate hota hai?' },
    { icon: AlertTriangle, label: 'Red Flags', message: 'Report me red flags kya hain?' },
    { icon: Gauge, label: 'Drawdown', message: 'Drawdown tracking kaise kaam karta hai?' },
  ],
  '/playbook': [
    { icon: Brain, label: '7 Dimensions', message: 'AI Playbook me 7 dimensions kya hain?' },
    { icon: Target, label: 'Patterns', message: 'AI Playbook patterns explain karo' },
    { icon: BarChart3, label: 'Streaks', message: 'Streak analysis kaise padhu?' },
    { icon: Gauge, label: 'Quality', message: 'Trade quality scoring kaise hota hai?' },
  ],
  '/trades': [
    { icon: Search, label: 'Filter', message: 'Trades filter kaise karu?' },
    { icon: Upload, label: 'Import', message: 'Trades CSV import kaise karu?' },
    { icon: BarChart3, label: 'Analyze', message: 'Trade-level analysis kaise karu?' },
    { icon: BookOpen, label: 'Notes', message: 'Trade me notes kaise add karu?' },
  ],
  '/achievements': [
    { icon: Target, label: 'Unlock', message: 'Achievement unlock kaise karu?' },
    { icon: TrendingUp, label: 'Progress', message: 'Mera progress kahan tak hai?' },
    { icon: Zap, label: 'Categories', message: 'Achievement categories kya hain?' },
    { icon: Brain, label: 'Elite', message: 'Elite achievement kaise unlock karu?' },
  ],
  '/paper-trading': [
    { icon: Play, label: 'Enable', message: 'Paper trading mode kaise enable karu?' },
    { icon: LineChart, label: 'Track P&L', message: 'Paper trading P&L kaise track karu?' },
    { icon: AlertTriangle, label: 'Mismatch', message: 'Paper trading PnL real se match nahi kar raha' },
    { icon: HelpCircle, label: 'Explain', message: 'Paper trading kaise kaam karta hai?' },
  ],
  '/patterns': [
    { icon: Brain, label: 'Detect', message: 'Pattern recognition kaise use karu?' },
    { icon: BarChart3, label: 'Candlestick', message: 'Candlestick patterns kaunse detect hote hain?' },
    { icon: Target, label: 'Chart Pattern', message: 'Chart patterns kaise identify hote hain?' },
    { icon: Gauge, label: 'Score', message: 'Pattern scoring kaise kaam karta hai?' },
  ],
  '/scanner': [
    { icon: Search, label: 'Build Rules', message: 'Scanner me rules kaise add karu?' },
    { icon: Zap, label: 'Run Scan', message: 'Scanner kaise use karu?' },
    { icon: Settings, label: 'Indicators', message: 'Scanner me custom indicator add kaise karu?' },
    { icon: BarChart3, label: 'Results', message: 'Scan results kaise interpret karu?' },
  ],
  '/workspace': [
    { icon: Settings, label: 'Create', message: 'Workspace create kaise karu?' },
    { icon: Zap, label: 'Invite', message: 'Member invite kaise karu?' },
    { icon: Shield, label: 'Roles', message: 'Workspace roles kya hain?' },
    { icon: AlertTriangle, label: 'Access', message: 'Workspace me access denied aa raha' },
  ],
  '/cloud-sync': [
    { icon: Zap, label: 'Sync Now', message: 'Cloud sync manually kaise trigger karu?' },
    { icon: AlertTriangle, label: 'Conflict', message: 'Cloud sync conflict detected' },
    { icon: Settings, label: 'Status', message: 'Cloud sync status kaise check karu?' },
    { icon: Shield, label: 'Offline', message: 'Offline mode kaise kaam karta hai?' },
  ],
  '/premium': [
    { icon: Zap, label: 'Features', message: 'Premium features kya hain?' },
    { icon: Calculator, label: 'Pricing', message: 'Pricing plans kya hain?' },
    { icon: Target, label: 'Trial', message: 'Free trial kaise start karu?' },
    { icon: HelpCircle, label: 'Compare', message: 'Free vs Pro kya difference hai?' },
  ],
  '/pricing': [
    { icon: Calculator, label: 'Plans', message: 'Pricing plans kya hain?' },
    { icon: Zap, label: 'Premium', message: 'Premium features kya hain?' },
    { icon: Target, label: 'Enterprise', message: 'Enterprise plan me kya extra milta hai?' },
    { icon: HelpCircle, label: 'Trial', message: 'Free trial available hai?' },
  ],
  '/bulk-tester': [
    { icon: Play, label: 'Run Bulk', message: 'Bulk tester me strategy kaise test karu?' },
    { icon: Settings, label: 'Concurrency', message: 'Bulk tester concurrency kitni set karu?' },
    { icon: BarChart3, label: 'Compare', message: 'Bulk test results compare kaise karu?' },
    { icon: Zap, label: 'Queue', message: 'Queue multiple backtests kaise karu?' },
  ],
  '/leaderboard': [
    { icon: TrendingUp, label: 'Rank', message: 'Leaderboard me rank kaise improve karu?' },
    { icon: Target, label: 'Criteria', message: 'Leaderboard me rank kaise determine hota hai?' },
    { icon: BarChart3, label: 'Top Traders', message: 'Top traders ki strategies dekh sakte hain?' },
    { icon: Shield, label: 'Verified', message: 'Verified results kaise submit karu?' },
  ],
  '/dev-tools': [
    { icon: Settings, label: 'JSON Editor', message: 'Dev tools kahan hai?' },
    { icon: Search, label: 'Regex Test', message: 'Regex tester kaise use karu?' },
    { icon: BarChart3, label: 'Storage', message: 'LocalStorage full ho gaya' },
    { icon: Zap, label: 'Timestamp', message: 'Timestamp convert kaise karu?' },
  ],
  '/referral': [
    { icon: Zap, label: 'Code', message: 'Referral code kahan milega?' },
    { icon: TrendingUp, label: 'Track', message: 'Referral status kaise track karu?' },
    { icon: Target, label: 'Rewards', message: 'Referral rewards kya hain?' },
    { icon: HelpCircle, label: 'Share', message: 'Referral link kaise share karu?' },
  ],
  '/affiliate/dashboard': [
    { icon: BarChart3, label: 'Stats', message: 'Affiliate stats kaise dekhu?' },
    { icon: Calculator, label: 'Commission', message: 'Commission kaise calculate hota hai?' },
    { icon: TrendingUp, label: 'Clicks', message: 'Clicks aur conversions track kaise karu?' },
    { icon: Zap, label: 'Payout', message: 'Payout kab milega?' },
  ],
  '/profile': [
    { icon: Settings, label: 'Edit', message: 'Profile edit kaise karu?' },
    { icon: Shield, label: 'Public', message: 'Share stats page kaise enable karu?' },
    { icon: Zap, label: 'Avatar', message: 'Profile picture change kaise karu?' },
    { icon: HelpCircle, label: 'Username', message: 'Username change kar sakte hain?' },
  ],
  '/logs': [
    { icon: Search, label: 'Filter', message: 'Logs kahan dekhu?' },
    { icon: Upload, label: 'Export', message: 'Logs export kaise karu?' },
    { icon: AlertTriangle, label: 'Errors', message: 'Error logs filter kaise karu?' },
    { icon: Settings, label: 'Clear', message: 'Logs clear kaise karu?' },
  ],
  '/help': [
    { icon: BookOpen, label: 'Guide', message: 'Help documentation kahan hai?' },
    { icon: Brain, label: 'Copilot', message: 'Aap kya kya kar sakte ho?' },
    { icon: Zap, label: 'Shortcuts', message: 'Keyboard shortcuts kya hain?' },
    { icon: HelpCircle, label: 'FAQ', message: 'Common questions kya hain?' },
  ],
};

// Default chips when no route-specific chips exist
const defaultChips: QuickChip[] = [
  { icon: Upload, label: 'Import Data', message: 'CSV import kaise karu?' },
  { icon: Play, label: 'Run Backtest', message: 'Backtest kaise run karu?' },
  { icon: Search, label: 'Run Scan', message: 'Scanner kaise use karu?' },
  { icon: AlertTriangle, label: 'Fix Error', message: 'Error aa rahi hai, help karo' },
  { icon: HelpCircle, label: 'Explain Metric', message: 'Sharpe ratio kya hota hai?' },
  { icon: TrendingUp, label: 'Performance', message: 'Strategy performance improve kaise karu?' },
];

export function CopilotQuickChips({ onChipClick, disabled, className, currentRoute }: CopilotQuickChipsProps) {
  // Get route-specific chips or default
  const chips = (currentRoute && routeChips[currentRoute]) || defaultChips;
  
  return (
    <div className={cn("flex flex-wrap gap-1.5 px-3 py-2 border-b border-border/30", className)}>
      {chips.map((chip) => {
        const Icon = chip.icon;
        return (
          <button
            key={chip.label}
            onClick={() => onChipClick(chip.message)}
            disabled={disabled}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium",
              "bg-muted/50 border border-border/40 text-muted-foreground",
              "hover:bg-primary/10 hover:text-primary hover:border-primary/30",
              "transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-primary/30",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Icon className="h-2.5 w-2.5" />
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
