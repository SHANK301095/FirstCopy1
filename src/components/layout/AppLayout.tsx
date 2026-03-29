import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePrefetch } from '@/hooks/usePrefetch';
import { useSmartPreload } from '@/hooks/useSmartPreload';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Lock,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
  HelpCircle } from
'lucide-react';
import mmcLogo from '@/assets/mmc-logo.png';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useRef, useCallback } from 'react';
import { PWAStatusIndicator } from '@/components/pwa/PWAStatusIndicator';
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator';
import { NetworkStatusToast } from '@/components/pwa/NetworkStatusToast';
import { SessionTimeoutHandler } from '@/components/auth/SessionTimeoutHandler';

import { ThemeToggle } from '@/components/ThemeToggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { WorkspaceSelector } from '@/components/workspace/WorkspaceSelector';
import { OnlineUsers } from '@/components/workspace/OnlineUsers';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useRealtimePresence } from '@/hooks/useRealtimePresence';
import { InteractiveWalkthrough, useInteractiveWalkthrough } from '@/components/onboarding/InteractiveWalkthrough';
import { PremiumWelcomeScreen, useWelcomeScreen } from '@/components/onboarding/PremiumWelcomeScreen';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { usePlatformStats } from '@/hooks/usePlatformStats';
// FloatingParticles removed for finance-grade UI
import { useUIPreferencesStore } from '@/store/uiPreferencesStore';
import { useSoundEffectsStore } from '@/store/soundEffectsStore';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { QuickJumpMenu } from '@/components/navigation/QuickJumpMenu';
import { PremiumSearchBar } from '@/components/navigation/PremiumSearchBar';
import { SpotlightTrigger } from '@/components/ui/SpotlightSearch';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { usePullToOpenSidebar } from '@/hooks/usePullToOpenSidebar';
import { hapticFeedback } from '@/lib/haptics';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { PinnedRecents, PinToggle } from '@/components/navigation/PinnedRecents';
import { usePageHistory } from '@/hooks/usePageHistory';
import { QuickActionsFAB } from '@/components/ui/QuickActionsFAB';

// V3 Navigation Configuration
import {
  navItems,
  SIDEBAR_SECTIONS,
  getSectionIcon,
  getSectionLabel,
  getNavItemsBySection,
  findSectionByPath,
  type SectionKey,
  type NavItem } from
'@/lib/navigationConfig';

/**
 * App Layout with collapsible sidebar
 * V3 Information Architecture - Task-first navigation
 */

interface AppLayoutProps {
  children: ReactNode;
}

// User menu component
function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { resetWalkthrough } = useInteractiveWalkthrough();
  const { isPremium } = usePremiumStatus();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-7 w-7 rounded-full p-0">
          <Avatar className="h-7 w-7">
            <AvatarFallback className={`text-[10px] font-medium ${isPremium ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-primary/20 text-primary'}`}>
              {initials}
            </AvatarFallback>
          </Avatar>
          {isPremium &&
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-[1.5px] border-background" />
          }
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 z-50 bg-popover text-popover-foreground border border-border/60 shadow-md"
        align="end"
        forceMount>
        
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none truncate">{displayName}</p>
              {isPremium && <PremiumBadge size="sm" showText={false} />}
            </div>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        {isPremium ?
        <DropdownMenuItem asChild>
            <Link to="/premium" className="flex items-center text-amber-600">
              <Crown className="mr-2 h-4 w-4" />
              <span>Premium Features</span>
            </Link>
          </DropdownMenuItem> :

        <DropdownMenuItem asChild>
            <Link to="/premium" className="flex items-center">
              <Crown className="mr-2 h-4 w-4 text-amber-500" />
              <span>Get Premium</span>
            </Link>
          </DropdownMenuItem>
        }
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={resetWalkthrough} className="flex items-center">
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>Start Tour</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>);

}

