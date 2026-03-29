/**
 * Unified Data Service
 * Cloud-first data persistence with Supabase as source of truth
 * Dexie serves as offline cache only
 */

import { supabase } from '@/integrations/supabase/client';
import { db, Dataset as LocalDataset, Strategy as LocalStrategy } from '@/db/index';
import type { Json } from '@/integrations/supabase/types';

// ============= Types =============

export interface CloudDataset {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  file_name: string | null;
  row_count: number | null;
  columns: Json | null;
  timezone: string | null;
  fingerprint: string | null;
  range_from_ts: number | null;
  range_to_ts: number | null;
  source_name: string | null;
  project_id: string | null;
  user_id: string;
  created_at: string | null;
}

export interface CloudStrategy {
  id: string;
  name: string;
  code: string | null;
  notes: string | null;
  version: string | null;
  parameters: Json | null;
  project_id: string | null;
  user_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  pendingUploads: number;
  error: string | null;
}

// ============= Datasets =============

export async function fetchAllDatasets(): Promise<CloudDataset[]> {
  const { data, error } = await supabase
    .from('datasets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as CloudDataset[];
}

export async function fetchDatasetsBySymbol(symbol: string): Promise<CloudDataset[]> {
  const { data, error } = await supabase
    .from('datasets')
    .select('*')
    .eq('symbol', symbol)
    .order('range_from_ts', { ascending: false });

  if (error) throw error;
  return (data || []) as CloudDataset[];
}

export async function getUniqueSymbols(): Promise<string[]> {
  const { data, error } = await supabase
    .from('datasets')
    .select('symbol')
    .order('symbol');

  if (error) throw error;
  const symbols = [...new Set((data || []).map(d => d.symbol).filter(Boolean))] as string[];
  return symbols;
}

export async function createDataset(dataset: {
  name: string;
  symbol: string;
  timeframe?: string;
  file_name?: string;
  row_count?: number;
  columns?: Json;
  timezone?: string;
  fingerprint?: string;
  range_from_ts?: number;
  range_to_ts?: number;
  source_name?: string;
  project_id?: string;
}): Promise<CloudDataset> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('datasets')
    .insert({ ...dataset, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as CloudDataset;
}

export async function updateDataset(id: string, updates: Partial<CloudDataset>): Promise<CloudDataset> {
  const { data, error } = await supabase
    .from('datasets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CloudDataset;
}

export async function deleteDataset(id: string): Promise<void> {
  const { error } = await supabase
    .from('datasets')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function renameSymbolFolder(oldSymbol: string, newSymbol: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('datasets')
    .update({ symbol: newSymbol })
    .eq('symbol', oldSymbol)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function deleteSymbolFolder(symbol: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('datasets')
    .delete()
    .eq('symbol', symbol)
    .eq('user_id', user.id);

  if (error) throw error;
}

// ============= Strategies =============

export async function fetchAllStrategies(): Promise<CloudStrategy[]> {
  const { data, error } = await supabase
    .from('strategies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as CloudStrategy[];
}

export async function createStrategy(strategy: {
  name: string;
  code?: string;
  notes?: string;
  version?: string;
  parameters?: Json;
  project_id?: string;
}): Promise<CloudStrategy> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('strategies')
    .insert({ ...strategy, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as CloudStrategy;
}

export async function updateStrategy(id: string, updates: Partial<CloudStrategy>): Promise<CloudStrategy> {
  const { data, error } = await supabase
    .from('strategies')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CloudStrategy;
}

export async function deleteStrategy(id: string): Promise<void> {
  const { error } = await supabase
    .from('strategies')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============= Runs & Results =============

export interface CloudRun {
  id: string;
  status: string | null;
  params_json: Json | null;
  fingerprint: string | null;
  strategy_id: string | null;
  dataset_id: string | null;
  user_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CloudResult {
  id: string;
  run_id: string | null;
  summary_json: Json;
  strategy_version_id: string | null;
  user_id: string;
  created_at: string | null;
}

export async function fetchRuns(): Promise<CloudRun[]> {
  const { data, error } = await supabase
    .from('runs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as CloudRun[];
}

export async function createRun(run: {
  status?: string;
  params_json?: Json;
  fingerprint?: string;
  strategy_id?: string;
  dataset_id?: string;
}): Promise<CloudRun> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('runs')
    .insert({ ...run, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as CloudRun;
}

export async function updateRun(id: string, updates: Partial<CloudRun>): Promise<CloudRun> {
  const { data, error } = await supabase
    .from('runs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CloudRun;
}

export async function fetchResults(): Promise<CloudResult[]> {
  const { data, error } = await supabase
    .from('results')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as CloudResult[];
}

export async function createResult(result: {
  run_id?: string;
  summary_json: Json;
  strategy_version_id?: string;
}): Promise<CloudResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('results')
    .insert({ ...result, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as CloudResult;
}

// ============= Sync Functions =============

/**
 * Sync all data from Supabase to local Dexie cache
 * Called on login
 */
export async function syncFromCloud(): Promise<{
  datasets: number;
  strategies: number;
  runs: number;
  results: number;
}> {
  const [datasets, strategies, runs, results] = await Promise.all([
    fetchAllDatasets(),
    fetchAllStrategies(),
    fetchRuns(),
    fetchResults(),
  ]);

  // For now, we just return counts - local cache can be implemented later
  // The app will primarily use cloud data directly
  
  return {
    datasets: datasets.length,
    strategies: strategies.length,
    runs: runs.length,
    results: results.length,
  };
}

/**
 * Check if user is authenticated and online
 */
export async function checkSyncStatus(): Promise<SyncStatus> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        isOnline: false,
        isSyncing: false,
        lastSync: null,
        pendingUploads: 0,
        error: 'Not authenticated',
      };
    }

    // Test connection
    await supabase.from('datasets').select('id').limit(1);
    
    return {
      isOnline: true,
      isSyncing: false,
      lastSync: new Date(),
      pendingUploads: 0,
      error: null,
    };
  } catch (err) {
    return {
      isOnline: false,
      isSyncing: false,
      lastSync: null,
      pendingUploads: 0,
      error: err instanceof Error ? err.message : 'Connection failed',
    };
  }
}

// ============= Username Helpers =============

export async function findUserByUsername(username: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.toLowerCase())
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}

export async function updateUsername(userId: string, username: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ username: username.toLowerCase() })
    .eq('id', userId);

  if (error) throw error;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return !data;
}
