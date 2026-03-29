/**
 * Hook to warn users when navigating away from pages with unsaved changes
 * Shows a toast notification and optionally blocks navigation
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface UseUnsavedChangesWarningOptions {
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Custom message to show in the warning toast */
  message?: string;
  /** Whether to block navigation (show confirmation dialog) */
  blockNavigation?: boolean;
}

/**
 * Warns users when they try to navigate away from a page with unsaved changes
 * 
 * @example
 * useUnsavedChangesWarning({
 *   hasUnsavedChanges: formState.isDirty,
 *   message: 'You have unsaved strategy changes',
 * });
 */
export function useUnsavedChangesWarning({
  hasUnsavedChanges,
  message = 'You have unsaved changes that will be lost.',
  blockNavigation = true,
}: UseUnsavedChangesWarningOptions) {
  const toastIdRef = useRef<string | null>(null);
  const proceedRef = useRef<(() => void) | null>(null);
  const resetRef = useRef<(() => void) | null>(null);

  // Block navigation when there are unsaved changes
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      blockNavigation &&
      hasUnsavedChanges &&
      currentLocation.pathname !== nextLocation.pathname
  );

  // Store blocker methods in refs for toast action access
  useEffect(() => {
    if (blocker.state === 'blocked') {
      proceedRef.current = blocker.proceed;
      resetRef.current = blocker.reset;
    }
  }, [blocker]);

  // Handle browser refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, message]);

  // Show toast when blocker is triggered
  useEffect(() => {
    if (blocker.state === 'blocked' && !toastIdRef.current) {
      const { id, dismiss } = toast({
        title: 'Unsaved Changes',
        description: `${message} Click here to stay on this page, or use your browser's back button to leave.`,
        variant: 'destructive',
        duration: 10000,
      });
      
      toastIdRef.current = id;
      
      // Auto-reset if toast is dismissed without action
      const timeout = setTimeout(() => {
        if (blocker.state === 'blocked') {
          blocker.reset?.();
        }
        toastIdRef.current = null;
      }, 10000);
      
      return () => {
        clearTimeout(timeout);
      };
    }
    
    // Reset the ref when blocker resets
    if (blocker.state !== 'blocked') {
      toastIdRef.current = null;
    }
  }, [blocker.state, blocker, message]);

  // Method to programmatically proceed (leave the page)
  const proceedNavigation = useCallback(() => {
    blocker.proceed?.();
    toastIdRef.current = null;
  }, [blocker]);

  // Method to programmatically reset (stay on page)
  const cancelNavigation = useCallback(() => {
    blocker.reset?.();
    toastIdRef.current = null;
  }, [blocker]);

  return {
    blocker,
    isBlocked: blocker.state === 'blocked',
    proceedNavigation,
    cancelNavigation,
  };
}

/**
 * Simple hook for tracking form dirty state
 */
export function useFormDirtyState(initialValue = false) {
  const [isDirty, setIsDirty] = useState(initialValue);
  
  const markDirty = useCallback(() => setIsDirty(true), []);
  const markClean = useCallback(() => setIsDirty(false), []);
  const reset = useCallback(() => setIsDirty(initialValue), [initialValue]);
  
  return { isDirty, setIsDirty, markDirty, markClean, reset };
}
