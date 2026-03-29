/**
 * Phase 9: PWA Update Prompt hook
 * Detects new service worker and prompts user to refresh
 */

import { useState, useEffect, useCallback } from 'react';

interface UpdatePromptState {
  showUpdatePrompt: boolean;
  applyUpdate: () => void;
  dismissUpdate: () => void;
}

export function useUpdatePrompt(): UpdatePromptState {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      // Already waiting
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setShowUpdatePrompt(true);
        return;
      }

      // Listen for new SW installing
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setShowUpdatePrompt(true);
          }
        });
      });
    });

    // Check for updates every 60 minutes
    const interval = setInterval(() => {
      navigator.serviceWorker.getRegistration().then((reg) => reg?.update());
    }, 60 * 60 * 1000);

    return () => {
      clearInterval(interval);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setShowUpdatePrompt(false);
    }
  }, [waitingWorker]);

  const dismissUpdate = useCallback(() => {
    setShowUpdatePrompt(false);
  }, []);

  return { showUpdatePrompt, applyUpdate, dismissUpdate };
}
