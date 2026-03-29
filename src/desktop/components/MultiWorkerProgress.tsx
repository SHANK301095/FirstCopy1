/**
 * Multi-Worker Progress Panel
 * Shows progress for all active workers (up to 4)
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Cpu, 
  Play, 
  Pause, 
  Square, 
  CheckCircle2, 
  XCircle,
  Loader2,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TesterProgressCard } from './TesterProgressCard';
import type { ProcessInfo, TesterProgress } from '../mt5/process-manager';
import { getAllProcesses, onProgress, formatDuration } from '../mt5/process-manager';

interface WorkerSlot {
  id: string;
  process?: ProcessInfo;
  progress?: TesterProgress;
}

interface MultiWorkerProgressProps {
  workerCount?: number;
  onCancelWorker?: (workerId: string) => void;
  onPauseAll?: () => void;
  onResumeAll?: () => void;
  className?: string;
}

export function MultiWorkerProgress({
  workerCount = 4,
  onCancelWorker,
  onPauseAll,
  onResumeAll,
  className,
}: MultiWorkerProgressProps) {
  const [workers, setWorkers] = useState<WorkerSlot[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, TesterProgress>>(new Map());

  // Initialize worker slots
  useEffect(() => {
    const slots: WorkerSlot[] = [];
    const letters = ['A', 'B', 'C', 'D'];
    for (let i = 0; i < Math.min(workerCount, 4); i++) {
      slots.push({ id: letters[i] });
    }
    setWorkers(slots);
  }, [workerCount]);

  // Subscribe to progress updates
  useEffect(() => {
    const unsubscribe = onProgress((progress) => {
      setProgressMap(prev => {
        const next = new Map(prev);
        next.set(progress.workerId, progress);
        return next;
      });
    });

    return unsubscribe;
  }, []);

  // Refresh process list
  useEffect(() => {
    const interval = setInterval(() => {
      const processes = getAllProcesses();
      setWorkers(prev => prev.map(slot => ({
        ...slot,
        process: processes.find(p => p.workerId === slot.id),
        progress: progressMap.get(slot.id),
      })));
    }, 250);

    return () => clearInterval(interval);
  }, [progressMap]);

  // Calculate aggregate stats
  const activeCount = workers.filter(w => 
    w.process?.status === 'running' || w.process?.status === 'starting'
  ).length;
  
  const completedCount = workers.filter(w => 
    w.process?.status === 'completed'
  ).length;
  
  const errorCount = workers.filter(w => 
    w.process?.status === 'error'
  ).length;

  const avgProgress = workers.reduce((sum, w) => {
    return sum + (w.progress?.progress ?? w.process?.progress ?? 0);
  }, 0) / Math.max(workers.length, 1);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Worker Status
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Cpu className="h-3 w-3" />
                {activeCount} / {workerCount} Active
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-mono font-medium">{avgProgress.toFixed(1)}%</span>
            </div>
            <Progress value={avgProgress} className="h-2" />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-md bg-emerald-500/10">
              <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">{completedCount}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Completed</p>
            </div>
            <div className="p-2 rounded-md bg-primary/10">
              <div className="flex items-center justify-center gap-1 text-primary">
                <Loader2 className={cn("h-4 w-4", activeCount > 0 && "animate-spin")} />
                <span className="font-medium">{activeCount}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Running</p>
            </div>
            <div className="p-2 rounded-md bg-destructive/10">
              <div className="flex items-center justify-center gap-1 text-destructive">
                <XCircle className="h-4 w-4" />
                <span className="font-medium">{errorCount}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Errors</p>
            </div>
          </div>

          {/* Control Buttons */}
          {activeCount > 0 && (
            <div className="flex gap-2">
              {onPauseAll && (
                <Button variant="outline" size="sm" className="flex-1" onClick={onPauseAll}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause All
                </Button>
              )}
              {onResumeAll && (
                <Button variant="outline" size="sm" className="flex-1" onClick={onResumeAll}>
                  <Play className="h-4 w-4 mr-2" />
                  Resume All
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Worker Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workers.map((worker) => (
          <TesterProgressCard
            key={worker.id}
            process={worker.process}
            progress={worker.progress}
            onCancel={onCancelWorker ? () => onCancelWorker(worker.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
