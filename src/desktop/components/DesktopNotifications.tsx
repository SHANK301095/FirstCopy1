/**
 * Desktop Notifications Service
 * Phase 8: System tray notifications for backtest completion
 */

import { useEffect, useState } from 'react';
import { Bell, BellOff, Check, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface NotificationOptions {
  title: string;
  body: string;
  silent?: boolean;
}

interface DesktopNotificationsProps {
  className?: string;
}

// Check if running in desktop mode
const isDesktopMode = (): boolean => {
  const api = (window as Window & { electronAPI?: unknown }).electronAPI;
  return !!api;
};

// Show a desktop notification
export const showDesktopNotification = async (options: NotificationOptions): Promise<boolean> => {
  const api = (window as Window & { 
    electronAPI?: { 
      showNotification?: (opts: NotificationOptions) => Promise<boolean>;
    } 
  }).electronAPI;
  
  if (api?.showNotification) {
    return api.showNotification(options);
  }
  
  // Fallback to browser notifications
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(options.title, { body: options.body, silent: options.silent });
    return true;
  }
  
  return false;
};

// Convenience methods for common notification types
export const notifyBacktestComplete = async (
  strategyName: string, 
  tradesCount: number, 
  winRate: number
): Promise<void> => {
  await showDesktopNotification({
    title: '✅ Backtest Complete',
    body: `${strategyName}: ${tradesCount} trades, ${winRate.toFixed(1)}% win rate`,
  });
};

export const notifyOptimizationComplete = async (
  strategyName: string, 
  generations: number,
  bestFitness: number
): Promise<void> => {
  await showDesktopNotification({
    title: '🧬 Optimization Complete',
    body: `${strategyName}: ${generations} generations, best fitness: ${bestFitness.toFixed(2)}`,
  });
};

export const notifyBulkRunComplete = async (
  totalItems: number, 
  completed: number, 
  failed: number
): Promise<void> => {
  await showDesktopNotification({
    title: '📊 Bulk Run Complete',
    body: `${completed}/${totalItems} successful, ${failed} failed`,
  });
};

export const notifyError = async (message: string): Promise<void> => {
  await showDesktopNotification({
    title: '⚠️ Error',
    body: message,
  });
};

// Settings component for notifications
export function DesktopNotifications({ className }: DesktopNotificationsProps) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [notifyOnBacktest, setNotifyOnBacktest] = useState(true);
  const [notifyOnOptimization, setNotifyOnOptimization] = useState(true);
  const [notifyOnBulkRun, setNotifyOnBulkRun] = useState(true);
  const [notifyOnError, setNotifyOnError] = useState(true);

  useEffect(() => {
    setIsDesktop(isDesktopMode());
    
    // Load saved preferences
    const saved = localStorage.getItem('desktop-notification-prefs');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        setEnabled(prefs.enabled ?? true);
        setNotifyOnBacktest(prefs.notifyOnBacktest ?? true);
        setNotifyOnOptimization(prefs.notifyOnOptimization ?? true);
        setNotifyOnBulkRun(prefs.notifyOnBulkRun ?? true);
        setNotifyOnError(prefs.notifyOnError ?? true);
      } catch {
        // Use defaults
      }
    }
  }, []);

  const savePreferences = () => {
    const prefs = {
      enabled,
      notifyOnBacktest,
      notifyOnOptimization,
      notifyOnBulkRun,
      notifyOnError,
    };
    localStorage.setItem('desktop-notification-prefs', JSON.stringify(prefs));
    
    // Update electron setting if available
    const api = (window as Window & { 
      electronAPI?: { 
        setNotificationEnabled?: (enabled: boolean) => Promise<boolean>;
      } 
    }).electronAPI;
    
    api?.setNotificationEnabled?.(enabled);
  };

  useEffect(() => {
    savePreferences();
  }, [enabled, notifyOnBacktest, notifyOnOptimization, notifyOnBulkRun, notifyOnError]);

  const testNotification = async () => {
    const success = await showDesktopNotification({
      title: '🔔 Test Notification',
      body: 'Desktop notifications are working!',
    });
    
    if (success) {
      toast({ title: 'Notification Sent', description: 'Check your system tray' });
    } else {
      toast({ 
        title: 'Notification Failed', 
        description: 'Enable notifications in system settings',
        variant: 'destructive'
      });
    }
  };

  if (!isDesktop) {
    return (
      <Card className={className}>
        <CardContent className="py-6 text-center text-muted-foreground">
          <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">Desktop Notifications</p>
          <p className="text-xs mt-1">System tray notifications are available in Desktop Mode</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {enabled ? (
              <Bell className="h-4 w-4 text-primary" />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
            Desktop Notifications
          </CardTitle>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {enabled && (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <Label className="text-sm">Backtest Complete</Label>
                </div>
                <Switch 
                  checked={notifyOnBacktest} 
                  onCheckedChange={setNotifyOnBacktest}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <Label className="text-sm">Optimization Complete</Label>
                </div>
                <Switch 
                  checked={notifyOnOptimization} 
                  onCheckedChange={setNotifyOnOptimization}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="h-4 w-4 p-0 justify-center text-[10px]">
                    B
                  </Badge>
                  <Label className="text-sm">Bulk Run Complete</Label>
                </div>
                <Switch 
                  checked={notifyOnBulkRun} 
                  onCheckedChange={setNotifyOnBulkRun}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <Label className="text-sm">Errors</Label>
                </div>
                <Switch 
                  checked={notifyOnError} 
                  onCheckedChange={setNotifyOnError}
                />
              </div>
            </div>

            <Separator />

            <Button 
              variant="outline" 
              size="sm" 
              onClick={testNotification}
              className="w-full"
            >
              <Bell className="h-4 w-4 mr-2" />
              Test Notification
            </Button>
          </>
        )}

        {!enabled && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Enable notifications to receive alerts for backtest completion, 
            optimization results, and errors.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Export notification preferences checker
export const getNotificationPreferences = () => {
  const saved = localStorage.getItem('desktop-notification-prefs');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // Return defaults
    }
  }
  return {
    enabled: true,
    notifyOnBacktest: true,
    notifyOnOptimization: true,
    notifyOnBulkRun: true,
    notifyOnError: true,
  };
};
