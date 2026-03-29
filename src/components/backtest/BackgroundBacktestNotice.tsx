/**
 * Background Backtest Notice - P1 Backtest Workflow
 * In-app notification when background backtest completes
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  Activity, 
  Clock, 
  ExternalLink,
  X,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export type BacktestStatus = 'running' | 'completed' | 'failed' | 'cancelled';

interface BackgroundBacktest {
  id: string;
  strategyName: string;
  datasetName: string;
  status: BacktestStatus;
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  resultSummary?: {
    netProfit: number;
    sharpeRatio: number;
    totalTrades: number;
  };
  error?: string;
}

interface BackgroundBacktestNoticeProps {
  backtest: BackgroundBacktest;
  onDismiss: () => void;
  onViewResults?: () => void;
  className?: string;
}

export function BackgroundBacktestNotice({
  backtest,
  onDismiss,
  onViewResults,
  className,
}: BackgroundBacktestNoticeProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  const statusConfig = {
    running: {
      icon: Activity,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30',
      label: 'Running',
    },
    completed: {
      icon: CheckCircle,
      color: 'text-profit',
      bgColor: 'bg-profit/10',
      borderColor: 'border-profit/30',
      label: 'Completed',
    },
    failed: {
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/30',
      label: 'Failed',
    },
    cancelled: {
      icon: X,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      borderColor: 'border-border',
      label: 'Cancelled',
    },
  };

  const config = statusConfig[backtest.status];
  const StatusIcon = config.icon;

  if (isMinimized) {
    return (
      <motion.button
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => setIsMinimized(false)}
        className={cn(
          "fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-lg",
          config.bgColor,
          config.borderColor,
          "border",
          className
        )}
      >
        <StatusIcon className={cn("h-5 w-5", config.color)} />
        {backtest.status === 'running' && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </span>
        )}
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className={cn(
          "fixed bottom-4 right-4 z-50 w-80 rounded-xl border shadow-lg backdrop-blur-sm",
          config.bgColor,
          config.borderColor,
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("h-4 w-4", config.color)} />
            <span className="text-sm font-medium">{config.label}</span>
            {backtest.status === 'running' && (
              <Badge variant="outline" className="text-xs animate-pulse">
                {backtest.progress}%
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMinimized(true)}
            >
              <span className="sr-only">Minimize</span>
              <div className="h-0.5 w-3 bg-current" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onDismiss}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          <div>
            <p className="text-sm font-medium truncate">{backtest.strategyName}</p>
            <p className="text-xs text-muted-foreground truncate">
              on {backtest.datasetName}
            </p>
          </div>

          {backtest.status === 'running' && (
            <div className="space-y-1">
              <Progress value={backtest.progress} className="h-1.5" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {Math.floor((Date.now() - backtest.startedAt.getTime()) / 1000)}s
                </span>
                <span>{backtest.progress}% complete</span>
              </div>
            </div>
          )}

          {backtest.status === 'completed' && backtest.resultSummary && (
            <div className="grid grid-cols-3 gap-2 p-2 rounded-md bg-background/50">
              <div className="text-center">
                <p className={cn(
                  "text-sm font-mono font-bold",
                  backtest.resultSummary.netProfit >= 0 ? "text-profit" : "text-loss"
                )}>
                  {backtest.resultSummary.netProfit >= 0 ? '+' : ''}
                  {backtest.resultSummary.netProfit.toFixed(2)}%
                </p>
                <p className="text-[10px] text-muted-foreground">Profit</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-mono font-bold">
                  {backtest.resultSummary.sharpeRatio.toFixed(2)}
                </p>
                <p className="text-[10px] text-muted-foreground">Sharpe</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-mono font-bold">
                  {backtest.resultSummary.totalTrades}
                </p>
                <p className="text-[10px] text-muted-foreground">Trades</p>
              </div>
            </div>
          )}

          {backtest.status === 'failed' && backtest.error && (
            <p className="text-xs text-destructive">
              {backtest.error}
            </p>
          )}

          {backtest.status === 'completed' && (
            <Button 
              size="sm" 
              className="w-full"
              onClick={onViewResults}
              asChild
            >
              <Link to="/saved-results">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Results
              </Link>
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Memory Usage Indicator - P1 Backtest Workflow
 */
interface MemoryUsageIndicatorProps {
  usedMB: number;
  totalMB: number;
  className?: string;
}

export function MemoryUsageIndicator({
  usedMB,
  totalMB,
  className,
}: MemoryUsageIndicatorProps) {
  const percentage = (usedMB / totalMB) * 100;
  const isHigh = percentage > 80;
  const isMedium = percentage > 60;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-300",
            isHigh && "bg-destructive",
            isMedium && !isHigh && "bg-warning",
            !isMedium && "bg-profit"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={cn(
        "text-xs font-mono",
        isHigh && "text-destructive",
        isMedium && !isHigh && "text-warning",
        !isMedium && "text-muted-foreground"
      )}>
        {usedMB.toFixed(0)}MB
      </span>
    </div>
  );
}