// Desktop Sidebar Navigation Content - V3 IA
function DesktopSidebarContent({
  isAdmin,
  collapsed,
  userIsPremium




}: {isAdmin: boolean;collapsed: boolean;userIsPremium: boolean;}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { getPrefetchProps } = usePrefetch();
  const { playDropdownOpen, playDropdownClose } = useSoundEffectsStore();
  const navRef = useRef<HTMLElement>(null);
  const { addVisit } = usePageHistory();

  // Track page visits for Recents
  useEffect(() => {
    const item = navItems.find((n) => n.path === location.pathname);
    if (item) {
      addVisit(item.path, item.label);
    }
  }, [location.pathname, addVisit]);

  // Track which sections are expanded - persist only one section
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const savedSection = localStorage.getItem('nav-section-open-v3');
    const currentSection = findSectionByPath(location.pathname);
    const base: Record<string, boolean> = { command: true };
    if (currentSection && currentSection !== 'dashboard') {
      base[currentSection] = true;
    } else if (savedSection && savedSection !== 'dashboard') {
      base[savedSection] = true;
    }
    return base;
  });

  // Close all dropdowns when clicking outside
  const closeAllDropdowns = useCallback(() => {
    setExpandedSections({ command: true });
    playDropdownClose();
  }, [playDropdownClose]);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const el = navRef.current;
      if (!el) return;
      const path = typeof (e as any).composedPath === 'function' ? (e as any).composedPath() as EventTarget[] : [];
      const clickedInside = path.length ? path.includes(el) : el.contains(e.target as Node);
      if (!clickedInside) {
        closeAllDropdowns();
      }
    };
    window.addEventListener('pointerdown', handlePointerDown, true);
    return () => window.removeEventListener('pointerdown', handlePointerDown, true);
  }, [closeAllDropdowns]);

  // Persist only the single open section
  useEffect(() => {
    const openSection = Object.keys(expandedSections).find((k) => k !== 'dashboard' && expandedSections[k]);
    if (openSection) {
      localStorage.setItem('nav-section-open-v3', openSection);
    } else {
      localStorage.removeItem('nav-section-open-v3');
    }
  }, [expandedSections]);

  // Auto-expand section containing current route on route change
  useEffect(() => {
    const currentSection = findSectionByPath(location.pathname);
    if (currentSection && currentSection !== 'dashboard') {
      setExpandedSections({ command: true, [currentSection]: true });

      const scrollTimeout = setTimeout(() => {
        const activeEl = navRef.current?.querySelector(`a[href="${location.pathname}"]`);
        activeEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);

      return () => clearTimeout(scrollTimeout);
    } else {
      setExpandedSections({ command: true });
    }
  }, [location.pathname]);

  // Accordion behavior: open one section at a time (except start)
  const toggleSection = (section: string, nextOpen?: boolean) => {
    if (section === 'dashboard') return;

    setExpandedSections((prev) => {
      const isOpening = nextOpen ?? !prev[section];

      if (isOpening) {
        playDropdownOpen();
      } else {
        playDropdownClose();
      }

      if (!isOpening) {
        return { ...prev, [section]: false };
      }

      // Opening: close all others (except start) and open this one
      const newState: Record<string, boolean> = { command: true };
      newState[section] = true;
      return newState;
    });
  };

  // Render a single nav item
  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.path;
    const tourAttr = item.tourId ? { 'data-tour': item.tourId } : {};
    const isLocked = item.premium && !userIsPremium;

    if (collapsed) {
      return (
        <Tooltip key={item.path}>
          <TooltipTrigger asChild>
            <Link
              to={isLocked ? '#' : item.path}
              onClick={isLocked ? (e) => {e.preventDefault();navigate('/premium');} : undefined}
              {...tourAttr}
              {...isLocked ? {} : getPrefetchProps(item.path)}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200',
                isActive ?
                'bg-primary/15 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)]' :
                'text-sidebar-foreground/70 hover:bg-muted/60 hover:text-foreground',
                isLocked && 'opacity-60'
              )}>
              
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
        </Tooltip>);

    }

    // Locked premium item
    if (isLocked) {
      return (
        <Tooltip key={item.path}>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate('/premium')}
              className={cn(
                'group relative w-full flex items-center rounded-md px-2 py-1.5 text-[13px] font-medium transition-all duration-200',
                'bg-gradient-to-r from-amber-500/5 to-transparent border border-amber-500/20',
                'text-muted-foreground hover:text-amber-600 hover:border-amber-500/40 cursor-pointer'
              )}>
              
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
        </Tooltip>);

    }

    return (
      <Link
        key={item.path}
        to={item.path}
        {...tourAttr}
        {...getPrefetchProps(item.path)}
        className={cn(
          'group relative flex items-center rounded-md px-2 py-1.5 text-[13px] font-medium transition-all duration-200',
          isActive ?
          'bg-primary/15 text-primary border border-primary/30 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.15)]' :
          'text-sidebar-foreground/70 hover:bg-muted/50 hover:text-foreground border border-transparent'
        )}>
        
        <item.icon className={cn(
          'h-4 w-4 mr-2 shrink-0',
          isActive && 'text-primary'
        )} />
        <span className="truncate">{item.label}</span>
        
        {/* Pin toggle on hover */}
        <PinToggle path={item.path} showOnHover className="ml-auto" />
        
        {/* Active indicator */}
        {isActive &&
        <div className="absolute right-2 h-1.5 w-1.5 rounded-full bg-primary" />
        }
      </Link>);

  };

  // Staggered entrance animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
        delayChildren: 0.1
      }
    }
  };

  const sectionVariants = {
    hidden: {
      opacity: 0,
      x: -12
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.25,
        ease: [0.25, 0.1, 0.25, 1] as const
      }
    }
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      x: -8
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.2,
        ease: [0.25, 0.1, 0.25, 1] as const
      }
    }
  };

  return (
    <motion.nav
      ref={navRef}
      className="flex-1 overflow-y-auto py-2 px-2 space-y-1 scrollbar-glow"
      initial="hidden"
      animate="visible"
      variants={containerVariants}>
      
      {/* Pinned & Recents - V3 Enhancement */}
      <motion.div variants={sectionVariants}>
        <PinnedRecents collapsed={collapsed} className="mb-2" />
      </motion.div>
      
      {/* Main Navigation Sections */}
      {SIDEBAR_SECTIONS.map((sectionConfig, sectionIdx) => {
        const section = sectionConfig.key;
        let sectionItems = getNavItemsBySection(section);

        // Filter admin for non-admin users
        if (section === 'admin' && !isAdmin) return null;
        if (sectionItems.length === 0) return null;

        // IMPORTANT: keep Collapsible controlled (boolean) otherwise Radix treats it as uncontrolled
        // and multiple sections can stay open.
        const isExpanded = Boolean(expandedSections[section]);
        const hasActiveItem = sectionItems.some((item) =>
        location.pathname === item.path || location.pathname.startsWith(item.path + '?')
        );
        const SectionIcon = getSectionIcon(section);
        const sectionLabel = getSectionLabel(section);
        const isStart = section === 'dashboard';

        // Collapsed mode - show icons only with stagger
        if (collapsed) {
          return (
            <motion.div key={section} className="space-y-0.5" variants={sectionVariants}>
              {sectionIdx > 0 && <div className="h-px my-1 bg-sidebar-border/30" />}
              {sectionItems.map((item, idx) =>
              <motion.div key={item.path} variants={itemVariants}>
                  {renderNavItem(item)}
                </motion.div>
              )}
            </motion.div>);

        }

        // Start section - always open, no dropdown
        if (isStart) {
          return (
            <motion.div key={section} variants={sectionVariants}>
              <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {sectionLabel}
              </p>
              <div className="space-y-0.5">
                {sectionItems.map((item, idx) =>
                <motion.div key={item.path} variants={itemVariants}>
                    {renderNavItem(item)}
                  </motion.div>
                )}
              </div>
            </motion.div>);

        }

        // Collapsible section with entrance animation
        return (
          <motion.div key={section} variants={sectionVariants}>
            <Collapsible
              open={isExpanded}
              onOpenChange={(open) => toggleSection(section, open)}>
              
              {sectionIdx > 0 && <div className="h-px bg-sidebar-border/20 my-1" />}
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    'group w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all duration-200 relative',
                    'border border-transparent',
                    hasActiveItem ?
                    'text-primary bg-primary/5 border-primary/20' :
                    'text-muted-foreground/60 hover:text-foreground hover:bg-muted/40',
                    isExpanded && 'before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:rounded-full before:bg-primary/70'
                  )}>
                  
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
                    isExpanded ?
                    'bg-primary/15 rotate-180' :
                    'bg-muted/30 group-hover:bg-muted/50'
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
                  {isExpanded &&
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full bg-gradient-to-b from-primary/60 via-primary/30 to-transparent" />
                  }
                  {sectionItems.map((item, idx) =>
                  <div
                    key={item.path}
                    className="opacity-0 animate-dropdown-item-in"
                    style={{
                      animationDelay: `${30 + idx * 20}ms`,
                      animationFillMode: 'forwards'
                    }}>
                    
                      {renderNavItem(item)}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>);

      })}
      
      {/* Bottom Sticky: Upgrade/Premium */}
      <motion.div className="pt-2 mt-auto" variants={sectionVariants}>
        <div className="h-px bg-sidebar-border/30 mb-2" />
        
        {/* Premium/Upgrade Button */}
        {!collapsed ?
        <Link
          to="/premium"
          className={cn(
            'flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all duration-200',
            userIsPremium ?
            'bg-gradient-to-r from-premium/15 to-premium/5 border border-premium/30 text-premium hover:border-premium/50' :
            'bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/25 text-amber-600 hover:border-amber-500/50 hover:shadow-[0_0_12px_hsl(45_100%_50%/0.15)]'
          )}>
          
            <Crown className={cn(
            'h-4 w-4',
            userIsPremium ? 'text-premium' : 'text-amber-500'
          )} />
            <span className="text-sm font-medium">
              {userIsPremium ? 'Premium' : 'Upgrade'}
            </span>
            {!userIsPremium &&
          <Badge variant="secondary" className="ml-auto text-[9px] px-1.5 py-0 bg-amber-500/20 text-amber-600 border-0">
                PRO
              </Badge>
          }
          </Link> :

        <Tooltip>
            <TooltipTrigger asChild>
              <Link
              to="/premium"
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200',
                userIsPremium ?
                'bg-premium/15 text-premium' :
                'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
              )}>
              
                <Crown className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              {userIsPremium ? 'Premium Features' : 'Upgrade to Premium'}
            </TooltipContent>
          </Tooltip>
        }
      </motion.div>
    </motion.nav>);

}

