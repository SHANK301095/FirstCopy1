/**
 * Navigation Configuration - V6 Clean Information Architecture
 * Simplified to 10 focused sections matching core user journey.
 * Principle: Every visible item must be real, usable, and valuable.
 */

import {
  LayoutDashboard,
  BarChart3,
  Database,
  BookOpen,
  Bookmark,
  GitBranch,
  Activity,
  Layers,
  FlaskConical,
  TrendingUp,
  Target,
  Search,
  Sparkles,
  FileText,
  Zap,
  ScrollText,
  Bell,
  Store,
  Bot,
  Download,
  Monitor,
  Shield,
  Settings,
  Calculator,
  Brain,
  Crosshair,
  LineChart,
  Gauge,
  Trophy,
  Briefcase,
  Dices,
  Milestone,
  Stethoscope,
  ClipboardCheck,
  AreaChart,
  Terminal,
  Globe,
  GraduationCap,
  Medal,
  User,
  type LucideIcon,
} from 'lucide-react';

// ============================================
// NAV ITEM TYPES
// ============================================

export interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  section: SectionKey;
  tourId?: string;
  premium?: boolean;
}

export interface SidebarSection {
  key: SectionKey;
  label: string;
  icon: LucideIcon;
  alwaysOpen?: boolean;
  collapsible?: boolean;
}

// ============================================
// SECTION KEYS - V6 Clean IA (10 sections)
// ============================================

export type SectionKey =
  | 'dashboard'     // Home, Command Center
  | 'journal'       // Journal, Trades, Notebook
  | 'analytics'     // Analytics, Reports, Tearsheet, Diagnostics
  | 'strategies'    // Strategy Library, Versions, Data, Templates, Backtest
  | 'risk'          // Risk Guardian, Trading Dashboard, Execution, Prop
  | 'copilot'       // AI Copilot, AI Playbook, Pre-Trade Check
  | 'marketplace'   // Strategy Marketplace
  | 'achievements'  // Achievements, Leaderboard
  | 'academy'       // Tutorials, Calculators, Simulators
  | 'settings'      // Settings, Profile, Export
  | 'admin';

// ============================================
// SIDEBAR SECTIONS CONFIG - V6
// ============================================

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, alwaysOpen: true },
  { key: 'journal', label: 'Journal', icon: ScrollText, collapsible: true },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, collapsible: true },
  { key: 'strategies', label: 'Strategies', icon: FlaskConical, collapsible: true },
  { key: 'risk', label: 'Risk', icon: Shield, collapsible: true },
  { key: 'copilot', label: 'Copilot', icon: Bot, collapsible: true },
  { key: 'marketplace', label: 'Marketplace', icon: Store, collapsible: false },
  { key: 'achievements', label: 'Achievements', icon: Trophy, collapsible: true },
  { key: 'academy', label: 'Academy', icon: GraduationCap, collapsible: true },
  { key: 'settings', label: 'Settings', icon: Settings, collapsible: true },
  { key: 'admin', label: 'Admin', icon: Shield, collapsible: true },
];

// ============================================
// NAVIGATION ITEMS - V6 Clean IA
// ============================================

