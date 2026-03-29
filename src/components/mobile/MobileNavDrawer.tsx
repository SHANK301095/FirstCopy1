/**
 * Mobile Navigation Drawer - V6 Clean IA
 * Matches desktop sidebar: 10 focused sections
 */

import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Monitor, Activity,
  BookOpen, Database, FlaskConical, TrendingUp, FileText, Layers, Crosshair,
  Shield, Globe, Zap, Bell, Trophy, Briefcase,
  ScrollText, Bot, Brain, BarChart3, Stethoscope, ClipboardCheck, Milestone,
  Settings, Calculator, Target, Download, User,
  X, Sparkles, Store, GraduationCap, Medal, AreaChart, LineChart, Gauge, Dices
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import mmcLogo from '@/assets/mmc-logo.png';

interface NavGroup {
  title: string;
  icon: React.ElementType;
  items: {
    title: string;
    href: string;
    icon: React.ElementType;
    isPremium?: boolean;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { title: 'Home', href: '/', icon: LayoutDashboard },
      { title: 'Command Center', href: '/command-center', icon: Monitor },
    ],
  },
  {
    title: 'Journal',
    icon: ScrollText,
    items: [
      { title: 'Journal', href: '/journal', icon: ScrollText },
      { title: 'Trades', href: '/trades', icon: Activity },
    ],
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    items: [
      { title: 'Performance', href: '/analytics', icon: BarChart3 },
      { title: 'Reports', href: '/reports', icon: AreaChart },
      { title: 'Tearsheet', href: '/tearsheet', icon: LineChart },
      { title: 'Diagnostics', href: '/diagnostics', icon: Stethoscope },
    ],
  },
  {
    title: 'Strategies',
    icon: FlaskConical,
    items: [
      { title: 'Strategy Library', href: '/strategies', icon: BookOpen },
      { title: 'Data Manager', href: '/data', icon: Database },
      { title: 'Backtest', href: '/workflow', icon: Activity },
      { title: 'Optimizer', href: '/optimizer', icon: FlaskConical, isPremium: true },
      { title: 'Walk-Forward', href: '/walk-forward', icon: TrendingUp, isPremium: true },
      { title: 'Monte Carlo', href: '/advanced-analytics', icon: Dices, isPremium: true },
      { title: 'Scanner', href: '/scanner', icon: Crosshair, isPremium: true },
      { title: 'Results', href: '/saved-results', icon: FileText },
    ],
  },
  {
    title: 'Risk',
    icon: Shield,
    items: [
      { title: 'Risk Guardian', href: '/risk-guardian', icon: Shield },
      { title: 'Trading Dashboard', href: '/trading-dashboard', icon: Gauge },
      { title: 'Regime Control', href: '/regime-control', icon: Globe },
      { title: 'Execution', href: '/execution', icon: Zap },
      { title: 'Alerts', href: '/alerts', icon: Bell },
      { title: 'Prop Firms', href: '/prop-firm', icon: Briefcase },
    ],
  },
  {
    title: 'Copilot',
    icon: Bot,
    items: [
      { title: 'AI Copilot', href: '/ai-copilot', icon: Bot },
      { title: 'AI Playbook', href: '/playbook', icon: Brain },
      { title: 'Pre-Trade Check', href: '/pre-trade-check', icon: ClipboardCheck },
      { title: 'Growth Roadmap', href: '/growth-roadmap', icon: Milestone },
    ],
  },
  {
    title: 'Marketplace',
    icon: Store,
    items: [
      { title: 'Marketplace', href: '/marketplace', icon: Store },
    ],
  },
  {
    title: 'Achievements',
    icon: Trophy,
    items: [
      { title: 'Achievements', href: '/achievements', icon: Trophy },
      { title: 'Leaderboard', href: '/leaderboard', icon: Medal },
    ],
  },
  {
    title: 'Academy',
    icon: GraduationCap,
    items: [
      { title: 'Tutorials', href: '/tutorials', icon: GraduationCap },
      { title: 'Calculators', href: '/calculators', icon: Calculator },
      { title: 'Simulators', href: '/simulators', icon: Target },
    ],
  },
  {
    title: 'Settings',
    icon: Settings,
    items: [
      { title: 'Settings', href: '/settings', icon: Settings },
      { title: 'Profile', href: '/profile', icon: User },
      { title: 'Export Center', href: '/export-center', icon: Download },
    ],
  },
];

interface MobileNavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

export function MobileNavDrawer({ open, onOpenChange }: MobileNavDrawerProps) {
  const location = useLocation();

  useEffect(() => {
    onOpenChange(false);
  }, [location.pathname, onOpenChange]);

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname === href || location.pathname.startsWith(href + '?');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[280px] p-0 bg-background border-r border-border/30"
      >
        <SheetHeader className="p-3.5 border-b border-border/20">
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src={mmcLogo} alt="MMC" className="h-7 w-7 object-contain" />
              <div>
                <span className="font-bold text-base tracking-tight">MMC</span>
                <p className="text-[10px] text-muted-foreground font-medium leading-none">Trading OS</p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100dvh-60px)]">
          <div className="p-2 space-y-0.5">
            {NAV_GROUPS.map((group, groupIndex) => (
              <div key={group.title}>
                {groupIndex > 0 && <div className="h-px bg-border/15 my-2 mx-2" />}

                <div className="flex items-center gap-2 px-2.5 py-2">
                  <group.icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {group.title}
                  </span>
                </div>

                <div className="space-y-px">
                  {group.items.map(item => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150",
                          "active:scale-[0.98] touch-manipulation min-h-[40px]",
                          active
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted/40 text-foreground/75"
                        )}
                      >
                        <item.icon className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-primary" : "text-muted-foreground"
                        )} />
                        <span className={cn("flex-1 text-[13px]", active && "font-medium")}>{item.title}</span>
                        {item.isPremium && !active && (
                          <span className="text-[8px] font-semibold uppercase tracking-wider text-amber-500/70 bg-amber-500/10 px-1 py-0.5 rounded">
                            PRO
                          </span>
                        )}
                        {active && (
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="h-20" />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