// Mobile Sidebar Sheet Content - V3 IA
function MobileSidebarContent({
  isAdmin,
  onNavigate



}: {isAdmin: boolean;onNavigate: () => void;}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { getPrefetchProps } = usePrefetch();
  const { playDropdownOpen, playDropdownClose } = useSoundEffectsStore();
  const { isPremium: userIsPremium } = usePremiumStatus();
  const navRef = useRef<HTMLElement>(null);

  // Track which sections are expanded - auto-expand active route's section
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const currentSection = findSectionByPath(location.pathname);
    const base: Record<string, boolean> = { command: true };
    if (currentSection && currentSection !== 'dashboard') {
      base[currentSection] = true;
    }
    return base;
  });

  // Close all dropdowns when clicking outside nav area
  const closeAllDropdowns = useCallback(() => {
    setExpandedSections({ command: true });
    playDropdownClose();
  }, [playDropdownClose]);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const el = navRef.current;
      if (!el) return;
      const path = typeof (e as any).composedPath === 'function' ? (e as any).composedPath() as EventTarget[] : [];
      const clickedInside = path.length ? path.includes(el) : el.contains(e.target as Node);
      if (!clickedInside) {
        closeAllDropdowns();
      }
    };
    window.addEventListener('pointerdown', handlePointerDown, true);
    return () => window.removeEventListener('pointerdown', handlePointerDown, true);
  }, [closeAllDropdowns]);

  // Auto-expand section containing current route on route change
  useEffect(() => {
    const currentSection = findSectionByPath(location.pathname);
    if (currentSection && currentSection !== 'dashboard') {
      setExpandedSections({ command: true, [currentSection]: true });

      const scrollTimeout = setTimeout(() => {
        const activeEl = navRef.current?.querySelector(`a[href="${location.pathname}"]`);
        activeEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);

      return () => clearTimeout(scrollTimeout);
    } else {
      setExpandedSections({ command: true });
    }
  }, [location.pathname]);

  // Accordion behavior for mobile with sound
  const toggleSection = (section: string, nextOpen?: boolean) => {
    if (section === 'dashboard') return;
    setExpandedSections((prev) => {
      const isOpening = nextOpen ?? !prev[section];
      if (isOpening) {
        playDropdownOpen();
      } else {
        playDropdownClose();
      }
      if (!isOpening) {
        return { ...prev, [section]: false };
      }
      const newState: Record<string, boolean> = { command: true };
      newState[section] = true;
      return newState;
    });
  };

  return (
    <nav ref={navRef} className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-glow">
      {/* Pinned & Recents for mobile */}
      <PinnedRecents className="mb-2" />
      
      {SIDEBAR_SECTIONS.map((sectionConfig, sectionIdx) => {
        const section = sectionConfig.key;
        const sectionItems = getNavItemsBySection(section);

        // Filter admin for non-admin users
        if (section === 'admin' && !isAdmin) return null;
        if (sectionItems.length === 0) return null;

        // IMPORTANT: keep Collapsible controlled (boolean) otherwise Radix treats it as uncontrolled
        // and multiple sections can stay open.
        const isExpanded = Boolean(expandedSections[section]);
        const hasActiveItem = sectionItems.some((item) => location.pathname === item.path);
        const SectionIcon = getSectionIcon(section);
        const sectionLabel = getSectionLabel(section);
        const isStart = section === 'dashboard';

        if (isStart) {
          return (
            <div key={section}>
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                {sectionLabel}
              </p>
              {sectionItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onNavigate}
                    {...getPrefetchProps(item.path)}
                    className={cn(
                      'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                      isActive ?
                      'bg-primary/15 text-primary border border-primary/30' :
                      'text-sidebar-foreground/70 hover:bg-muted/80'
                    )}>
                    
                    <item.icon className="h-[18px] w-[18px] mr-3" />
                    <span>{item.label}</span>
                  </Link>);

              })}
            </div>);

        }

        return (
          <Collapsible
            key={section}
            open={isExpanded}
            onOpenChange={(open) => toggleSection(section, open)}>
            
            {sectionIdx > 0 && <div className="h-px bg-sidebar-border/30 my-2" />}
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  'group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-300 relative',
                  'border border-transparent',
                  hasActiveItem ?
                  'text-primary bg-gradient-to-r from-primary/15 to-primary/5 border-primary/30' :
                  'text-muted-foreground/60 hover:text-foreground hover:bg-muted/50',
                  isExpanded && 'before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:rounded-full before:bg-primary/70'
                )}>
                
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    'relative p-1.5 rounded-lg transition-all duration-300',
                    hasActiveItem ? 'bg-primary/20' : 'bg-muted/50 group-hover:bg-muted'
                  )}>
                    <SectionIcon className={cn(
                      'h-3.5 w-3.5 transition-all duration-300',
                      hasActiveItem && 'text-primary'
                    )} />
                  </div>
                  <span className="transition-all duration-200 group-hover:translate-x-0.5">
                    {sectionLabel}
                  </span>
                </div>
                <div className={cn(
                  'relative flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300',
                  isExpanded ? 'bg-primary/20 rotate-180' : 'bg-muted/50 group-hover:bg-muted'
                )}>
                  <ChevronDown className={cn(
                    'h-3.5 w-3.5 transition-all duration-300',
                    isExpanded && 'text-primary'
                  )} />
                </div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
              <div className="mt-2 space-y-1 ml-2 pl-3 relative">
                {isExpanded &&
                <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full bg-gradient-to-b from-primary/60 via-primary/30 to-transparent" />
                }
                {sectionItems.map((item, idx) => {
                  const isActive = location.pathname === item.path;
                  const isLocked = item.premium && !userIsPremium;

                  if (isLocked) {
                    return (
                      <div
                        key={item.path}
                        className="opacity-0 animate-dropdown-item-in"
                        style={{ animationDelay: `${60 + idx * 40}ms`, animationFillMode: 'forwards' }}>
                        
                        <button
                          onClick={() => {navigate('/premium');onNavigate();}}
                          className="w-full flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all bg-amber-500/5 border border-amber-500/20 text-muted-foreground">
                          
                          <Lock className="h-4 w-4 mr-3 text-amber-500/60" />
                          <span className="opacity-70">{item.label}</span>
                          <Crown className="ml-auto h-4 w-4 text-amber-500" />
                        </button>
                      </div>);

                  }

                  return (
                    <div
                      key={item.path}
                      className="opacity-0 animate-dropdown-item-in"
                      style={{ animationDelay: `${60 + idx * 40}ms`, animationFillMode: 'forwards' }}>
                      
                      <Link
                        to={item.path}
                        onClick={onNavigate}
                        {...getPrefetchProps(item.path)}
                        className={cn(
                          'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          isActive ?
                          'bg-primary/15 text-primary border border-primary/30' :
                          'text-sidebar-foreground/70 hover:bg-muted/80'
                        )}>
                        
                        <item.icon className={cn(
                          'h-[18px] w-[18px] mr-3',
                          isActive && 'text-primary'
                        )} />
                        <span>{item.label}</span>
                        {isActive &&
                        <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
                        }
                      </Link>
                    </div>);

                })}
              </div>
            </CollapsibleContent>
          </Collapsible>);

      })}
      
      {/* Bottom: Premium/Upgrade */}
      <div className="pt-3 mt-2">
        <div className="h-px bg-sidebar-border/30 mb-3" />
        <Link
          to="/premium"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200',
            userIsPremium ?
            'bg-premium/10 border border-premium/30 text-premium' :
            'bg-amber-500/10 border border-amber-500/25 text-amber-600'
          )}>
          
          <Crown className={cn('h-5 w-5', userIsPremium ? 'text-premium' : 'text-amber-500')} />
          <span className="text-sm font-medium">
            {userIsPremium ? 'Premium' : 'Upgrade to Premium'}
          </span>
        </Link>
      </div>
    </nav>);

}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  // Use lg breakpoint (1024px) for sidebar overlay vs static push
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    const handler = () => setIsCompact(mql.matches);
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { isAdmin } = useAdmin();
  const { stats: platformStats } = usePlatformStats();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });

  // Resizable sidebar width
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebar-width');
    return saved ? parseInt(saved, 10) : 260;
  });
  const [isResizing, setIsResizing] = useState(false);

  // UI Preferences
  const { backgroundEffects, particleDensity } = useUIPreferencesStore();

  // Walkthrough state
  const { showWalkthrough, completeWalkthrough } = useInteractiveWalkthrough();

  // Welcome screen state
  const { showWelcome, completeWelcome } = useWelcomeScreen();

  // Auth
  const { user } = useAuth();
  const { isPremium: userIsPremium } = usePremiumStatus();

  // Workspace and presence
  const { currentWorkspace } = useWorkspace();
  const { onlineUsers, updatePresence } = useRealtimePresence(currentWorkspace?.id || null);

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Persist sidebar width
  useEffect(() => {
    localStorage.setItem('sidebar-width', String(sidebarWidth));
  }, [sidebarWidth]);

  // Handle sidebar resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(Math.max(200, e.clientX), 360);
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Admin check now handled by useAdmin hook

  // Close sheet on navigation
  useEffect(() => {
    setSheetOpen(false);
  }, [location.pathname]);

  // Update presence when page changes
  useEffect(() => {
    if (currentWorkspace?.id) {
      updatePresence({ currentPage: location.pathname });
    }
  }, [location.pathname, currentWorkspace?.id, updatePresence]);

  // Keyboard shortcut to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Smart preloading - learns user patterns
  useSmartPreload();

  // Calculate reduced particle count based on density setting
  const particleCount = Math.round(12 * particleDensity);

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  // Pull-down gesture to open sidebar
  const { pullDistance, isPulling, progress: pullProgress } = usePullToOpenSidebar({
    onOpen: () => setSheetOpen(true),
    disabled: !isMobile || sheetOpen
  });

  // Mobile Layout
  if (isCompact) {
    return (
      <div className="min-h-screen w-full bg-background overflow-x-hidden">
        {/* Premium Welcome Screen for first-time users */}
        {showWelcome &&
        <PremiumWelcomeScreen onComplete={(path) => completeWelcome(path)} />
        }
        {/* Background effects disabled for finance-grade UI */}
        
        {/* Pull-down indicator */}
        {isPulling && pullDistance > 10 &&
        <div
          className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none"
          style={{
            transform: `translateY(${Math.min(pullDistance, 60)}px)`,
            opacity: pullProgress
          }}>
          
            <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full bg-primary/90 text-primary-foreground text-sm font-medium shadow-lg backdrop-blur-sm transition-transform",
            pullProgress >= 1 && "scale-110"
          )}>
              <Menu className="h-4 w-4" />
              {pullProgress >= 1 ? "Release to open" : "Pull down for menu"}
            </div>
          </div>
        }
        
        {/* Mobile Top Bar */}
        <header
          className="fixed top-0 left-0 right-0 z-50 h-11 border-b border-border/20 bg-background/95 backdrop-blur-2xl flex items-center justify-between px-2"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          
          <div className="flex items-center gap-1.5">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-9 w-9 rounded-lg"
                  aria-label="Open navigation menu">
                  
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </svg>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[80vw] max-w-72 p-0 bg-gradient-to-b from-sidebar via-sidebar to-[hsl(230_25%_3%)] border-r-sidebar-border/50 flex flex-col h-full overflow-hidden">
                
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation Menu</SheetTitle>
                </SheetHeader>
                <div className="flex h-14 items-center border-b border-sidebar-border/50 px-3 gap-2 shrink-0">
                  <img src={mmcLogo} alt="MMC Logo" className="h-8 object-contain" />
                  <span className="text-sm font-semibold text-sidebar-foreground/80">MMC AI Intelligence</span>
                </div>
                <MobileSidebarContent isAdmin={isAdmin} onNavigate={() => setSheetOpen(false)} />
                <div
                  className="shrink-0 p-3 border-t border-sidebar-border/30 bg-sidebar/80 backdrop-blur-sm"
                  style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}>
                  
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                        {user?.user_metadata?.display_name?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sidebar-foreground truncate">
                        {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <img src={mmcLogo} alt="MMC Logo" className="h-7 object-contain" />
          </div>
          <div className="flex items-center gap-0.5">
            <OfflineIndicator />
            <ThemeToggle />
            <OnlineUsers users={onlineUsers} maxDisplay={2} />
            <UserMenu />
          </div>
        </header>
        
        <InstallPrompt />
        
        <main
          className="pt-11 pb-16 px-2 sm:px-3 min-h-screen mobile-scroll-container min-w-0 w-full max-w-full overflow-x-hidden">
          
          <div className="animate-fade-in py-2 min-w-0">
            {children}
          </div>
        </main>
        
        <MobileBottomNav />
      </div>);

  }

  // Desktop Layout
  return (
    <div className="flex min-h-screen w-full bg-background overflow-x-hidden">
      {/* Premium Welcome Screen for first-time users */}
      {showWelcome &&
      <PremiumWelcomeScreen onComplete={(path) => {
        completeWelcome(path);
        // After welcome, show the interactive walkthrough
      }} />
      }
      
      {/* Interactive Walkthrough */}
      {showWalkthrough && !showWelcome &&
      <InteractiveWalkthrough onComplete={completeWalkthrough} />
      }

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'relative sticky top-0 h-screen flex flex-col border-r border-sidebar-border/50 bg-gradient-to-b from-sidebar via-sidebar to-[hsl(230_25%_5%)]',
          sidebarCollapsed ? 'w-16' : '',
          isResizing ? '' : 'transition-all duration-300'
        )}
        style={sidebarCollapsed ? undefined : { width: sidebarWidth }}>
        
        {/* Resize Handle */}
        {!sidebarCollapsed &&
        <div
          onMouseDown={handleMouseDown}
          onDoubleClick={() => setSidebarWidth(260)}
          className={cn(
            'absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-50 group',
            'hover:bg-primary/40 transition-colors',
            isResizing && 'bg-primary/60'
          )}>
          
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-primary/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            {/* Width tooltip while resizing */}
            {isResizing &&
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded bg-popover border border-border text-xs font-mono text-foreground shadow-lg whitespace-nowrap">
                {sidebarWidth}px
              </div>
          }
          </div>
        }
        {/* Sidebar Header */}
        <div className={cn(
          'flex h-12 items-center border-b border-sidebar-border/40 shrink-0',
          sidebarCollapsed ? 'justify-center px-2' : 'px-3.5 gap-2'
        )}>
          <img
            src={mmcLogo}
            alt="MMC Logo"
            className={cn(
              'object-contain transition-all duration-300',
              sidebarCollapsed ? 'h-6 w-6' : 'h-8'
            )} />
          
        </div>

        {/* Nav Content */}
        <DesktopSidebarContent isAdmin={isAdmin} collapsed={sidebarCollapsed} userIsPremium={userIsPremium} />

        {/* Toggle Button - Middle of sidebar edge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-background shadow-md hover:bg-muted transition-colors"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              
              {sidebarCollapsed ?
              <ChevronRight className="h-3.5 w-3.5" /> :

              <ChevronLeft className="h-3.5 w-3.5" />
              }
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            {sidebarCollapsed ? 'Expand' : 'Collapse'} (⌘B)
          </TooltipContent>
        </Tooltip>

        {/* Community counter */}
        {!sidebarCollapsed





        }

        {/* Sidebar Footer - User info */}
        <div className={cn(
          'shrink-0 border-t border-sidebar-border/30 p-3',
          sidebarCollapsed && 'flex justify-center'
        )}>
          {sidebarCollapsed ?
          <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right">
                {displayName}
              </TooltipContent>
            </Tooltip> :

          <div className="flex items-center gap-2.5">
              <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {displayName}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          }
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-11 px-4 border-b border-border/20 bg-background/95 backdrop-blur-2xl">
          <div className="flex items-center gap-2 min-w-0">
            <Breadcrumbs className="hidden md:flex" />
            <WorkspaceSelector />
          </div>
          
          {/* Center Search Bar - Spotlight */}
          <div className="hidden md:flex flex-1 min-w-0 max-w-sm mx-4">
            <SpotlightTrigger className="w-full" />
          </div>
          
          <div className="flex items-center gap-0.5 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 md:hidden hover:bg-muted/60"
              onClick={() => {
                hapticFeedback('light');
                const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
                document.dispatchEvent(event);
              }}>
              
              <Search className="h-3.5 w-3.5" />
            </Button>
            <OfflineIndicator />
            <NotificationCenter />
            <ThemeToggle />
            <OnlineUsers users={onlineUsers} maxDisplay={4} />
            <UserMenu />
          </div>
        </header>

        {/* Page container */}
        <div className="flex-1 w-full max-w-full px-3 sm:px-5 lg:px-6 py-4 min-w-0">
          <div className="max-w-[1400px] mx-auto min-w-0">
            {children}
          </div>
        </div>

        <Footer />
      </main>
      
      <QuickJumpMenu />
      <QuickActionsFAB />
      <NetworkStatusToast />
      <SessionTimeoutHandler />
      
      {/* Background effects disabled for finance-grade UI */}
    </div>);

}