/**
 * Real-time progress card for MT5 Strategy Tester
 * Shows progress bar, elapsed time, ETA, and current simulation date
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Calendar, 
  Cpu, 
  Loader2,
  CheckCircle2,
  XCircle,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProcessInfo, TesterProgress } from '../mt5/process-manager';
import { formatDuration } from '../mt5/process-manager';

interface TesterProgressCardProps {
  process?: ProcessInfo | null;
  progress?: TesterProgress | null;
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
}

export function TesterProgressCard({
  process,
  progress,
  onCancel,
  onRetry,
  className,
}: TesterProgressCardProps) {
  const status = process?.status || 'idle';
  const progressValue = progress?.progress ?? process?.progress ?? 0;
  const elapsedMs = progress?.elapsedMs ?? (process ? Date.now() - process.startTime : 0);
  const estimatedRemainingMs = progress?.estimatedRemainingMs;

  const statusConfig = useMemo(() => {
    switch (status) {
      case 'starting':
        return {
          icon: Loader2,
          label: 'Starting...',
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          animate: true,
        };
      case 'running':
        return {
          icon: Play,
          label: 'Running',
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-500/10',
          animate: false,
        };
      case 'completed':
        return {
          icon: CheckCircle2,
          label: 'Completed',
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-500/10',
          animate: false,
        };
      case 'error':
        return {
          icon: XCircle,
          label: 'Error',
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          animate: false,
        };
      case 'canceled':
        return {
          icon: Square,
          label: 'Canceled',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          animate: false,
        };
      default:
        return {
          icon: Pause,
          label: 'Idle',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          animate: false,
        };
    }
  }, [status]);

  const StatusIcon = statusConfig.icon;

  if (!process) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Cpu className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">No active backtest</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Start a backtest to see progress here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <div className={cn('p-1.5 rounded-md', statusConfig.bgColor)}>
              <StatusIcon 
                className={cn(
                  'h-4 w-4',
                  statusConfig.color,
                  statusConfig.animate && 'animate-spin'
                )} 
              />
            </div>
            Worker {process.workerId}
          </CardTitle>
          <Badge 
            variant={status === 'running' ? 'default' : 'secondary'}
            className={cn(
              status === 'running' && 'animate-pulse',
              status === 'completed' && 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
              status === 'error' && 'bg-destructive/20 text-destructive'
            )}
          >
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-mono font-medium">{progressValue.toFixed(1)}%</span>
          </div>
          <Progress 
            value={progressValue} 
            className={cn(
              'h-3',
              status === 'error' && '[&>div]:bg-destructive'
            )}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Elapsed Time */}
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Elapsed</p>
              <p className="text-sm font-mono font-medium">
                {formatDuration(elapsedMs)}
              </p>
            </div>
          </div>

          {/* ETA */}
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">ETA</p>
              <p className="text-sm font-mono font-medium">
                {estimatedRemainingMs 
                  ? formatDuration(estimatedRemainingMs)
                  : '--:--'
                }
              </p>
            </div>
          </div>

          {/* Current Date */}
          {progress?.currentDate && (
            <div className="col-span-2 flex items-center gap-2 p-2 rounded-md bg-muted/50">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Simulation Date</p>
                <p className="text-sm font-mono font-medium">
                  {progress.currentDate}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {status === 'error' && process.error && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{process.error}</p>
          </div>
        )}

        {/* Run ID */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Run ID: <code className="px-1 py-0.5 rounded bg-muted text-[10px]">{process.runId}</code>
          </p>
        </div>

        {/* Actions */}
        {(status === 'running' || status === 'starting') && onCancel && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onCancel}
            className="w-full"
          >
            <Square className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        )}

        {status === 'error' && onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
