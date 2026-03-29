/**
 * PWA Status Indicator Component
 * Shows Online/Offline status and Installed badge
 * Spec: PWA Layer - PWA status indicator (Online/Offline + Installed badge)
 */

import { Wifi, WifiOff, Download, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { useToast } from '@/hooks/use-toast';

export function PWAStatusIndicator() {
  const { isOnline, isInstalled, isInstallable, promptInstall } = usePWAInstall();
  const { toast } = useToast();

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      toast({
        title: 'App Installed',
        description: 'MMC is now installed and works offline!',
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Online/Offline Status */}
      {isOnline ? (
        <Badge variant="outline" className="gap-1.5 text-profit border-profit/30 bg-profit/10">
          <Wifi className="h-3 w-3" />
          Online
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1.5 text-warning border-warning/30 bg-warning/10">
          <WifiOff className="h-3 w-3" />
          Offline
        </Badge>
      )}

      {/* Installed Badge */}
      {isInstalled && (
        <Badge variant="outline" className="gap-1.5 text-primary border-primary/30 bg-primary/10">
          <CheckCircle className="h-3 w-3" />
          PWA Installed
        </Badge>
      )}

      {/* Install CTA */}
      {isInstallable && !isInstalled && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleInstall}
          className="gap-1.5 h-6 text-xs"
        >
          <Download className="h-3 w-3" />
          Install App
        </Button>
      )}
    </div>
  );
}
