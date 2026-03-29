/**
 * Sidebar Section Component
 * Reusable collapsible section with consistent styling
 */

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Lock, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePrefetch } from '@/hooks/usePrefetch';
import { PinToggle } from './PinnedRecents';
import type { NavItem, SectionKey } from '@/lib/navigationConfig';
import { getSectionIcon, getSectionLabel } from '@/lib/navigationConfig';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarSectionProps {
  section: SectionKey;
  items: NavItem[];
  isExpanded: boolean;
  onToggle: (open: boolean) => void;
  collapsed?: boolean;
  userIsPremium?: boolean;
}

export function SidebarSection({
  section,
  items,
  isExpanded,
  onToggle,
  collapsed,
  userIsPremium = false,
}: SidebarSectionProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { getPrefetchProps } = usePrefetch();
  
  const SectionIcon = getSectionIcon(section);
  const sectionLabel = getSectionLabel(section);
  const hasActiveItem = items.some(item => 
    location.pathname === item.path || 
    location.pathname.startsWith(item.path + '?')
  );

  // Collapsed mode - show icons only
  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          const isLocked = item.premium && !userIsPremium;
          
          return (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                <Link
                  to={isLocked ? '#' : item.path}
                  onClick={isLocked ? (e) => { e.preventDefault(); navigate('/premium'); } : undefined}
                  {...(isLocked ? {} : getPrefetchProps(item.path))}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-primary/15 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)]'
                      : 'text-sidebar-foreground/70 hover:bg-muted/60 hover:text-foreground',
                    isLocked && 'opacity-60'
                  )}
                >
                  <item.icon className={cn(
                    'h-[18px] w-[18px] shrink-0',
                    isActive && 'text-primary'
                  )} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8} className={isLocked ? 'bg-amber-500/10 border-amber-500/30' : ''}>
                <div className="flex items-center gap-2">
                  {isLocked && <Lock className="h-3 w-3 text-amber-500" />}
                  <span>{item.label}</span>
                  {isLocked && <span className="text-[10px] text-amber-500">(PRO)</span>}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  }

  // Always-open section (like 'dashboard')
  if (section === 'dashboard') {
    return (
      <div className="space-y-0.5">
        <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {sectionLabel}
        </p>
        {items.map((item) => (
          <NavItemLink 
            key={item.path} 
            item={item} 
            userIsPremium={userIsPremium}
          />
        ))}
      </div>
    );
  }

  // Collapsible section
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'group w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all duration-200',
            'border border-transparent',
            hasActiveItem
              ? 'text-primary bg-primary/5 border-primary/20'
              : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/40'
          )}
        >
          <div className="flex items-center gap-2">
            <div className={cn(
              'p-1 rounded-md transition-all duration-200',
              hasActiveItem ? 'bg-primary/15' : 'bg-muted/40 group-hover:bg-muted/60'
            )}>
              <SectionIcon className={cn(
                'h-3.5 w-3.5',
                hasActiveItem && 'text-primary'
              )} />
            </div>
            <span>{sectionLabel}</span>
          </div>
          <div className={cn(
            'flex items-center justify-center w-5 h-5 rounded-full transition-all duration-200',
            isExpanded 
              ? 'bg-primary/15 rotate-180' 
              : 'bg-muted/30 group-hover:bg-muted/50'
          )}>
            <ChevronDown className={cn(
              'h-3 w-3 transition-all duration-200',
              isExpanded && 'text-primary'
            )} />
          </div>
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        <div className="mt-0.5 space-y-px ml-1 pl-1 relative">
          {/* Left border accent line */}
          {isExpanded && (
            <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full bg-gradient-to-b from-primary/60 via-primary/30 to-transparent" />
          )}
          {items.map((item, idx) => (
            <div 
              key={item.path}
              className="opacity-0 animate-dropdown-item-in"
              style={{ 
                animationDelay: `${30 + idx * 20}ms`,
                animationFillMode: 'forwards'
              }}
            >
              <NavItemLink item={item} userIsPremium={userIsPremium} />
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Individual Nav Item Link
 */
function NavItemLink({ 
  item, 
  userIsPremium 
}: { 
  item: NavItem; 
  userIsPremium: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { getPrefetchProps } = usePrefetch();
  const { user } = useAuth();
  
  const isActive = location.pathname === item.path;
  const isLocked = item.premium && !userIsPremium;
  const tourAttr = item.tourId ? { 'data-tour': item.tourId } : {};

  // MT5 Sync live indicator
  const isMT5SyncItem = item.path === '/mt5-sync';
  const [mt5Connected, setMt5Connected] = useState(false);

  useEffect(() => {
    if (!isMT5SyncItem || !user) return;
    const check = async () => {
      const { data } = await supabase.from('mt5_accounts')
        .select('connection_status, last_heartbeat_at')
        .eq('user_id', user.id).eq('is_active', true).eq('connection_status', 'connected')
        .limit(1);
      if (data && data.length > 0 && data[0].last_heartbeat_at) {
        const diff = Date.now() - new Date(data[0].last_heartbeat_at).getTime();
        setMt5Connected(diff < 120000);
      } else {
        setMt5Connected(false);
      }
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, [isMT5SyncItem, user]);

  // Locked premium item
  if (isLocked) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate('/premium')}
            className={cn(
              'group relative w-full flex items-center rounded-md px-2 py-1.5 text-[13px] font-medium transition-all duration-200',
              'bg-gradient-to-r from-amber-500/5 to-transparent border border-amber-500/20',
              'text-muted-foreground hover:text-amber-600 hover:border-amber-500/40 cursor-pointer'
            )}
          >
            <Lock className="h-3.5 w-3.5 mr-2 shrink-0 text-amber-500/60" />
            <span className="opacity-70 truncate">{item.label}</span>
            <Crown className="ml-auto h-3.5 w-3.5 text-amber-500 shrink-0" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[200px] p-2 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/30">
          <p className="text-xs text-muted-foreground">
            Upgrade to Premium to unlock {item.label}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      to={item.path}
      {...tourAttr}
      {...getPrefetchProps(item.path)}
      className={cn(
        'group relative flex items-center rounded-md px-2 py-1.5 text-[13px] font-medium transition-all duration-200',
        isActive
          ? 'bg-primary/15 text-primary border border-primary/30 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.15)]'
          : 'text-sidebar-foreground/70 hover:bg-muted/50 hover:text-foreground border border-transparent'
      )}
    >
      <div className="relative">
        <item.icon className={cn(
          'h-4 w-4 mr-2 shrink-0',
          isActive && 'text-primary'
        )} />
        {isMT5SyncItem && mt5Connected && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-chart-2 ring-1 ring-background" />
        )}
      </div>
      <span className="truncate">{item.label}</span>
      
      {/* Pin toggle on hover */}
      <PinToggle path={item.path} showOnHover className="ml-auto" />
      
      {/* Active indicator */}
      {isActive && (
        <div className="absolute right-2 h-1.5 w-1.5 rounded-full bg-primary" />
      )}
    </Link>
  );
}
