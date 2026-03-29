/**
 * Offline Indicator Component
 * Global banner showing online/offline state and sync status
 */

import { WifiOff, Wifi, Cloud, CloudOff, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNetworkStatus, type SyncStatus } from '@/hooks/useNetworkStatus';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const statusConfig: Record<SyncStatus, { 
  icon: typeof Wifi;
  label: string; 
  color: string;
  bgColor: string;
}> = {
  idle: { 
    icon: Cloud, 
    label: 'Synced', 
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30'
  },
  syncing: { 
    icon: Loader2, 
    label: 'Syncing...', 
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  failed: { 
    icon: AlertCircle, 
    label: 'Sync failed', 
    color: 'text-destructive',
    bgColor: 'bg-destructive/10'
  },
  offline: { 
    icon: WifiOff, 
    label: 'Offline', 
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30'
  },
  'local-only': { 
    icon: CloudOff, 
    label: 'Local only', 
    color: 'text-muted-foreground',
    bgColor: 'bg-muted'
  },
};

export function OfflineIndicator() {
  const { isOnline, syncStatus, lastSyncTime, syncError, triggerSync, isAuthenticated } = useNetworkStatus();
  
  const config = statusConfig[syncStatus];
  const Icon = config.icon;
  const isSpinning = syncStatus === 'syncing';
  
  const tooltipContent = () => {
    const lines: string[] = [config.label];
    
    if (!isOnline) {
      lines.push('No internet connection');
      lines.push('Changes saved locally');
    } else if (!isAuthenticated) {
      lines.push('Sign in to enable cloud sync');
    } else if (lastSyncTime) {
      lines.push(`Last sync: ${formatDistanceToNow(lastSyncTime, { addSuffix: true })}`);
    }
    
    if (syncError) {
      lines.push(`Error: ${syncError}`);
    }
    
    return lines.join('\n');
  };

  const showRetry = syncStatus === 'failed' && isOnline && isAuthenticated;

  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors',
      config.bgColor,
      config.color
    )}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-help">
            <Icon className={cn('h-3 w-3', isSpinning && 'animate-spin')} />
            <span className="hidden sm:inline">{config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs whitespace-pre-line">
          {tooltipContent()}
        </TooltipContent>
      </Tooltip>
      
      {showRetry && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 p-0 hover:bg-transparent"
          onClick={() => triggerSync()}
        >
          <RefreshCw className="h-3 w-3" />
          <span className="sr-only">Retry sync</span>
        </Button>
      )}
    </div>
  );
}

/** 
 * Compact indicator for mobile/small screens 
 */
export function OfflineIndicatorCompact() {
  const { isOnline, syncStatus } = useNetworkStatus();
  const config = statusConfig[syncStatus];
  const Icon = config.icon;

  // Only show when not in normal synced state
  if (isOnline && syncStatus === 'idle') return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          'flex items-center justify-center w-6 h-6 rounded-full',
          config.bgColor,
          config.color
        )}>
          <Icon className={cn('h-3.5 w-3.5', syncStatus === 'syncing' && 'animate-spin')} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {config.label}
      </TooltipContent>
    </Tooltip>
  );
}
