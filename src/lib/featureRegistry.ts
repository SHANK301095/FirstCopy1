/**
 * Feature Registry - Comprehensive tracking of all 600+ platform features
 * Each feature has: id, category, name, status, uiPath, description
 */

export type FeatureStatus = 'not-started' | 'stubbed' | 'implemented';

export interface Feature {
  id: string;
  category: string;
  subcategory?: string;
  name: string;
  status: FeatureStatus;
  uiPath?: string;
  description: string;
  priority: 'critical' | 'important' | 'nice-to-have';
}

// ============= FEATURE DEFINITIONS =============

export const featureRegistry: Feature[] = [
  // ============= 1. UI/UX & VISUAL POLISH (1-100) =============
  
  // Themes & Styling (1-10)
  { id: 'F001', category: 'UI/UX', subcategory: 'Themes', name: 'True Black OLED Mode', status: 'stubbed', uiPath: '/settings', description: 'Pure black background for OLED displays', priority: 'important' },
  { id: 'F002', category: 'UI/UX', subcategory: 'Themes', name: 'Cyberpunk Neon Theme', status: 'stubbed', uiPath: '/settings', description: 'Neon accents on dark base', priority: 'nice-to-have' },
  { id: 'F003', category: 'UI/UX', subcategory: 'Themes', name: 'Financial Terminal Theme', status: 'stubbed', uiPath: '/settings', description: 'Bloomberg-style high-contrast theme', priority: 'important' },
  { id: 'F004', category: 'UI/UX', subcategory: 'Themes', name: 'Zen Minimalist Mode', status: 'stubbed', uiPath: '/settings', description: 'Hides all non-essential UI elements', priority: 'nice-to-have' },
  { id: 'F005', category: 'UI/UX', subcategory: 'Themes', name: 'Dynamic Time-Based Theming', status: 'stubbed', uiPath: '/settings', description: 'Theme changes based on time of day', priority: 'nice-to-have' },
  { id: 'F006', category: 'UI/UX', subcategory: 'Themes', name: 'Color-Blind Palettes', status: 'implemented', uiPath: '/settings', description: 'Protanopia, Deuteranopia friendly colors', priority: 'critical' },
  { id: 'F007', category: 'UI/UX', subcategory: 'Themes', name: 'Custom Font Selector', status: 'stubbed', uiPath: '/settings', description: 'Inter, Roboto Mono, Fira Code options', priority: 'nice-to-have' },
  { id: 'F008', category: 'UI/UX', subcategory: 'Themes', name: 'Glassmorphism Control', status: 'stubbed', uiPath: '/settings', description: 'Adjust blur intensity globally', priority: 'nice-to-have' },
  { id: 'F009', category: 'UI/UX', subcategory: 'Themes', name: 'Custom Accent Colors', status: 'stubbed', uiPath: '/settings', description: 'User-customizable accent colors', priority: 'nice-to-have' },
  { id: 'F010', category: 'UI/UX', subcategory: 'Themes', name: 'Seasonal Themes', status: 'stubbed', uiPath: '/settings', description: 'Winter, summer specific styles', priority: 'nice-to-have' },
  
  // Micro-interactions & Animations (11-20)
  { id: 'F011', category: 'UI/UX', subcategory: 'Animations', name: 'Table Row Enter Animations', status: 'implemented', uiPath: '/strategies', description: 'Staggered row animations for tables', priority: 'important' },
  { id: 'F012', category: 'UI/UX', subcategory: 'Animations', name: 'Button Press Effects', status: 'implemented', uiPath: '/', description: 'Scale effects on button press', priority: 'important' },
  { id: 'F013', category: 'UI/UX', subcategory: 'Animations', name: 'Loading Skeletons', status: 'implemented', uiPath: '/', description: 'Infinite scroll shimmer skeletons', priority: 'critical' },
  { id: 'F014', category: 'UI/UX', subcategory: 'Animations', name: 'Financial Number Counters', status: 'implemented', uiPath: '/dashboard', description: 'Numbers that spin for financial figures', priority: 'important' },
  { id: 'F015', category: 'UI/UX', subcategory: 'Animations', name: 'Page Transition Wipes', status: 'implemented', uiPath: '/', description: 'Smooth page transition effects', priority: 'important' },
  { id: 'F016', category: 'UI/UX', subcategory: 'Animations', name: '3D Flip Cards', status: 'stubbed', uiPath: '/dashboard', description: '3D flip cards for summary widgets', priority: 'nice-to-have' },
  { id: 'F017', category: 'UI/UX', subcategory: 'Animations', name: 'Hover Detail Tooltips', status: 'implemented', uiPath: '/', description: 'Detailed tooltips for every metric', priority: 'important' },
  { id: 'F018', category: 'UI/UX', subcategory: 'Animations', name: 'Confetti Effects', status: 'stubbed', uiPath: '/achievements', description: 'Particle effects for goal completion', priority: 'nice-to-have' },
  { id: 'F019', category: 'UI/UX', subcategory: 'Animations', name: 'Accordion Transitions', status: 'implemented', uiPath: '/', description: 'Smooth height transitions for collapsibles', priority: 'important' },
  { id: 'F020', category: 'UI/UX', subcategory: 'Animations', name: 'Widget Drag-Drop Animations', status: 'stubbed', uiPath: '/dashboard', description: 'Drag-and-drop animations for widgets', priority: 'important' },
  
  // Layout & Navigation (21-30)
  { id: 'F021', category: 'UI/UX', subcategory: 'Layout', name: 'Draggable Dashboard Grid', status: 'stubbed', uiPath: '/dashboard', description: 'Fully draggable/resizable dashboard', priority: 'important' },
  { id: 'F022', category: 'UI/UX', subcategory: 'Layout', name: 'Focus Mode Sidebar', status: 'implemented', uiPath: '/', description: 'Collapses sidebar to icons only', priority: 'important' },
  { id: 'F023', category: 'UI/UX', subcategory: 'Layout', name: 'Breadcrumb History', status: 'stubbed', uiPath: '/', description: 'Breadcrumbs with dropdown history', priority: 'nice-to-have' },
  { id: 'F024', category: 'UI/UX', subcategory: 'Layout', name: 'Command Palette', status: 'implemented', uiPath: '/', description: 'Cmd+K deep search for all settings', priority: 'critical' },
  { id: 'F025', category: 'UI/UX', subcategory: 'Layout', name: 'Pinned Pages Bar', status: 'implemented', uiPath: '/', description: 'Quick access pinned pages', priority: 'important' },
  { id: 'F026', category: 'UI/UX', subcategory: 'Layout', name: 'Multi-Tab Interface', status: 'stubbed', uiPath: '/', description: 'Browser/IDE style tabs', priority: 'important' },
  { id: 'F027', category: 'UI/UX', subcategory: 'Layout', name: 'Split-View Mode', status: 'stubbed', uiPath: '/', description: 'Compare two pages side-by-side', priority: 'important' },
  { id: 'F028', category: 'UI/UX', subcategory: 'Layout', name: 'Sticky Table Headers', status: 'implemented', uiPath: '/', description: 'Sticky headers for long tables', priority: 'important' },
  { id: 'F029', category: 'UI/UX', subcategory: 'Layout', name: 'Back to Top Button', status: 'stubbed', uiPath: '/', description: 'Floating button with scroll progress', priority: 'nice-to-have' },
  { id: 'F030', category: 'UI/UX', subcategory: 'Layout', name: 'Mobile Bottom Sheet', status: 'implemented', uiPath: '/', description: 'Mobile bottom sheet for actions', priority: 'important' },

  // ============= 2. LOCAL DATA & OFFLINE (101-200) =============
  
  // Data Management (101-110)
  { id: 'F101', category: 'Local Data', subcategory: 'Management', name: 'JSON Settings Backup', status: 'implemented', uiPath: '/settings', description: 'Full local backup to JSON', priority: 'critical' },
  { id: 'F102', category: 'Local Data', subcategory: 'Management', name: 'CSV Trade Import', status: 'implemented', uiPath: '/data', description: 'Drag-and-drop CSV trade history', priority: 'critical' },
  { id: 'F103', category: 'Local Data', subcategory: 'Management', name: 'Local Snapshots', status: 'stubbed', uiPath: '/settings', description: 'Save current state of analysis', priority: 'important' },
  { id: 'F104', category: 'Local Data', subcategory: 'Management', name: 'Pending Queue', status: 'stubbed', uiPath: '/', description: 'Offline-first pending transactions', priority: 'nice-to-have' },
  { id: 'F105', category: 'Local Data', subcategory: 'Management', name: 'Strategy Recycle Bin', status: 'stubbed', uiPath: '/strategies', description: 'Soft delete with restore option', priority: 'important' },
  { id: 'F106', category: 'Local Data', subcategory: 'Management', name: 'Strategy Version History', status: 'implemented', uiPath: '/strategy-versions', description: 'Local version history for edits', priority: 'important' },
  { id: 'F107', category: 'Local Data', subcategory: 'Management', name: 'Universal Tagging', status: 'implemented', uiPath: '/', description: 'Tags for strategies, logs, ideas', priority: 'important' },
  { id: 'F108', category: 'Local Data', subcategory: 'Management', name: 'Full-Text Search', status: 'stubbed', uiPath: '/strategies', description: 'Advanced local search on strategies', priority: 'important' },
  { id: 'F109', category: 'Local Data', subcategory: 'Management', name: 'Analytics Caching', status: 'implemented', uiPath: '/', description: 'Client-side caching of computed analytics', priority: 'important' },
  { id: 'F110', category: 'Local Data', subcategory: 'Management', name: 'Privacy Mode', status: 'stubbed', uiPath: '/settings', description: 'Blurs values when away from keyboard', priority: 'nice-to-have' },
  
  // Export & Reporting (111-115)
  { id: 'F111', category: 'Local Data', subcategory: 'Export', name: 'PDF Monthly Reports', status: 'implemented', uiPath: '/reports', description: 'Generate PDF monthly reports', priority: 'critical' },
  { id: 'F112', category: 'Local Data', subcategory: 'Export', name: 'Excel Export', status: 'implemented', uiPath: '/export-center', description: 'Excel export of all data grids', priority: 'critical' },
  { id: 'F113', category: 'Local Data', subcategory: 'Export', name: 'Screenshot Mode', status: 'stubbed', uiPath: '/settings', description: 'Hides UI chrome for clean capture', priority: 'nice-to-have' },
  { id: 'F114', category: 'Local Data', subcategory: 'Export', name: 'Markdown Journal Export', status: 'stubbed', uiPath: '/journal', description: 'Markdown export for Trade Journal', priority: 'nice-to-have' },
  { id: 'F115', category: 'Local Data', subcategory: 'Export', name: 'Social Media Cards', status: 'stubbed', uiPath: '/export-center', description: 'Generate shareable image cards', priority: 'nice-to-have' },

  // ============= 3. FINANCIAL TOOLS & CALCULATORS (201-300) =============
  
  // Calculators (201-210)
  { id: 'F201', category: 'Calculators', subcategory: 'Position', name: 'Position Sizing Calculator', status: 'implemented', uiPath: '/position-sizing', description: 'Fixed Fractional, Kelly Criterion', priority: 'critical' },
  { id: 'F202', category: 'Calculators', subcategory: 'Finance', name: 'Compound Interest Projector', status: 'stubbed', uiPath: '/calculators', description: 'Compound interest projections', priority: 'important' },
  { id: 'F203', category: 'Calculators', subcategory: 'Risk', name: 'Risk of Ruin Simulator', status: 'stubbed', uiPath: '/calculators', description: 'Calculate risk of account ruin', priority: 'important' },
  { id: 'F204', category: 'Calculators', subcategory: 'Trading', name: 'Break-Even Calculator', status: 'stubbed', uiPath: '/calculators', description: 'Including commissions/swap', priority: 'important' },
  { id: 'F205', category: 'Calculators', subcategory: 'Trading', name: 'Pip Value Calculator', status: 'stubbed', uiPath: '/calculators', description: 'Pip values for various pairs', priority: 'important' },
  { id: 'F206', category: 'Calculators', subcategory: 'Trading', name: 'Margin Calculator', status: 'stubbed', uiPath: '/calculators', description: 'Margin requirement calculations', priority: 'important' },
  { id: 'F207', category: 'Calculators', subcategory: 'Analysis', name: 'Fibonacci Calculator', status: 'stubbed', uiPath: '/calculators', description: 'Fibonacci retracement levels', priority: 'nice-to-have' },
  { id: 'F208', category: 'Calculators', subcategory: 'Analysis', name: 'Pivot Point Calculator', status: 'stubbed', uiPath: '/calculators', description: 'Standard, Woodie, Camarilla', priority: 'nice-to-have' },
  { id: 'F209', category: 'Calculators', subcategory: 'Risk', name: 'ATR Stop Loss Calculator', status: 'stubbed', uiPath: '/calculators', description: 'ATR-based stop loss levels', priority: 'important' },
  { id: 'F210', category: 'Calculators', subcategory: 'Strategy', name: 'DCA Simulator', status: 'stubbed', uiPath: '/calculators', description: 'Dollar cost averaging simulator', priority: 'nice-to-have' },
  
  // Simulation (211-215)
  { id: 'F211', category: 'Simulation', subcategory: 'Backtest', name: 'Manual Scalper Simulator', status: 'stubbed', uiPath: '/simulators', description: 'Replay historical data manually', priority: 'nice-to-have' },
  { id: 'F212', category: 'Simulation', subcategory: 'Risk', name: 'Monte Carlo Simulation', status: 'implemented', uiPath: '/analytics', description: 'Expected returns simulation', priority: 'critical' },
  { id: 'F213', category: 'Simulation', subcategory: 'Analysis', name: 'What-If Analysis', status: 'stubbed', uiPath: '/analytics', description: 'Modify past winrate scenarios', priority: 'important' },
  { id: 'F214', category: 'Simulation', subcategory: 'Risk', name: 'Strategy Stress Test', status: 'implemented', uiPath: '/stress-testing', description: 'Randomly invalidate X% of trades', priority: 'important' },
  { id: 'F215', category: 'Simulation', subcategory: 'Visualization', name: 'Equity Curve Simulator', status: 'stubbed', uiPath: '/simulators', description: 'Simulate future equity curves', priority: 'nice-to-have' },

  // ============= 4. TRADE JOURNAL & PSYCHOLOGY (301-400) =============
  
  { id: 'F301', category: 'Journal', subcategory: 'Editor', name: 'Rich Text Journal', status: 'implemented', uiPath: '/journal', description: 'Rich-text editor for entries', priority: 'critical' },
  { id: 'F302', category: 'Journal', subcategory: 'Psychology', name: 'Mood Tracker', status: 'stubbed', uiPath: '/journal', description: 'Emoji-based mood linked to trades', priority: 'important' },
  { id: 'F303', category: 'Journal', subcategory: 'Psychology', name: 'Mistake Tagger', status: 'stubbed', uiPath: '/journal', description: 'FOMO, Revenge, Early Exit tags', priority: 'important' },
  { id: 'F304', category: 'Journal', subcategory: 'Routine', name: 'Pre-Flight Checklist', status: 'stubbed', uiPath: '/journal', description: 'Daily trading checklist builder', priority: 'important' },
  { id: 'F305', category: 'Journal', subcategory: 'Learning', name: 'Lessons Database', status: 'stubbed', uiPath: '/journal', description: 'Searchable lessons learned', priority: 'important' },
  { id: 'F306', category: 'Journal', subcategory: 'Visualization', name: 'PnL Calendar Heatmap', status: 'stubbed', uiPath: '/journal', description: 'Calendar view of daily PnL', priority: 'important' },
  { id: 'F307', category: 'Journal', subcategory: 'Input', name: 'Voice-to-Text Notes', status: 'stubbed', uiPath: '/journal', description: 'Browser Speech API notes', priority: 'nice-to-have' },
  { id: 'F308', category: 'Journal', subcategory: 'Learning', name: 'Pattern Flashcards', status: 'stubbed', uiPath: '/tutorials', description: 'Flashcards for trading patterns', priority: 'nice-to-have' },
  { id: 'F309', category: 'Journal', subcategory: 'Productivity', name: 'Focus Timer', status: 'stubbed', uiPath: '/journal', description: 'Pomodoro timer for trading', priority: 'nice-to-have' },
  { id: 'F310', category: 'Journal', subcategory: 'Wellness', name: 'Breathing Exercise', status: 'stubbed', uiPath: '/journal', description: 'Stress relief breathing overlay', priority: 'nice-to-have' },

  // ============= 5. DEVELOPER & POWER USER (401-500) =============
  
  { id: 'F401', category: 'Dev Tools', subcategory: 'Automation', name: 'Rules Engine', status: 'stubbed', uiPath: '/dev-tools', description: 'If X > Y then Alert - local eval', priority: 'important' },
  { id: 'F402', category: 'Dev Tools', subcategory: 'Editor', name: 'JSON Editor', status: 'stubbed', uiPath: '/dev-tools', description: 'Raw data JSON manipulation', priority: 'important' },
  { id: 'F403', category: 'Dev Tools', subcategory: 'Testing', name: 'Regex Tester', status: 'stubbed', uiPath: '/dev-tools', description: 'Pattern matching tester', priority: 'nice-to-have' },
  { id: 'F404', category: 'Dev Tools', subcategory: 'Shortcuts', name: 'Keyboard Shortcut Mapper', status: 'implemented', uiPath: '/settings', description: 'Remap functionality shortcuts', priority: 'important' },
  { id: 'F405', category: 'Dev Tools', subcategory: 'State', name: 'URL Parameter Handling', status: 'stubbed', uiPath: '/', description: 'Deep linking state via URL', priority: 'nice-to-have' },
  { id: 'F406', category: 'Dev Tools', subcategory: 'Debug', name: 'LocalStorage Viewer', status: 'stubbed', uiPath: '/dev-tools', description: 'View/edit localStorage UI', priority: 'important' },
  { id: 'F407', category: 'Dev Tools', subcategory: 'Automation', name: 'Macro Recorder', status: 'stubbed', uiPath: '/dev-tools', description: 'Record repetitive UI tasks', priority: 'nice-to-have' },
  { id: 'F408', category: 'Dev Tools', subcategory: 'Data', name: 'CSV Data Cleaner', status: 'stubbed', uiPath: '/dev-tools', description: 'Remove duplicates, fix formats', priority: 'important' },
  { id: 'F409', category: 'Dev Tools', subcategory: 'Utilities', name: 'Timestamp Converter', status: 'stubbed', uiPath: '/dev-tools', description: 'Epoch to Human conversion', priority: 'nice-to-have' },
  { id: 'F410', category: 'Dev Tools', subcategory: 'Utilities', name: 'Base64 Encoder/Decoder', status: 'stubbed', uiPath: '/dev-tools', description: 'Base64 data sharing', priority: 'nice-to-have' },

  // ============= 6. VISUALIZATION ENHANCEMENTS (501-600) =============
  
  { id: 'F501', category: 'Visualization', subcategory: 'Charts', name: 'Candlestick Chart with Tools', status: 'stubbed', uiPath: '/analytics', description: 'Recharts/Canvas with drawing tools', priority: 'important' },
  { id: 'F502', category: 'Visualization', subcategory: 'Analysis', name: 'Correlation Matrix Heatmap', status: 'implemented', uiPath: '/analytics', description: 'Strategy correlation heatmap', priority: 'important' },
  { id: 'F503', category: 'Visualization', subcategory: 'Charts', name: 'Win/Loss Donut Charts', status: 'implemented', uiPath: '/analytics', description: 'Donut charts with drill-down', priority: 'important' },
  { id: 'F504', category: 'Visualization', subcategory: 'Flow', name: 'Sankey Diagram', status: 'stubbed', uiPath: '/analytics', description: 'Cashflow/PnL attribution', priority: 'nice-to-have' },
  { id: 'F505', category: 'Visualization', subcategory: 'Charts', name: 'Duration vs Profit Scatter', status: 'stubbed', uiPath: '/analytics', description: 'Trade duration vs profit scatter', priority: 'nice-to-have' },
  { id: 'F506', category: 'Visualization', subcategory: 'Time', name: 'Hour of Day Histogram', status: 'stubbed', uiPath: '/analytics', description: 'Performance by hour histogram', priority: 'important' },
  { id: 'F507', category: 'Visualization', subcategory: 'Time', name: 'Day of Week Radar', status: 'stubbed', uiPath: '/analytics', description: 'Performance by day radar chart', priority: 'important' },
  { id: 'F508', category: 'Visualization', subcategory: 'Charts', name: 'PnL vs Drawdown Area Chart', status: 'implemented', uiPath: '/analytics', description: 'Cumulative PnL vs drawdown', priority: 'important' },
  { id: 'F509', category: 'Visualization', subcategory: 'Comparison', name: 'Strategy Race Chart', status: 'stubbed', uiPath: '/analytics', description: 'Animated race chart comparison', priority: 'nice-to-have' },
  { id: 'F510', category: 'Visualization', subcategory: 'Logic', name: 'Decision Tree Visualizer', status: 'stubbed', uiPath: '/strategies', description: 'Interactive strategy logic tree', priority: 'nice-to-have' },
];

