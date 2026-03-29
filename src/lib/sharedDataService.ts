/**
 * Shared Market Data Service
 * Handles fetching shared OHLCV datasets for backtesting
 * Users can't download files directly - data is streamed via edge function
 */

import { supabase } from '@/integrations/supabase/client';

export interface SharedDataset {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  row_count: number;
  file_size_bytes: number;
  range_from_ts: number;
  range_to_ts: number;
  description?: string;
  source_info?: string;
  is_active: boolean;
  created_at: string;
}

export interface DataChunkMeta {
  symbol: string;
  timeframe: string;
  sourceTimeframe?: string;
  totalRows: number;
  totalChunks: number;
  currentChunk: number;
  hasMore: boolean;
  rangeFrom?: number;
  rangeTo?: number;
  aggregatedFrom?: string;
}

export interface DataChunkResponse {
  rows: number[][]; // [ts, o, h, l, c, v]
  meta: DataChunkMeta;
}

// Supported aggregation timeframes
export type AggregationTimeframe = '1m' | '5m' | '15m' | '30m' | '1H' | '4H' | '1D';

export const AGGREGATION_OPTIONS: { value: AggregationTimeframe; label: string }[] = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '30m', label: '30 Minutes' },
  { value: '1H', label: '1 Hour' },
  { value: '4H', label: '4 Hours' },
  { value: '1D', label: '1 Day' },
];

/**
 * Fetch list of available shared datasets (metadata only)
 */
export async function getSharedDatasets(): Promise<SharedDataset[]> {
  const { data, error } = await supabase
    .from('shared_datasets')
    .select('*')
    .eq('is_active', true)
    .order('symbol', { ascending: true });

  if (error) {
    console.error('Failed to fetch shared datasets:', error);
    throw error;
  }

  return (data || []) as SharedDataset[];
}

/**
 * Get datasets for a specific symbol
 */
export async function getDatasetsBySymbol(symbol: string): Promise<SharedDataset[]> {
  const { data, error } = await supabase
    .from('shared_datasets')
    .select('*')
    .eq('symbol', symbol.toUpperCase())
    .eq('is_active', true)
    .order('timeframe', { ascending: true });

  if (error) {
    console.error('Failed to fetch datasets for symbol:', error);
    throw error;
  }

  return (data || []) as SharedDataset[];
}

/**
 * Get unique symbols from shared datasets
 */
export async function getSharedSymbols(): Promise<string[]> {
  const { data, error } = await supabase
    .from('shared_datasets')
    .select('symbol')
    .eq('is_active', true);

  if (error) {
    console.error('Failed to fetch symbols:', error);
    throw error;
  }

  const symbols = [...new Set((data || []).map(d => d.symbol))];
  return symbols.sort();
}

export interface FetchDataOptions {
  chunkIndex?: number;
  chunkSize?: number;
  startTs?: number;
  endTs?: number;
  aggregateTo?: AggregationTimeframe;
}

/**
 * Fetch OHLCV data chunk from edge function
 * This is the ONLY way users can access the actual data
 * 
 * @param datasetId - The shared dataset ID
 * @param options - Fetch options including pagination and aggregation
 * @param options.aggregateTo - Target timeframe for server-side aggregation (5m, 15m, 1H, 4H, 1D)
 */
export async function fetchDataChunk(
  datasetId: string,
  options: FetchDataOptions = {}
): Promise<DataChunkResponse> {
  const { 
    chunkIndex = 0, 
    chunkSize = 50000, 
    startTs, 
    endTs, 
    aggregateTo 
  } = options;
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Authentication required to fetch market data');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-market-data`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        datasetId,
        chunkIndex,
        chunkSize,
        startTs,
        endTs,
        aggregateTo,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch market data');
  }

  return response.json();
}

export interface FetchFullDatasetOptions {
  startTs?: number;
  endTs?: number;
  aggregateTo?: AggregationTimeframe;
}

/**
 * Fetch ALL data for a dataset (streaming chunks)
 * For large datasets, this may take time
 * 
 * @param datasetId - The shared dataset ID
 * @param onProgress - Progress callback
 * @param options - Fetch options including date range and aggregation
 */
export async function fetchFullDataset(
  datasetId: string,
  onProgress?: (progress: number, message: string) => void,
  options?: FetchFullDatasetOptions
): Promise<number[][]> {
  const allRows: number[][] = [];
  let chunkIndex = 0;
  let hasMore = true;

  const tfLabel = options?.aggregateTo ? ` (${options.aggregateTo})` : '';

  while (hasMore) {
    onProgress?.(0, `Fetching chunk ${chunkIndex + 1}${tfLabel}...`);
    
    const { rows, meta } = await fetchDataChunk(datasetId, {
      chunkIndex,
      startTs: options?.startTs,
      endTs: options?.endTs,
      aggregateTo: options?.aggregateTo,
    });
    allRows.push(...rows);
    
    hasMore = meta.hasMore;
    chunkIndex++;

    const progress = Math.min(100, (allRows.length / meta.totalRows) * 100);
    const aggInfo = meta.aggregatedFrom ? ` (aggregated from ${meta.aggregatedFrom})` : '';
    onProgress?.(progress, `Loaded ${allRows.length.toLocaleString()} of ${meta.totalRows.toLocaleString()} rows${aggInfo}`);
  }

  return allRows;
}

/**
 * Check if a shared dataset exists for given symbol/timeframe
 */
export async function findSharedDataset(
  symbol: string,
  timeframe: string
): Promise<SharedDataset | null> {
  const { data, error } = await supabase
    .from('shared_datasets')
    .select('*')
    .eq('symbol', symbol.toUpperCase())
    .eq('timeframe', timeframe)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Failed to find dataset:', error);
    return null;
  }

  return data as SharedDataset | null;
}
