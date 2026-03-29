/**
 * CopilotHelpTooltip - Smart contextual help that links to MMC Copilot
 * Shows helpful tips and offers to open Copilot with pre-filled questions
 */

import { HelpCircle, MessageCircle, ExternalLink } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSupportBotStore } from '@/store/supportBotStore';

export interface HelpTopic {
  id: string;
  title: string;
  tip: string;
  copilotQuestion: string;
  shortcut?: string;
  learnMoreUrl?: string;
}

// Comprehensive help topics mapped to Copilot Q&A
export const HELP_TOPICS: Record<string, HelpTopic> = {
  // Data Management
  'csv-import': {
    id: 'csv-import',
    title: 'CSV Import',
    tip: 'Upload CSV files with Date/Time + OHLC columns. Supports MT5, TradingView, and custom formats.',
    copilotQuestion: 'CSV import kaise karu? Format kya chahiye?',
    shortcut: 'Ctrl+I',
  },
  'data-merge': {
    id: 'data-merge',
    title: 'Merge Datasets',
    tip: 'Combine multiple CSV files. Handle duplicate timestamps and timezone differences.',
    copilotQuestion: 'Data merge me duplicate timestamp error aa raha hai, kaise fix karu?',
  },
  'timezone': {
    id: 'timezone',
    title: 'Timezone Handling',
    tip: 'Set correct timezone for accurate backtest timing. IST is auto-converted to UTC.',
    copilotQuestion: 'Timezone mismatch during import ho raha hai, kaise handle karu?',
  },
  'data-quality': {
    id: 'data-quality',
    title: 'Data Quality',
    tip: 'Check for gaps, duplicates, and missing values. Quality score affects backtest reliability.',
    copilotQuestion: 'Data quality score low hai, kaise improve karu?',
  },

  // Strategy
  'strategy-paste': {
    id: 'strategy-paste',
    title: 'Paste Strategy Code',
    tip: 'Paste MQL4/5 EA code. Parser will extract parameters automatically.',
    copilotQuestion: 'MQL code paste karne ke baad parameters kaise extract honge?',
  },
  'strategy-params': {
    id: 'strategy-params',
    title: 'Strategy Parameters',
    tip: 'Define input parameters with ranges for optimization. Use sensible defaults.',
    copilotQuestion: 'Strategy parameters kaise define karu optimization ke liye?',
  },

  // Backtesting
  'backtest-run': {
    id: 'backtest-run',
    title: 'Run Backtest',
    tip: 'Execute strategy on historical data. Check data and strategy are valid first.',
    copilotQuestion: 'Backtest run karne ke liye kya steps hain?',
    shortcut: 'Ctrl+Enter',
  },
  'backtest-no-trades': {
    id: 'backtest-no-trades',
    title: 'No Trades Generated',
    tip: 'If no trades appear, check signal logic, date range, and parameter values.',
    copilotQuestion: 'Backtest me no trades generate ho rahe, kya check karu?',
  },

  // Broker Integration
  'zerodha-connect': {
    id: 'zerodha-connect',
    title: 'Zerodha Connection',
    tip: 'Connect Kite API for live trading. Token expires daily at 7:30 AM IST.',
    copilotQuestion: 'Zerodha Kite connect kaise karu?',
  },
  'zerodha-token-expiry': {
    id: 'zerodha-token-expiry',
    title: 'Token Expiry',
    tip: 'Kite tokens expire daily. Re-authenticate each morning before trading.',
    copilotQuestion: 'Zerodha token expiry ho gaya, baar baar login karna padta hai. Kya solution hai?',
  },
  'zerodha-order-rejected': {
    id: 'zerodha-order-rejected',
    title: 'Order Rejected',
    tip: 'Orders may fail due to margin, lot size, or market conditions.',
    copilotQuestion: 'Zerodha order reject ho gaya margin se. Kaise debug karu?',
  },

  // Workspace
  'workspace-invite': {
    id: 'workspace-invite',
    title: 'Invite Members',
    tip: 'Share workspace with team. Roles: Owner, Admin, Editor, Viewer.',
    copilotQuestion: 'Workspace me member invite kaise karu?',
  },
  'workspace-permissions': {
    id: 'workspace-permissions',
    title: 'Role Permissions',
    tip: 'Viewers can only see data. Editors can modify. Admins can manage members.',
    copilotQuestion: 'Workspace me Viewer role wala member edit nahi kar pa raha. Kya setting change karu?',
  },
  'workspace-sync': {
    id: 'workspace-sync',
    title: 'Cloud Sync',
    tip: 'Data syncs automatically when online. Manual sync available in settings.',
    copilotQuestion: 'Cloud sync conflict aa raha hai, kaise resolve karu?',
  },

  // Analytics
  'monte-carlo': {
    id: 'monte-carlo',
    title: 'Monte Carlo Analysis',
    tip: 'Simulate thousands of possible outcomes. 95th percentile shows worst-case scenarios.',
    copilotQuestion: 'Monte Carlo analysis kaise interpret karu?',
  },
  'walk-forward': {
    id: 'walk-forward',
    title: 'Walk-Forward Testing',
    tip: 'Out-of-sample testing to detect overfitting. Use 70/30 or 80/20 split.',
    copilotQuestion: 'Walk-forward analysis kya hai aur kaise use karu?',
  },
  'drawdown': {
    id: 'drawdown',
    title: 'Drawdown Analysis',
    tip: 'Max drawdown shows largest peak-to-trough decline. Key risk metric.',
    copilotQuestion: 'Drawdown analysis kaise karu aur acceptable range kya hai?',
  },

  // Optimization
  'genetic-algo': {
    id: 'genetic-algo',
    title: 'Genetic Algorithm',
    tip: 'Evolutionary optimization for parameter tuning. Good for large search spaces.',
    copilotQuestion: 'Genetic algorithm optimization kaise karu? Settings kya rakhu?',
  },
  'overfitting': {
    id: 'overfitting',
    title: 'Overfitting Detection',
    tip: 'Watch for R² > 0.95 or perfect results. Use walk-forward to validate.',
    copilotQuestion: 'Overfitting kaise detect karu? Red flags kya hain?',
  },

  // Results
  'profit-factor': {
    id: 'profit-factor',
    title: 'Profit Factor',
    tip: 'Gross profit / Gross loss. Above 1.5 is good, above 2.0 is excellent.',
    copilotQuestion: 'Profit factor kya hota hai aur good range kya hai?',
  },
  'sharpe-ratio': {
    id: 'sharpe-ratio',
    title: 'Sharpe Ratio',
    tip: 'Risk-adjusted return metric. Above 1.0 is acceptable, above 2.0 is excellent.',
    copilotQuestion: 'Sharpe ratio kaise calculate hota hai aur kya target rakhu?',
  },

  // Bulk Tester
  'bulk-queue': {
    id: 'bulk-queue',
    title: 'Bulk Test Queue',
    tip: 'Queue multiple backtests to run sequentially. Drag to reorder priority.',
    copilotQuestion: 'Bulk tester me queue kaise manage karu?',
  },
  'concurrency': {
    id: 'concurrency',
    title: 'Concurrency Settings',
    tip: 'Run multiple backtests in parallel. Higher = faster but more CPU usage.',
    copilotQuestion: 'Concurrency kitni set karu for optimal performance?',
  },

  // Reports
  'pdf-export': {
    id: 'pdf-export',
    title: 'PDF Export',
    tip: 'Generate professional reports with charts and metrics. Customize branding.',
    copilotQuestion: 'PDF report generate kaise karu with custom branding?',
  },
  'excel-export': {
    id: 'excel-export',
    title: 'Excel Export',
    tip: 'Export trades, equity curve, and metrics to Excel for further analysis.',
    copilotQuestion: 'Excel me export kaise karu with all trade details?',
  },
};

