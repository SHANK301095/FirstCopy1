/**
 * Live Backtest Monitor Component
 * Real-time progress tracking for MT5 Strategy Tester runs
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export type BacktestStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error' | 'canceled';

export interface LiveBacktestState {
  runId: string;
  eaName: string;
  presetName?: string;
  status: BacktestStatus;
  progress: number; // 0-100
  startTime: number;
  currentTime?: number;
  estimatedEndTime?: number;
  currentBar?: number;
  totalBars?: number;
  currentDate?: string;
  equity: number[];
  drawdown: number[];
  currentEquity?: number;
  currentDrawdown?: number;
  tradesCount?: number;
  profitFactor?: number;
  winRate?: number;
  error?: string;
  workerId: string;
}

interface LiveBacktestMonitorProps {
  state: LiveBacktestState;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function formatNumber(num: number, decimals = 2): string {
  if (Math.abs(num) >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(num) >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toFixed(decimals);
}

export function LiveBacktestMonitor({
  state,
  onPause,
  onResume,
  onCancel,
  onRetry,
  className,
}: LiveBacktestMonitorProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Update elapsed time every second when running
  useEffect(() => {
    if (state.status !== 'running') return;
    
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - state.startTime);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [state.status, state.startTime]);
  
  // Prepare chart data
  const equityData = state.equity.map((value, index) => ({
    index,
    equity: value,
    drawdown: state.drawdown[index] || 0,
  }));
  
  // Status badge colors
  const statusColors: Record<BacktestStatus, string> = {
    idle: 'bg-muted text-muted-foreground',
    running: 'bg-primary text-primary-foreground',
    paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    completed: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
    error: 'bg-destructive/20 text-destructive border-destructive/30',
    canceled: 'bg-muted text-muted-foreground',
  };
  
  const statusIcons: Record<BacktestStatus, React.ReactNode> = {
    idle: <Clock className="h-3 w-3" />,
    running: <Loader2 className="h-3 w-3 animate-spin" />,
    paused: <Pause className="h-3 w-3" />,
    completed: <CheckCircle className="h-3 w-3" />,
    error: <XCircle className="h-3 w-3" />,
    canceled: <Square className="h-3 w-3" />,
  };
  
  const estimatedRemaining = state.estimatedEndTime 
    ? Math.max(0, state.estimatedEndTime - Date.now())
    : null;
  
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Live Backtest
            </CardTitle>
            <CardDescription>
              {state.eaName}
              {state.presetName && ` • ${state.presetName}`}
            </CardDescription>
          </div>
          
          <Badge 
            variant="outline" 
            className={cn('flex items-center gap-1', statusColors[state.status])}
          >
            {statusIcons[state.status]}
            {state.status.charAt(0).toUpperCase() + state.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-mono font-medium">{state.progress.toFixed(1)}%</span>
          </div>
          <Progress value={state.progress} className="h-2" />
          {state.currentDate && (
            <p className="text-xs text-muted-foreground">
              Processing: {state.currentDate}
            </p>
          )}
        </div>
        
        {/* Time Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Elapsed</p>
            <p className="font-mono text-sm font-medium">
              {formatDuration(elapsedTime)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="font-mono text-sm font-medium">
              {estimatedRemaining !== null 
                ? formatDuration(estimatedRemaining)
                : '--:--'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Worker</p>
            <p className="font-mono text-sm font-medium">
              #{state.workerId}
            </p>
          </div>
        </div>
        
        <Separator />
        
        {/* Live Metrics */}
        {(state.currentEquity !== undefined || state.tradesCount !== undefined) && (
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Equity
              </p>
              <p className={cn(
                'font-mono text-sm font-medium',
                (state.currentEquity ?? 0) >= 10000 ? 'text-chart-2' : 'text-destructive'
              )}>
                ${formatNumber(state.currentEquity ?? 10000)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                Drawdown
              </p>
              <p className="font-mono text-sm font-medium text-destructive">
                {formatNumber(state.currentDrawdown ?? 0, 1)}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                Trades
              </p>
              <p className="font-mono text-sm font-medium">
                {state.tradesCount ?? 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="font-mono text-sm font-medium">
                {state.winRate !== undefined ? `${state.winRate.toFixed(1)}%` : '--'}
              </p>
            </div>
          </div>
        )}
        
        {/* Live Equity Chart */}
        {equityData.length > 1 && (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityData}>
                <XAxis dataKey="index" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-md">
                        <p className="text-xs text-muted-foreground">
                          Equity: ${formatNumber(payload[0].value as number)}
                        </p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine 
                  y={10000} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="3 3" 
                />
                <Line
                  type="monotone"
                  dataKey="equity"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={0}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {/* Error Message */}
        {state.error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-destructive">{state.error}</p>
          </div>
        )}
        
        {/* Controls */}
        <div className="flex items-center gap-2 pt-2">
          {state.status === 'running' && onPause && (
            <Button variant="outline" size="sm" onClick={onPause}>
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>
          )}
          
          {state.status === 'paused' && onResume && (
            <Button variant="outline" size="sm" onClick={onResume}>
              <Play className="h-4 w-4 mr-1" />
              Resume
            </Button>
          )}
          
          {(state.status === 'running' || state.status === 'paused') && onCancel && (
            <Button variant="destructive" size="sm" onClick={onCancel}>
              <Square className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
          
          {(state.status === 'error' || state.status === 'canceled') && onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Multi-worker monitor grid
interface MultiWorkerMonitorProps {
  workers: LiveBacktestState[];
  onPauseAll?: () => void;
  onResumeAll?: () => void;
  onCancelAll?: () => void;
  onPauseWorker?: (workerId: string) => void;
  onResumeWorker?: (workerId: string) => void;
  onCancelWorker?: (workerId: string) => void;
  className?: string;
}

export function MultiWorkerMonitor({
  workers,
  onPauseAll,
  onResumeAll,
  onCancelAll,
  onPauseWorker,
  onResumeWorker,
  onCancelWorker,
  className,
}: MultiWorkerMonitorProps) {
  const activeWorkers = workers.filter(w => w.status === 'running');
  const completedWorkers = workers.filter(w => w.status === 'completed');
  const errorWorkers = workers.filter(w => w.status === 'error');
  
  const overallProgress = workers.length > 0
    ? workers.reduce((sum, w) => sum + w.progress, 0) / workers.length
    : 0;
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Overall Progress</p>
                <p className="font-mono text-lg font-bold">{overallProgress.toFixed(1)}%</p>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span>{activeWorkers.length} running</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-chart-2" />
                  <span>{completedWorkers.length} done</span>
                </div>
                {errorWorkers.length > 0 && (
                  <div className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-destructive" />
                    <span>{errorWorkers.length} failed</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {activeWorkers.length > 0 && onPauseAll && (
                <Button variant="outline" size="sm" onClick={onPauseAll}>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause All
                </Button>
              )}
              {activeWorkers.length === 0 && workers.some(w => w.status === 'paused') && onResumeAll && (
                <Button variant="outline" size="sm" onClick={onResumeAll}>
                  <Play className="h-4 w-4 mr-1" />
                  Resume All
                </Button>
              )}
              {(activeWorkers.length > 0 || workers.some(w => w.status === 'paused')) && onCancelAll && (
                <Button variant="destructive" size="sm" onClick={onCancelAll}>
                  <Square className="h-4 w-4 mr-1" />
                  Cancel All
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Worker Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workers.map(worker => (
          <LiveBacktestMonitor
            key={worker.workerId}
            state={worker}
            onPause={onPauseWorker ? () => onPauseWorker(worker.workerId) : undefined}
            onResume={onResumeWorker ? () => onResumeWorker(worker.workerId) : undefined}
            onCancel={onCancelWorker ? () => onCancelWorker(worker.workerId) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export default LiveBacktestMonitor;
