/**
 * Bulk Tester Live Charts Component
 * Real-time progress visualization for batch testing
 */

import { useMemo, useEffect, useState } from 'react';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Zap, 
  Pause, 
  Play,
  CheckCircle2,
  XCircle,
  Timer,
  Cpu,
  BarChart3,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { BulkTestItem, BulkTestStatus } from '@/lib/bulkTesterStore';

interface BulkTesterLiveChartsProps {
  items: BulkTestItem[];
  status: BulkTestStatus;
  startedAt?: number;
  onPause: () => void;
  onResume: () => void;
  className?: string;
}

interface CompletionDataPoint {
  time: number;
  completed: number;
  failed: number;
  running: number;
}

interface ThroughputDataPoint {
  minute: number;
  count: number;
}

const COLORS = {
  queued: 'hsl(var(--muted))',
  running: 'hsl(var(--primary))',
  completed: 'hsl(var(--profit))',
  failed: 'hsl(var(--destructive))',
  cached: 'hsl(var(--accent))',
};

export function BulkTesterLiveCharts({
  items,
  status,
  startedAt,
  onPause,
  onResume,
  className,
}: BulkTesterLiveChartsProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completionHistory, setCompletionHistory] = useState<CompletionDataPoint[]>([]);
  const [throughputHistory, setThroughputHistory] = useState<ThroughputDataPoint[]>([]);

  const isPaused = status === 'paused';
  const isRunning = status === 'running';
  const isActive = isRunning || isPaused;

  // Calculate stats
  const stats = useMemo(() => {
    const queued = items.filter(i => i.status === 'queued').length;
    const running = items.filter(i => i.status === 'running').length;
    const completed = items.filter(i => i.status === 'completed').length;
    const failed = items.filter(i => i.status === 'failed').length;
    const cached = items.filter(i => i.status === 'cached').length;
    const total = items.length;
    const processed = completed + failed + cached;
    const progress = total > 0 ? (processed / total) * 100 : 0;
    
    // Calculate average progress of running items
    const runningProgress = running > 0 
      ? items.filter(i => i.status === 'running').reduce((sum, i) => sum + i.progress, 0) / running
      : 0;

    // Calculate average duration of completed items
    const completedItems = items.filter(i => i.completedAt && i.startedAt);
    const avgDuration = completedItems.length > 0
      ? completedItems.reduce((sum, i) => sum + ((i.completedAt! - i.startedAt!) / 1000), 0) / completedItems.length
      : 0;

    return { queued, running, completed, failed, cached, total, processed, progress, runningProgress, avgDuration };
  }, [items]);

  // Update elapsed time
  useEffect(() => {
    if (!isActive || !startedAt) return;

    const interval = setInterval(() => {
      if (!isPaused) {
        setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isPaused, startedAt]);

  // Track completion history for live chart
  useEffect(() => {
    if (!isActive) return;

    const newPoint: CompletionDataPoint = {
      time: elapsedSeconds,
      completed: stats.completed,
      failed: stats.failed,
      running: stats.running,
    };

    setCompletionHistory(prev => {
      const updated = [...prev, newPoint];
      // Keep last 60 data points
      return updated.slice(-60);
    });
  }, [stats.completed, stats.failed, stats.running, elapsedSeconds, isActive]);

  // Calculate throughput (tests per minute)
  useEffect(() => {
    if (!isActive) return;

    const minute = Math.floor(elapsedSeconds / 60);
    const completedThisMinute = stats.completed + stats.failed + stats.cached;

    setThroughputHistory(prev => {
      const existing = prev.find(p => p.minute === minute);
      if (existing) {
        return prev.map(p => p.minute === minute ? { ...p, count: completedThisMinute } : p);
      }
      return [...prev, { minute, count: completedThisMinute }].slice(-10);
    });
  }, [elapsedSeconds, stats.completed, stats.failed, stats.cached, isActive]);

  // Calculate estimated remaining time
  const estimatedRemaining = useMemo(() => {
    if (stats.processed === 0 || elapsedSeconds === 0) return 0;
    const rate = stats.processed / elapsedSeconds;
    return Math.round((stats.total - stats.processed) / rate);
  }, [stats.processed, stats.total, elapsedSeconds]);

  // Pie chart data for status distribution
  const pieData = useMemo(() => [
    { name: 'Queued', value: stats.queued, color: COLORS.queued },
    { name: 'Running', value: stats.running, color: COLORS.running },
    { name: 'Completed', value: stats.completed, color: COLORS.completed },
    { name: 'Failed', value: stats.failed, color: COLORS.failed },
    { name: 'Cached', value: stats.cached, color: COLORS.cached },
  ].filter(d => d.value > 0), [stats]);

  // Running items detail
  const runningItems = useMemo(() => 
    items.filter(i => i.status === 'running'),
    [items]
  );

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Progress Card */}
      <Card className={cn(
        "border-primary/30",
        isRunning && "animate-pulse-border"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className={cn(
                "h-5 w-5",
                isRunning && "animate-pulse text-primary"
              )} />
              {isRunning ? 'Live Progress' : isPaused ? 'Paused' : status === 'completed' ? 'Batch Complete' : 'Batch Queue'}
            </CardTitle>
            <div className="flex items-center gap-2">
              {isActive && (
                <>
                  <Badge variant="outline" className="font-mono">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTime(elapsedSeconds)}
                  </Badge>
                  {stats.processed > 0 && elapsedSeconds > 0 && (
                    <Badge variant="outline" className="font-mono">
                      <Zap className="h-3 w-3 mr-1" />
                      {(stats.processed / (elapsedSeconds / 60)).toFixed(1)}/min
                    </Badge>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={isPaused ? onResume : onPause}
                    className="h-8"
                  >
                    {isPaused ? (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {stats.processed} / {stats.total} completed
              </span>
              <span className="font-mono text-primary font-bold">
                {stats.progress.toFixed(1)}%
              </span>
            </div>
            <Progress value={stats.progress} className="h-3" />
            {isActive && estimatedRemaining > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Elapsed: {formatTime(elapsedSeconds)}</span>
                <span className="flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  ETA: {formatTime(estimatedRemaining)}
                </span>
              </div>
            )}
          </div>

          {/* Live Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="p-2 rounded-lg bg-muted/30 text-center">
              <div className="text-xs text-muted-foreground mb-0.5">Queued</div>
              <div className="text-xl font-mono font-bold">{stats.queued}</div>
            </div>
            <div className="p-2 rounded-lg bg-primary/10 text-center">
              <div className="text-xs text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
                <Cpu className="h-3 w-3" />
                Running
              </div>
              <div className="text-xl font-mono font-bold text-primary">{stats.running}</div>
            </div>
            <div className="p-2 rounded-lg bg-profit/10 text-center">
              <div className="text-xs text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Done
              </div>
              <div className="text-xl font-mono font-bold text-profit">{stats.completed}</div>
            </div>
            <div className="p-2 rounded-lg bg-destructive/10 text-center">
              <div className="text-xs text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
                <XCircle className="h-3 w-3" />
                Failed
              </div>
              <div className="text-xl font-mono font-bold text-destructive">{stats.failed}</div>
            </div>
            <div className="p-2 rounded-lg bg-accent/10 text-center">
              <div className="text-xs text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
                <Zap className="h-3 w-3" />
                Cached
              </div>
              <div className="text-xl font-mono font-bold text-accent-foreground">{stats.cached}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Workers */}
      {runningItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              Active Workers ({runningItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {runningItems.map(item => (
              <div key={item.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate flex-1">{item.eaName}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {item.symbol} • {item.timeframe}
                  </Badge>
                  <span className="font-mono text-primary ml-2">{item.progress}%</span>
                </div>
                <Progress value={item.progress} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Completion Timeline */}
        {completionHistory.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Completion Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={completionHistory}>
                    <defs>
                      <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--profit))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--profit))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="failedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="time" 
                      tickFormatter={(t) => `${t}s`}
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      hide 
                      domain={[0, 'auto']} 
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string) => [value, name === 'completed' ? 'Completed' : 'Failed']}
                      labelFormatter={(label) => `${label}s elapsed`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="completed" 
                      stroke="hsl(var(--profit))" 
                      strokeWidth={2}
                      fill="url(#completedGradient)"
                      isAnimationActive={false}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="failed" 
                      stroke="hsl(var(--destructive))" 
                      strokeWidth={2}
                      fill="url(#failedGradient)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Distribution */}
        {pieData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {pieData.map(entry => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: entry.color }} 
                    />
                    <span className="text-muted-foreground">{entry.name}</span>
                    <span className="font-mono font-medium">{entry.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Performance Metrics */}
      {stats.avgDuration > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-primary">
                  {stats.avgDuration.toFixed(1)}s
                </div>
                <div className="text-xs text-muted-foreground">Avg Duration</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-mono font-bold">
                  {elapsedSeconds > 0 ? (stats.processed / (elapsedSeconds / 60)).toFixed(1) : '0'}
                </div>
                <div className="text-xs text-muted-foreground">Tests/min</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-profit">
                  {stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0}%
                </div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-mono font-bold">
                  {stats.total > 0 ? ((stats.cached / stats.total) * 100).toFixed(0) : 0}%
                </div>
                <div className="text-xs text-muted-foreground">Cache Hit</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default BulkTesterLiveCharts;
