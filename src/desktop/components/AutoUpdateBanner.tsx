/**
 * Auto-Update Banner Component
 * Shows update availability and download progress in desktop mode
 */

import { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  message: string;
  data?: {
    version?: string;
    percent?: number;
    bytesPerSecond?: number;
    transferred?: number;
    total?: number;
  };
}

export function AutoUpdateBanner() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ status: 'idle', message: '' });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const api = window.electronAPI as typeof window.electronAPI & {
      onUpdateStatus?: (callback: (data: { status: string; message: string; data?: unknown }) => void) => () => void;
      checkForUpdates?: () => Promise<{ success: boolean; result?: unknown; error?: string }>;
    };
    
    if (!api?.onUpdateStatus) return;

    const unsubscribe = api.onUpdateStatus((data) => {
      setUpdateStatus({
        status: data.status as UpdateStatus['status'],
        message: data.message,
        data: data.data as UpdateStatus['data'],
      });
      
      // Show banner for important statuses
      if (['available', 'downloading', 'downloaded', 'error'].includes(data.status)) {
        setIsVisible(true);
      }
    });

    // Check for updates on mount (after a short delay)
    const timer = setTimeout(() => {
      api?.checkForUpdates?.();
    }, 5000);

    return () => {
      unsubscribe?.();
      clearTimeout(timer);
    };
  }, []);

  const handleCheckUpdates = async () => {
    const api = window.electronAPI as typeof window.electronAPI & {
      checkForUpdates?: () => Promise<unknown>;
    };
    setUpdateStatus({ status: 'checking', message: 'Checking for updates...' });
    await api?.checkForUpdates?.();
  };

  const handleDownload = async () => {
    const api = window.electronAPI as typeof window.electronAPI & {
      downloadUpdate?: () => Promise<unknown>;
    };
    await api?.downloadUpdate?.();
  };

  const handleInstall = async () => {
    const api = window.electronAPI as typeof window.electronAPI & {
      installUpdate?: () => Promise<unknown>;
    };
    await api?.installUpdate?.();
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible && updateStatus.status === 'idle') {
    return null;
  }

  const getVariant = () => {
    switch (updateStatus.status) {
      case 'available':
      case 'downloading':
        return 'default';
      case 'downloaded':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getIcon = () => {
    switch (updateStatus.status) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'available':
        return <Download className="h-4 w-4" />;
      case 'downloading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'downloaded':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'not-available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      default:
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  if (!isVisible) return null;

  return (
    <Alert 
      variant={getVariant()} 
      className={cn(
        "mb-4 border-primary/20 bg-primary/5",
        updateStatus.status === 'error' && "border-destructive/20 bg-destructive/5"
      )}
    >
      <div className="flex items-center gap-3">
        {getIcon()}
        <div className="flex-1">
          <AlertTitle className="text-sm font-medium">
            {updateStatus.status === 'available' && 'Update Available'}
            {updateStatus.status === 'downloading' && 'Downloading Update'}
            {updateStatus.status === 'downloaded' && 'Update Ready'}
            {updateStatus.status === 'error' && 'Update Error'}
            {updateStatus.status === 'not-available' && 'Up to Date'}
          </AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground">
            {updateStatus.message}
          </AlertDescription>
          
          {updateStatus.status === 'downloading' && updateStatus.data?.percent !== undefined && (
            <div className="mt-2 space-y-1">
              <Progress value={updateStatus.data.percent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {Math.round(updateStatus.data.percent)}% 
                {updateStatus.data.bytesPerSecond && (
                  <span> • {formatBytes(updateStatus.data.bytesPerSecond)}/s</span>
                )}
              </p>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          {updateStatus.status === 'available' && (
            <Button size="sm" onClick={handleDownload}>
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
          )}
          
          {updateStatus.status === 'downloaded' && (
            <Button size="sm" onClick={handleInstall}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Restart & Install
            </Button>
          )}
          
          {['available', 'not-available', 'error'].includes(updateStatus.status) && (
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Dismiss
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default AutoUpdateBanner;
