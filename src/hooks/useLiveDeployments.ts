/**
 * Hook for live_deployments + broker_connections CRUD with Supabase
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LiveDeployment {
  id: string;
  strategy_name: string;
  strategy_version_id: string | null;
  broker_type: string;
  account_id: string | null;
  symbol: string;
  timeframe: string;
  status: string;
  current_pnl: number | null;
  trades_executed: number | null;
  last_signal_at: string | null;
  last_heartbeat: string | null;
  pause_reason: string | null;
  runtime_config: Record<string, unknown> | null;
  risk_policy_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrokerConnection {
  id: string;
  broker_type: string;
  display_name: string | null;
  status: string;
  account_id: string | null;
  last_sync_at: string | null;
  token_expiry: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export function useLiveDeployments() {
  const { user } = useAuth();
  const [deployments, setDeployments] = useState<LiveDeployment[]>([]);
  const [brokerConnections, setBrokerConnections] = useState<BrokerConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [deplRes, brokerRes] = await Promise.all([
      supabase
        .from('live_deployments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('broker_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);
    if (deplRes.data) setDeployments(deplRes.data as unknown as LiveDeployment[]);
    if (brokerRes.data) setBrokerConnections(brokerRes.data as unknown as BrokerConnection[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateDeploymentStatus = async (id: string, status: string, pauseReason?: string) => {
    if (!user) return;
    await supabase
      .from('live_deployments')
      .update({ status, pause_reason: pauseReason || null, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .eq('user_id', user.id);
    setDeployments(prev => prev.map(d => d.id === id ? { ...d, status, pause_reason: pauseReason || null } as LiveDeployment : d));
  };

  const killAll = async () => {
    if (!user) return;
    await supabase
      .from('live_deployments')
      .update({ status: 'stopped', pause_reason: 'Kill switch activated', updated_at: new Date().toISOString() } as any)
      .eq('user_id', user.id)
      .in('status', ['running', 'paused']);
    setDeployments(prev => prev.map(d => 
      ['running', 'paused'].includes(d.status) 
        ? { ...d, status: 'stopped', pause_reason: 'Kill switch activated' } as LiveDeployment 
        : d
    ));
  };

  const connectedBrokers = brokerConnections.filter(b => b.status === 'connected');
  const runningDeployments = deployments.filter(d => d.status === 'running');
  const totalPnl = deployments.reduce((s, d) => s + (d.current_pnl || 0), 0);
  const totalTrades = deployments.reduce((s, d) => s + (d.trades_executed || 0), 0);

  return {
    deployments,
    brokerConnections,
    loading,
    connectedBrokers,
    runningDeployments,
    totalPnl,
    totalTrades,
    updateDeploymentStatus,
    killAll,
    refetch: fetchAll,
  };
}
