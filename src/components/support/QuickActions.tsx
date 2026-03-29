import { Upload, Play, BarChart2, Settings, Bug, MessageCircle, Database, HelpCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { CONTACT_URL } from '@/lib/supportBot/systemPrompt';

interface QuickActionsProps {
  onActionClick: (message: string) => void;
  className?: string;
  showSuggestions?: boolean;
  compact?: boolean; // For pinned mode - smaller buttons
}

// Primary quick action buttons
const quickActions = [
  { icon: Upload, label: 'Import Data', message: 'How do I import CSV data?' },
  { icon: Play, label: 'Run Backtest', message: 'How do I run a backtest?' },
  { icon: BarChart2, label: 'View Results', message: 'Where can I see my backtest results?' },
  { icon: Settings, label: 'Settings', message: 'How do I configure settings?' },
];

// Auto-suggested questions when chat opens
const suggestedQuestions = [
  { icon: Database, label: 'Dataset not visible?', message: 'My dataset is not showing up. What should I do?' },
  { icon: HelpCircle, label: 'Formats supported?', message: 'What file formats are supported for import?' },
  { icon: RefreshCw, label: 'Sync issues?', message: 'My data is not syncing across devices. How to fix?' },
  { icon: Bug, label: 'Report a bug', message: 'I want to report a bug in the app' },
];

export function QuickActions({ onActionClick, className, showSuggestions = true, compact = false }: QuickActionsProps) {
  return (
    <div className={cn('space-y-4', compact && 'space-y-2', className)}>
      {/* Primary Actions */}
      <div>
        {!compact && (
          <p className="text-[10px] text-muted-foreground font-semibold px-0.5 mb-2.5 uppercase tracking-widest font-heading">
            Quick Actions
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className={cn(
                "gap-2 bg-muted/40 hover:bg-muted border-border/40 hover:border-border/60 rounded-xl transition-all",
                compact ? "h-7 text-[11px] px-2.5" : "h-8 text-xs px-3"
              )}
              onClick={() => onActionClick(action.message)}
            >
              <action.icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Suggested Questions */}
      {showSuggestions && !compact && (
        <div>
          <p className="text-[10px] text-muted-foreground font-semibold px-0.5 mb-2.5 uppercase tracking-widest font-heading">
            Common Questions
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedQuestions.map((q) => (
              <Button
                key={q.label}
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] gap-1.5 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors"
                onClick={() => onActionClick(q.message)}
              >
                <q.icon className="h-3 w-3" />
                {q.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Contact Support Button - hide in compact */}
      {!compact && (
        <div className="pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-2 w-full bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 border-primary/20 text-primary rounded-xl transition-all"
            asChild
          >
            <Link to={CONTACT_URL}>
              <MessageCircle className="h-3.5 w-3.5" />
              Contact Human Support
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

// Navigation buttons component for inline responses
interface NavigationButtonsProps {
  buttons: Array<{ label: string; path: string }>;
  className?: string;
}

export function NavigationButtons({ buttons, className }: NavigationButtonsProps) {
  return (
    <div className={cn('flex flex-wrap gap-1.5 mt-2', className)}>
      {buttons.map((btn) => (
        <Button
          key={btn.path}
          variant="outline"
          size="sm"
          className="h-6 text-[10px] gap-1 px-2"
          asChild
        >
          <Link to={btn.path}>{btn.label}</Link>
        </Button>
      ))}
    </div>
  );
}
