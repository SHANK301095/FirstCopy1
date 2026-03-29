/**
 * Quick Actions Floating Action Button (FAB)
 * Production-grade floating button with expandable action menu
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  X,
  Play,
  Upload,
  FileCode,
  BarChart3,
  TrendingUp,
  Scan,
  Zap,
  LineChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { hapticFeedback } from '@/lib/haptics';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  color: string;
  description: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'backtest',
    label: 'Run Backtest',
    icon: Play,
    path: '/workflow',
    color: 'bg-primary hover:bg-primary/90',
    description: 'Start a new backtest run',
  },
  {
    id: 'import',
    label: 'Import Data',
    icon: Upload,
    path: '/data',
    color: 'bg-emerald-600 hover:bg-emerald-700',
    description: 'Upload CSV market data',
  },
  {
    id: 'strategy',
    label: 'New Strategy',
    icon: FileCode,
    path: '/strategies',
    color: 'bg-violet-600 hover:bg-violet-700',
    description: 'Create a trading strategy',
  },
  {
    id: 'scanner',
    label: 'Run Scanner',
    icon: Scan,
    path: '/scanner',
    color: 'bg-amber-600 hover:bg-amber-700',
    description: 'Scan for trading signals',
  },
  {
    id: 'optimizer',
    label: 'Optimize',
    icon: Zap,
    path: '/optimizer',
    color: 'bg-rose-600 hover:bg-rose-700',
    description: 'Optimize strategy parameters',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: LineChart,
    path: '/analytics',
    color: 'bg-cyan-600 hover:bg-cyan-700',
    description: 'View performance analytics',
  },
];

// Pages where FAB should be hidden
const hiddenOnPages = ['/login', '/signup', '/forgot-password', '/reset-password', '/landing'];

export function QuickActionsFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Hide FAB on certain pages
  const shouldHide = hiddenOnPages.some(page => location.pathname.startsWith(page));

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          setIsVisible(currentScrollY < lastScrollY || currentScrollY < 100);
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleToggle = useCallback(() => {
    hapticFeedback('light');
    setIsOpen(prev => !prev);
  }, []);

  const handleAction = useCallback((action: QuickAction) => {
    hapticFeedback('medium');
    setIsOpen(false);
    navigate(action.path);
  }, [navigate]);

  if (shouldHide) return null;

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB Container */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20,
          delay: 0.3
        }}
        className={cn(
          'fixed z-50',
          'top-16 right-2 sm:top-14 sm:right-4',
          !isVisible && !isOpen && '-translate-y-24 opacity-0 pointer-events-none transition-all duration-300'
        )}
      >
        {/* Action Buttons */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute top-12 right-0 flex flex-col gap-2 items-end"
            >
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, x: 20, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0, 
                    scale: 1,
                    transition: { delay: index * 0.05 }
                  }}
                  exit={{ 
                    opacity: 0, 
                    x: 20, 
                    scale: 0.8,
                    transition: { delay: (quickActions.length - index) * 0.03 }
                  }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleAction(action)}
                        className={cn(
                          'h-12 gap-3 px-4 rounded-full shadow-lg text-white',
                          action.color
                        )}
                      >
                        <action.icon className="h-5 w-5" />
                        <span className="font-medium">{action.label}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" sideOffset={8}>
                      {action.description}
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB Button */}
        <motion.button
          onClick={handleToggle}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={cn(
            'h-10 w-10 rounded-full shadow-lg flex items-center justify-center',
            'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground',
            'hover:shadow-xl hover:shadow-primary/25 transition-shadow',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
          )}
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {isOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </motion.div>
        </motion.button>
      </motion.div>
    </>
  );
}
