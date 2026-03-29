/**
 * FeatureHelpPanel - Contextual help panel for current feature/page
 * Shows relevant tips and quick Copilot questions
 */

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  HelpCircle, 
  MessageCircle, 
  ChevronRight, 
  Lightbulb,
  X,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useSupportBotStore } from '@/store/supportBotStore';
import { HELP_TOPICS, HelpTopic } from './CopilotHelpTooltip';

// Map routes to relevant help topics
const PAGE_HELP_TOPICS: Record<string, string[]> = {
  '/data': ['csv-import', 'data-merge', 'timezone', 'data-quality'],
  '/workflow': ['csv-import', 'strategy-paste', 'backtest-run', 'backtest-no-trades'],
  '/strategies': ['strategy-paste', 'strategy-params', 'overfitting'],
  '/optimizer': ['genetic-algo', 'overfitting', 'walk-forward'],
  '/analytics': ['profit-factor', 'sharpe-ratio', 'drawdown', 'monte-carlo'],
  '/advanced-analytics': ['monte-carlo', 'walk-forward', 'drawdown'],
  '/saved-results': ['profit-factor', 'sharpe-ratio', 'pdf-export', 'excel-export'],
  '/reports': ['pdf-export', 'excel-export'],
  '/bulk-tester': ['bulk-queue', 'concurrency', 'backtest-run'],
  '/execution-bridge': ['zerodha-connect', 'zerodha-token-expiry', 'zerodha-order-rejected'],
  '/workspace': ['workspace-invite', 'workspace-permissions', 'workspace-sync'],
  '/settings': ['workspace-sync', 'timezone'],
};

interface FeatureHelpPanelProps {
  className?: string;
  compact?: boolean;
}

export function FeatureHelpPanel({ className, compact = false }: FeatureHelpPanelProps) {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(!compact);
  const { open, addMessage } = useSupportBotStore();

  // Get relevant topics for current page
  const topicIds = PAGE_HELP_TOPICS[location.pathname] || [];
  const topics = topicIds
    .map(id => HELP_TOPICS[id])
    .filter(Boolean) as HelpTopic[];

  if (topics.length === 0) return null;

  const handleAskCopilot = (question: string) => {
    open();
    setTimeout(() => {
      addMessage({
        role: 'user',
        content: question,
        timestamp: Date.now(),
      });
    }, 100);
  };

  if (compact) {
    return (
      <div className={cn("relative", className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-1.5 h-8"
        >
          <Lightbulb className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Quick Help</span>
          <ChevronRight className={cn(
            "h-3.5 w-3.5 transition-transform",
            isExpanded && "rotate-90"
          )} />
        </Button>

        {isExpanded && (
          <Card className="absolute right-0 top-10 w-72 z-50 shadow-lg animate-in fade-in slide-in-from-top-2">
            <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Quick Help
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsExpanded(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-48">
                <div className="space-y-1">
                  {topics.slice(0, 5).map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => handleAskCopilot(topic.copilotQuestion)}
                      className={cn(
                        "w-full text-left p-2 rounded-md transition-colors",
                        "hover:bg-muted/80 group"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <HelpCircle className="h-3.5 w-3.5 mt-0.5 text-muted-foreground group-hover:text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{topic.title}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-2">
                            {topic.tip}
                          </p>
                        </div>
                        <MessageCircle className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary" />
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Quick Help for this Page
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="space-y-2">
          {topics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => handleAskCopilot(topic.copilotQuestion)}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-all",
                "hover:border-primary/50 hover:bg-primary/5 group"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{topic.title}</span>
                    {topic.shortcut && (
                      <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                        {topic.shortcut}
                      </kbd>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {topic.tip}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Ask
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Floating help button for mobile
export function FloatingHelpButton() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { open, addMessage } = useSupportBotStore();

  const topicIds = PAGE_HELP_TOPICS[location.pathname] || [];
  const topics = topicIds
    .map(id => HELP_TOPICS[id])
    .filter(Boolean) as HelpTopic[];

  if (topics.length === 0) return null;

  const handleAskCopilot = (question: string) => {
    setIsOpen(false);
    open();
    setTimeout(() => {
      addMessage({
        role: 'user',
        content: question,
        timestamp: Date.now(),
      });
    }, 100);
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-20 sm:bottom-5 right-[7.5rem] h-10 w-10 rounded-full shadow-lg z-40 bg-background border-border hover:bg-primary/10"
        onClick={() => setIsOpen(true)}
        title="Quick Help"
      >
        <Lightbulb className="h-5 w-5" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-md animate-in slide-in-from-bottom">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Quick Help
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-3 pt-0 pb-6">
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {topics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => handleAskCopilot(topic.copilotQuestion)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-colors",
                        "active:bg-primary/10"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <HelpCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{topic.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {topic.tip}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
