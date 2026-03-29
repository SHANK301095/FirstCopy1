/**
 * Performance Monitor Component
 * Phase 8: Real-time CPU, memory, worker stats for desktop app
 */

import { useState, useEffect } from 'react';
import { 
  Cpu, 
  HardDrive, 
  Activity, 
  Zap,
  Clock,
  Server,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PerformanceData {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  process: {
    memory: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
    uptime: number;
    pid: number;
  };
  system: {
    platform: string;
    arch: string;
    uptime: number;
    hostname: string;
  };
}

interface PerformanceMonitorProps {
  className?: string;
  compact?: boolean;
  refreshInterval?: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

const getUsageColor = (percent: number): string => {
  if (percent < 50) return 'text-green-500';
  if (percent < 80) return 'text-yellow-500';
  return 'text-red-500';
};

const getUsageBg = (percent: number): string => {
  if (percent < 50) return 'bg-green-500';
  if (percent < 80) return 'bg-yellow-500';
  return 'bg-red-500';
};

export function PerformanceMonitor({ 
  className, 
  compact = false,
  refreshInterval = 2000 
}: PerformanceMonitorProps) {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const [prevCpu, setPrevCpu] = useState<number>(0);

  const fetchPerformance = async () => {
    try {
      const api = (window as Window & { electronAPI?: { getPerformance?: () => Promise<PerformanceData> } }).electronAPI;
      if (!api?.getPerformance) {
        setError('Desktop API not available');
        setIsLoading(false);
        return;
      }
      
      const perfData = await api.getPerformance();
      setData(perfData);
      
      // Determine trend
      if (perfData.cpu.usage > prevCpu + 5) {
        setTrend('up');
      } else if (perfData.cpu.usage < prevCpu - 5) {
        setTrend('down');
      } else {
        setTrend('stable');
      }
      setPrevCpu(perfData.cpu.usage);
      
      setError(null);
      setIsLoading(false);
    } catch (e) {
      setError(String(e));
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
    const interval = setInterval(fetchPerformance, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (error) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="py-6 text-center text-muted-foreground">
          <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Performance monitoring requires Desktop Mode</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card className={className}>
        <CardContent className="py-6 text-center">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-4 text-xs', className)}>
        <div className="flex items-center gap-1.5">
          <Cpu className={cn('h-3.5 w-3.5', getUsageColor(data.cpu.usage))} />
          <span className="tabular-nums">{data.cpu.usage.toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <HardDrive className={cn('h-3.5 w-3.5', getUsageColor(data.memory.usagePercent))} />
          <span className="tabular-nums">{data.memory.usagePercent.toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{formatUptime(data.process.uptime)}</span>
        </div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Performance Monitor
          </CardTitle>
          <div className="flex items-center gap-2">
            {trend === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
            {trend === 'down' && <TrendingDown className="h-4 w-4 text-green-500" />}
            <Badge variant="outline" className="text-xs">
              PID: {data.process.pid}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* CPU Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Cpu className={cn('h-4 w-4', getUsageColor(data.cpu.usage))} />
              <span>CPU</span>
              <Badge variant="secondary" className="text-[10px]">
                {data.cpu.cores} cores
              </Badge>
            </div>
            <span className={cn('font-mono font-bold', getUsageColor(data.cpu.usage))}>
              {data.cpu.usage.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={data.cpu.usage} 
            className={cn('h-2', getUsageBg(data.cpu.usage))}
          />
          <p className="text-[10px] text-muted-foreground truncate">{data.cpu.model}</p>
        </div>

        {/* Memory Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <HardDrive className={cn('h-4 w-4', getUsageColor(data.memory.usagePercent))} />
              <span>Memory</span>
            </div>
            <span className={cn('font-mono font-bold', getUsageColor(data.memory.usagePercent))}>
              {formatBytes(data.memory.used)} / {formatBytes(data.memory.total)}
            </span>
          </div>
          <Progress 
            value={data.memory.usagePercent} 
            className="h-2"
          />
        </div>

        {/* Process Memory */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <div className="text-lg font-bold text-primary">
              {formatBytes(data.process.memory.heapUsed)}
            </div>
            <div className="text-[10px] text-muted-foreground">Heap Used</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <div className="text-lg font-bold">
              {formatBytes(data.process.memory.rss)}
            </div>
            <div className="text-[10px] text-muted-foreground">RSS</div>
          </div>
        </div>

        {/* System Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>App: {formatUptime(data.process.uptime)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Server className="h-3 w-3" />
            <span>System: {formatUptime(data.system.uptime)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
