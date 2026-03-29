/**
 * useRegimeSnapshots — DB-backed regime data hook
 * Fetches latest regime snapshots and transitions from regime_snapshots table
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { computeRegimeFeatures, classifyRegime } from '@/services/regimeService';
import type { RegimeFeatures, RegimeLabel } from '@/types/quant';
import type { OHLCV } from '@/lib/indicators';

export interface RegimeSnapshot {
  id: string;
  symbol: string;
  timeframe: string;
  regime: string;
  confidence: number;
  features: RegimeFeatures;
  computed_at: string;
}

export function useRegimeSnapshots() {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<RegimeSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSnapshots = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('regime_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('computed_at', { ascending: false })
        .limit(100);

      if (data) {
        setSnapshots(data.map((r: any) => ({
          id: r.id,
          symbol: r.symbol,
          timeframe: r.timeframe,
          regime: r.regime,
          confidence: Number(r.confidence),
          features: (r.features || {}) as RegimeFeatures,
          computed_at: r.computed_at,
        })));
      }
    } catch (e) {
      console.error('[RegimeSnapshots] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchSnapshots(); }, [fetchSnapshots]);

  /** Compute regime from raw OHLCV bars and persist to DB */
  const computeAndSave = useCallback(async (
    symbol: string,
    timeframe: string,
    bars: OHLCV[]
  ): Promise<{ regime: RegimeLabel; confidence: number; features: RegimeFeatures } | null> => {
    if (!user || bars.length < 70) return null;

    const features = computeRegimeFeatures(bars);
    const { regime, confidence } = classifyRegime(features);

    // Check last snapshot to detect transition
    const { data: lastSnap } = await supabase
      .from('regime_snapshots')
      .select('regime')
      .eq('user_id', user.id)
      .eq('symbol', symbol)
      .eq('timeframe', timeframe)
      .order('computed_at', { ascending: false })
      .limit(1)
      .single();

    // Persist snapshot
    await supabase.from('regime_snapshots').insert({
      user_id: user.id,
      symbol,
      timeframe,
      regime,
      confidence,
      features: features as any,
    });

    // Record transition if regime changed
    if (lastSnap && lastSnap.regime !== regime) {
      await supabase.from('regime_transitions').insert({
        user_id: user.id,
        symbol,
        timeframe,
        from_regime: lastSnap.regime,
        to_regime: regime,
        confidence,
      });
    }

    await fetchSnapshots();
    return { regime, confidence, features };
  }, [user, fetchSnapshots]);

  // Deduplicate: latest per symbol
  const latestBySymbol = snapshots.reduce((map, s) => {
    if (!map.has(s.symbol)) map.set(s.symbol, s);
    return map;
  }, new Map<string, RegimeSnapshot>());

  return {
    snapshots,
    latestBySymbol: Array.from(latestBySymbol.values()),
    loading,
    computeAndSave,
    refetch: fetchSnapshots,
  };
}
