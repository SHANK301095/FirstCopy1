/**
 * App Initialization Hook
 * Handles app startup tasks: auth check, data preload, performance logging
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { performanceMonitor } from '@/lib/performanceMonitor';
import { invalidatePremiumCache } from '@/hooks/usePremiumStatus';
import { invalidateWorkspaceCache } from '@/hooks/useWorkspace';
import { checkAndUpdateAchievements } from '@/lib/achievementTracker';
import { useTradesDB } from '@/hooks/useTradesDB';
import { useAlertEngine } from '@/hooks/useAlertEngine';
import { toast } from 'sonner';
import { ACHIEVEMENT_DEFS } from '@/lib/achievementTracker';

interface AppInitConfig {
  logPerformance?: boolean;
  preloadRoutes?: boolean;
}

export function useAppInit(config: AppInitConfig = {}) {
  const { logPerformance = true, preloadRoutes = true } = config;
  const { user } = useAuth();
  const { trades } = useTradesDB();
  const hasInitialized = useRef(false);
  const achievementsChecked = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (logPerformance && import.meta.env.DEV) {
      setTimeout(() => { performanceMonitor.logMetrics(); }, 5000);
    }

    if (preloadRoutes && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => { console.log('🚀 App initialized'); });
    }
  }, [logPerformance, preloadRoutes]);

  // Alert engine - auto-evaluate alerts
  useAlertEngine();

  // Check achievements on app init (once per session)
  useEffect(() => {
    if (!user || achievementsChecked.current || trades.length === 0) return;
    achievementsChecked.current = true;

    checkAndUpdateAchievements(user.id, trades).then(newlyUnlocked => {
      newlyUnlocked.forEach(id => {
        const def = ACHIEVEMENT_DEFS.find(d => d.id === id);
        if (def) toast.success(`🏆 Achievement Unlocked: ${def.name}! +${def.xp} XP`);
      });
    }).catch(() => { /* silent */ });
  }, [user, trades]);

  // Clear caches on user change
  useEffect(() => {
    if (user) {
      achievementsChecked.current = false;
    } else {
      invalidatePremiumCache();
      invalidateWorkspaceCache();
    }
  }, [user?.id]);

  return {
    isReady: hasInitialized.current,
  };
}
