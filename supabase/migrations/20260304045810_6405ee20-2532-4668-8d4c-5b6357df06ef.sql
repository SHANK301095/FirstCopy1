
-- ============================================
-- STRATEGY FACTORY + AUTO-ROTATION SCHEMA
-- ============================================

-- 1. Extend existing strategies table with factory columns
ALTER TABLE public.strategies
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_symbol text,
  ADD COLUMN IF NOT EXISTS timeframes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS factory_status text NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_strategies_factory_status ON public.strategies (factory_status);
CREATE INDEX IF NOT EXISTS idx_strategies_tags ON public.strategies USING gin (tags);

-- 2. Extend existing strategy_versions with artifact columns
ALTER TABLE public.strategy_versions
  ADD COLUMN IF NOT EXISTS artifact_type text NOT NULL DEFAULT 'script',
  ADD COLUMN IF NOT EXISTS artifact_path text,
  ADD COLUMN IF NOT EXISTS sha256 text,
  ADD COLUMN IF NOT EXISTS changelog text;

-- 3. broker_profiles
CREATE TABLE public.broker_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  broker_name text NOT NULL,
  symbol text NOT NULL,
  avg_spread numeric NOT NULL DEFAULT 0,
  spread_p95 numeric NOT NULL DEFAULT 0,
  commission_per_lot numeric NOT NULL DEFAULT 0,
  slippage_normal numeric NOT NULL DEFAULT 0,
  slippage_worst numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_broker_profiles_user ON public.broker_profiles (user_id);
CREATE INDEX idx_broker_profiles_broker ON public.broker_profiles (broker_name);
CREATE INDEX idx_broker_profiles_symbol ON public.broker_profiles (symbol);
ALTER TABLE public.broker_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own broker_profiles" ON public.broker_profiles FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4. data_profiles
CREATE TABLE public.data_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  source text NOT NULL DEFAULT 'unknown',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_data_profiles_user ON public.data_profiles (user_id);
ALTER TABLE public.data_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own data_profiles" ON public.data_profiles FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5. backtest_configs
CREATE TABLE public.backtest_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  timeframe text NOT NULL,
  broker_profile_id uuid NOT NULL REFERENCES public.broker_profiles(id),
  data_profile_id uuid NOT NULL REFERENCES public.data_profiles(id),
  train_start date NOT NULL,
  train_end date NOT NULL,
  test_start date NOT NULL,
  test_end date NOT NULL,
  slippage_mode text NOT NULL DEFAULT 'normal',
  commission_mode text NOT NULL DEFAULT 'realistic',
  spread_mode text NOT NULL DEFAULT 'realistic',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_backtest_configs_user ON public.backtest_configs (user_id);
CREATE INDEX idx_backtest_configs_symbol ON public.backtest_configs (symbol);
CREATE INDEX idx_backtest_configs_tf ON public.backtest_configs (timeframe);
ALTER TABLE public.backtest_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own backtest_configs" ON public.backtest_configs FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 6. rotation_cycles
CREATE TABLE public.rotation_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cycle_type text NOT NULL,
  as_of date NOT NULL,
  status text NOT NULL DEFAULT 'running',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cycle_type, as_of)
);
CREATE INDEX idx_rotation_cycles_user ON public.rotation_cycles (user_id);
CREATE INDEX idx_rotation_cycles_status ON public.rotation_cycles (status);
ALTER TABLE public.rotation_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rotation_cycles" ON public.rotation_cycles FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 7. backtest_jobs
CREATE TABLE public.backtest_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cycle_id uuid NOT NULL REFERENCES public.rotation_cycles(id) ON DELETE CASCADE,
  strategy_version_id uuid NOT NULL REFERENCES public.strategy_versions(id),
  backtest_config_id uuid NOT NULL REFERENCES public.backtest_configs(id),
  priority int NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'queued',
  attempts int NOT NULL DEFAULT 0,
  worker_id uuid,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_backtest_jobs_user ON public.backtest_jobs (user_id);
CREATE INDEX idx_backtest_jobs_cycle ON public.backtest_jobs (cycle_id);
CREATE INDEX idx_backtest_jobs_status ON public.backtest_jobs (status);
CREATE INDEX idx_backtest_jobs_schedule ON public.backtest_jobs (scheduled_for);
CREATE INDEX idx_backtest_jobs_priority ON public.backtest_jobs (priority);
ALTER TABLE public.backtest_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own backtest_jobs" ON public.backtest_jobs FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 8. backtest_results (factory-specific, distinct from existing results table)
CREATE TABLE public.factory_backtest_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid NOT NULL REFERENCES public.backtest_jobs(id) ON DELETE CASCADE,
  net_profit numeric NOT NULL DEFAULT 0,
  cagr numeric,
  max_dd_pct numeric NOT NULL DEFAULT 0,
  profit_factor numeric NOT NULL DEFAULT 0,
  sharpe numeric,
  sortino numeric,
  win_rate numeric NOT NULL DEFAULT 0,
  avg_trade numeric NOT NULL DEFAULT 0,
  trades int NOT NULL DEFAULT 0,
  worst_month numeric,
  consistency_score numeric NOT NULL DEFAULT 0,
  robust_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id)
);
CREATE INDEX idx_fbr_user ON public.factory_backtest_results (user_id);
CREATE INDEX idx_fbr_robust ON public.factory_backtest_results (robust_score);
ALTER TABLE public.factory_backtest_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own factory_backtest_results" ON public.factory_backtest_results FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 9. strategy_scores
CREATE TABLE public.strategy_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cycle_id uuid NOT NULL REFERENCES public.rotation_cycles(id) ON DELETE CASCADE,
  strategy_version_id uuid NOT NULL REFERENCES public.strategy_versions(id),
  symbol text NOT NULL,
  timeframe text NOT NULL,
  robust_score numeric NOT NULL,
  rank int NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_strategy_scores_user ON public.strategy_scores (user_id);
