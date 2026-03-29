/**
 * Import Progress Bar - P0 Data Manager
 * Shows import progress with ETA
 */

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, Clock, FileSpreadsheet } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ImportProgressProps {
  progress: number; // 0-100
  currentStep: string;
  rowsProcessed: number;
  totalRows: number;
  startTime: number | null;
  className?: string;
}

export function ImportProgress({
  progress,
  currentStep,
  rowsProcessed,
  totalRows,
  startTime,
  className,
}: ImportProgressProps) {
  const [eta, setEta] = useState<string>('Calculating...');

  useEffect(() => {
    if (!startTime || progress === 0 || progress >= 100) {
      setEta(progress >= 100 ? 'Complete' : 'Calculating...');
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
  }, [progress, startTime]);

  const isComplete = progress >= 100;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle className="h-4 w-4 text-profit animate-in zoom-in" />
          ) : (
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          )}
          <span className="text-sm font-medium">
            {isComplete ? 'Import Complete' : 'Importing...'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            ETA: {eta}
          </span>
          <span className="font-mono">{progress.toFixed(0)}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <Progress 
        value={progress} 
        className={cn("h-2", isComplete && "bg-profit/20")} 
      />

      {/* Details */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <FileSpreadsheet className="h-3 w-3" />
          {currentStep}
        </span>
        <span className="font-mono">
          {rowsProcessed.toLocaleString()} / {totalRows.toLocaleString()} rows
        </span>
      </div>
    </div>
  );
}

/**
 * Data Quality Score Badge - P0 Data Manager
 */
interface QualityScoreBadgeProps {
  score: number; // 0-100
  compact?: boolean;
  className?: string;
}

export function QualityScoreBadge({ score, compact = false, className }: QualityScoreBadgeProps) {
  const getColor = () => {
    if (score >= 90) return 'bg-profit/20 text-profit border-profit/30';
    if (score >= 70) return 'bg-warning/20 text-warning border-warning/30';
    return 'bg-loss/20 text-loss border-loss/30';
  };

  const getLabel = () => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  if (compact) {
    return (
      <span className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
        getColor(),
        className
      )}>
        {score}%
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        getColor()
      )}>
        {score}%
      </span>
      <span className="text-xs text-muted-foreground">{getLabel()}</span>
    </div>
  );
}

/**
 * Duplicate Detection Alert - P0 Data Manager
 */
interface DuplicateAlertProps {
  count: number;
  onResolve: (action: 'keep-first' | 'keep-last' | 'remove-all') => void;
  className?: string;
}

export function DuplicateAlert({ count, onResolve, className }: DuplicateAlertProps) {
  if (count === 0) return null;

  return (
    <div className={cn(
      "p-3 rounded-lg bg-warning/10 border border-warning/30",
      className
    )}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-warning">
            {count} duplicate rows detected
          </p>
          <p className="text-xs text-muted-foreground">
            Choose how to handle duplicate timestamps
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onResolve('keep-first')}
            className="px-2 py-1 text-xs rounded bg-muted hover:bg-muted/80 transition-colors"
          >
            Keep First
          </button>
          <button
            onClick={() => onResolve('keep-last')}
            className="px-2 py-1 text-xs rounded bg-muted hover:bg-muted/80 transition-colors"
          >
            Keep Last
          </button>
        </div>
      </div>
    </div>
  );
}
