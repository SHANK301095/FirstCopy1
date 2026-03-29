import { useEffect, useState } from 'react';
import { Monitor, CheckCircle, XCircle, Loader2, Zap, Cpu, HardDrive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { BackendStatus } from '@/types/electron-api';

/**
 * Desktop Mode Badge Component
 * Shows desktop mode indicator and backend engine status with enhanced polish
 * Uses optional chaining for Electron API per spec
 */
export function DesktopModeBadge() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const checkDesktopMode = async () => {
      // Spec: All Electron calls optional-chained
      const api = window.electronAPI;
      if (typeof window !== 'undefined' && api) {
        setIsDesktop(true);
        try {
          const status = await api.getBackendStatus();
          setBackendStatus(status);
        } catch {
          setBackendStatus({ running: false, online: false });
        }
      } else {
        setIsDesktop(false);
      }
      setChecking(false);
    };

    checkDesktopMode();
    
    // Poll backend status every 30 seconds
    const interval = setInterval(async () => {
      const api = window.electronAPI;
      if (api) {
        try {
          const status = await api.getBackendStatus();
          setBackendStatus(status);
        } catch {
          setBackendStatus({ running: false, online: false });
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (!isDesktop) return null;

  const isOnline = backendStatus?.running || backendStatus?.online;

  return (
    <div 
      className="flex items-center gap-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1.5 transition-all duration-300 cursor-default",
              "bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30",
              "hover:from-primary/20 hover:to-primary/10 hover:border-primary/50",
              isHovered && "shadow-sm shadow-primary/20"
            )}
          >
            <Monitor className={cn("h-3 w-3 transition-transform", isHovered && "scale-110")} />
            <span className="font-medium">Desktop Mode</span>
            <Zap className="h-2.5 w-2.5 text-primary" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">Desktop Features Enabled</p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <Cpu className="h-3 w-3" /> MT5 Strategy Tester Integration
              </li>
              <li className="flex items-center gap-1.5">
                <HardDrive className="h-3 w-3" /> Local File Access
              </li>
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
      
      {checking ? (
        <Badge variant="outline" className="gap-1.5 animate-pulse">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs">Connecting...</span>
        </Badge>
      ) : isOnline ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1.5 transition-all duration-300",
                "text-chart-2 border-chart-2/30 bg-chart-2/10",
                "hover:bg-chart-2/20 hover:border-chart-2/50"
              )}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-chart-2 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-chart-2" />
              </span>
              <span className="font-medium">Engine Online</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">Backend engine running and ready for backtests</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1.5 transition-all duration-300",
                "text-destructive border-destructive/30 bg-destructive/10",
                "hover:bg-destructive/20 hover:border-destructive/50"
              )}
            >
              <XCircle className="h-3 w-3" />
              <span className="font-medium">Engine Offline</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">Backend engine not running. Check Desktop Settings.</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
