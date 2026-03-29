/**
 * Bulk Runner Grid Component
 * Spec: "20-20 slots" paged grid UI for bulk EA backtesting
 * Enhanced: Polished animations, better status indicators, time estimates
 */

import { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Square,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Timer,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { QueueItem, QueueState } from '../mt5/types';

// Format seconds to readable duration
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

interface BulkRunnerGridProps {
  state: QueueState;
  pageSize?: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onReset: () => void;
  onPageChange: (page: number) => void;
}

export function BulkRunnerGrid({
  state,
  pageSize = 20,
  onStart,
  onPause,
  onResume,
  onCancel,
  onReset,
  onPageChange,
}: BulkRunnerGridProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  const totalPages = Math.ceil(state.totalItems / pageSize);
  const currentPage = state.currentPage;
  
  // Get items for current page
  const startIdx = (currentPage - 1) * pageSize;
  const pageItems = state.items.slice(startIdx, startIdx + pageSize);
  
  // Fill remaining slots with empty placeholders
  const slots: (QueueItem | null)[] = [...pageItems];
  while (slots.length < pageSize) {
    slots.push(null);
  }

  // Calculate overall progress
  const overallProgress = state.totalItems > 0
    ? ((state.completedItems + state.reusedItems) / state.totalItems) * 100
    : 0;

  // Track elapsed time
  useEffect(() => {
    if (state.status === 'running' && !startTime) {
      setStartTime(Date.now());
    } else if (state.status !== 'running' && state.status !== 'paused') {
      setStartTime(null);
      setElapsedTime(0);
    }
  }, [state.status, startTime]);

  useEffect(() => {
    if (state.status === 'running' && startTime) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [state.status, startTime]);

  // Estimate remaining time
  const estimatedRemaining = useMemo(() => {
    const completed = state.completedItems + state.reusedItems;
    if (completed === 0 || elapsedTime === 0) return null;
    const avgTimePerItem = elapsedTime / completed;
    const remaining = state.totalItems - completed;
    return Math.round(avgTimePerItem * remaining);
  }, [state.completedItems, state.reusedItems, state.totalItems, elapsedTime]);

  const getStatusIcon = (status: QueueItem['status']) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="h-4 w-4 text-chart-2" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-chart-4" />;
      case 'canceled':
        return <Square className="h-4 w-4 text-muted-foreground" />;
      case 'reused':
        return <RotateCcw className="h-4 w-4 text-chart-3" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: QueueItem['status']) => {
    switch (status) {
      case 'done':
        return 'border-chart-2 bg-chart-2/10 hover:bg-chart-2/20';
      case 'error':
        return 'border-destructive bg-destructive/10 hover:bg-destructive/20';
      case 'running':
        return 'border-primary bg-primary/10 animate-pulse';
      case 'paused':
        return 'border-chart-4 bg-chart-4/10';
      case 'canceled':
        return 'border-muted bg-muted/50';
      case 'reused':
        return 'border-chart-3 bg-chart-3/10 hover:bg-chart-3/20';
      default:
        return 'border-border bg-card hover:bg-muted/50';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">
            {state.bulkConfig?.name || 'Bulk Run'}
          </h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{state.totalItems} EAs</span>
            <span>•</span>
            <span className="text-chart-2">{state.completedItems} done</span>
            <span>•</span>
            <span className="text-destructive">{state.failedItems} failed</span>
            <span>•</span>
            <span className="text-chart-3">{state.reusedItems} cached</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {state.status === 'idle' && (
            <Button onClick={onStart} disabled={state.totalItems === 0}>
              <Play className="h-4 w-4 mr-1" />
              Start Bulk Run
            </Button>
          )}
          
          {state.status === 'running' && (
            <>
              <Button variant="outline" onClick={onPause}>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
              <Button variant="destructive" onClick={onCancel}>
                <Square className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </>
          )}
          
          {state.status === 'paused' && (
            <>
              <Button onClick={onResume}>
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
              <Button variant="destructive" onClick={onCancel}>
                <Square className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </>
          )}
          
          {(state.status === 'completed' || state.status === 'error') && (
            <Button variant="outline" onClick={onReset}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Overall progress */}
      <Card className="overflow-hidden">
        <div 
          className="h-1 bg-primary transition-all duration-500 ease-out"
          style={{ width: `${overallProgress}%` }}
        />
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span>Progress</span>
                </div>
                {state.status === 'running' && elapsedTime > 0 && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Timer className="h-3 w-3" />
                    {formatDuration(elapsedTime)}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="tabular-nums font-bold text-lg">
                  {state.completedItems + state.reusedItems}
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="tabular-nums text-muted-foreground">
                  {state.totalItems}
                </span>
              </div>
            </div>
            
            <Progress value={overallProgress} className="h-2.5" />
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {state.bulkConfig?.concurrency || 2} workers
                </span>
                {state.status === 'running' && estimatedRemaining && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    ~{formatDuration(estimatedRemaining)} remaining
                  </span>
                )}
              </div>
              <span className="tabular-nums font-medium text-foreground">
                {overallProgress.toFixed(1)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 20-20 Slots Grid */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              Slots {startIdx + 1}–{Math.min(startIdx + pageSize, state.totalItems)} of {state.totalItems}
            </CardTitle>
            
            {/* Pagination */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="text-sm tabular-nums min-w-[60px] text-center">
                {currentPage} / {totalPages || 1}
              </span>
              
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Grid of 20 slots (4x5 or 5x4) */}
          <div className="grid grid-cols-4 lg:grid-cols-5 gap-2">
            {slots.map((item, idx) => (
              <Tooltip key={item?.id || `empty-${idx}`}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'relative p-3 rounded-lg border-2 transition-all duration-200 min-h-[80px] cursor-default',
                      item ? getStatusColor(item.status) : 'border-dashed border-muted bg-muted/20 opacity-50'
                    )}
                  >
                    {item ? (
                      <>
                        {/* Slot number badge */}
                        <div className="absolute top-1 left-1 text-[10px] text-muted-foreground tabular-nums font-medium">
                          #{startIdx + idx + 1}
                        </div>
                        
                        {/* Status icon */}
                        <div className="absolute top-1 right-1">
                          {getStatusIcon(item.status)}
                        </div>
                        
                        {/* EA name */}
                        <div className="mt-4 text-xs font-medium truncate" title={item.eaName}>
                          {item.eaName}
                        </div>
                        
                        {/* Preset name */}
                        {item.presetName && (
                          <div className="text-[10px] text-muted-foreground truncate">
                            {item.presetName}
                          </div>
                        )}
                        
                        {/* Progress for running items */}
                        {item.status === 'running' && (
                          <div className="mt-2 space-y-1">
                            <Progress value={item.progress} className="h-1" />
                            <div className="text-[9px] text-muted-foreground tabular-nums text-right">
                              {item.progress?.toFixed(0)}%
                            </div>
                          </div>
                        )}
                        
                        {/* Error indicator */}
                        {item.status === 'error' && item.error && (
                          <div className="mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
                            <span className="text-[10px] text-destructive truncate">
                              Error
                            </span>
                          </div>
                        )}
                        
                        {/* Reused indicator */}
                        {item.status === 'reused' && (
                          <Badge variant="secondary" className="text-[9px] mt-1 px-1.5 gap-0.5">
                            <Zap className="h-2 w-2" />
                            Cached
                          </Badge>
                        )}
                        
                        {/* Done indicator with checkmark animation */}
                        {item.status === 'done' && (
                          <Badge variant="outline" className="text-[9px] mt-1 px-1.5 border-chart-2/50 text-chart-2">
                            Complete
                          </Badge>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground/30">
                        <span className="text-xs">—</span>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                {item && (
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium">{item.eaName}</p>
                      {item.presetName && (
                        <p className="text-xs text-muted-foreground">Preset: {item.presetName}</p>
                      )}
                      {item.status === 'error' && item.error && (
                        <p className="text-xs text-destructive">{item.error}</p>
                      )}
                      {item.status === 'running' && (
                        <p className="text-xs">Progress: {item.progress?.toFixed(1)}%</p>
                      )}
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Queued</span>
        </div>
        <div className="flex items-center gap-1">
          <Loader2 className="h-3 w-3" />
          <span>Running</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-chart-2" />
          <span>Done</span>
        </div>
        <div className="flex items-center gap-1">
          <XCircle className="h-3 w-3 text-destructive" />
          <span>Failed</span>
        </div>
        <div className="flex items-center gap-1">
          <RotateCcw className="h-3 w-3 text-chart-3" />
          <span>Cached</span>
        </div>
      </div>
    </div>
  );
}
