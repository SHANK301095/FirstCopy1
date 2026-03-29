/**
 * Hook for paper_accounts + paper_orders CRUD with Supabase
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PaperAccount {
  id: string;
  name: string;
  mode: string;
  balance: number;
  equity: number;
  initial_balance: number;
  realized_pnl: number | null;
  unrealized_pnl: number | null;
  used_margin: number | null;
  total_fees: number | null;
  created_at: string;
  updated_at: string;
}

export interface PaperOrder {
  id: string;
  account_id: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number | null;
  avg_fill_price: number | null;
  order_type: string;
  status: string;
  stop_loss: number | null;
  take_profit: number | null;
  fees: number | null;
  slippage: number | null;
  created_at: string;
}

export function usePaperAccount() {
  const { user } = useAuth();
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [orders, setOrders] = useState<PaperOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccount = useCallback(async () => {
    if (!user) return;
    // Get or create default paper account
    let { data } = await supabase
      .from('paper_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      const { data: created } = await supabase
        .from('paper_accounts')
        .insert({
          user_id: user.id,
          name: 'Default Paper Account',
          mode: 'manual',
          balance: 10000,
          equity: 10000,
          initial_balance: 10000,
        })
        .select()
        .single();
      data = created;
    }

    if (data) setAccount(data as unknown as PaperAccount);
    setLoading(false);
  }, [user]);

  const fetchOrders = useCallback(async () => {
    if (!user || !account) return;
    const { data } = await supabase
      .from('paper_orders')
      .select('*')
      .eq('account_id', account.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);
    if (data) setOrders(data as unknown as PaperOrder[]);
  }, [user, account]);

  useEffect(() => { fetchAccount(); }, [fetchAccount]);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const placeOrder = async (order: {
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
    stop_loss?: number;
    take_profit?: number;
  }) => {
    if (!user || !account) return null;
    const { data, error } = await supabase
      .from('paper_orders')
      .insert({
        user_id: user.id,
        account_id: account.id,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        price: order.price,
        avg_fill_price: order.price,
        order_type: 'market',
        status: 'filled',
        stop_loss: order.stop_loss || null,
        take_profit: order.take_profit || null,
        fees: +(order.quantity * order.price * 0.00002).toFixed(2), // Simulated commission
      })
      .select()
      .single();
    if (data) {
      setOrders(prev => [data as unknown as PaperOrder, ...prev]);
    }
    return data;
  };

  const closeOrder = async (orderId: string, exitPrice: number) => {
    if (!user) return;
    await supabase
      .from('paper_orders')
      .update({ status: 'closed', avg_fill_price: exitPrice } as any)
      .eq('id', orderId)
      .eq('user_id', user.id);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'closed', avg_fill_price: exitPrice } : o));
  };

  const updateAccountBalance = async (updates: Partial<{
    balance: number;
    equity: number;
    realized_pnl: number;
    unrealized_pnl: number;
    used_margin: number;
  }>) => {
    if (!user || !account) return;
    await supabase
      .from('paper_accounts')
      .update(updates as any)
      .eq('id', account.id)
      .eq('user_id', user.id);
    setAccount(prev => prev ? { ...prev, ...updates } as PaperAccount : null);
  };

  const resetAccount = async () => {
    if (!user || !account) return;
    await supabase.from('paper_orders').delete().eq('account_id', account.id).eq('user_id', user.id);
    await supabase.from('paper_accounts').update({
      balance: account.initial_balance,
      equity: account.initial_balance,
      realized_pnl: 0,
      unrealized_pnl: 0,
      used_margin: 0,
      total_fees: 0,
    } as any).eq('id', account.id).eq('user_id', user.id);
    setOrders([]);
    setAccount(prev => prev ? {
      ...prev,
      balance: prev.initial_balance,
      equity: prev.initial_balance,
      realized_pnl: 0,
      unrealized_pnl: 0,
      used_margin: 0,
      total_fees: 0,
    } : null);
  };

  return { account, orders, loading, placeOrder, closeOrder, updateAccountBalance, resetAccount, refetch: fetchAccount };
}
