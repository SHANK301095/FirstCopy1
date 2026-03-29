/**
 * PWA Install Prompt - Shows banner for mobile users who haven't installed the app
 */
import { useState, useEffect, useCallback } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const isMobile = useIsMobile();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);

  useEffect(() => {
    // Check if already installed
    const installed = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(installed);

    // Check if dismissed before
    const wasDismissed = localStorage.getItem('mmc_install_dismissed');
    if (wasDismissed) {
      const dismissedAt = parseInt(wasDismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }

    // Detect iOS
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isiOS);

    // Listen for beforeinstallprompt (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSTip(true);
    }
  }, [deferredPrompt, isIOS]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem('mmc_install_dismissed', Date.now().toString());
  }, []);

  // Don't show if: not mobile, already installed, or dismissed
  if (!isMobile || isInstalled || dismissed) return null;
  // Only show if we have a prompt OR it's iOS
  if (!deferredPrompt && !isIOS) return null;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[60] bg-primary/95 backdrop-blur-sm text-primary-foreground px-4 py-2.5 flex items-center gap-3 animate-fade-in safe-area-top">
        <Download className="h-4 w-4 shrink-0" />
        <p className="text-xs font-medium flex-1">
          Add MMCai to your home screen for the best experience
        </p>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 text-xs px-3 shrink-0"
          onClick={handleInstall}
        >
          {isIOS ? 'How?' : 'Install'}
        </Button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSTip && (
        <div className="fixed inset-0 z-[70] bg-background/80 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold">Install MMCai on iOS</h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="bg-primary/10 text-primary rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <span>Tap the <Share className="inline h-4 w-4 text-primary mx-1" /> Share button in Safari</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-primary/10 text-primary rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-primary/10 text-primary rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <span>Tap <strong>"Add"</strong> to confirm</span>
              </li>
            </ol>
            <Button className="w-full" onClick={() => { setShowIOSTip(false); handleDismiss(); }}>
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
