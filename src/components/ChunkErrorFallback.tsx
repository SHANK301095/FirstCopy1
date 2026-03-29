/**
 * Friendly fallback shown when a dynamic chunk fails to load
 * even after auto-retry (e.g., stale deploy, network issue).
 */
import { RefreshCw } from 'lucide-react';

export function ChunkErrorFallback() {
  const handleHardReload = () => {
    // Clear all caches, unregister SW, hard reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
      });
    }
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <RefreshCw className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight">Update Available</h1>
          <p className="text-muted-foreground text-sm">
            A new version of MMC has been deployed. Please refresh to load the latest version.
          </p>
        </div>
        <button
          onClick={handleHardReload}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Now
        </button>
      </div>
    </div>
  );
}
