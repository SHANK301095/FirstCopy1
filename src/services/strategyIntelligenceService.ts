/**
 * Strategy Intelligence Service — Real DB-backed strategy profiles
 * Replaces the mock random generator with actual persisted evidence
 */
import { supabase } from '@/integrations/supabase/client';
import type { StrategyIntelligence } from '@/types/strategyIntelligence';

export interface StrategyIntelligenceRow {
  id: string;
  user_id: string;
  strategy_id: string | null;
  name: string;
  strategy_type: string;
  description: string;
  methodology: string;
  status: string;
  readiness: string;
  win_rate: number;
  profit_factor: number;
  expectancy: number;
  cagr: number;
  max_drawdown: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  walk_forward_stability: number;
  oos_performance: number;
  parameter_robustness: number;
  recovery_efficiency: number;
  mmc_composite_score: number;
  execution_realism_score: number;
  markets: string[];
  assets: string[];
  timeframes: string[];
  regime_suitability: string[];
  session_dependency: string;
  tags: string[];
  backtest_count: number;
  last_backtest_at: string | null;
  last_wf_at: string | null;
  last_mc_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

/** Convert DB row to the StrategyIntelligence format used by UI components */
export function rowToStrategyIntelligence(row: StrategyIntelligenceRow): StrategyIntelligence {
  return {
    identity: {
      id: row.id,
      name: row.name,
      type: row.strategy_type as any,
      description: row.description,
      status: row.status as any,
    },
    compatibility: {
      markets: row.markets as any[],
      assets: row.assets,
      timeframes: row.timeframes,
      sessionDependency: row.session_dependency as any,
      regimeSuitability: row.regime_suitability as any[],
    },
    performance: {
      winRate: Number(row.win_rate),
      profitFactor: Number(row.profit_factor),
      expectancy: Number(row.expectancy),
      cagr: Number(row.cagr),
      avgTradeDuration: 'N/A',
      maxDrawdown: Number(row.max_drawdown),
      sharpeRatio: Number(row.sharpe_ratio),
      sortinoRatio: Number(row.sortino_ratio),
      ulcerIndex: 0,
      consecutiveLossCount: 0,
    },
    execution: {
      volatilitySensitivity: 'medium',
      spreadSensitivity: 'medium',
      slippageSensitivity: 'medium',
      newsSensitivity: 'low',
      executionRealismScore: Number(row.execution_realism_score),
    },
    research: {
      walkForwardStability: Number(row.walk_forward_stability),
      outOfSamplePerformance: Number(row.oos_performance),
      parameterRobustness: Number(row.parameter_robustness),
      recoveryEfficiency: Number(row.recovery_efficiency),
      mmcCompositeScore: Number(row.mmc_composite_score),
    },
    tags: row.tags as any[],
    charts: {
      equityCurve: [],
      drawdownCurve: [],
      monthlyReturns: [],
      distributionBuckets: [],
    },
    notes: row.notes,
    methodology: row.methodology,
    deploymentReadiness: row.readiness === 'deployable' ? 'ready' : row.readiness === 'review_required' ? 'needs_review' : 'not_ready',
    lastUpdated: row.updated_at,
    createdAt: row.created_at,
  };
}

/** Fetch all strategy intelligence records for the current user */
export async function fetchStrategyIntelligence(): Promise<StrategyIntelligence[]> {
  const { data, error } = await supabase
    .from('strategy_intelligence')
    .select('*')
    .order('mmc_composite_score', { ascending: false });

  if (error) {
    console.error('[StrategyIntelligence] Fetch error:', error.message);
    return [];
  }

  return (data || []).map((row: any) => rowToStrategyIntelligence(row as StrategyIntelligenceRow));
}

/** Upsert a strategy intelligence record */
export async function upsertStrategyIntelligence(
  record: Partial<StrategyIntelligenceRow> & { name: string; user_id: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase
    .from('strategy_intelligence')
    .upsert(record as any, { onConflict: 'id' })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: data?.id };
}

/** Delete a strategy intelligence record */
export async function deleteStrategyIntelligence(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('strategy_intelligence')
    .delete()
    .eq('id', id);
  return !error;
}
