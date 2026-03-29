/**
 * Hook to fetch strategy health scores from Supabase
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StrategyHealthScore {
  id: string;
  strategy_id: string;
  scope: string;
  symbol: string;
  timeframe: string;
  score: number;
  grade: 'healthy' | 'medium' | 'risky';
  components: {
    robustness: number;
    risk_quality: number;
    consistency: number;
    execution_reality: number;
  };
  reasons: string[];
  warnings: string[];
  computed_from: string;
  sample_size: number;
  last_computed_at: string;
}

export function useStrategyHealth(strategyId?: string) {
  const [health, setHealth] = useState<StrategyHealthScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    if (!strategyId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('strategy_health_scores')
        .select('*')
        .eq('strategy_id', strategyId)
        .eq('scope', 'global')
        .maybeSingle();

      if (err) throw err;
      if (data) {
        setHealth({
          ...data,
          grade: data.grade as 'healthy' | 'medium' | 'risky',
          components: data.components as StrategyHealthScore['components'],
        });
      } else {
        setHealth(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch health score');
    } finally {
      setLoading(false);
    }
  }, [strategyId]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return { health, loading, error, refetch: fetchHealth };
}

export function useStrategyHealthBulk(strategyIds: string[]) {
  const [healthMap, setHealthMap] = useState<Record<string, StrategyHealthScore>>({});
  const [loading, setLoading] = useState(false);

  const fetchBulk = useCallback(async () => {
    if (strategyIds.length === 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('strategy_health_scores')
        .select('*')
        .in('strategy_id', strategyIds)
        .eq('scope', 'global');

      if (error) throw error;
      const map: Record<string, StrategyHealthScore> = {};
      (data || []).forEach((row: any) => {
        map[row.strategy_id] = {
          ...row,
          grade: row.grade as 'healthy' | 'medium' | 'risky',
          components: row.components as StrategyHealthScore['components'],
        };
      });
      setHealthMap(map);
    } catch {
      // Silently fail — health is supplementary
    } finally {
      setLoading(false);
    }
  }, [strategyIds.join(',')]);

  useEffect(() => {
    fetchBulk();
  }, [fetchBulk]);

  return { healthMap, loading, refetch: fetchBulk };
}
