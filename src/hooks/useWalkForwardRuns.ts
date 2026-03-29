/**
 * useWalkForwardRuns — DB-backed walk-forward run persistence
 * Saves completed walk-forward analyses to walk_forward_runs table
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WalkForwardRunRecord {
  id: string;
  status: string;
  config: Record<string, unknown>;
  windows: Record<string, unknown>[] | null;
  diagnostics: Record<string, unknown> | null;
  strategy_id: string | null;
  dataset_id: string | null;
  error: string | null;
  created_at: string;
}

export function useWalkForwardRuns() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<WalkForwardRunRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRuns = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('walk_forward_runs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setRuns(data as unknown as WalkForwardRunRecord[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const saveRun = useCallback(async (run: {
    config: Record<string, unknown>;
    windows: Record<string, unknown>[];
    diagnostics: Record<string, unknown> | null;
    strategy_id?: string;
    dataset_id?: string;
    status: string;
  }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('walk_forward_runs')
      .insert({
        user_id: user.id,
        config: run.config as any,
        windows: run.windows as any,
        diagnostics: run.diagnostics as any,
        strategy_id: run.strategy_id || null,
        dataset_id: run.dataset_id || null,
        status: run.status,
      })
      .select('id')
      .single();
    if (data) await fetchRuns();
    return data?.id || null;
  }, [user, fetchRuns]);

  return { runs, loading, saveRun, refetch: fetchRuns };
}
