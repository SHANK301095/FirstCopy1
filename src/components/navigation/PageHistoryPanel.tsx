/**
 * Page History Panel - P1 Navigation
 * Full page visit history
 */

import { History, Trash2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePageHistory } from '@/hooks/usePageHistory';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface PageHistoryPanelProps {
  className?: string;
}

export function PageHistoryPanel({ className }: PageHistoryPanelProps) {
  const { history, clearHistory } = usePageHistory();

  // Group history by date
  const groupedHistory = history.reduce((groups, visit) => {
    const date = new Date(visit.timestamp).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(visit);
    return groups;
  }, {} as Record<string, typeof history>);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className={cn("gap-1.5", className)}>
          <History className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">History</span>
          {history.length > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              {history.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Page History
            </SheetTitle>
            {history.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearHistory}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
          {history.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No history yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedHistory).map(([date, visits]) => (
                <div key={date}>
                  <p className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                    {date === new Date().toLocaleDateString() ? 'Today' : date}
                  </p>
                  <div className="space-y-1">
                    {visits.map((visit, idx) => (
                      <Link
                        key={`${visit.path}-${idx}`}
                        to={visit.path}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate group-hover:text-primary">
                            {visit.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {visit.path}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(visit.timestamp, { addSuffix: true })}
                          </span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
