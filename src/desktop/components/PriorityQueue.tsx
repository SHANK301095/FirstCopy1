/**
 * Priority Queue Component
 * Phase 8: Drag-drop reordering, priority lanes for bulk runs
 */

import { useState, useCallback } from 'react';
import { 
  GripVertical, 
  ArrowUp, 
  ArrowDown,
  Star,
  Clock,
  Zap,
  AlertTriangle,
  RotateCcw,
  Play,
  Pause,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export type Priority = 'high' | 'normal' | 'low';

export interface QueuedItem {
  id: string;
  name: string;
  priority: Priority;
  status: 'queued' | 'running' | 'paused' | 'done' | 'error';
  progress?: number;
  estimatedTime?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

interface PriorityQueueProps {
  items: QueuedItem[];
  onReorder: (items: QueuedItem[]) => void;
  onPriorityChange: (id: string, priority: Priority) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  className?: string;
}

const priorityConfig: Record<Priority, { label: string; icon: typeof Star; color: string; bg: string }> = {
  high: { 
    label: 'High', 
    icon: Zap, 
    color: 'text-red-500',
    bg: 'bg-red-500/10 border-red-500/30'
  },
  normal: { 
    label: 'Normal', 
    icon: Clock, 
    color: 'text-blue-500',
    bg: 'bg-blue-500/10 border-blue-500/30'
  },
  low: { 
    label: 'Low', 
    icon: ArrowDown, 
    color: 'text-gray-500',
    bg: 'bg-gray-500/10 border-gray-500/30'
  },
};

export function PriorityQueue({
  items,
  onReorder,
  onPriorityChange,
  onRemove,
  onRetry,
  onPause,
  onResume,
  className,
}: PriorityQueueProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== draggedId) {
      setDragOverId(id);
    }
  }, [draggedId]);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const draggedIndex = items.findIndex(i => i.id === draggedId);
    const targetIndex = items.findIndex(i => i.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    const newItems = [...items];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, removed);
    
    onReorder(newItems);
    setDraggedId(null);
  }, [draggedId, items, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  const moveItem = (id: string, direction: 'up' | 'down') => {
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const newItems = [...items];
    const [removed] = newItems.splice(index, 1);
    newItems.splice(newIndex, 0, removed);
    
    onReorder(newItems);
  };

  const cyclePriority = (id: string, current: Priority) => {
    const priorities: Priority[] = ['low', 'normal', 'high'];
    const currentIndex = priorities.indexOf(current);
    const nextPriority = priorities[(currentIndex + 1) % priorities.length];
    onPriorityChange(id, nextPriority);
  };

  // Group items by priority
  const groupedItems = {
    high: items.filter(i => i.priority === 'high'),
    normal: items.filter(i => i.priority === 'normal'),
    low: items.filter(i => i.priority === 'low'),
  };

  const renderItem = (item: QueuedItem, index: number, showIndex: boolean = true) => {
    const config = priorityConfig[item.priority];
    const PriorityIcon = config.icon;
    const isRunning = item.status === 'running';
    const isDone = item.status === 'done';
    const hasError = item.status === 'error';
    const isPaused = item.status === 'paused';

    return (
      <div
        key={item.id}
        draggable={!isRunning && !isDone}
        onDragStart={(e) => handleDragStart(e, item.id)}
        onDragOver={(e) => handleDragOver(e, item.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, item.id)}
        onDragEnd={handleDragEnd}
        className={cn(
          'group flex items-center gap-2 p-3 rounded-lg border transition-all duration-200',
          draggedId === item.id && 'opacity-50 scale-95',
          dragOverId === item.id && 'ring-2 ring-primary',
          isDone && 'opacity-60 bg-muted/30',
          hasError && 'border-destructive/50 bg-destructive/5',
          isRunning && 'border-primary/50 bg-primary/5',
          !isRunning && !isDone && 'cursor-grab active:cursor-grabbing hover:bg-muted/50'
        )}
      >
        {/* Drag Handle */}
        {!isRunning && !isDone && (
          <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}

        {/* Index Badge */}
        {showIndex && (
          <span className="text-xs text-muted-foreground tabular-nums w-5">
            #{index + 1}
          </span>
        )}

        {/* Priority Icon */}
        <button
          onClick={() => cyclePriority(item.id, item.priority)}
          disabled={isRunning || isDone}
          className={cn(
            'p-1 rounded transition-colors',
            !isRunning && !isDone && 'hover:bg-muted',
            config.color
          )}
          title={`Priority: ${config.label} (click to change)`}
        >
          <PriorityIcon className="h-4 w-4" />
        </button>

        {/* Name & Status */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{item.name}</div>
          {isRunning && item.progress !== undefined && (
            <div className="w-full h-1 mt-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          )}
          {hasError && item.error && (
            <div className="text-[10px] text-destructive truncate">{item.error}</div>
          )}
        </div>

        {/* Status Badge */}
        <Badge 
          variant={isDone ? 'secondary' : hasError ? 'destructive' : 'outline'}
          className="text-[10px] shrink-0"
        >
          {item.status}
        </Badge>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isDone && !isRunning && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => moveItem(item.id, 'up')}
                disabled={index === 0}
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => moveItem(item.id, 'down')}
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </>
          )}

          {hasError && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={() => onRetry(item.id)}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}

          {isRunning && onPause && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onPause(item.id)}
            >
              <Pause className="h-3 w-3" />
            </Button>
          )}

          {isPaused && onResume && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onResume(item.id)}
            >
              <Play className="h-3 w-3" />
            </Button>
          )}

          {!isRunning && !isDone && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={() => onRemove(item.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            Priority Queue
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{items.filter(i => i.status === 'queued').length} queued</span>
            <span>•</span>
            <span>{items.filter(i => i.status === 'running').length} running</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {/* High Priority Lane */}
            {groupedItems.high.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs font-semibold text-red-500 uppercase tracking-wide">
                    High Priority
                  </span>
                  <Badge variant="outline" className="text-[10px] h-4">
                    {groupedItems.high.length}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {groupedItems.high.map((item, i) => renderItem(item, i, false))}
                </div>
              </div>
            )}

            {/* Normal Priority Lane */}
            {groupedItems.normal.length > 0 && (
              <div>
                {groupedItems.high.length > 0 && <Separator className="mb-3" />}
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">
                    Normal
                  </span>
                  <Badge variant="outline" className="text-[10px] h-4">
                    {groupedItems.normal.length}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {groupedItems.normal.map((item, i) => renderItem(item, i, false))}
                </div>
              </div>
            )}

            {/* Low Priority Lane */}
            {groupedItems.low.length > 0 && (
              <div>
                {(groupedItems.high.length > 0 || groupedItems.normal.length > 0) && (
                  <Separator className="mb-3" />
                )}
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDown className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Low Priority
                  </span>
                  <Badge variant="outline" className="text-[10px] h-4">
                    {groupedItems.low.length}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {groupedItems.low.map((item, i) => renderItem(item, i, false))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {items.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No items in queue</p>
                <p className="text-xs">Add EAs to start bulk processing</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
