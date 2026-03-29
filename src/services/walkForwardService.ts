/**
 * Walk-Forward Service — Persist and retrieve walk-forward validation runs
 */
import { supabase } from '@/integrations/supabase/client';
import type { WalkForwardRunRecord, WalkForwardDiagnostics } from '@/types/quant';

export async function createWalkForwardRun(
  userId: string,
  run: {
    strategy_id?: string;
    dataset_id?: string;
    config: Record<string, unknown>;
  }
) {
  const { data, error } = await supabase
    .from('walk_forward_runs')
    .insert({
      user_id: userId,
      strategy_id: run.strategy_id || null,
      dataset_id: run.dataset_id || null,
      config: run.config as any,
      status: 'running',
    })
    .select('id')
    .single();
  return { success: !error, id: data?.id, error: error?.message };
}

export async function updateWalkForwardRun(
  userId: string,
  runId: string,
  updates: {
    status?: string;
    windows?: any[];
    diagnostics?: WalkForwardDiagnostics;
    error?: string;
  }
) {
  await supabase
    .from('walk_forward_runs')
    .update(updates as any)
    .eq('id', runId)
    .eq('user_id', userId);
}

export async function fetchWalkForwardRuns(userId: string, limit = 50) {
  const { data } = await supabase
    .from('walk_forward_runs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function fetchWalkForwardRun(userId: string, runId: string) {
  const { data } = await supabase
    .from('walk_forward_runs')
    .select('*')
    .eq('id', runId)
    .eq('user_id', userId)
    .single();
  return data;
}
