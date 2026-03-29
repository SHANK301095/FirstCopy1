/**
 * Cloud Sync Service
 * Handles syncing local data with Supabase when user is authenticated
 * Uses incremental sync with pagination and delta tracking
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// Pagination settings
const PAGE_SIZE = 100;

// Last sync timestamp storage key prefix
const LAST_SYNC_KEY_PREFIX = 'cloud_sync_last_';

export interface CloudProject {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloudStrategy {
  id: string;
  name: string;
  code: string | null;
  notes: string | null;
  version: string | null;
  parameters: Json | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloudDataset {
  id: string;
  name: string;
  file_name: string | null;
  row_count: number | null;
  columns: Json | null;
  timezone: string | null;
  fingerprint: string | null;
  project_id: string | null;
  created_at: string;
}

export interface CloudRun {
  id: string;
  status: string | null;
  params_json: Json | null;
  fingerprint: string | null;
  strategy_id: string | null;
  dataset_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloudResult {
  id: string;
  run_id: string | null;
  summary_json: Json;
  created_at: string;
  strategy_version_id: string | null;
}

// Helper to get/set last sync timestamp
function getLastSyncAt(entity: string): string | null {
  return localStorage.getItem(`${LAST_SYNC_KEY_PREFIX}${entity}`);
}

function setLastSyncAt(entity: string, timestamp: string): void {
  localStorage.setItem(`${LAST_SYNC_KEY_PREFIX}${entity}`, timestamp);
}

// Projects
export async function fetchProjects(options?: { incremental?: boolean }): Promise<CloudProject[]> {
  const since = options?.incremental ? getLastSyncAt('projects') : null;
  const allData: CloudProject[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (since) {
      query = query.gt('updated_at', since);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    if (data && data.length > 0) {
      allData.push(...data);
      hasMore = data.length === PAGE_SIZE;
      page++;
    } else {
      hasMore = false;
    }
  }

  if (allData.length > 0) {
    setLastSyncAt('projects', new Date().toISOString());
  }
  
  return allData;
}

export async function createProject(name: string, description?: string): Promise<CloudProject> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('projects')
    .insert({ name, description, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProject(id: string, updates: { name?: string; description?: string }): Promise<CloudProject> {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Strategies
export async function fetchStrategies(projectId?: string, options?: { incremental?: boolean }): Promise<CloudStrategy[]> {
  const since = options?.incremental ? getLastSyncAt('strategies') : null;
  const allData: CloudStrategy[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('strategies')
      .select('*')
      .order('updated_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (since) {
      query = query.gt('updated_at', since);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    if (data && data.length > 0) {
      allData.push(...data);
      hasMore = data.length === PAGE_SIZE;
      page++;
    } else {
      hasMore = false;
    }
  }

  if (allData.length > 0) {
    setLastSyncAt('strategies', new Date().toISOString());
  }
  
  return allData;
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
  return data;
}

export async function updateStrategy(id: string, updates: Partial<CloudStrategy>): Promise<CloudStrategy> {
  const { data, error } = await supabase
    .from('strategies')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteStrategy(id: string): Promise<void> {
  const { error } = await supabase
    .from('strategies')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Datasets
export async function fetchDatasets(projectId?: string, options?: { incremental?: boolean }): Promise<CloudDataset[]> {
  const since = options?.incremental ? getLastSyncAt('datasets') : null;
  const allData: CloudDataset[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('datasets')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (since) {
      query = query.gt('created_at', since);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    if (data && data.length > 0) {
      allData.push(...data);
      hasMore = data.length === PAGE_SIZE;
      page++;
    } else {
      hasMore = false;
    }
  }

  if (allData.length > 0) {
    setLastSyncAt('datasets', new Date().toISOString());
  }
  
  return allData;
}

export async function createDataset(dataset: {
  name: string;
  file_name?: string;
  row_count?: number;
  columns?: Json;
  timezone?: string;
  fingerprint?: string;
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
  return data;
}

export async function deleteDataset(id: string): Promise<void> {
  const { error } = await supabase
    .from('datasets')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Runs
export async function fetchRuns(strategyId?: string, options?: { incremental?: boolean }): Promise<CloudRun[]> {
  const since = options?.incremental ? getLastSyncAt('runs') : null;
  const allData: CloudRun[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('runs')
      .select('*')
      .order('updated_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (strategyId) {
      query = query.eq('strategy_id', strategyId);
    }
    if (since) {
      query = query.gt('updated_at', since);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    if (data && data.length > 0) {
      allData.push(...data);
      hasMore = data.length === PAGE_SIZE;
      page++;
    } else {
      hasMore = false;
    }
  }

  if (allData.length > 0) {
    setLastSyncAt('runs', new Date().toISOString());
  }
  
  return allData;
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
  return data;
}

export async function updateRun(id: string, updates: Partial<CloudRun>): Promise<CloudRun> {
  const { data, error } = await supabase
    .from('runs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Results
export async function fetchResults(options?: { runId?: string; strategyVersionId?: string; incremental?: boolean }): Promise<CloudResult[]> {
  const since = options?.incremental ? getLastSyncAt('results') : null;
  const allData: CloudResult[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('results')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (options?.runId) {
      query = query.eq('run_id', options.runId);
    }
    if (options?.strategyVersionId) {
      query = query.eq('strategy_version_id', options.strategyVersionId);
    }
    if (since) {
      query = query.gt('created_at', since);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    if (data && data.length > 0) {
      allData.push(...data);
      hasMore = data.length === PAGE_SIZE;
      page++;
    } else {
      hasMore = false;
    }
  }

  if (allData.length > 0) {
    setLastSyncAt('results', new Date().toISOString());
  }
  
  return allData;
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
  return data;
}

export async function updateResult(id: string, updates: { strategy_version_id?: string }): Promise<CloudResult> {
  const { data, error } = await supabase
    .from('results')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteResult(id: string): Promise<void> {
  const { error } = await supabase
    .from('results')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Strategy Versions
export interface CloudStrategyVersion {
  id: string;
  strategy_id: string;
  version: string;
  code: string | null;
  notes: string | null;
  parameters: Json | null;
  change_summary: string | null;
  created_at: string;
}

export async function fetchStrategyVersions(strategyId: string): Promise<CloudStrategyVersion[]> {
  const { data, error } = await supabase
    .from('strategy_versions')
    .select('*')
    .eq('strategy_id', strategyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createStrategyVersion(version: {
  strategy_id: string;
  version: string;
  code?: string;
  notes?: string;
  parameters?: Json;
  change_summary?: string;
}): Promise<CloudStrategyVersion> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('strategy_versions')
    .insert({ ...version, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteStrategyVersion(id: string): Promise<void> {
  const { error } = await supabase
    .from('strategy_versions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Logging
export async function logToCloud(scope: string, message: string, level: 'info' | 'warn' | 'error' = 'info', meta?: Json): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  await supabase
    .from('logs')
    .insert({
      scope,
      message,
      level,
      meta_json: meta,
      user_id: user?.id
    });
}

// Sync status check
export async function checkSyncStatus(): Promise<{ isOnline: boolean; lastSync: Date | null }> {
  try {
    await supabase.from('projects').select('id').limit(1);
    return { isOnline: true, lastSync: new Date() };
  } catch {
    return { isOnline: false, lastSync: null };
  }
}

// Clear sync timestamps (useful for forcing full refresh)
export function clearSyncTimestamps(): void {
  const keys = ['projects', 'strategies', 'datasets', 'runs', 'results'];
  keys.forEach(key => localStorage.removeItem(`${LAST_SYNC_KEY_PREFIX}${key}`));
}
