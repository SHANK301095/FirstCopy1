import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AiUsageState {
  usedToday: number;
  remaining: number;
  limit: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DAILY_FREE_LIMIT = 3;

export function useAiUsage(feature: string = 'strategy_generator'): AiUsageState {
  const { user } = useAuth();
  const [usedToday, setUsedToday] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!user) {
      setUsedToday(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_daily_ai_usage', {
        _user_id: user.id,
        _feature: feature
      });

      if (rpcError) {
        console.error('Error fetching AI usage:', rpcError);
        setError('Failed to fetch usage');
        setUsedToday(0);
      } else {
        setUsedToday(data || 0);
      }
    } catch (err) {
      console.error('AI usage error:', err);
      setError('Failed to fetch usage');
      setUsedToday(0);
    } finally {
      setIsLoading(false);
    }
  }, [user, feature]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const remaining = Math.max(0, DAILY_FREE_LIMIT - usedToday);

  return {
    usedToday,
    remaining,
    limit: DAILY_FREE_LIMIT,
    isLoading,
    error,
    refetch: fetchUsage
  };
}
