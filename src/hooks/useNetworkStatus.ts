/**
 * Network Status Hook
 * Tracks online/offline state and sync status
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SyncStatus = 'idle' | 'syncing' | 'failed' | 'offline' | 'local-only';

export interface NetworkState {
  isOnline: boolean;
  syncStatus: SyncStatus;
  lastSyncTime: Date | null;
  syncError: string | null;
}

export function useNetworkStatus() {
  const { user } = useAuth();
  const [state, setState] = useState<NetworkState>({
    isOnline: navigator.onLine,
    syncStatus: navigator.onLine ? 'idle' : 'offline',
    lastSyncTime: null,
    syncError: null,
  });

  // Track online/offline
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ 
        ...prev, 
        isOnline: true,
        syncStatus: user ? 'idle' : 'local-only'
      }));
    };
    
    const handleOffline = () => {
      setState(prev => ({ 
        ...prev, 
        isOnline: false,
        syncStatus: 'offline'
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  // Update sync status based on auth
  useEffect(() => {
    if (!state.isOnline) {
      setState(prev => ({ ...prev, syncStatus: 'offline' }));
    } else if (!user) {
      setState(prev => ({ ...prev, syncStatus: 'local-only' }));
    } else {
      setState(prev => ({ ...prev, syncStatus: 'idle' }));
    }
  }, [user, state.isOnline]);

  const triggerSync = useCallback(async () => {
    if (!state.isOnline || !user) return false;

    setState(prev => ({ ...prev, syncStatus: 'syncing', syncError: null }));

    try {
      // Ping Supabase to verify connection
      const { error } = await supabase.from('projects').select('id').limit(1);
      
      if (error) throw error;

      setState(prev => ({
        ...prev,
        syncStatus: 'idle',
        lastSyncTime: new Date(),
        syncError: null,
      }));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      setState(prev => ({
        ...prev,
        syncStatus: 'failed',
        syncError: errorMessage,
      }));
      return false;
    }
  }, [state.isOnline, user]);

  return {
    ...state,
    triggerSync,
    isAuthenticated: !!user,
  };
}
