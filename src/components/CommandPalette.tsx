/**
 * Command Palette Component V3.0
 * Enhanced with search, actions, and quick commands
 * Spec: UI/UX - command palette (Ctrl/Cmd+K)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Activity,
  Database,
  BookOpen,
  FlaskConical,
  BarChart3,
  FileText,
  Settings,
  ScrollText,
  HelpCircle,
  Search,
  Play,
  Upload,
  Download,
  Moon,
  Sun,
  Keyboard,
  GitMerge,
  TrendingUp,
  Wallet,
  Award,
  Users,
  Zap,
  LayoutDashboard,
  AlertTriangle,
  Target,
  Layers,
  RefreshCw,
  Save,
  FolderOpen,
  Trash2,
  Plus,
} from 'lucide-react';
import { db } from '@/db/index';

interface CommandItemType {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  keywords?: string[];
  action: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [recentDatasets, setRecentDatasets] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      
      // Number keys for quick navigation (when not in input)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      
      if (e.key >= '1' && e.key <= '9' && !e.metaKey && !e.ctrlKey) {
        const routes = ['/workflow', '/data', '/strategies', '/backtests', '/optimizer', '/walk-forward', '/analytics', '/settings', '/logs'];
        const idx = parseInt(e.key) - 1;
        if (idx < routes.length) {
          e.preventDefault();
          navigate(routes[idx]);
        }
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [navigate]);

  // Load recent datasets for quick access
  useEffect(() => {
    db.datasets.orderBy('createdAt').reverse().limit(5).toArray().then(datasets => {
      setRecentDatasets(datasets.map(d => d.name));
    });
  }, [open]);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    setSearch('');
    command();
  }, []);

  const navigationItems: CommandItemType[] = useMemo(() => [
    { icon: Activity, label: 'Workflow', shortcut: '1', keywords: ['home', 'main', 'backtest'], action: () => navigate('/workflow') },
    { icon: Database, label: 'Data Manager', shortcut: '2', keywords: ['import', 'csv', 'ohlcv', 'dataset'], action: () => navigate('/data') },
    { icon: BookOpen, label: 'Strategy Library', shortcut: '3', keywords: ['strategies', 'code', 'algo'], action: () => navigate('/strategies') },
    { icon: Play, label: 'Backtests', shortcut: '4', keywords: ['run', 'test', 'simulate'], action: () => navigate('/backtests') },
    { icon: FlaskConical, label: 'Optimizer', shortcut: '5', keywords: ['grid', 'optimize', 'parameters'], action: () => navigate('/optimizer') },
    { icon: RefreshCw, label: 'Walk-Forward', shortcut: '6', keywords: ['robustness', 'overfit', 'train'], action: () => navigate('/walk-forward') },
    { icon: BarChart3, label: 'Analytics', shortcut: '7', keywords: ['reports', 'charts', 'metrics'], action: () => navigate('/analytics') },
    { icon: Settings, label: 'Settings', shortcut: ',', keywords: ['config', 'preferences'], action: () => navigate('/settings') },
    { icon: ScrollText, label: 'Logs', shortcut: 'L', keywords: ['debug', 'errors', 'history'], action: () => navigate('/logs') },
    { icon: HelpCircle, label: 'Help & Docs', shortcut: '?', keywords: ['help', 'documentation', 'guide'], action: () => navigate('/help/offline') },
  ], [navigate]);

  const advancedPages: CommandItemType[] = useMemo(() => [
    { icon: LayoutDashboard, label: 'Dashboard', keywords: ['overview', 'summary'], action: () => navigate('/dashboard') },
    { icon: TrendingUp, label: 'Advanced Analytics', keywords: ['deep', 'detailed'], action: () => navigate('/advanced-analytics') },
    { icon: AlertTriangle, label: 'Risk Dashboard', keywords: ['risk', 'exposure', 'var'], action: () => navigate('/risk') },
    { icon: Layers, label: 'Portfolio Builder', keywords: ['multi', 'allocation'], action: () => navigate('/portfolio') },
    { icon: Target, label: 'Position Sizing', keywords: ['kelly', 'risk', 'sizing'], action: () => navigate('/position-sizing') },
    { icon: Zap, label: 'Stress Testing', keywords: ['monte', 'simulation'], action: () => navigate('/stress-testing') },
    { icon: Award, label: 'Achievements', keywords: ['badges', 'progress'], action: () => navigate('/achievements') },
    { icon: Users, label: 'Leaderboard', keywords: ['rank', 'compare'], action: () => navigate('/leaderboard') },
  ], [navigate]);

  const actionItems: CommandItemType[] = useMemo(() => [
    { icon: Upload, label: 'Import CSV Data', keywords: ['upload', 'file', 'add'], action: () => navigate('/data') },
    { icon: Download, label: 'Export Results', keywords: ['save', 'pdf', 'excel'], action: () => navigate('/analytics') },
    { icon: Play, label: 'Run Backtest', keywords: ['start', 'execute'], action: () => navigate('/workflow') },
    { icon: GitMerge, label: 'Merge Datasets', keywords: ['combine', 'stitch'], action: () => navigate('/data') },
    { icon: Plus, label: 'New Strategy', keywords: ['create', 'add'], action: () => navigate('/strategies') },
    { icon: Save, label: 'Save Current Work', shortcut: 'Ctrl+S', keywords: ['persist'], action: () => {} },
    { icon: Keyboard, label: 'Keyboard Shortcuts', shortcut: '?', keywords: ['keys', 'hotkeys'], action: () => {
      const event = new KeyboardEvent('keydown', { key: '?', bubbles: true });
      document.dispatchEvent(event);
    }},
  ], [navigate]);

  // Filter items based on search
  const filteredNavigation = useMemo(() => 
    navigationItems.filter(item => 
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.keywords?.some(k => k.includes(search.toLowerCase()))
    ),
  [navigationItems, search]);

  const filteredAdvanced = useMemo(() => 
    advancedPages.filter(item => 
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.keywords?.some(k => k.includes(search.toLowerCase()))
    ),
  [advancedPages, search]);

  const filteredActions = useMemo(() => 
    actionItems.filter(item => 
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.keywords?.some(k => k.includes(search.toLowerCase()))
    ),
  [actionItems, search]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Type a command or search..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>No results found.</CommandEmpty>
        
        {/* Quick Access - Recent Datasets */}
        {search === '' && recentDatasets.length > 0 && (
          <>
            <CommandGroup heading="Recent Datasets">
              {recentDatasets.slice(0, 3).map((name) => (
                <CommandItem
                  key={name}
                  onSelect={() => runCommand(() => navigate('/data'))}
                  className="gap-3"
                >
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        
        <CommandGroup heading="Navigation">
          {filteredNavigation.map((item) => (
            <CommandItem
              key={item.label}
              onSelect={() => runCommand(item.action)}
              className="gap-3"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
              {item.shortcut && (
                <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  {item.shortcut}
                </kbd>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        {filteredAdvanced.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Advanced">
              {filteredAdvanced.map((item) => (
                <CommandItem
                  key={item.label}
                  onSelect={() => runCommand(item.action)}
                  className="gap-3"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="Actions">
          {filteredActions.map((item) => (
            <CommandItem
              key={item.label}
              onSelect={() => runCommand(item.action)}
              className="gap-3"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
              {item.shortcut && (
                <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  {item.shortcut}
                </kbd>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