export const navItems: NavItem[] = [
  // ── DASHBOARD ──
  { icon: LayoutDashboard, label: 'Home', path: '/', section: 'dashboard' },
  { icon: Monitor, label: 'Command Center', path: '/command-center', section: 'dashboard' },

  // ── JOURNAL ──
  { icon: ScrollText, label: 'Journal', path: '/journal', section: 'journal' },
  { icon: Activity, label: 'Trades', path: '/trades', section: 'journal' },

  // ── ANALYTICS ──
  { icon: BarChart3, label: 'Performance', path: '/analytics', section: 'analytics', tourId: 'analytics' },
  { icon: AreaChart, label: 'Reports', path: '/reports', section: 'analytics' },
  { icon: LineChart, label: 'Tearsheet', path: '/tearsheet', section: 'analytics' },
  { icon: Stethoscope, label: 'Diagnostics', path: '/diagnostics', section: 'analytics' },

  // ── STRATEGIES ──
  { icon: BookOpen, label: 'Strategy Library', path: '/strategies', section: 'strategies', tourId: 'strategies' },
  { icon: Database, label: 'Data Manager', path: '/data', section: 'strategies', tourId: 'data-manager' },
  { icon: Activity, label: 'Backtest', path: '/workflow', section: 'strategies', tourId: 'workflow' },
  { icon: FlaskConical, label: 'Optimizer', path: '/optimizer', section: 'strategies', premium: true },
  { icon: TrendingUp, label: 'Walk-Forward', path: '/walk-forward', section: 'strategies', premium: true },
  { icon: Dices, label: 'Monte Carlo', path: '/advanced-analytics', section: 'strategies', premium: true },
  { icon: Crosshair, label: 'Scanner', path: '/scanner', section: 'strategies', premium: true },
  { icon: Layers, label: 'Bulk Tester', path: '/bulk-tester', section: 'strategies' },
  { icon: FileText, label: 'Results', path: '/saved-results', section: 'strategies' },

  // ── RISK ──
  { icon: Shield, label: 'Risk Guardian', path: '/risk-guardian', section: 'risk' },
  { icon: Gauge, label: 'Trading Dashboard', path: '/trading-dashboard', section: 'risk' },
  { icon: Globe, label: 'Regime Control', path: '/regime-control', section: 'risk' },
  { icon: Zap, label: 'Execution', path: '/execution', section: 'risk' },
  { icon: Bell, label: 'Alerts', path: '/alerts', section: 'risk' },
  { icon: Briefcase, label: 'Prop Firms', path: '/prop-firm', section: 'risk' },
  { icon: Trophy, label: 'Prop Intelligence', path: '/prop-intelligence', section: 'risk' },

  // ── COPILOT ──
  { icon: Bot, label: 'AI Copilot', path: '/ai-copilot', section: 'copilot' },
  { icon: Brain, label: 'AI Playbook', path: '/playbook', section: 'copilot' },
  { icon: ClipboardCheck, label: 'Pre-Trade Check', path: '/pre-trade-check', section: 'copilot' },
  { icon: Milestone, label: 'Growth Roadmap', path: '/growth-roadmap', section: 'copilot' },

  // ── MARKETPLACE ──
  { icon: Store, label: 'Marketplace', path: '/marketplace', section: 'marketplace' },

  // ── ACHIEVEMENTS ──
  { icon: Trophy, label: 'Achievements', path: '/achievements', section: 'achievements' },
  { icon: Medal, label: 'Leaderboard', path: '/leaderboard', section: 'achievements' },

  // ── ACADEMY ──
  { icon: GraduationCap, label: 'Academy', path: '/academy', section: 'academy' },
  { icon: GraduationCap, label: 'Tutorials', path: '/tutorials', section: 'academy' },
  { icon: Calculator, label: 'Calculators', path: '/calculators', section: 'academy' },
  { icon: Target, label: 'Simulators', path: '/simulators', section: 'academy' },

  // ── SETTINGS ──
  { icon: Settings, label: 'Settings', path: '/settings', section: 'settings' },
  { icon: User, label: 'Profile', path: '/profile', section: 'settings' },
  { icon: Download, label: 'Export Center', path: '/export-center', section: 'settings' },

  // ── ADMIN (hidden unless admin) ──
  { icon: Shield, label: 'Admin', path: '/admin', section: 'admin' },
];

// ============================================
// PREMIUM HUB ITEMS
// ============================================

export const premiumHubItems = [
  { icon: Sparkles, label: 'AI Features', path: '/ai-features', description: 'Explore AI-powered tools' },
  { icon: FlaskConical, label: 'Optimizer', path: '/optimizer', description: 'GA/PSO parameter optimization' },
  { icon: TrendingUp, label: 'Walk-Forward', path: '/walk-forward', description: 'Out-of-sample validation' },
  { icon: Dices, label: 'Monte Carlo', path: '/advanced-analytics', description: 'Statistical robustness testing' },
  { icon: Crosshair, label: 'Scanner', path: '/scanner', description: 'Multi-symbol strategy scanning' },
];

// ============================================
// DEFAULT PINNED PAGES
// ============================================

export const DEFAULT_PINNED_PAGES = [
  '/workflow',
  '/trades',
  '/analytics',
  '/saved-results',
  '/execution',
];

// ============================================
// PAGE LABELS (all routable pages, including hidden ones)
// ============================================

