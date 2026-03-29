/**
 * Network Status Toast Notifications
 * Shows toast when network status changes
 */

import { useEffect, useRef } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useToast } from '@/hooks/use-toast';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export function NetworkStatusToast() {
  const { isOnline } = useNetworkStatus();
  const { toast } = useToast();
  const previousOnline = useRef<boolean | null>(null);
  const wasOffline = useRef(false);

  useEffect(() => {
    // Skip initial render
    if (previousOnline.current === null) {
      previousOnline.current = isOnline;
      wasOffline.current = !isOnline;
      return;
    }

    // Status changed
    if (previousOnline.current !== isOnline) {
      if (isOnline) {
        // Back online
        toast({
          title: 'Back Online',
          description: wasOffline.current 
            ? 'Your connection has been restored. Any pending changes will sync now.' 
            : 'You\'re connected to the internet.',
          duration: 4000,
        });
        wasOffline.current = false;
      } else {
        // Gone offline
        wasOffline.current = true;
        toast({
          title: 'You\'re Offline',
          description: 'Don\'t worry, your work is saved locally and will sync when you\'re back online.',
          variant: 'destructive',
          duration: 5000,
        });
      }
      previousOnline.current = isOnline;
    }
  }, [isOnline, toast]);

  return null;
}
