/**
 * Backtest Recovery Banner
 * Shows when recovered runs are found after crash/refresh
 */

import { AlertTriangle, Play, X, Eye } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { BacktestRun } from '@/db';

interface RecoveryBannerProps {
  runs: BacktestRun[];
  onResume: (runId: string) => void;
  onCancel: (runId: string) => void;
  onCancelAll: () => void;
  onDismiss: () => void;
  isRecovering: boolean;
}

export function RecoveryBanner({
  runs,
  onResume,
  onCancel,
  onCancelAll,
  onDismiss,
  isRecovering,
}: RecoveryBannerProps) {
  if (runs.length === 0) return null;

  return (
    <Alert className="border-chart-4 bg-chart-4/10 mb-4">
      <AlertTriangle className="h-4 w-4 text-chart-4" />
      <AlertTitle className="text-chart-4">Recovered Runs Found</AlertTitle>
      <AlertDescription>
        <p className="text-sm text-muted-foreground mb-3">
          {runs.length} backtest run{runs.length > 1 ? 's were' : ' was'} interrupted. 
          Would you like to resume from the last checkpoint?
        </p>

        <div className="space-y-2">
          {runs.map((run) => (
            <div
              key={run.id}
              className="flex items-center justify-between p-2 rounded-md bg-background/50"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  Run at {run.progress.pct}%
                </span>
                <span className="text-xs text-muted-foreground">
                  {run.checkpoints?.length || 0} checkpoint(s)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onResume(run.id)}
                  disabled={isRecovering}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Resume
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onCancel(run.id)}
                  disabled={isRecovering}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 mt-3">
          {runs.length > 1 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancelAll}
              disabled={isRecovering}
            >
              Cancel All
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            disabled={isRecovering}
          >
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
