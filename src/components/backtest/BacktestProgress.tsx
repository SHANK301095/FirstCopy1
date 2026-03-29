/**
 * Backtest Progress Tracker - P0 Backtest Workflow
 * Visual progress bar with stages, ETA, and cancel
 */

import { useState, useEffect } from 'react';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Pause,
  Play,
  X,
  FileSpreadsheet,
  Code,
  Activity,
  BarChart3,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type BacktestStage = 'idle' | 'parsing' | 'loading' | 'executing' | 'analyzing' | 'complete' | 'cancelled' | 'error';

interface BacktestProgressProps {
  stage: BacktestStage;
  progress: number; // 0-100
  startTime: number | null;
  tradesExecuted?: number;
  barsProcessed?: number;
  totalBars?: number;
  onCancel?: () => void;
  onPause?: () => void;
  isPaused?: boolean;
  error?: string;
  className?: string;
}

const STAGES = [
  { key: 'parsing', label: 'Parsing Strategy', icon: Code },
  { key: 'loading', label: 'Loading Data', icon: FileSpreadsheet },
  { key: 'executing', label: 'Executing Trades', icon: Activity },
  { key: 'analyzing', label: 'Analyzing Results', icon: BarChart3 },
];

export function BacktestProgress({
  stage,
  progress,
  startTime,
  tradesExecuted = 0,
  barsProcessed = 0,
  totalBars = 0,
  onCancel,
  onPause,
  isPaused = false,
  error,
  className,
}: BacktestProgressProps) {
  const [eta, setEta] = useState<string>('Calculating...');

  useEffect(() => {
    if (!startTime || progress === 0 || stage === 'complete' || stage === 'cancelled') {
      setEta(stage === 'complete' ? 'Done' : 'Calculating...');
      return;
    }

    const elapsed = Date.now() - startTime;
    const estimatedTotal = (elapsed / progress) * 100;
    const remaining = estimatedTotal - elapsed;

    if (remaining < 1000) {
      setEta('< 1s');
    } else if (remaining < 60000) {
      setEta(`~${Math.ceil(remaining / 1000)}s`);
    } else {
      setEta(`~${Math.ceil(remaining / 60000)}m`);
    }
  }, [progress, startTime, stage]);

  const isRunning = ['parsing', 'loading', 'executing', 'analyzing'].includes(stage);
  const isComplete = stage === 'complete';
  const isCancelled = stage === 'cancelled';
  const isError = stage === 'error';

  const getCurrentStageIndex = () => {
    return STAGES.findIndex(s => s.key === stage);
  };

  if (stage === 'idle') return null;

  return (
    <div className={cn("space-y-4 p-4 rounded-xl border border-border/50 bg-card/50", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRunning && !isPaused && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
          {isRunning && isPaused && <Pause className="h-4 w-4 text-warning" />}
          {isComplete && <CheckCircle className="h-4 w-4 text-profit" />}
          {isCancelled && <XCircle className="h-4 w-4 text-muted-foreground" />}
          {isError && <XCircle className="h-4 w-4 text-loss" />}
          <span className="text-sm font-medium">
            {isPaused ? 'Paused' : isComplete ? 'Backtest Complete' : isCancelled ? 'Cancelled' : isError ? 'Error' : 'Running Backtest...'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {isRunning && (
            <>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                ETA: {eta}
              </span>
              {onPause && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={onPause}
                >
                  {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                </Button>
              )}
              {onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-loss"
                  onClick={onCancel}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stage Indicators */}
      <div className="flex items-center gap-2">
        {STAGES.map((s, idx) => {
          const currentIdx = getCurrentStageIndex();
          const isActive = s.key === stage;
          const isCompleted = currentIdx > idx || isComplete;
          const Icon = s.icon;
          
          return (
            <div key={s.key} className="flex-1">
              <div className={cn(
                "flex items-center gap-1.5 p-2 rounded-lg border text-xs transition-all",
                isActive && "bg-primary/10 border-primary/40 text-primary",
                isCompleted && !isActive && "bg-profit/10 border-profit/40 text-profit",
                !isActive && !isCompleted && "bg-muted/30 border-border/30 text-muted-foreground"
              )}>
                {isCompleted && !isActive ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : isActive && isRunning && !isPaused ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline truncate">{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <Progress 
          value={progress} 
          className={cn(
            "h-2",
            isComplete && "bg-profit/20",
            isError && "bg-loss/20"
          )} 
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {barsProcessed > 0 && `${barsProcessed.toLocaleString()} / ${totalBars.toLocaleString()} bars`}
          </span>
          <span className="font-mono">{progress.toFixed(0)}%</span>
        </div>
      </div>

      {/* Stats */}
      {tradesExecuted > 0 && (
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">
            Trades: <span className="text-foreground font-medium">{tradesExecuted}</span>
          </span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-2 rounded-lg bg-loss/10 border border-loss/30 text-xs text-loss">
          {error}
        </div>
      )}
    </div>
  );
}