interface CopilotHelpTooltipProps {
  topicId: keyof typeof HELP_TOPICS;
  children?: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  showIcon?: boolean;
  variant?: 'tooltip' | 'hovercard';
}

export function CopilotHelpTooltip({
  topicId,
  children,
  side = 'top',
  className,
  showIcon = true,
  variant = 'tooltip',
}: CopilotHelpTooltipProps) {
  const topic = HELP_TOPICS[topicId];
  const { open, addMessage } = useSupportBotStore();

  if (!topic) {
    console.warn(`Help topic "${topicId}" not found`);
    return <>{children}</>;
  }

  const handleAskCopilot = () => {
    open();
    // Add message after a small delay to ensure the chat is open
    setTimeout(() => {
      addMessage({
        role: 'user',
        content: topic.copilotQuestion,
        timestamp: Date.now(),
      });
    }, 100);
  };

  const triggerContent = children || (
    showIcon && (
      <button
        className={cn(
          "inline-flex items-center justify-center h-4 w-4 rounded-full",
          "text-muted-foreground/60 hover:text-primary transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        aria-label={`Help: ${topic.title}`}
      >
        <HelpCircle className="h-3 w-3" />
      </button>
    )
  );

  if (variant === 'hovercard') {
    return (
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          {triggerContent}
        </HoverCardTrigger>
        <HoverCardContent side={side} className="w-72 p-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-semibold">{topic.title}</h4>
              {topic.shortcut && (
                <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                  {topic.shortcut}
                </kbd>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {topic.tip}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={handleAskCopilot}
              >
                <MessageCircle className="h-3 w-3" />
                Ask Copilot
              </Button>
              {topic.learnMoreUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1"
                  asChild
                >
                  <a href={topic.learnMoreUrl} target="_blank" rel="noopener noreferrer">
                    Learn More
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {triggerContent}
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium">{topic.title}</span>
            {topic.shortcut && (
              <kbd className="px-1 py-0.5 rounded bg-muted/50 text-[9px]">
                {topic.shortcut}
              </kbd>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{topic.tip}</p>
          <button
            onClick={handleAskCopilot}
            className="flex items-center gap-1 text-[10px] text-primary hover:underline mt-1"
          >
            <MessageCircle className="h-2.5 w-2.5" />
            Ask Copilot about this
          </button>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// Quick inline help icon component
interface InlineHelpProps {
  topicId: keyof typeof HELP_TOPICS;
  className?: string;
}

export function InlineHelp({ topicId, className }: InlineHelpProps) {
  return (
    <CopilotHelpTooltip topicId={topicId} className={className} variant="hovercard" />
  );
}

// Help badge for feature headers
interface HelpBadgeProps {
  topicId: keyof typeof HELP_TOPICS;
  className?: string;
}

export function HelpBadge({ topicId, className }: HelpBadgeProps) {
  const topic = HELP_TOPICS[topicId];
  const { open, addMessage } = useSupportBotStore();

  if (!topic) return null;

  const handleClick = () => {
    open();
    setTimeout(() => {
      addMessage({
        role: 'user',
        content: topic.copilotQuestion,
        timestamp: Date.now(),
      });
    }, 100);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]",
        "bg-primary/10 text-primary hover:bg-primary/20 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <HelpCircle className="h-3 w-3" />
      Need help?
    </button>
  );
}
