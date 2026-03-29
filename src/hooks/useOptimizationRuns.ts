/**
 * Hook for optimization_runs CRUD with Supabase
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OptimizationRun {
  id: string;
  algorithm: string;
  status: string;
  progress: number | null;
  config: Record<string, unknown>;
  best_candidate: Record<string, unknown> | null;
  candidates: Record<string, unknown>[] | null;
  convergence: Record<string, unknown>[] | null;
  strategy_id: string | null;
  dataset_id: string | null;
  seed: number | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export function useOptimizationRuns() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<OptimizationRun[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRuns = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('optimization_runs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setRuns(data as unknown as OptimizationRun[]);
    setLoading(false);
  };

  useEffect(() => { fetchRuns(); }, [user]);

  const createRun = async (run: {
    algorithm: string;
    config: Record<string, unknown>;
    strategy_id?: string;
    dataset_id?: string;
    seed?: number;
  }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('optimization_runs')
      .insert({
        user_id: user.id,
        algorithm: run.algorithm,
        config: run.config as any,
        strategy_id: run.strategy_id || null,
        dataset_id: run.dataset_id || null,
        seed: run.seed || null,
        status: 'running',
        started_at: new Date().toISOString(),
        progress: 0,
      })
      .select()
      .single();
    if (data) setRuns(prev => [data as unknown as OptimizationRun, ...prev]);
    return data;
  };

  const updateRun = async (id: string, updates: Partial<{
    status: string;
    progress: number;
    best_candidate: Record<string, unknown>;
    candidates: Record<string, unknown>[];
    convergence: Record<string, unknown>[];
    error: string;
    completed_at: string;
  }>) => {
    if (!user) return;
    await supabase
      .from('optimization_runs')
      .update(updates as any)
      .eq('id', id)
      .eq('user_id', user.id);
    setRuns(prev => prev.map(r => r.id === id ? { ...r, ...updates } as OptimizationRun : r));
  };

  return { runs, loading, createRun, updateRun, refetch: fetchRuns };
}
