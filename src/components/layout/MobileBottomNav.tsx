import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, BookOpen, Bot, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/hooks/useTouchGestures';
import { useState, useRef, useEffect } from 'react';
import { MobileNavDrawer } from '@/components/mobile/MobileNavDrawer';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: TrendingUp, label: 'Trades', path: '/trades' },
  { icon: BookOpen, label: 'Journal', path: '/journal' },
  { icon: Bot, label: 'AI', path: '/ai-copilot' },
  { icon: Menu, label: 'More', path: null }, // Opens drawer
];

export function MobileBottomNav() {
  const location = useLocation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Update active index when location changes
  useEffect(() => {
    const index = navItems.findIndex(item => item.path === location.pathname);
    if (index !== -1) {
      setActiveIndex(index);
    }
  }, [location.pathname]);

  // Animate indicator position
  useEffect(() => {
    if (indicatorRef.current && navRef.current) {
      const itemWidth = navRef.current.offsetWidth / navItems.length;
      const offset = activeIndex * itemWidth + (itemWidth - 40) / 2;
      indicatorRef.current.style.transform = `translateX(${offset}px)`;
    }
  }, [activeIndex]);

  const handleNavClick = (index: number, isDrawerTrigger: boolean) => {
    triggerHaptic('light');
    if (isDrawerTrigger) {
      setDrawerOpen(true);
    } else {
      setActiveIndex(index);
    }
  };

  return (
    <>
      <MobileNavDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
      
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/20 bg-background/95 backdrop-blur-xl lg:hidden">
        {/* Animated indicator */}
        <div 
          ref={indicatorRef}
          className="absolute top-0 h-[2px] w-10 bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-full transition-transform duration-300 ease-out"
        />
        
        {/* Safe area padding handled by env() */}
        <div ref={navRef} className="grid h-12 grid-cols-5" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {navItems.map((item, index) => {
            const isDrawerTrigger = item.path === null;
            const isActive = !isDrawerTrigger && location.pathname === item.path;
            
            if (isDrawerTrigger) {
              return (
                <button
                  key="more"
                  onClick={() => handleNavClick(index, true)}
                  className={cn(
                    'relative flex flex-col items-center justify-center gap-0.5 transition-all duration-200',
                    'active:scale-95 touch-manipulation min-h-[48px]',
                    drawerOpen
                      ? 'text-primary'
                      : 'text-muted-foreground active:text-foreground'
                  )}
                >
                  <div className={cn(
                    'relative flex items-center justify-center rounded-xl p-1.5 transition-all duration-300',
                    drawerOpen && 'bg-primary/10 scale-110'
                  )}>
                    <item.icon className={cn(
                      'h-5 w-5 transition-all duration-200',
                      drawerOpen && 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]'
                    )} />
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium transition-all duration-200 leading-none',
                    drawerOpen && 'font-semibold text-primary'
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            }
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => handleNavClick(index, false)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 transition-all duration-200',
                  'active:scale-95 touch-manipulation min-h-[48px]',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground active:text-foreground'
                )}
              >
                {/* Touch ripple container */}
                <div className={cn(
                  'relative flex items-center justify-center rounded-xl p-1.5 transition-all duration-300',
                  isActive && 'bg-primary/10 scale-110'
                )}>
                  <item.icon className={cn(
                    'h-5 w-5 transition-all duration-200',
                    isActive && 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]'
                  )} />
                  
                  {/* Active glow effect */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-primary/5 animate-pulse" />
                  )}
                </div>
                
                <span className={cn(
                  'text-[10px] font-medium transition-all duration-200 leading-none',
                  isActive && 'font-semibold text-primary'
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}