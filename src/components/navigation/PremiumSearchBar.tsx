/**
 * Premium Search Bar Component
 * World-class UX with animations, glassmorphism, and quick actions
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Command, 
  Sparkles, 
  Clock, 
  ArrowRight,
  LayoutDashboard,
  Database,
  Activity,
  Settings,
  FileText,
  Brain,
  TrendingUp,
  Target,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticFeedback } from '@/lib/haptics';

interface QuickAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  keywords?: string[];
  badge?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', keywords: ['home', 'overview'] },
  { icon: Database, label: 'Data Manager', path: '/data', keywords: ['import', 'csv', 'dataset'] },
  { icon: Activity, label: 'Backtest', path: '/workflow', keywords: ['run', 'test'] },
  { icon: FileText, label: 'Results', path: '/saved-results', keywords: ['saved', 'history'] },
  { icon: Brain, label: 'Sentinel AI', path: '/sentinel', keywords: ['ai', 'chat'], badge: 'AI' },
  { icon: TrendingUp, label: 'Walk-Forward', path: '/walk-forward', keywords: ['optimize'] },
  { icon: Target, label: 'Scanner', path: '/scanner', keywords: ['scan', 'filter'] },
  { icon: Settings, label: 'Settings', path: '/settings', keywords: ['config', 'preferences'] },
];

const RECENT_PAGES_KEY = 'mmc-recent-pages';

export function PremiumSearchBar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [recentPages, setRecentPages] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load recent pages
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_PAGES_KEY);
      if (stored) {
        setRecentPages(JSON.parse(stored).slice(0, 3));
      }
    } catch {
      // ignore
    }
  }, [isExpanded]);

  // Filter actions based on query
  const filteredActions = useMemo(() => {
    if (!query.trim()) return QUICK_ACTIONS.slice(0, 5);
    const q = query.toLowerCase();
    return QUICK_ACTIONS.filter(action => 
      action.label.toLowerCase().includes(q) ||
      action.keywords?.some(k => k.includes(q))
    );
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredActions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredActions[selectedIndex]) {
      e.preventDefault();
      hapticFeedback('selection');
      navigate(filteredActions[selectedIndex].path);
      setIsExpanded(false);
      setQuery('');
    } else if (e.key === 'Escape') {
      setIsExpanded(false);
      setQuery('');
    }
  }, [filteredActions, selectedIndex, navigate]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        hapticFeedback('light');
        setIsExpanded(true);
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleExpand = () => {
    hapticFeedback('light');
    setIsExpanded(true);
  };

  const handleNavigate = (path: string) => {
    hapticFeedback('selection');
    navigate(path);
    setIsExpanded(false);
    setQuery('');
    
    // Save to recent
    try {
      const stored = localStorage.getItem(RECENT_PAGES_KEY);
      const recent = stored ? JSON.parse(stored) : [];
      const updated = [path, ...recent.filter((p: string) => p !== path)].slice(0, 5);
      localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl min-w-0">
      {/* Collapsed State - Premium Button */}
      <button
        onClick={handleExpand}
        className={cn(
          "w-full flex items-center gap-3 h-10 px-4 rounded-xl transition-all duration-300",
          "bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50",
          "border border-border/50 hover:border-primary/30",
          "hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)] hover:bg-muted/60",
          "group active:scale-[0.98]",
          isExpanded && "opacity-0 pointer-events-none"
        )}
      >
        <div className="relative">
          <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          <Sparkles className="h-2.5 w-2.5 absolute -top-1 -right-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <span className="flex-1 text-left text-sm text-muted-foreground truncate">
          Search pages, actions...
        </span>
        <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded-lg border border-border/50 bg-background/80 px-2 font-mono text-[11px] font-medium text-muted-foreground shadow-sm">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      {/* Expanded State - Premium Search Panel */}
      {isExpanded && (
        <div className="absolute top-0 left-0 right-0 z-50 animate-scale-in">
          <div className="bg-popover/95 backdrop-blur-xl rounded-xl border border-border/50 shadow-2xl shadow-black/20 overflow-hidden">
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
              <Search className="h-4 w-4 text-primary shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, actions, settings..."
                className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              />
              <button 
                onClick={() => { setIsExpanded(false); setQuery(''); }}
                className="p-1 rounded-md hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="py-2 max-h-[300px] overflow-y-auto">
              {!query && recentPages.length > 0 && (
                <div className="px-3 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">
                    Recent
                  </p>
                  {recentPages.map((path, idx) => {
                    const action = QUICK_ACTIONS.find(a => a.path === path);
                    if (!action) return null;
                    const Icon = action.icon;
                    return (
                      <button
                        key={path}
                        onClick={() => handleNavigate(path)}
                        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 active:scale-[0.98] transition-all text-left group"
                      >
                        <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-primary/10 transition-colors">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <span className="flex-1 text-sm">{action.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="px-3 py-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">
                  {query ? 'Results' : 'Quick Access'}
                </p>
                {filteredActions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No results found</p>
                ) : (
                  filteredActions.map((action, idx) => {
                    const Icon = action.icon;
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={action.path}
                        onClick={() => handleNavigate(action.path)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={cn(
                          "w-full flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all text-left group active:scale-[0.98]",
                          isSelected 
                            ? "bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.1)]" 
                            : "hover:bg-muted/50"
                        )}
                      >
                        <div className={cn(
                          "p-1.5 rounded-md transition-colors",
                          isSelected 
                            ? "bg-primary/20 text-primary" 
                            : "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className={cn(
                          "flex-1 text-sm font-medium",
                          isSelected && "text-primary"
                        )}>
                          {action.label}
                        </span>
                        {action.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20">
                            {action.badge}
                          </span>
                        )}
                        <ArrowRight className={cn(
                          "h-3.5 w-3.5 transition-all",
                          isSelected 
                            ? "text-primary opacity-100 translate-x-0" 
                            : "text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
                        )} />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer Hint */}
            <div className="px-4 py-2 border-t border-border/30 bg-muted/20 flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/50">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/50">↵</kbd>
                  Open
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/50">Esc</kbd>
                Close
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
