/**
 * Spotlight Search (Cmd+K) — Fuzzy search across all app pages
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, BarChart3, Brain, Database, Settings, FileText, Activity,
  Target, Layers, Shield, Zap, Trophy, Calendar, Cpu, Globe,
  BookOpen, Play, LineChart, FlaskConical, Dna, Gauge, Award,
  Bot, Smartphone, Users, Rocket, PenLine, TrendingUp, ArrowRight,
  Command
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchItem {
  title: string;
  path: string;
  icon: React.ElementType;
  category: string;
  keywords: string[];
}

const SEARCH_INDEX: SearchItem[] = [
  // Core
  { title: 'Home', path: '/', icon: Rocket, category: 'Start', keywords: ['home', 'dashboard', 'start'] },
  { title: 'Trading Dashboard', path: '/trading-dashboard', icon: Activity, category: 'Trading', keywords: ['trading', 'pnl', 'equity', 'kpi'] },
  { title: 'Dashboard', path: '/dashboard', icon: BarChart3, category: 'Start', keywords: ['dashboard', 'overview'] },
  
  // Build
  { title: 'Workflow', path: '/workflow', icon: Play, category: 'Build', keywords: ['workflow', 'backtest', 'run'] },
  { title: 'Strategy Library', path: '/strategies', icon: Brain, category: 'Build', keywords: ['strategy', 'strategies', 'library', 'code'] },
  { title: 'Optimizer', path: '/optimizer', icon: Target, category: 'Build', keywords: ['optimizer', 'optimize', 'parameters'] },
  { title: 'Advanced Optimizer', path: '/advanced-optimizer', icon: Dna, category: 'Build', keywords: ['genetic', 'advanced', 'optimizer'] },
  { title: 'Walk-Forward Analysis', path: '/walk-forward', icon: LineChart, category: 'Build', keywords: ['walk', 'forward', 'out-of-sample'] },
  { title: 'Bulk Tester', path: '/bulk-tester', icon: Layers, category: 'Build', keywords: ['bulk', 'batch', 'tester', 'mass'] },
  
  // Data
  { title: 'Data Manager', path: '/data', icon: Database, category: 'Data', keywords: ['data', 'import', 'csv', 'dataset'] },
  { title: 'Cloud Sync', path: '/cloud-sync', icon: Globe, category: 'Data', keywords: ['cloud', 'sync', 'backup'] },
  
  // Analytics
  { title: 'Analytics', path: '/analytics', icon: BarChart3, category: 'Analytics', keywords: ['analytics', 'stats', 'performance'] },
  { title: 'Advanced Analytics', path: '/advanced-analytics', icon: Gauge, category: 'Analytics', keywords: ['advanced', 'analytics', 'deep'] },
  { title: 'Portfolio Builder', path: '/portfolio', icon: Layers, category: 'Analytics', keywords: ['portfolio', 'multi-strategy'] },
  { title: 'Saved Results', path: '/saved-results', icon: FileText, category: 'Analytics', keywords: ['saved', 'results', 'history'] },
  { title: 'Quick Compare', path: '/quick-compare', icon: BarChart3, category: 'Analytics', keywords: ['compare', 'diff', 'side-by-side'] },
  { title: 'Tearsheet', path: '/tearsheet', icon: FileText, category: 'Analytics', keywords: ['tearsheet', 'report', 'summary'] },
  
  // Trading
  { title: 'Trades', path: '/trades', icon: TrendingUp, category: 'Trading', keywords: ['trades', 'import', 'log', 'journal'] },
  { title: 'Trade Reports', path: '/trade-reports', icon: FileText, category: 'Trading', keywords: ['reports', 'trade', 'export'] },
  { title: 'Pattern Recognition', path: '/pattern-recognition', icon: Brain, category: 'Trading', keywords: ['pattern', 'recognition', 'edge'] },
  { title: 'Playbook', path: '/playbook', icon: BookOpen, category: 'Trading', keywords: ['playbook', 'ai', 'patterns'] },
  { title: 'Pre-Trade Check', path: '/pre-trade-check', icon: Shield, category: 'Trading', keywords: ['pre-trade', 'check', 'checklist'] },
  { title: 'Live Tracker', path: '/live-tracker', icon: Activity, category: 'Trading', keywords: ['live', 'tracker', 'realtime'] },
  { title: 'Prop Firm Tracker', path: '/prop-firm', icon: Trophy, category: 'Trading', keywords: ['prop', 'firm', 'challenge', 'ftmo'] },
  
  // Journal
  { title: 'Trade Journal', path: '/journal', icon: Calendar, category: 'Journal', keywords: ['journal', 'diary', 'mood', 'review'] },
  { title: 'Notebook', path: '/notebook', icon: PenLine, category: 'Journal', keywords: ['notebook', 'notes', 'ideas'] },
  
  // AI
  { title: 'AI Copilot', path: '/ai-copilot', icon: Bot, category: 'AI', keywords: ['ai', 'copilot', 'chat', 'ask'] },
  { title: 'AI Insights', path: '/ai', icon: Zap, category: 'AI', keywords: ['ai', 'insights', 'suggestions'] },
  { title: 'Growth Roadmap', path: '/growth-roadmap', icon: Rocket, category: 'AI', keywords: ['growth', 'roadmap', 'goals'] },
  { title: 'Behavioral Diagnostics', path: '/diagnostics', icon: Brain, category: 'AI', keywords: ['behavioral', 'diagnostics', 'psychology', 'tilt'] },
  
  // Risk
  { title: 'Risk Dashboard', path: '/risk-dashboard', icon: Shield, category: 'Risk', keywords: ['risk', 'dashboard', 'drawdown'] },
  { title: 'Position Sizing', path: '/position-sizing', icon: Target, category: 'Risk', keywords: ['position', 'sizing', 'kelly'] },
  { title: 'Risk Tools', path: '/risk-tools', icon: Shield, category: 'Risk', keywords: ['risk', 'tools', 'calculator'] },
  { title: 'Stress Testing', path: '/stress-testing', icon: FlaskConical, category: 'Risk', keywords: ['stress', 'test', 'monte carlo'] },
  { title: 'Calculators', path: '/calculators', icon: Cpu, category: 'Risk', keywords: ['calculator', 'pip', 'lot', 'margin'] },
  
  // MT5
  { title: 'MT5 Hub', path: '/mt5-hub', icon: Smartphone, category: 'MT5', keywords: ['mt5', 'metatrader', 'hub'] },
  { title: 'MT5 Sync', path: '/mt5-sync', icon: Globe, category: 'MT5', keywords: ['mt5', 'sync', 'auto'] },
  { title: 'EA Manager', path: '/ea-manager', icon: Cpu, category: 'MT5', keywords: ['ea', 'expert', 'advisor'] },
  { title: 'Runners', path: '/runners', icon: Zap, category: 'MT5', keywords: ['runner', 'vps', 'terminal'] },
  
  // Community
  { title: 'Leaderboard', path: '/leaderboard', icon: Trophy, category: 'Community', keywords: ['leaderboard', 'rank', 'top'] },
  { title: 'Marketplace', path: '/marketplace', icon: Globe, category: 'Community', keywords: ['marketplace', 'store', 'buy'] },
  { title: 'Achievements', path: '/achievements', icon: Award, category: 'Community', keywords: ['achievements', 'badges', 'xp'] },
  
  // Settings
  { title: 'Settings', path: '/settings', icon: Settings, category: 'System', keywords: ['settings', 'preferences', 'config'] },
  { title: 'Profile', path: '/profile', icon: Users, category: 'System', keywords: ['profile', 'account', 'user'] },
  { title: 'Help Center', path: '/help', icon: BookOpen, category: 'System', keywords: ['help', 'docs', 'support', 'faq'] },
  { title: 'Workspace', path: '/workspace', icon: Users, category: 'System', keywords: ['workspace', 'team', 'collaborate'] },
  { title: 'Export Center', path: '/export-center', icon: FileText, category: 'System', keywords: ['export', 'download', 'pdf'] },
];

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (lower.includes(q)) return true;
  // Simple fuzzy: all chars of query appear in order
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function SpotlightSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return SEARCH_INDEX.slice(0, 8);
    return SEARCH_INDEX.filter(item =>
      fuzzyMatch(item.title, query) ||
      item.keywords.some(k => fuzzyMatch(k, query)) ||
      fuzzyMatch(item.category, query)
    ).slice(0, 12);
  }, [query]);

  const handleSelect = useCallback((item: SearchItem) => {
    navigate(item.path);
    setOpen(false);
    setQuery('');
  }, [navigate]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Arrow key navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  }, [results, selectedIndex, handleSelect]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Group results by category
  const grouped = useMemo(() => {
    const map = new Map<string, SearchItem[]>();
    results.forEach(item => {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    });
    return map;
  }, [results]);

  let flatIndex = -1;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-background/60 backdrop-blur-sm"
            onClick={() => { setOpen(false); setQuery(''); }}
          />
          
          {/* Search Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed top-[15vh] left-1/2 -translate-x-1/2 z-[101] w-[90vw] max-w-lg"
          >
            <div className="bg-card border border-border rounded-xl shadow-elevation-5 overflow-hidden">
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pages, tools, features..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  autoComplete="off"
                  spellCheck={false}
                />
                <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
                {results.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No results for "{query}"
                  </div>
                ) : (
                  Array.from(grouped.entries()).map(([category, items]) => (
                    <div key={category}>
                      <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{category}</p>
                      {items.map(item => {
                        flatIndex++;
                        const idx = flatIndex;
                        return (
                          <button
                            key={item.path}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                              selectedIndex === idx
                                ? 'bg-primary/10 text-foreground'
                                : 'text-muted-foreground hover:bg-muted/40'
                            )}
                          >
                            <item.icon className={cn(
                              'h-4 w-4 shrink-0',
                              selectedIndex === idx ? 'text-primary' : 'text-muted-foreground'
                            )} />
                            <span className="text-sm font-medium flex-1">{item.title}</span>
                            {selectedIndex === idx && (
                              <ArrowRight className="h-3.5 w-3.5 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="bg-muted px-1 py-0.5 rounded font-mono">↑↓</kbd> Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="bg-muted px-1 py-0.5 rounded font-mono">↵</kbd> Open
                  </span>
                </div>
                <span>{results.length} results</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Trigger button for the search
export function SpotlightTrigger({ className }: { className?: string }) {
  return (
    <button
      onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors text-sm',
        className
      )}
    >
      <Search className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono ml-2">
        <Command className="h-2.5 w-2.5" />K
      </kbd>
    </button>
  );
}
