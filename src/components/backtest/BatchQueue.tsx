/**
 * Batch Backtest Queue - P0 Backtest Workflow
 * Basic queue list for batch backtests
 */

import { useState } from 'react';
import { 
  List, 
  Play, 
  Pause, 
  Trash2, 
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type QueueItemStatus = 'pending' | 'running' | 'complete' | 'error' | 'cancelled';

export interface BatchQueueItem {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  status: QueueItemStatus;
  progress?: number;
  addedAt: number;
  completedAt?: number;
  error?: string;
}

interface BatchQueueProps {
  items: BatchQueueItem[];
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onCancel: (id: string) => void;
  onRunAll?: () => void;
  onPauseAll?: () => void;
  isPaused?: boolean;
  className?: string;
}

const STATUS_CONFIGS: Record<QueueItemStatus, { icon: typeof Clock; color: string; bg: string; spin?: boolean }> = {
  pending: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
  running: { icon: Loader2, color: 'text-primary', bg: 'bg-primary/10', spin: true },
  complete: { icon: CheckCircle, color: 'text-profit', bg: 'bg-profit/10' },
  error: { icon: XCircle, color: 'text-loss', bg: 'bg-loss/10' },
  cancelled: { icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted' },
};

export function BatchQueue({
  items,
  onRemove,
  onMoveUp,
  onMoveDown,
  onCancel,
  onRunAll,
  onPauseAll,
  isPaused = false,
  className,
}: BatchQueueProps) {
  const pendingCount = items.filter(i => i.status === 'pending').length;
  const runningCount = items.filter(i => i.status === 'running').length;
  const completeCount = items.filter(i => i.status === 'complete').length;

  if (items.length === 0) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <List className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No backtests in queue</p>
        <p className="text-xs text-muted-foreground">Add backtests to run them in batch</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">Batch Queue</h4>
          <Badge variant="outline" className="text-[10px]">
            {pendingCount} pending
          </Badge>
          {runningCount > 0 && (
            <Badge variant="default" className="text-[10px]">
              {runningCount} running
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onPauseAll && runningCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={onPauseAll}
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </Button>
          )}
          {onRunAll && pendingCount > 0 && (
            <Button
              size="sm"
              className="h-7"
              onClick={onRunAll}
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              Run All
            </Button>
          )}
        </div>
      </div>

      {/* Queue List */}
      <ScrollArea className="h-64">
        <div className="space-y-1">
          {items.map((item, index) => {
            const config = STATUS_CONFIGS[item.status];
            const Icon = config.icon;
            const isPending = item.status === 'pending';
            const isRunning = item.status === 'running';

            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border border-border/30 bg-card/50 group",
                  isRunning && "border-primary/30 bg-primary/5"
                )}
              >
                {/* Status Icon */}
                <div className={cn("p-1.5 rounded", config.bg)}>
                  <Icon className={cn(
                    "h-3.5 w-3.5",
                    config.color,
                    config.spin && "animate-spin"
                  )} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.symbol} • {item.timeframe}
                    {item.progress !== undefined && ` • ${item.progress}%`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isPending && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onMoveUp(item.id)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onMoveDown(item.id)}
                        disabled={index === items.length - 1}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  {isRunning && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-loss"
                      onClick={() => onCancel(item.id)}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  )}
                  {(isPending || item.status === 'complete' || item.status === 'error') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-loss"
                      onClick={() => onRemove(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
        <span>{items.length} total</span>
        <span>{completeCount} completed</span>
      </div>
    </div>
  );
}
