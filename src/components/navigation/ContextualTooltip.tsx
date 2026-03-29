/**
 * Contextual Help Tooltip - P0 UX
 * Help tooltips on navigation items
 */

import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ContextualTooltipProps {
  content: string;
  shortcut?: string;
  className?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

const PAGE_HELP: Record<string, { tip: string; shortcut?: string }> = {
  '/data': {
    tip: 'Upload CSV data files for backtesting. Supports MT5 and TradingView formats.',
    shortcut: 'Ctrl+D',
  },
  '/workflow': {
    tip: 'Run backtests on your strategies with uploaded data.',
    shortcut: 'Ctrl+B',
  },
  '/strategies': {
    tip: 'Create, edit, and manage trading strategies. Paste MQL4/5 code here.',
  },
  '/optimizer': {
    tip: 'Optimize strategy parameters using genetic algorithms.',
  },
  '/analytics': {
    tip: 'Deep dive into performance metrics and trade analysis.',
  },
  '/saved-results': {
    tip: 'View and compare your saved backtest results.',
  },
  '/reports': {
    tip: 'Generate PDF reports of your backtest results.',
  },
  '/sentinel': {
    tip: 'AI-powered trading assistant for strategy analysis.',
  },
};

export function ContextualTooltip({ content, shortcut, className, side = 'right' }: ContextualTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground/60 hover:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className
          )}
          aria-label="Help"
        >
          <HelpCircle className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">
        <p className="text-xs">{content}</p>
        {shortcut && (
          <p className="text-xs text-muted-foreground mt-1">
            Shortcut: <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">{shortcut}</kbd>
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function getPageHelp(path: string) {
  return PAGE_HELP[path];
}
