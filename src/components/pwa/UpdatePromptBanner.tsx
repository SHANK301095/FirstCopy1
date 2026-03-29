/**
 * Phase 9: Update prompt banner — tells user a new version is available
 */

import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUpdatePrompt } from '@/hooks/useUpdatePrompt';

export function UpdatePromptBanner() {
  const { showUpdatePrompt, applyUpdate, dismissUpdate } = useUpdatePrompt();

  if (!showUpdatePrompt) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-card/95 backdrop-blur-md shadow-lg p-4">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <RefreshCw className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">New version available!</p>
          <p className="text-xs text-muted-foreground">Refresh to get the latest features.</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" onClick={applyUpdate} className="h-8 text-xs">
            Update
          </Button>
          <Button variant="ghost" size="icon" onClick={dismissUpdate} className="h-8 w-8">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
