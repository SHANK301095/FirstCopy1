/**
 * useStrategyIntelligence — Real DB-backed hook
 * Replaces MOCK_STRATEGIES everywhere with actual persisted data
 */
import { useState, useEffect, useCallback } from 'react';
import { fetchStrategyIntelligence } from '@/services/strategyIntelligenceService';
import type { StrategyIntelligence } from '@/types/strategyIntelligence';

interface UseStrategyIntelligenceResult {
  strategies: StrategyIntelligence[];
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  refresh: () => Promise<void>;
}

export function useStrategyIntelligence(): UseStrategyIntelligenceResult {
  const [strategies, setStrategies] = useState<StrategyIntelligence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStrategyIntelligence();
      setStrategies(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load strategy intelligence');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    strategies,
    loading,
    error,
    isEmpty: !loading && strategies.length === 0,
    refresh,
  };
}
