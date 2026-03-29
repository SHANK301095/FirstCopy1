/**
 * Symbol Metadata Service — Fetch instrument metadata for all quant modules
 */
import { supabase } from '@/integrations/supabase/client';
import type { SymbolMetadata } from '@/types/quant';

let _cache: SymbolMetadata[] | null = null;
let _cacheAt = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

export async function fetchSymbolMetadata(): Promise<SymbolMetadata[]> {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) return _cache;

  const { data } = await supabase
    .from('symbol_metadata')
    .select('*')
    .eq('status', 'active')
    .order('symbol');

  _cache = (data || []) as unknown as SymbolMetadata[];
  _cacheAt = Date.now();
  return _cache;
}

export async function getSymbolMeta(symbol: string): Promise<SymbolMetadata | null> {
  const all = await fetchSymbolMetadata();
  return all.find(s => s.symbol === symbol) || null;
}

export function invalidateSymbolCache() {
  _cache = null;
  _cacheAt = 0;
}
