/**
 * SaaS Entity Services
 * Centralized data access for Datasets, Strategies, and Results
 * with visibility controls (private, public, workspace)
 */

import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TYPES
// =====================================================

export type VisibilityType = 'private' | 'public' | 'workspace';

export interface EntityBase {
  id: string;
  user_id: string;
  visibility: VisibilityType;
  created_at: string;
  usage_count: number;
  last_used_at?: string;
}

export interface DatasetEntity extends EntityBase {
  name: string;
  symbol: string;
  timeframe: string;
  row_count: number;
  range_from_ts: number;
  range_to_ts: number;
  description?: string;
  file_name?: string;
  file_size?: number;
  source_name?: string;
  project_id?: string;
}

export interface StrategyEntity extends EntityBase {
  name: string;
  code?: string;
  version?: string;
  notes?: string;
  description?: string;
  category: string;
  tags: string[];
  asset_classes: string[];
  compatible_timeframes: string[];
  parameters?: Record<string, unknown>;
  project_id?: string;
}

export interface ResultEntity extends EntityBase {
  name?: string;
  summary_json: Record<string, unknown>;
  tags: string[];
  dataset_id?: string;
  strategy_id?: string;
  run_id?: string;
  strategy_version_id?: string;
  is_favorite: boolean;
}

export interface EntityCategory {
  id: 'public' | 'private' | 'workspace' | 'shared';
  label: string;
  description: string;
  icon: string;
}

export const ENTITY_CATEGORIES: EntityCategory[] = [
  { id: 'public', label: 'Public Library', description: 'Free for everyone', icon: 'Globe' },
  { id: 'private', label: 'My Assets', description: 'Private to you', icon: 'Lock' },
  { id: 'workspace', label: 'Team Shared', description: 'Shared with workspace', icon: 'Users' },
  { id: 'shared', label: 'Shared Datasets', description: 'Admin-managed public data', icon: 'Database' },
];

// =====================================================
// DATASET SERVICE
// =====================================================

export async function getDatasets(options: {
  visibility?: VisibilityType | 'all';
  symbol?: string;
  timeframe?: string;
  limit?: number;
}): Promise<DatasetEntity[]> {
  const { visibility = 'all', symbol, timeframe, limit = 100 } = options;
  
  let query = supabase
    .from('datasets')
    .select('*')
    .order('usage_count', { ascending: false })
    .limit(limit);
  
  if (visibility !== 'all') {
    query = query.eq('visibility', visibility);
  }
  
  if (symbol) {
    query = query.eq('symbol', symbol.toUpperCase());
  }
  
  if (timeframe) {
    query = query.eq('timeframe', timeframe);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Failed to fetch datasets:', error);
    throw error;
  }
  
  return (data || []) as DatasetEntity[];
}

export async function getMyDatasets(): Promise<DatasetEntity[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  const { data, error } = await supabase
    .from('datasets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Failed to fetch user datasets:', error);
    return [];
  }
  
  return (data || []) as DatasetEntity[];
}

export async function getPublicDatasets(): Promise<DatasetEntity[]> {
  const { data, error } = await supabase
    .from('datasets')
    .select('*')
    .eq('visibility', 'public')
    .order('usage_count', { ascending: false });
  
  if (error) {
    console.error('Failed to fetch public datasets:', error);
    return [];
  }
  
  return (data || []) as DatasetEntity[];
}

export async function updateDatasetVisibility(
  datasetId: string, 
  visibility: VisibilityType
): Promise<boolean> {
  const { error } = await supabase
    .from('datasets')
    .update({ visibility })
    .eq('id', datasetId);
  
  if (error) {
    console.error('Failed to update dataset visibility:', error);
    return false;
  }
  
  return true;
}

export async function incrementDatasetUsage(datasetId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_dataset_usage', { 
    p_dataset_id: datasetId 
  });
  
  if (error) {
    console.error('Failed to increment dataset usage:', error);
  }
}

// =====================================================
// STRATEGY SERVICE
// =====================================================

export async function getStrategies(options: {
  visibility?: VisibilityType | 'all';
  category?: string;
  limit?: number;
}): Promise<StrategyEntity[]> {
  const { visibility = 'all', category, limit = 100 } = options;
  
  let query = supabase
    .from('strategies')
    .select('*')
    .order('usage_count', { ascending: false })
    .limit(limit);
  
  if (visibility !== 'all') {
    query = query.eq('visibility', visibility);
  }
  
  if (category) {
    query = query.eq('category', category);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Failed to fetch strategies:', error);
    throw error;
  }
  
  return (data || []) as StrategyEntity[];
}

export async function getMyStrategies(): Promise<StrategyEntity[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  const { data, error } = await supabase
    .from('strategies')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });
  
  if (error) {
    console.error('Failed to fetch user strategies:', error);
    return [];
  }
  
  return (data || []) as StrategyEntity[];
}