// ============= UTILITY FUNCTIONS =============

export function getFeaturesByCategory(category: string): Feature[] {
  return featureRegistry.filter(f => f.category === category);
}

export function getFeaturesByStatus(status: FeatureStatus): Feature[] {
  return featureRegistry.filter(f => f.status === status);
}

export function getFeaturesByPriority(priority: Feature['priority']): Feature[] {
  return featureRegistry.filter(f => f.priority === priority);
}

export function getFeatureStats() {
  const total = featureRegistry.length;
  const implemented = featureRegistry.filter(f => f.status === 'implemented').length;
  const stubbed = featureRegistry.filter(f => f.status === 'stubbed').length;
  const notStarted = featureRegistry.filter(f => f.status === 'not-started').length;
  
  return {
    total,
    implemented,
    stubbed,
    notStarted,
    implementedPct: Math.round((implemented / total) * 100),
    stubbedPct: Math.round((stubbed / total) * 100),
  };
}

export function getCategories(): string[] {
  return [...new Set(featureRegistry.map(f => f.category))];
}

export function getSubcategories(category: string): string[] {
  return [...new Set(
    featureRegistry
      .filter(f => f.category === category && f.subcategory)
      .map(f => f.subcategory as string)
  )];
}

// Local storage key for user-modified feature statuses
const FEATURE_STATUS_KEY = 'mmc_feature_status_overrides';

export function getFeatureStatusOverrides(): Record<string, FeatureStatus> {
  try {
    const stored = localStorage.getItem(FEATURE_STATUS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function setFeatureStatusOverride(featureId: string, status: FeatureStatus): void {
  const overrides = getFeatureStatusOverrides();
  overrides[featureId] = status;
  localStorage.setItem(FEATURE_STATUS_KEY, JSON.stringify(overrides));
}

export function getEffectiveFeatureStatus(featureId: string): FeatureStatus {
  const overrides = getFeatureStatusOverrides();
  if (overrides[featureId]) {
    return overrides[featureId];
  }
  const feature = featureRegistry.find(f => f.id === featureId);
  return feature?.status || 'not-started';
}
