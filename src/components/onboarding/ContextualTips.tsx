/**
 * Contextual Tips System - P1 Onboarding
 */

import { useState, useEffect } from 'react';
import { Lightbulb, X, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Tip {
  id: string;
  title: string;
  content: string;
  page?: string;
  feature?: string;
  priority?: 'high' | 'medium' | 'low';
}

// Tips store for tracking dismissed tips
interface TipsStore {
  dismissedTips: string[];
  dismissTip: (id: string) => void;
  resetTips: () => void;
  isDismissed: (id: string) => boolean;
}

export const useTipsStore = create<TipsStore>()(
  persist(
    (set, get) => ({
      dismissedTips: [],
      dismissTip: (id: string) => {
        set((state) => ({
          dismissedTips: [...state.dismissedTips, id],
        }));
      },
      resetTips: () => {
        set({ dismissedTips: [] });
      },
      isDismissed: (id: string) => {
        return get().dismissedTips.includes(id);
      },
    }),
    {
      name: 'mmc-tips-dismissed',
    }
  )
);

// Predefined tips
export const CONTEXTUAL_TIPS: Tip[] = [
  {
    id: 'keyboard-nav',
    title: 'Keyboard Navigation',
    content: 'Use ↑↓ arrows to navigate the sidebar, Enter to select, and Cmd+K for quick search.',
    feature: 'navigation',
    priority: 'high',
  },
  {
    id: 'favorite-pages',
    title: 'Pin Favorite Pages',
    content: 'Click the star icon on any page to pin it to the top of your sidebar for quick access.',
    feature: 'navigation',
    priority: 'medium',
  },
  {
    id: 'backtest-presets',
    title: 'Parameter Presets',
    content: 'Save your commonly used backtest parameters as presets to quickly apply them later.',
    page: 'workflow',
    priority: 'medium',
  },
  {
    id: 'data-quality',
    title: 'Data Quality Scores',
    content: 'Look for quality badges on datasets. Higher scores indicate cleaner, more reliable data.',
    page: 'data',
    priority: 'high',
  },
  {
    id: 'chart-zoom',
    title: 'Chart Interactions',
    content: 'Drag to zoom on charts. Double-click to reset the view. Use the screenshot button to save.',
    page: 'analytics',
    priority: 'medium',
  },
];

interface ContextualTipProps {
  tipId: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export function ContextualTip({ tipId, children, side = 'bottom', className }: ContextualTipProps) {
  const { isDismissed, dismissTip } = useTipsStore();
  const [open, setOpen] = useState(false);

  const tip = CONTEXTUAL_TIPS.find(t => t.id === tipId);
  
  if (!tip || isDismissed(tipId)) {
    return <>{children}</>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative inline-block">
          {children}
          {/* Pulse indicator */}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </span>
        </div>
      </PopoverTrigger>
      <PopoverContent 
        side={side} 
        className={cn("w-64 p-0", className)}
      >
        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-warning" />
              <h4 className="font-medium text-sm">{tip.title}</h4>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 -mt-1 -mr-1"
              onClick={() => {
                dismissTip(tipId);
                setOpen(false);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{tip.content}</p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() => {
              dismissTip(tipId);
              setOpen(false);
            }}
          >
            Got it
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Tips Panel - Shows all tips for current context
 */
interface TipsPanelProps {
  page?: string;
  feature?: string;
  className?: string;
}

export function TipsPanel({ page, feature, className }: TipsPanelProps) {
  const { isDismissed, dismissTip } = useTipsStore();

  const relevantTips = CONTEXTUAL_TIPS.filter(tip => {
    if (isDismissed(tip.id)) return false;
    if (page && tip.page && tip.page !== page) return false;
    if (feature && tip.feature && tip.feature !== feature) return false;
    return true;
  }).slice(0, 3);

  if (relevantTips.length === 0) return null;

  return (
    <div className={cn("p-3 rounded-lg bg-warning/5 border border-warning/20", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-warning" />
        <span className="text-xs font-medium">Tips</span>
      </div>
      <div className="space-y-2">
        {relevantTips.map(tip => (
          <div 
            key={tip.id}
            className="flex items-start gap-2 p-2 rounded-md bg-background/50"
          >
            <Lightbulb className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">{tip.title}</p>
              <p className="text-[10px] text-muted-foreground line-clamp-2">{tip.content}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0"
              onClick={() => dismissTip(tip.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