export const PAGE_LABELS: Record<string, string> = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/workflow': 'Backtest',
  '/data': 'Data Manager',
  '/strategies': 'Strategies',
  '/templates': 'Templates',
  '/strategy-versions': 'Versions',
  '/bulk-tester': 'Bulk Tester',
  '/optimizer': 'Optimizer',
  '/walk-forward': 'Walk-Forward',
  '/advanced-analytics': 'Monte Carlo',
  '/scanner': 'Scanner',
  '/quick-compare': 'Compare',
  '/saved-results': 'Results',
  '/analytics': 'Performance',
  '/reports': 'Reports',
  '/tearsheet': 'Tearsheet',
  '/execution': 'Execution',
  '/paper-trading': 'Paper Trading',
  '/position-sizing': 'Position Sizing',
  '/risk-tools': 'Risk Lab',
  '/trades': 'Trades',
  '/journal': 'Journal',
  '/alerts': 'Alerts',
  '/prop-firm': 'Prop Firms',
  '/diagnostics': 'Diagnostics',
  '/notebook': 'Notebook',
  '/trading-dashboard': 'Trading Dashboard',
  '/trade-reports': 'Trade Reports',
  '/playbook': 'AI Playbook',
  '/ai': 'AI Insights',
  '/pre-trade-check': 'Pre-Trade Check',
  '/growth-roadmap': 'Growth Roadmap',
  '/ai-copilot': 'AI Copilot',
  '/pricing': 'Pricing',
  '/marketplace': 'Marketplace',
  '/leaderboard': 'Leaderboard',
  '/workspace': 'Workspace',
  '/ea-manager': 'EA Manager',
  '/mt5-hub': 'MT5 Hub',
  '/mt5-sync': 'MT5 Sync',
  '/calculators': 'Calculators',
  '/simulators': 'Simulators',
  '/cloud-sync': 'Cloud Sync',
  '/export-center': 'Export Center',
  '/logs': 'Logs',
  '/system-check': 'System Check',
  '/settings': 'Settings',
  '/tutorials': 'Tutorials',
  '/achievements': 'Achievements',
  '/premium': 'Premium',
  '/admin': 'Admin',
  '/profile': 'Profile',
  '/sentinel': 'Sentinel AI',
  '/ai-features': 'AI Features',
  '/pattern-recognition': 'Pattern Recognition',
  '/stress-testing': 'Stress Testing',
  '/portfolio': 'Portfolio',
  '/risk-dashboard': 'Risk Dashboard',
  '/strategy-intelligence': 'Strategy Intelligence',
  '/factory/strategies': 'Strategy Factory',
  '/factory/backtests': 'Backtest Factory',
  '/factory/leaderboard': 'Factory Leaderboard',
  '/factory/portfolio': 'Portfolio Builder',
  '/factory/deployments': 'Deployments',
  '/factory/monitoring': 'Monitoring',
  '/command-center': 'Command Center',
  '/auto-selection': 'Auto-Selection',
  '/regime-control': 'Regime Control',
  '/risk-guardian': 'Risk Guardian',
  '/prop-intelligence': 'Prop Intelligence',
  '/referral': 'Referral',
  '/guide': 'App Guide',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export const getSectionIcon = (key: SectionKey): LucideIcon => {
  const section = SIDEBAR_SECTIONS.find(s => s.key === key);
  return section?.icon ?? LayoutDashboard;
};

export const getSectionLabel = (key: SectionKey): string => {
  const section = SIDEBAR_SECTIONS.find(s => s.key === key);
  return section?.label ?? key;
};

export const getPageLabel = (path: string): string => {
  return PAGE_LABELS[path] || path.split('/').pop()?.replace(/-/g, ' ') || 'Page';
};

export const getPageIcon = (path: string): React.ElementType | null => {
  const item = navItems.find(n => n.path === path);
  return item?.icon || null;
};

export const getNavItemsBySection = (section: SectionKey): NavItem[] => {
  return navItems.filter(item => item.section === section);
};

export const findNavItemByPath = (path: string): NavItem | undefined => {
  return navItems.find(item => item.path === path);
};

export const findSectionByPath = (path: string): SectionKey | undefined => {
  const item = findNavItemByPath(path);
  return item?.section;
};
