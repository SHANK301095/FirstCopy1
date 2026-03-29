/**
 * Live Progress Charts Component
 * Real-time backtest progress visualization
 */

import { useState, useEffect, useRef } from 'react';
import { Activity, TrendingUp, TrendingDown, Clock, Zap, Pause, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { cn } from '@/lib/utils';

interface ProgressData {
  bar: number;
  equity: number;
  drawdown: number;
  trades: number;
}

interface LiveProgressChartsProps {
  isRunning: boolean;
  progress: number;
  totalBars: number;
  currentBar: number;
  elapsedMs: number;
  equityData: ProgressData[];
  currentEquity: number;
  currentDrawdown: number;
  tradeCount: number;
  onPause?: () => void;
  onResume?: () => void;
  isPaused?: boolean;
  className?: string;
}

export function LiveProgressCharts({
  isRunning,
  progress,
  totalBars,
  currentBar,
  elapsedMs,
  equityData,
  currentEquity,
  currentDrawdown,
  tradeCount,
  onPause,
  onResume,
  isPaused = false,
  className
}: LiveProgressChartsProps) {
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());

  // Calculate FPS
  useEffect(() => {
    if (!isRunning) return;
    
    frameCountRef.current++;
    const now = Date.now();
    const elapsed = now - lastTimeRef.current;
    
    if (elapsed >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / elapsed));
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
  }, [isRunning, currentBar]);

  const barsPerSecond = elapsedMs > 0 ? Math.round((currentBar / elapsedMs) * 1000) : 0;
  const estimatedRemaining = barsPerSecond > 0 
    ? Math.round((totalBars - currentBar) / barsPerSecond) 
    : 0;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Sample data for display (downsample if too many points)
  const displayData = equityData.length > 100 
    ? equityData.filter((_, i) => i % Math.ceil(equityData.length / 100) === 0)
    : equityData;

  if (!isRunning && equityData.length === 0) {
    return null;
  }

  return (
    <Card className={cn("border-primary/30", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className={cn("h-5 w-5", isRunning && !isPaused && "animate-pulse text-primary")} />
            {isRunning ? (isPaused ? 'Paused' : 'Live Progress') : 'Backtest Complete'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isRunning && (
              <>
                <Badge variant="outline" className="font-mono">
                  <Zap className="h-3 w-3 mr-1" />
                  {barsPerSecond.toLocaleString()} bars/s
                </Badge>
                {onPause && onResume && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={isPaused ? onResume : onPause}
                  >
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Bar {currentBar.toLocaleString()} / {totalBars.toLocaleString()}
              </span>
              <span className="font-mono text-primary">{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Elapsed: {formatTime(Math.round(elapsedMs / 1000))}</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                ETA: {formatTime(estimatedRemaining)}
              </span>
            </div>
          </div>
        )}

        {/* Live Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" />
              Current Equity
            </div>
            <div className={cn(
              "text-lg font-mono font-bold",
              currentEquity >= 100000 ? "text-profit" : "text-loss"
            )}>
              ₹{currentEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <TrendingDown className="h-3 w-3" />
              Current DD
            </div>
            <div className="text-lg font-mono font-bold text-warning">
              {currentDrawdown.toFixed(2)}%
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Activity className="h-3 w-3" />
              Trades
            </div>
            <div className="text-lg font-mono font-bold">
              {tradeCount}
            </div>
          </div>
        </div>

        {/* Live Equity Chart */}
        {displayData.length > 1 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Equity Curve (Live)</div>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayData}>
                  <defs>
                    <linearGradient id="liveEquityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="bar" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Area 
                    type="monotone" 
                    dataKey="equity" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fill="url(#liveEquityGradient)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Live Drawdown Chart */}
        {displayData.length > 1 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Drawdown (Live)</div>
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayData}>
                  <defs>
                    <linearGradient id="liveDrawdownGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="bar" hide />
                  <YAxis hide domain={['auto', 0]} />
                  <Area 
                    type="monotone" 
                    dataKey="drawdown" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    fill="url(#liveDrawdownGradient)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LiveProgressCharts;