export async function getPublicStrategies(): Promise<StrategyEntity[]> {
  const { data, error } = await supabase
    .from('strategies')
    .select('*')
    .eq('visibility', 'public')
    .order('usage_count', { ascending: false });
  
  if (error) {
    console.error('Failed to fetch public strategies:', error);
    return [];
  }
  
  return (data || []) as StrategyEntity[];
}

export async function forkStrategy(strategyId: string): Promise<StrategyEntity | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  // Get original strategy
  const { data: original, error: fetchError } = await supabase
    .from('strategies')
    .select('*')
    .eq('id', strategyId)
    .single();
  
  if (fetchError || !original) {
    console.error('Failed to fetch original strategy:', fetchError);
    return null;
  }
  
  // Create fork
  const { data: forked, error: insertError } = await supabase
    .from('strategies')
    .insert({
      user_id: user.id,
      name: `${original.name} (Fork)`,
      code: original.code,
      parameters: original.parameters,
      notes: `Forked from ${original.name}`,
      description: original.description,
      category: original.category,
      tags: original.tags,
      asset_classes: original.asset_classes,
      compatible_timeframes: original.compatible_timeframes,
      visibility: 'private',
    })
    .select()
    .single();
  
  if (insertError) {
    console.error('Failed to fork strategy:', insertError);
    return null;
  }
  
  return forked as StrategyEntity;
}

export async function updateStrategyVisibility(
  strategyId: string, 
  visibility: VisibilityType
): Promise<boolean> {
  const { error } = await supabase
    .from('strategies')
    .update({ visibility })
    .eq('id', strategyId);
  
  if (error) {
    console.error('Failed to update strategy visibility:', error);
    return false;
  }
  
  return true;
}

export async function incrementStrategyUsage(strategyId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_strategy_usage', { 
    p_strategy_id: strategyId 
  });
  
  if (error) {
    console.error('Failed to increment strategy usage:', error);
  }
}

// =====================================================
// RESULTS SERVICE
// =====================================================

export async function getResults(options: {
  visibility?: VisibilityType | 'all';
  limit?: number;
  favoritesOnly?: boolean;
}): Promise<ResultEntity[]> {
  const { visibility = 'all', limit = 100, favoritesOnly = false } = options;
  
  let query = supabase
    .from('results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (visibility !== 'all') {
    query = query.eq('visibility', visibility);
  }
  
  if (favoritesOnly) {
    query = query.eq('is_favorite', true);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Failed to fetch results:', error);
    throw error;
  }
  
  return (data || []) as ResultEntity[];
}

export async function getMyResults(): Promise<ResultEntity[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  const { data, error } = await supabase
    .from('results')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Failed to fetch user results:', error);
    return [];
  }
  
  return (data || []) as ResultEntity[];
}

export async function updateResultVisibility(
  resultId: string, 
  visibility: VisibilityType
): Promise<boolean> {
  const { error } = await supabase
    .from('results')
    .update({ visibility })
    .eq('id', resultId);
  
  if (error) {
    console.error('Failed to update result visibility:', error);
    return false;
  }
  
  return true;
}

export async function toggleResultFavorite(resultId: string): Promise<boolean> {
  const { data: current, error: fetchError } = await supabase
    .from('results')
    .select('is_favorite')
    .eq('id', resultId)
    .single();
  
  if (fetchError) {
    console.error('Failed to fetch result:', fetchError);
    return false;
  }
  
  const { error } = await supabase
    .from('results')
    .update({ is_favorite: !current?.is_favorite })
    .eq('id', resultId);
  
  if (error) {
    console.error('Failed to toggle favorite:', error);
    return false;
  }
  
  return true;
}

// =====================================================
// SEARCH SERVICE
// =====================================================

export interface SearchResult {
  type: 'dataset' | 'strategy' | 'result';
  id: string;
  name: string;
  description?: string;
  visibility: VisibilityType;
  meta: Record<string, unknown>;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];
  
  const results: SearchResult[] = [];
  const searchTerm = `%${query.toLowerCase()}%`;
  
  // Search datasets
  const { data: datasets } = await supabase
    .from('datasets')
    .select('id, name, symbol, timeframe, visibility')
    .or(`name.ilike.${searchTerm},symbol.ilike.${searchTerm}`)
    .limit(10);
  
  datasets?.forEach(d => {
    results.push({
      type: 'dataset',
      id: d.id,
      name: d.name,
      description: `${d.symbol} - ${d.timeframe}`,
      visibility: d.visibility as VisibilityType,
      meta: { symbol: d.symbol, timeframe: d.timeframe },
    });
  });
  
  // Search strategies
  const { data: strategies } = await supabase
    .from('strategies')
    .select('id, name, category, visibility')
    .or(`name.ilike.${searchTerm},category.ilike.${searchTerm}`)
    .limit(10);
  
  strategies?.forEach(s => {
    results.push({
      type: 'strategy',
      id: s.id,
      name: s.name,
      description: s.category,
      visibility: s.visibility as VisibilityType,
      meta: { category: s.category },
    });
  });
  
  return results;
}
