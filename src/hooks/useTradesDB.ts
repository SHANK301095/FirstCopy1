/**
 * Trades database hook - CRUD operations for trades table
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { computeTradeStats } from '@/lib/tradeMetrics';

export interface Trade {
  id: string;
  user_id: string;
  account_id: string | null;
  symbol: string;
  direction: 'long' | 'short';
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  lot_size: number | null;
  entry_time: string;
  exit_time: string | null;
  status: 'open' | 'closed' | 'cancelled';
  pnl: number;
  pnl_pips: number | null;
  fees: number;
  net_pnl: number;
  stop_loss: number | null;
  take_profit: number | null;
  risk_reward: number | null;
  r_multiple: number | null;
  strategy_tag: string | null;
  session_tag: string | null;
  timeframe: string | null;
  setup_type: string | null;
  notes: string | null;
  mindset_rating: number | null;
  quality_score: number | null;
  emotions: string[];
  tags: string[];
  trade_grade: string | null;
  grade_details: Record<string, unknown> | null;
  broker_trade_id: string | null;
  import_source: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TradeInsert {
  symbol: string;
  direction: 'long' | 'short';
  entry_price: number;
  exit_price?: number | null;
  quantity?: number;
  lot_size?: number | null;
  entry_time: string;
  exit_time?: string | null;
  status?: 'open' | 'closed' | 'cancelled';
  pnl?: number;
  net_pnl?: number;
  pnl_pips?: number | null;
  fees?: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  risk_reward?: number | null;
  r_multiple?: number | null;
  strategy_tag?: string | null;
  session_tag?: string | null;
  timeframe?: string | null;
  setup_type?: string | null;
  notes?: string | null;
  mindset_rating?: number | null;
  quality_score?: number | null;
  emotions?: string[];
  tags?: string[];
  import_source?: string;
  account_id?: string | null;
  broker_trade_id?: string | null;
}

export interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnL: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  maxDrawdown: number;
  bestTrade: number;
  worstTrade: number;
  avgRMultiple: number;
  currentStreak: { type: 'win' | 'loss'; count: number };
  longestWinStreak: number;
  longestLossStreak: number;
}

export function useTradesDB() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TradeStats | null>(null);

  const fetchTrades = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_time', { ascending: false });

      if (error) throw error;
      const typed = (data || []) as unknown as Trade[];
      setTrades(typed);
      setStats(computeTradeStats(typed));
    } catch (err: any) {
      toast.error('Failed to load trades', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addTrade = async (trade: TradeInsert) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('trades')
        .insert({ ...trade, user_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      toast.success('Trade logged');
      await fetchTrades();
      return data;
    } catch (err: any) {
      toast.error('Failed to add trade', { description: err.message });
      return null;
    }
  };

  const addBulkTrades = async (tradesList: TradeInsert[]) => {
    if (!user) return false;
    try {
      const rows = tradesList.map(t => ({ ...t, user_id: user.id }));
      const { error } = await supabase.from('trades').insert(rows as any);
      if (error) throw error;
      toast.success(`${tradesList.length} trades imported`);
      await fetchTrades();
      return true;
    } catch (err: any) {
      toast.error('Failed to import trades', { description: err.message });
      return false;
    }
  };

  const updateTrade = async (id: string, updates: Partial<TradeInsert>) => {
    try {
      const { error } = await supabase
        .from('trades')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
      toast.success('Trade updated');
      await fetchTrades();
    } catch (err: any) {
      toast.error('Failed to update trade', { description: err.message });
    }
  };

  const deleteTrade = async (id: string) => {
    try {
      const { error } = await supabase.from('trades').delete().eq('id', id);
      if (error) throw error;
      toast.success('Trade deleted');
      await fetchTrades();
    } catch (err: any) {
      toast.error('Failed to delete trade', { description: err.message });
    }
  };

  // computeStats is now delegated to shared tradeMetrics module

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('trades-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: `user_id=eq.${user.id}` }, () => {
        fetchTrades();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchTrades]);

  return { trades, loading, stats, addTrade, addBulkTrades, updateTrade, deleteTrade, refresh: fetchTrades };
}