CREATE INDEX idx_strategy_scores_cycle ON public.strategy_scores (cycle_id);
CREATE INDEX idx_strategy_scores_rank ON public.strategy_scores (rank);
ALTER TABLE public.strategy_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own strategy_scores" ON public.strategy_scores FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 10. factory_portfolios
CREATE TABLE public.factory_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cycle_id uuid NOT NULL REFERENCES public.rotation_cycles(id) ON DELETE CASCADE,
  name text NOT NULL,
  max_eas int NOT NULL DEFAULT 15,
  risk_budget_pct numeric NOT NULL DEFAULT 3.0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fp_user ON public.factory_portfolios (user_id);
CREATE INDEX idx_fp_cycle ON public.factory_portfolios (cycle_id);
ALTER TABLE public.factory_portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own factory_portfolios" ON public.factory_portfolios FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 11. factory_portfolio_members
CREATE TABLE public.factory_portfolio_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  portfolio_id uuid NOT NULL REFERENCES public.factory_portfolios(id) ON DELETE CASCADE,
  strategy_version_id uuid NOT NULL REFERENCES public.strategy_versions(id),
  symbol text NOT NULL,
  timeframe text NOT NULL,
  allocation_pct numeric NOT NULL DEFAULT 0,
  role text NOT NULL DEFAULT 'champion',
  kill_dd_pct numeric NOT NULL DEFAULT 10,
  kill_loss_streak int NOT NULL DEFAULT 6,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fpm_user ON public.factory_portfolio_members (user_id);
CREATE INDEX idx_fpm_portfolio ON public.factory_portfolio_members (portfolio_id);
CREATE INDEX idx_fpm_role ON public.factory_portfolio_members (role);
ALTER TABLE public.factory_portfolio_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own factory_portfolio_members" ON public.factory_portfolio_members FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 12. factory_terminals
CREATE TABLE public.factory_terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'mt5',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ft_user ON public.factory_terminals (user_id);
ALTER TABLE public.factory_terminals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own factory_terminals" ON public.factory_terminals FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 13. factory_accounts
CREATE TABLE public.factory_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  broker_name text NOT NULL,
  account_number text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fa_user ON public.factory_accounts (user_id);
CREATE INDEX idx_fa_broker ON public.factory_accounts (broker_name);
ALTER TABLE public.factory_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own factory_accounts" ON public.factory_accounts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 14. factory_deployments
CREATE TABLE public.factory_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  portfolio_member_id uuid NOT NULL REFERENCES public.factory_portfolio_members(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.factory_accounts(id),
  terminal_id uuid NOT NULL REFERENCES public.factory_terminals(id),
  status text NOT NULL DEFAULT 'deploying',
  deployed_at timestamptz,
  last_heartbeat timestamptz,
  last_trade_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fd_user ON public.factory_deployments (user_id);
CREATE INDEX idx_fd_status ON public.factory_deployments (status);
CREATE INDEX idx_fd_account ON public.factory_deployments (account_id);
ALTER TABLE public.factory_deployments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own factory_deployments" ON public.factory_deployments FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 15. factory_live_metrics
CREATE TABLE public.factory_live_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deployment_id uuid NOT NULL REFERENCES public.factory_deployments(id) ON DELETE CASCADE,
  date date NOT NULL,
  daily_pnl numeric NOT NULL DEFAULT 0,
  dd_pct numeric NOT NULL DEFAULT 0,
  trade_count int NOT NULL DEFAULT 0,
  expectancy numeric NOT NULL DEFAULT 0,
  drift_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deployment_id, date)
);
CREATE INDEX idx_flm_user ON public.factory_live_metrics (user_id);
CREATE INDEX idx_flm_date ON public.factory_live_metrics (date);
ALTER TABLE public.factory_live_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own factory_live_metrics" ON public.factory_live_metrics FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 16. factory_system_events
CREATE TABLE public.factory_system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  message text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fse_user ON public.factory_system_events (user_id);
CREATE INDEX idx_fse_kind ON public.factory_system_events (kind);
CREATE INDEX idx_fse_created ON public.factory_system_events (created_at);
ALTER TABLE public.factory_system_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own factory_system_events" ON public.factory_system_events FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('mmc-artifacts', 'mmc-artifacts', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('mmc-backtests', 'mmc-backtests', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users manage own artifacts" ON storage.objects FOR ALL
  USING (bucket_id = 'mmc-artifacts' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'mmc-artifacts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users manage own backtests" ON storage.objects FOR ALL
  USING (bucket_id = 'mmc-backtests' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'mmc-backtests' AND auth.uid()::text = (storage.foldername(name))[1]);
