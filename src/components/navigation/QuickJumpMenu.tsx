/**
 * Quick Jump Menu - P0 UX
 * Cmd+K command palette with fuzzy search and page previews
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  FileText,
  Activity,
  BarChart3,
  Settings,
  Target,
  BookOpen,
  FlaskConical,
  TrendingUp,
  Shield,
  Bot,
  Briefcase,
  PieChart,
  Zap,
  Cloud,
  Users,
  ScrollText,
  Bell,
  Store,
  Search,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PageInfo {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: string;
  keywords: string[];
  description: string;
  preview?: string;
}

const PAGES: PageInfo[] = [
  { path: '/', label: 'Home', icon: LayoutDashboard, section: 'Core', keywords: ['home', 'start', 'landing'], description: 'Main landing page', preview: 'Dashboard overview and quick actions' },
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3, section: 'Core', keywords: ['overview', 'stats', 'metrics'], description: 'Performance overview', preview: 'View your trading stats and performance metrics' },
  { path: '/data', label: 'Data Manager', icon: Database, section: 'Core', keywords: ['import', 'csv', 'upload', 'dataset'], description: 'Manage datasets', preview: 'Import, organize and manage your market data' },
  { path: '/workflow', label: 'Backtest Workflow', icon: Activity, section: 'Core', keywords: ['run', 'test', 'strategy', 'execute'], description: 'Run backtests', preview: 'Execute and configure backtest runs' },
  { path: '/saved-results', label: 'Saved Results', icon: FileText, section: 'Core', keywords: ['results', 'trades', 'history'], description: 'View past results', preview: 'Browse and compare saved backtest results' },
  { path: '/reports', label: 'Reports', icon: FileText, section: 'Core', keywords: ['pdf', 'export', 'generate'], description: 'Generate reports', preview: 'Create professional PDF reports' },
  { path: '/scanner', label: 'Scanner', icon: Target, section: 'Core', keywords: ['scan', 'search', 'find'], description: 'Scan strategies', preview: 'Batch scan multiple strategies at once' },
  
  { path: '/strategies', label: 'Strategy Library', icon: BookOpen, section: 'Strategy', keywords: ['code', 'ea', 'mql'], description: 'Manage strategies', preview: 'Browse and edit your trading strategies' },
  { path: '/optimizer', label: 'Optimizer', icon: FlaskConical, section: 'Strategy', keywords: ['optimize', 'params', 'genetic'], description: 'Optimize parameters', preview: 'Find optimal strategy parameters' },
  { path: '/walk-forward', label: 'Walk-Forward', icon: TrendingUp, section: 'Strategy', keywords: ['analysis', 'validation'], description: 'Walk-forward analysis', preview: 'Validate strategy robustness over time' },
  { path: '/templates', label: 'Templates', icon: BookOpen, section: 'Strategy', keywords: ['presets', 'templates'], description: 'Workflow templates', preview: 'Quick start with pre-built templates' },
  
  { path: '/sentinel', label: 'Sentinel AI', icon: Bot, section: 'Advanced', keywords: ['ai', 'assistant', 'chat'], description: 'AI Assistant', preview: 'Get AI-powered trading insights' },
  { path: '/analytics', label: 'Analytics', icon: BarChart3, section: 'Advanced', keywords: ['charts', 'metrics', 'analysis'], description: 'Advanced analytics', preview: 'Deep dive into performance analytics' },
  { path: '/portfolio', label: 'Portfolio Builder', icon: Briefcase, section: 'Advanced', keywords: ['combine', 'portfolio'], description: 'Build portfolios', preview: 'Combine strategies into portfolios' },
  { path: '/risk-dashboard', label: 'Risk Dashboard', icon: PieChart, section: 'Advanced', keywords: ['risk', 'var', 'drawdown'], description: 'Risk analysis', preview: 'Monitor and analyze risk metrics' },
  { path: '/execution', label: 'Execution Bridge', icon: Zap, section: 'Advanced', keywords: ['live', 'trade', 'broker'], description: 'Live execution', preview: 'Connect to brokers for live trading' },
  
  { path: '/settings', label: 'Settings', icon: Settings, section: 'System', keywords: ['config', 'preferences', 'options'], description: 'App settings', preview: 'Configure app preferences' },
  { path: '/cloud-sync', label: 'Cloud Sync', icon: Cloud, section: 'System', keywords: ['sync', 'backup', 'cloud'], description: 'Cloud backup', preview: 'Sync data across devices' },
  { path: '/workspace', label: 'Workspace', icon: Users, section: 'System', keywords: ['team', 'collaboration'], description: 'Team workspace', preview: 'Collaborate with your team' },
  { path: '/logs', label: 'Logs', icon: ScrollText, section: 'System', keywords: ['debug', 'errors', 'history'], description: 'System logs', preview: 'View application logs' },
  { path: '/alerts', label: 'Alerts', icon: Bell, section: 'System', keywords: ['notifications', 'alerts'], description: 'Manage alerts', preview: 'Configure trading alerts' },
  { path: '/marketplace', label: 'Marketplace', icon: Store, section: 'System', keywords: ['store', 'buy', 'sell'], description: 'Strategy store', preview: 'Browse and share strategies' },
];

// Get recent pages from localStorage
const getRecentPages = (): string[] => {
  try {
    const stored = localStorage.getItem('recent-search-pages');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addRecentPage = (path: string) => {
  try {
    const recent = getRecentPages().filter(p => p !== path);
    recent.unshift(path);
    localStorage.setItem('recent-search-pages', JSON.stringify(recent.slice(0, 5)));
  } catch {
    // ignore
  }
};

export function QuickJumpMenu() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [open]);

  const handleSelect = useCallback((path: string) => {
    addRecentPage(path);
    navigate(path);
    setOpen(false);
  }, [navigate]);

  // Filter and rank pages based on search
  const filteredPages = useMemo(() => {
    if (!search.trim()) {
      // Show recent pages first when no search
      const recent = getRecentPages();
      const recentPages = recent
        .map(path => PAGES.find(p => p.path === path))
        .filter(Boolean) as PageInfo[];
      
      return {
        recent: recentPages,
        suggested: PAGES.filter(p => !recent.includes(p.path)).slice(0, 6),
        all: [],
      };
    }

    const query = search.toLowerCase();
    const scored = PAGES.map(page => {
      let score = 0;
      
      // Exact label match
      if (page.label.toLowerCase() === query) score += 100;
      // Label starts with query
      else if (page.label.toLowerCase().startsWith(query)) score += 50;
      // Label contains query
      else if (page.label.toLowerCase().includes(query)) score += 30;
      
      // Keyword matches
      page.keywords.forEach(kw => {
        if (kw === query) score += 40;
        else if (kw.startsWith(query)) score += 20;
        else if (kw.includes(query)) score += 10;
      });
      
      // Description match
      if (page.description.toLowerCase().includes(query)) score += 5;
      
      return { ...page, score };
    })
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score);

    return {
      recent: [],
      suggested: [],
      all: scored,
    };
  }, [search]);

  const allResults = [
    ...filteredPages.recent,
    ...filteredPages.suggested,
    ...filteredPages.all,
  ];

  const selectedPage = allResults[selectedIndex];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="flex">
        {/* Main search area */}
        <div className="flex-1 min-w-0">
          <CommandInput 
            placeholder="Search pages, features, actions..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[350px]">
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                <Search className="h-8 w-8 opacity-50" />
                <p>No pages found for "{search}"</p>
                <p className="text-xs">Try different keywords</p>
              </div>
            </CommandEmpty>
            
            {/* Recent Pages */}
            {filteredPages.recent.length > 0 && (
              <>
                <CommandGroup heading={
                  <span className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Recent
                  </span>
                }>
                  {filteredPages.recent.map((page, idx) => (
                    <CommandItem
                      key={`recent-${page.path}`}
                      value={`${page.label} ${page.keywords.join(' ')}`}
                      onSelect={() => handleSelect(page.path)}
                      className={cn(
                        "flex items-center gap-3 cursor-pointer group",
                        selectedIndex === idx && "bg-primary/10"
                      )}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/50 group-hover:bg-primary/10 transition-colors">
                        <page.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{page.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{page.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            
            {/* Suggested Pages */}
            {filteredPages.suggested.length > 0 && (
              <>
                <CommandGroup heading={
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3" />
                    Suggested
                  </span>
                }>
                  {filteredPages.suggested.map((page, idx) => {
                    const actualIdx = filteredPages.recent.length + idx;
                    return (
                      <CommandItem
                        key={`suggested-${page.path}`}
                        value={`${page.label} ${page.keywords.join(' ')}`}
                        onSelect={() => handleSelect(page.path)}
                        className={cn(
                          "flex items-center gap-3 cursor-pointer group",
                          selectedIndex === actualIdx && "bg-primary/10"
                        )}
                        onMouseEnter={() => setSelectedIndex(actualIdx)}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/50 group-hover:bg-primary/10 transition-colors">
                          <page.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{page.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{page.description}</p>
                        </div>
                        <Badge variant="outline" className="text-[9px] opacity-60">{page.section}</Badge>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
            
            {/* Search Results */}
            {filteredPages.all.length > 0 && (
              <CommandGroup heading="Search Results">
                {filteredPages.all.map((page, idx) => {
                  const actualIdx = filteredPages.recent.length + filteredPages.suggested.length + idx;
                  return (
                    <CommandItem
                      key={`result-${page.path}`}
                      value={`${page.label} ${page.keywords.join(' ')}`}
                      onSelect={() => handleSelect(page.path)}
                      className={cn(
                        "flex items-center gap-3 cursor-pointer group",
                        selectedIndex === actualIdx && "bg-primary/10"
                      )}
                      onMouseEnter={() => setSelectedIndex(actualIdx)}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/50 group-hover:bg-primary/10 transition-colors">
                        <page.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{page.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{page.description}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] opacity-60">{page.section}</Badge>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </div>

        {/* Preview Panel */}
        {selectedPage && (
          <div className="hidden md:flex w-64 border-l border-border/50 p-4 flex-col gap-3 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <selectedPage.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{selectedPage.label}</h3>
                <p className="text-xs text-muted-foreground">{selectedPage.section}</p>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {selectedPage.preview || selectedPage.description}
            </p>
            
            <div className="mt-auto pt-3 border-t border-border/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">Enter</kbd>
                <span>to open</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 text-xs text-muted-foreground bg-muted/10">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-background rounded border text-[10px]">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-background rounded border text-[10px]">Enter</kbd>
            Open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-background rounded border text-[10px]">Esc</kbd>
            Close
          </span>
        </div>
        <span>⌘K to toggle</span>
      </div>
    </CommandDialog>
  );
}

// Trigger button for sidebar
export function QuickJumpTrigger({ collapsed = false }: { collapsed?: boolean }) {
  const handleClick = () => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  if (collapsed) {
    return (
      <button
        onClick={handleClick}
        className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
        aria-label="Quick search"
      >
        <Search className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-foreground text-sm transition-colors"
    >
      <Search className="h-4 w-4" />
      <span className="flex-1 text-left">Quick Jump...</span>
      <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}