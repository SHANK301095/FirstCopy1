import { useEffect, useState, forwardRef } from 'react';
import { 
  HardDrive, 
  Cpu, 
  MemoryStick, 
  FolderOpen, 
  Settings as SettingsIcon,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SystemInfo, BackendStatus, AppPaths } from '@/types/electron-api';
import { secureLogger } from '@/lib/secureLogger';

/**
 * System Status Component
 * Shows system diagnostics in desktop mode
 * Spec: Desktop Settings - System Info panel
 */
export const SystemStatus = forwardRef<HTMLDivElement, object>((_, ref) => {
  const [isDesktop, setIsDesktop] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [backendHealth, setBackendHealth] = useState<BackendStatus | null>(null);
  const [paths, setPaths] = useState<AppPaths | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    // Spec: All Electron calls optional-chained
    const api = window.electronAPI;
    if (!api) return;
    
    setLoading(true);
    try {
      const [sysInfo, health, appPaths] = await Promise.all([
        api.getSystemInfo(),
        api.getBackendStatus(),
        api.getPaths(),
      ]);
      
      setSystemInfo(sysInfo);
      setBackendHealth(health);
      setPaths(appPaths);
    } catch (e) {
      secureLogger.error('ui', 'Failed to fetch system status', { error: e });
    }
    setLoading(false);
  };

  useEffect(() => {
    const api = window.electronAPI;
    if (typeof window !== 'undefined' && api) {
      setIsDesktop(true);
      fetchStatus();
    } else {
      setIsDesktop(false);
      setLoading(false);
    }
  }, []);

  if (!isDesktop) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <SettingsIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Web Mode</h3>
          <p className="text-sm text-muted-foreground">
            System diagnostics are available in Desktop Mode only.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isOnline = backendHealth?.running || backendHealth?.online;

  return (
    <div ref={ref} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">System Status</h2>
        <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Backend Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              Backend Engine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {isOnline ? (
                  <Badge className="bg-profit/20 text-profit border-profit/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Online
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Offline
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Port</span>
                <span className="font-mono text-sm">{backendHealth?.port || '-'}</span>
              </div>
              {backendHealth?.cpu_percent !== undefined && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">CPU Usage</span>
                    <span>{backendHealth.cpu_percent}%</span>
                  </div>
                  <Progress value={backendHealth.cpu_percent} className="h-1.5" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-primary" />
              System Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform</span>
                <span className="capitalize">{systemInfo?.platform || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Architecture</span>
                <span className="font-mono">{systemInfo?.arch || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">App Version</span>
                <span className="font-mono">{systemInfo?.version || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Build Type</span>
                <Badge variant="outline" className="text-xs">
                  {systemInfo?.isPackaged ? 'Production' : 'Development'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Memory */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MemoryStick className="h-4 w-4 text-primary" />
              Memory
            </CardTitle>
          </CardHeader>
          <CardContent>
            {backendHealth?.memory_total_gb ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Available</span>
                  <span>{backendHealth.memory_available_gb?.toFixed(1)} GB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span>{backendHealth.memory_total_gb?.toFixed(1)} GB</span>
                </div>
                <Progress 
                  value={((backendHealth.memory_total_gb - (backendHealth.memory_available_gb || 0)) / backendHealth.memory_total_gb) * 100} 
                  className="h-1.5" 
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Paths */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary" />
            Application Paths
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {paths && Object.entries(paths).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[300px]" title={value}>
                    {value}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => window.electronAPI?.openPath(value)}
                  >
                    <FolderOpen className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

SystemStatus.displayName = 'SystemStatus';
