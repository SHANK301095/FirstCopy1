
-- ═══════════════════════════════════════════════════════════════
-- QUANT LAYER: Strategy Intelligence, Optimization, Regime, Paper Trading
-- ═══════════════════════════════════════════════════════════════

-- 1. Strategy Intelligence (evidence-backed profiles)
CREATE TABLE public.strategy_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  strategy_type TEXT NOT NULL DEFAULT 'unknown',
  description TEXT DEFAULT '',
  methodology TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  readiness TEXT NOT NULL DEFAULT 'experimental',
  -- Performance metrics
  win_rate NUMERIC DEFAULT 0,
  profit_factor NUMERIC DEFAULT 0,
  expectancy NUMERIC DEFAULT 0,
  cagr NUMERIC DEFAULT 0,
  max_drawdown NUMERIC DEFAULT 0,
  sharpe_ratio NUMERIC DEFAULT 0,
  sortino_ratio NUMERIC DEFAULT 0,
  -- Research quality
  walk_forward_stability NUMERIC DEFAULT 0,
  oos_performance NUMERIC DEFAULT 0,
  parameter_robustness NUMERIC DEFAULT 0,
  recovery_efficiency NUMERIC DEFAULT 0,
  mmc_composite_score NUMERIC DEFAULT 0,
  execution_realism_score NUMERIC DEFAULT 0,
  -- Compatibility
  markets TEXT[] DEFAULT '{}',
  assets TEXT[] DEFAULT '{}',
  timeframes TEXT[] DEFAULT '{}',
  regime_suitability TEXT[] DEFAULT '{}',
  session_dependency TEXT DEFAULT 'any',
  -- Tags
  tags TEXT[] DEFAULT '{}',
  -- Evidence counts
  backtest_count INTEGER DEFAULT 0,
  last_backtest_at TIMESTAMPTZ,
  last_wf_at TIMESTAMPTZ,
  last_mc_at TIMESTAMPTZ,
  -- Meta
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.strategy_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own strategy intelligence"
  ON public.strategy_intelligence FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. Optimization Runs
CREATE TABLE public.optimization_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE SET NULL,
  algorithm TEXT NOT NULL DEFAULT 'genetic',
  config JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  progress NUMERIC DEFAULT 0,
  best_candidate JSONB,
  candidates JSONB DEFAULT '[]',
  convergence JSONB DEFAULT '[]',
  seed INTEGER,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.optimization_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own optimization runs"
  ON public.optimization_runs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Regime Snapshots
CREATE TABLE public.regime_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT '1h',
  regime TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.regime_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own regime snapshots"
  ON public.regime_snapshots FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_regime_snapshots_symbol ON public.regime_snapshots(user_id, symbol, computed_at DESC);

-- 4. Paper Accounts
CREATE TABLE public.paper_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Paper Account',
  mode TEXT NOT NULL DEFAULT 'replay',
  initial_balance NUMERIC NOT NULL DEFAULT 10000,
  balance NUMERIC NOT NULL DEFAULT 10000,
  equity NUMERIC NOT NULL DEFAULT 10000,
  used_margin NUMERIC DEFAULT 0,
  realized_pnl NUMERIC DEFAULT 0,
  unrealized_pnl NUMERIC DEFAULT 0,
  total_fees NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.paper_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own paper accounts"
  ON public.paper_accounts FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Paper Orders
CREATE TABLE public.paper_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.paper_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'market',
  quantity NUMERIC NOT NULL,
  price NUMERIC,
  stop_price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  trailing_stop NUMERIC,
  status TEXT NOT NULL DEFAULT 'created',
  filled_quantity NUMERIC DEFAULT 0,
  avg_fill_price NUMERIC,
  fees NUMERIC DEFAULT 0,
  slippage NUMERIC DEFAULT 0,
  strategy_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.paper_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own paper orders"
  ON public.paper_orders FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 6. Walk-Forward Runs
CREATE TABLE public.walk_forward_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE SET NULL,
  config JSONB NOT NULL DEFAULT '{}',
  windows JSONB DEFAULT '[]',
  diagnostics JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.walk_forward_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own walk forward runs"
  ON public.walk_forward_runs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 7. Monte Carlo Runs
CREATE TABLE public.monte_carlo_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL DEFAULT 'backtest_trades',
  config JSONB NOT NULL DEFAULT '{}',
  results JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.monte_carlo_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own monte carlo runs"
  ON public.monte_carlo_runs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 8. Risk Policies
CREATE TABLE public.risk_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'account',
  scope_id UUID,
  rules JSONB NOT NULL DEFAULT '[]',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own risk policies"
  ON public.risk_policies FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 9. Risk Breaches
CREATE TABLE public.risk_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  policy_id UUID REFERENCES public.risk_policies(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  current_value NUMERIC NOT NULL,
  limit_value NUMERIC NOT NULL,
  action_taken TEXT NOT NULL,
  deployment_id UUID,
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_breaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own risk breaches"
  ON public.risk_breaches FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 10. Quant Incidents
CREATE TABLE public.quant_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  status TEXT NOT NULL DEFAULT 'open',
  title TEXT NOT NULL,
  detail TEXT DEFAULT '',
  deployment_id UUID,
  metadata JSONB DEFAULT '{}',
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quant_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own incidents"
  ON public.quant_incidents FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 11. Quant Audit Trail
CREATE TABLE public.quant_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  detail TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quant_audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own audit trail"
  ON public.quant_audit_trail FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own audit events"
  ON public.quant_audit_trail FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 12. Live Deployments (real, not hardcoded)
CREATE TABLE public.live_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  strategy_name TEXT NOT NULL,
  strategy_version_id UUID,
  broker_type TEXT NOT NULL,
  account_id UUID,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT '1h',
  status TEXT NOT NULL DEFAULT 'pending_approval',
  risk_policy_id UUID REFERENCES public.risk_policies(id) ON DELETE SET NULL,
  runtime_config JSONB DEFAULT '{}',
  current_pnl NUMERIC DEFAULT 0,
  trades_executed INTEGER DEFAULT 0,
  last_heartbeat TIMESTAMPTZ,
  last_signal_at TIMESTAMPTZ,
  pause_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own deployments"
  ON public.live_deployments FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
