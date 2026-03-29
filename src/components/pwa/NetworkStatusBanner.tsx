/**
 * Network Status Banner
 * Shows offline indicator and sync status
 */

import { useState, useEffect } from 'react';
import { WifiOff, Wifi, Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNetworkStatus, SyncStatus } from '@/hooks/useNetworkStatus';

const STATUS_CONFIG: Record<SyncStatus, {
  icon: typeof Wifi;
  label: string;
  color: string;
  bgColor: string;
}> = {
  idle: {
    icon: Cloud,
    label: 'Synced',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  syncing: {
    icon: RefreshCw,
    label: 'Syncing...',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  failed: {
    icon: AlertCircle,
    label: 'Sync Failed',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  offline: {
    icon: WifiOff,
    label: 'Offline',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  'local-only': {
    icon: CloudOff,
    label: 'Local Only',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
};

interface NetworkStatusBannerProps {
  compact?: boolean;
  showOnlyWhenOffline?: boolean;
}

export function NetworkStatusBanner({ 
  compact = false,
  showOnlyWhenOffline = false,
}: NetworkStatusBannerProps) {
  const { isOnline, syncStatus, lastSyncTime, syncError, triggerSync, isAuthenticated } = useNetworkStatus();
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    // Show banner when going offline or when sync fails
    if (!isOnline || syncStatus === 'failed') {
      setVisible(true);
    } else if (showOnlyWhenOffline && isOnline && syncStatus === 'idle') {
      // Hide after a delay when back online
      const timeout = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, syncStatus, showOnlyWhenOffline]);

  // For showOnlyWhenOffline mode, don't render when online and idle
  if (showOnlyWhenOffline && isOnline && syncStatus === 'idle' && !visible) {
    return null;
  }

  const config = STATUS_CONFIG[syncStatus];
  const Icon = config.icon;
  const isSyncing = syncStatus === 'syncing';

  if (compact) {
    return (
      <Badge 
        variant="outline" 
        className={cn('gap-1.5', config.bgColor, config.color)}
      >
        <Icon className={cn('h-3 w-3', isSyncing && 'animate-spin')} />
        {config.label}
      </Badge>
    );
  }

  if (!visible && showOnlyWhenOffline) return null;

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 px-4 py-2',
        'flex items-center justify-center gap-3',
        'transition-all duration-300',
        config.bgColor,
        'border-b',
        !isOnline && 'bg-yellow-500/20 border-yellow-500/30'
          )}
        >
          <Icon className={cn('h-4 w-4', config.color, isSyncing && 'animate-spin')} />
          
          <span className={cn('text-sm font-medium', config.color)}>
            {!isOnline ? 'You are offline' : config.label}
          </span>
          
          {syncError && (
            <span className="text-xs text-destructive">
              {syncError}
            </span>
          )}
          
          {lastSyncTime && isOnline && (
            <span className="text-xs text-muted-foreground">
              Last synced: {new Date(lastSyncTime).toLocaleTimeString()}
            </span>
          )}
          
          {isOnline && isAuthenticated && syncStatus !== 'syncing' && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs"
              onClick={() => triggerSync()}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Sync Now
            </Button>
          )}
          
      {!isOnline && (
        <span className="text-xs text-muted-foreground">
          Changes will sync when back online
        </span>
      )}
    </div>
  );
}

/**
 * Compact network status indicator for headers
 */
export function NetworkStatusIndicator() {
  const { isOnline, syncStatus } = useNetworkStatus();
  const config = STATUS_CONFIG[syncStatus];
  const Icon = config.icon;
  const isSyncing = syncStatus === 'syncing';

  return (
    <div 
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
        config.bgColor,
        config.color
      )}
      title={`${config.label}${!isOnline ? ' - Working offline' : ''}`}
    >
      <Icon className={cn('h-3 w-3', isSyncing && 'animate-spin')} />
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  );
}
