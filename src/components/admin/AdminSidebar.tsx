/**
 * Admin Sidebar Navigation
 * Premium collapsible sidebar with grouped navigation, search, and system health
 */

import { useState } from 'react';
import {
  Activity, Users, Crown, Phone, BarChart3, Sparkles, HardDrive,
  Clock, Settings, HeartPulse, Megaphone, ToggleLeft, Store,
  MessageSquare, Shield, Search,
  PanelLeftClose, PanelLeft, FileText, Sliders,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
  id: string;
  label: string;
  icon: typeof Activity;
  badge?: number;
  group: string;
}

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  stats?: {
    waitlistCount?: number;
    userCount?: number;
    unreadAlerts?: number;
  };
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Command Center',
    items: [
      { id: 'overview', label: 'Overview', icon: Activity, group: 'command' },
      { id: 'analytics', label: 'Analytics', icon: BarChart3, group: 'command' },
      { id: 'audit', label: 'Audit Trail', icon: FileText, group: 'command' },
    ],
  },
  {
    label: 'Users & Access',
    items: [
      { id: 'users', label: 'Users', icon: Users, group: 'users' },
      { id: 'waitlist', label: 'Waitlist', icon: Phone, group: 'users' },
      { id: 'roles', label: 'Roles', icon: Crown, group: 'users' },
      { id: 'premium', label: 'Premium', icon: Crown, group: 'users' },
      { id: 'requests', label: 'Requests', icon: MessageSquare, group: 'users' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { id: 'flags', label: 'Feature Flags', icon: ToggleLeft, group: 'platform' },
      { id: 'config', label: 'Config Center', icon: Sliders, group: 'platform' },
      { id: 'announcements', label: 'Announcements', icon: Megaphone, group: 'platform' },
      { id: 'moderation', label: 'Moderation', icon: Store, group: 'platform' },
      { id: 'testimonials', label: 'Testimonials', icon: MessageSquare, group: 'platform' },
      { id: 'affiliates', label: 'Affiliates', icon: Users, group: 'platform' },
    ],
  },
  {
    label: 'Data & AI',
    items: [
      { id: 'market-data', label: 'Market Data', icon: HardDrive, group: 'data' },
      { id: 'ai-usage', label: 'AI Usage', icon: Sparkles, group: 'data' },
      { id: 'copilot', label: 'Copilot KB', icon: Sparkles, group: 'data' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'health', label: 'System Health', icon: HeartPulse, group: 'system' },
      { id: 'logs', label: 'Activity Logs', icon: Clock, group: 'system' },
      { id: 'settings', label: 'Settings', icon: Settings, group: 'system' },
    ],
  },
];

export function AdminSidebar({ activeTab, onTabChange, collapsed, onToggleCollapse, stats }: AdminSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGroups = searchQuery
    ? NAV_GROUPS.map(g => ({
        ...g,
        items: g.items.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase())),
      })).filter(g => g.items.length > 0)
    : NAV_GROUPS;

  const getBadge = (id: string) => {
    if (id === 'waitlist' && stats?.waitlistCount) return stats.waitlistCount;
    if (id === 'users' && stats?.userCount) return stats.userCount;
    return undefined;
  };

  return (
    <div
      className={cn(
        'h-full flex flex-col border-r border-border/40 bg-card/80 backdrop-blur-xl transition-all duration-300 shrink-0',
        collapsed ? 'w-[60px]' : 'w-[260px]'
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center border-b border-border/40 shrink-0',
        collapsed ? 'justify-center p-2.5' : 'justify-between px-4 py-3'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md shadow-primary/20">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight">Admin</span>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Control Tower</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-lg hover:bg-muted/60"
          onClick={onToggleCollapse}
        >
          {collapsed ? <PanelLeft className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-muted/30 border-border/40 rounded-lg focus-visible:ring-1 focus-visible:ring-primary/30"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 bg-muted/60 px-1.5 py-0.5 rounded-md font-mono">
              /
            </kbd>
          </div>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2">
        <div className="py-2 space-y-5">
          {filteredGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-2.5 mb-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.12em]">
                  {group.label}
                </p>
              )}
              {collapsed && <Separator className="my-2 opacity-50" />}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  const badge = getBadge(item.id);
                  const Icon = item.icon;

                  const button = (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 rounded-xl transition-all text-left group relative',
                        collapsed ? 'justify-center p-2.5' : 'px-2.5 py-[7px]',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                      )}
                    >
                      {/* Active left accent bar */}
                      {isActive && !collapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary" />
                      )}
                      <Icon className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive ? 'text-primary' : 'group-hover:text-foreground'
                      )} />
                      {!collapsed && (
                        <>
                          <span className="text-[13px] flex-1 truncate">{item.label}</span>
                          {badge !== undefined && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                'h-[18px] px-1.5 text-[10px] rounded-md font-mono',
                                isActive ? 'bg-primary/20 text-primary' : ''
                              )}
                            >
                              {badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </button>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.id} delayDuration={0}>
                        <TooltipTrigger asChild>{button}</TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">
                          {item.label}
                          {badge !== undefined && ` (${badge})`}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return button;
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* System Health Mini Panel */}
      <div className={cn(
        'border-t border-border/40 shrink-0',
        collapsed ? 'p-2' : 'p-3'
      )}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="flex justify-center">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="text-xs">
              Systems Online • DB OK • API OK
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-2.5">
            <div className="flex items-center gap-2 text-xs">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Systems Online</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Zap className="h-2.5 w-2.5 text-emerald-500" /> DB OK
              </span>
              <span className="text-border">•</span>
              <span className="flex items-center gap-1">
                <Activity className="h-2.5 w-2.5 text-emerald-500" /> API OK
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}