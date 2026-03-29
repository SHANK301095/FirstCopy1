import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TrialInfo {
  isOnTrial: boolean;
  expiresAt: Date | null;
  daysRemaining: number;
  hasUsedTrial: boolean;
}

interface PremiumStatus {
  isPremium: boolean;
  isLoading: boolean;
  error: string | null;
  trial: TrialInfo;
  startTrial: () => Promise<boolean>;
  refetch: () => Promise<void>;
}

// Module-level cache for premium status to reduce redundant API calls
interface PremiumCache {
  isPremium: boolean;
  trial: TrialInfo;
  userId: string;
  timestamp: number;
}

let premiumCache: PremiumCache | null = null;
const CACHE_TTL = 60000; // 60 seconds

/**
 * Invalidate the premium status cache.
 * Call this after subscription changes or manual refresh requests.
 */
export function invalidatePremiumCache(): void {
  premiumCache = null;
}

export function usePremiumStatus(): PremiumStatus {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trial, setTrial] = useState<TrialInfo>({
    isOnTrial: false,
    expiresAt: null,
    daysRemaining: 0,
    hasUsedTrial: false,
  });

  const fetchPremiumStatus = useCallback(async () => {
    if (!user) {
      setIsPremium(false);
      setIsLoading(false);
      setTrial({ isOnTrial: false, expiresAt: null, daysRemaining: 0, hasUsedTrial: false });
      return;
    }

    // Check cache first - skip API call if cache is valid
    if (
      premiumCache &&
      premiumCache.userId === user.id &&
      Date.now() - premiumCache.timestamp < CACHE_TTL
    ) {
      setIsPremium(premiumCache.isPremium);
      setTrial(premiumCache.trial);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check premium status (includes trial check in DB function)
      const { data: premiumData, error: rpcError } = await supabase.rpc('is_premium_user', {
        _user_id: user.id
      });

      if (rpcError) {
        console.error('Error checking premium status:', rpcError);
        setError('Failed to check premium status');
        setIsPremium(false);
      } else {
        setIsPremium(premiumData === true);
      }

      // Check trial status separately for UI display
      const { data: trialData } = await supabase
        .from('premium_trials')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (trialData) {
        const expiresAt = new Date(trialData.expires_at);
        const now = new Date();
        const isActive = expiresAt > now;
        const daysRemaining = isActive 
          ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        const trialInfo: TrialInfo = {
          isOnTrial: isActive,
          expiresAt,
          daysRemaining,
          hasUsedTrial: true,
        };
        
        setTrial(trialInfo);
        
        // Update cache
        premiumCache = {
          isPremium: premiumData === true,
          trial: trialInfo,
          userId: user.id,
          timestamp: Date.now(),
        };
      } else {
        setTrial({
          isOnTrial: false,
          expiresAt: null,
          daysRemaining: 0,
          hasUsedTrial: false,
        });
        
        // Update cache with non-trial state
        premiumCache = {
          isPremium: premiumData === true,
          trial: { isOnTrial: false, expiresAt: null, daysRemaining: 0, hasUsedTrial: false },
          userId: user.id,
          timestamp: Date.now(),
        };
      }
    } catch (err) {
      console.error('Premium status error:', err);
      setError('Failed to check premium status');
      setIsPremium(false);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const startTrial = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('premium_trials')
        .insert({ user_id: user.id });

      if (error) {
        console.error('Error starting trial:', error);
        return false;
      }

      // Invalidate cache and refetch to update status
      invalidatePremiumCache();
      await fetchPremiumStatus();
      return true;
    } catch (err) {
      console.error('Start trial error:', err);
      return false;
    }
  }, [user, fetchPremiumStatus]);

  useEffect(() => {
    fetchPremiumStatus();
  }, [fetchPremiumStatus]);

  return {
    isPremium,
    isLoading,
    error,
    trial,
    startTrial,
    refetch: fetchPremiumStatus
  };
}