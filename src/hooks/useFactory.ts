/**
 * Factory hooks — CRUD + edge function invocations for Strategy Factory
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ── Strategies (extended) ──
export function useFactoryStrategies() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['factory-strategies', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategies')
        .select('*, strategy_versions(id, version_number, artifact_type, sha256, created_at)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ── Broker Profiles ──
export function useBrokerProfiles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['broker-profiles', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('broker_profiles').select('*').eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
  });
}

// ── Data Profiles ──
export function useDataProfiles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['data-profiles', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('data_profiles').select('*').eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
  });
}

// ── Backtest Configs ──
export function useBacktestConfigs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['backtest-configs', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backtest_configs')
        .select('*, broker_profiles(broker_name, symbol), data_profiles(name)')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
  });
}

// ── Rotation Cycles ──
export function useRotationCycles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['rotation-cycles', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rotation_cycles')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ── Backtest Jobs ──
export function useBacktestJobs(cycleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['backtest-jobs', user?.id, cycleId],
    enabled: !!user && !!cycleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backtest_jobs')
        .select('*, strategy_versions(version_number, strategies(name)), backtest_configs(symbol, timeframe), factory_backtest_results(*)')
        .eq('user_id', user!.id)
        .eq('cycle_id', cycleId!)
        .order('priority', { ascending: true });
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });
}

// ── Strategy Scores ──
export function useStrategyScores(cycleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['strategy-scores', user?.id, cycleId],
    enabled: !!user && !!cycleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategy_scores')
        .select('*, strategy_versions(version_number, strategies(name, category))')
        .eq('user_id', user!.id)
        .eq('cycle_id', cycleId!)
        .order('rank', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

// ── Factory Portfolios ──
export function useFactoryPortfolios() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['factory-portfolios', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('factory_portfolios')
        .select('*, rotation_cycles(cycle_type, as_of, status)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePortfolioMembers(portfolioId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['portfolio-members', user?.id, portfolioId],
    enabled: !!user && !!portfolioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('factory_portfolio_members')
        .select('*, strategy_versions(version_number, strategies(name, category))')
        .eq('user_id', user!.id)
        .eq('portfolio_id', portfolioId!)
        .order('role', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

// ── Deployments ──
export function useFactoryDeployments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['factory-deployments', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('factory_deployments')
        .select('*, factory_portfolio_members(symbol, timeframe, role, strategy_versions(strategies(name))), factory_accounts(label), factory_terminals(name)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });
}

// ── Live Metrics ──
export function useLiveMetrics(deploymentId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['live-metrics', user?.id, deploymentId],
    enabled: !!user && !!deploymentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('factory_live_metrics')
        .select('*')
        .eq('user_id', user!.id)
        .eq('deployment_id', deploymentId!)
        .order('date', { ascending: false })
        .limit(90);
      if (error) throw error;
      return data;
    },
  });
}

// ── System Events ──
export function useSystemEvents(limit = 50) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['factory-events', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('factory_system_events')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

// ── Terminals & Accounts ──
export function useFactoryTerminals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['factory-terminals', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('factory_terminals').select('*').eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
  });
}

export function useFactoryAccounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['factory-accounts', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('factory_accounts').select('*').eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
  });
}

// ── Edge Function Mutations ──
export function useEnqueueJobs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { cycle_id: string; strategy_ids?: string[]; symbols?: string[]; timeframes?: string[] }) => {
      const { data, error } = await supabase.functions.invoke('backtest-enqueue', { body: params });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const d = data?.data || data;
      toast.success(`${d.jobs_created || 0} jobs enqueued`);
      qc.invalidateQueries({ queryKey: ['backtest-jobs'] });
      qc.invalidateQueries({ queryKey: ['factory-events'] });
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useScoreCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { cycle_id: string }) => {
      const { data, error } = await supabase.functions.invoke('score-cycle', { body: params });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const d = data?.data || data;
      toast.success(`Scored ${d.scores || 0} strategies. Top: ${d.top_score || 0}`);
      qc.invalidateQueries({ queryKey: ['strategy-scores'] });
      qc.invalidateQueries({ queryKey: ['rotation-cycles'] });
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useBuildPortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { cycle_id: string; max_eas?: number }) => {
      const { data, error } = await supabase.functions.invoke('build-portfolio', { body: params });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const d = data?.data || data;
      toast.success(`Portfolio built: ${d.champions || 0} champions, ${d.challengers || 0} challengers`);
      qc.invalidateQueries({ queryKey: ['factory-portfolios'] });
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function usePublishCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { cycle_id: string }) => {
      const { data, error } = await supabase.functions.invoke('publish-cycle', { body: params });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Cycle published');
      qc.invalidateQueries({ queryKey: ['rotation-cycles'] });
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useDeployPortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { portfolio_id: string; account_id: string; terminal_id: string }) => {
      const { data, error } = await supabase.functions.invoke('deployment-dispatch', { body: params });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const d = data?.data || data;
      toast.success(`${d.deployments || 0} deployments created`);
      qc.invalidateQueries({ queryKey: ['factory-deployments'] });
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useSubmitMockResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { job_id: string; result: Record<string, any> }) => {
      const { data, error } = await supabase.functions.invoke('backtest-submit-results', {
        body: { job_id: params.job_id, status: 'succeeded', result: params.result },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Mock result submitted');
      qc.invalidateQueries({ queryKey: ['backtest-jobs'] });
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useIngestMetrics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { deployment_id: string; date: string; daily_pnl: number; dd_pct: number; trade_count: number; expectancy: number; drift_score: number }) => {
      const { data, error } = await supabase.functions.invoke('monitoring-ingest', { body: params });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const d = data?.data || data;
      if (d.killed) toast.warning('Kill-switch triggered! Auto-replacement initiated.');
      else toast.success('Metrics ingested');
      qc.invalidateQueries({ queryKey: ['factory-deployments'] });
      qc.invalidateQueries({ queryKey: ['live-metrics'] });
    },
    onError: (err: any) => toast.error(err.message),
  });
}
