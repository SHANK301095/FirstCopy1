
-- ═══════ Symbol Metadata ═══════
CREATE TABLE IF NOT EXISTS public.symbol_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  display_name TEXT NOT NULL,
  asset_class TEXT NOT NULL DEFAULT 'forex',
  exchange TEXT,
  tick_size NUMERIC NOT NULL DEFAULT 0.00001,
  price_precision INT NOT NULL DEFAULT 5,
  quantity_precision INT NOT NULL DEFAULT 2,
  lot_step NUMERIC NOT NULL DEFAULT 0.01,
  min_quantity NUMERIC NOT NULL DEFAULT 0.01,
  max_quantity NUMERIC,
  contract_multiplier NUMERIC NOT NULL DEFAULT 1,
  quote_currency TEXT NOT NULL DEFAULT 'USD',
  base_currency TEXT,
  leverage_style TEXT DEFAULT 'margin',
  trading_timezone TEXT NOT NULL DEFAULT 'UTC',
  session_open TEXT,
  session_close TEXT,
  broker_mappings JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(symbol)
);

ALTER TABLE public.symbol_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read symbol metadata" ON public.symbol_metadata FOR SELECT USING (true);

-- ═══════ Regime Snapshots ═══════
CREATE TABLE IF NOT EXISTS public.regime_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT 'H1',
  regime TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.regime_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own regime snapshots" ON public.regime_snapshots FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own regime snapshots" ON public.regime_snapshots FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_regime_snapshots_user_symbol ON public.regime_snapshots(user_id, symbol, timeframe, computed_at DESC);

-- ═══════ Regime Transitions ═══════
CREATE TABLE IF NOT EXISTS public.regime_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT 'H1',
  from_regime TEXT NOT NULL,
  to_regime TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.regime_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own transitions" ON public.regime_transitions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own transitions" ON public.regime_transitions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ═══════ Walk-Forward Runs ═══════
CREATE TABLE IF NOT EXISTS public.walk_forward_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID,
  dataset_id UUID,
  config JSONB NOT NULL DEFAULT '{}',
  windows JSONB NOT NULL DEFAULT '[]',
  diagnostics JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.walk_forward_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own WF runs" ON public.walk_forward_runs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ═══════ Risk Policies ═══════
CREATE TABLE IF NOT EXISTS public.risk_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'account',
  scope_id UUID,
  rules JSONB NOT NULL DEFAULT '[]',
  enabled BOOLEAN NOT NULL DEFAULT true,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own risk policies" ON public.risk_policies FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ═══════ Risk Breaches ═══════
CREATE TABLE IF NOT EXISTS public.risk_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES public.risk_policies(id) ON DELETE SET NULL,
  rule_type TEXT NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  limit_value NUMERIC NOT NULL DEFAULT 0,
  action_taken TEXT NOT NULL DEFAULT 'alert',
  deployment_id UUID,
  order_id UUID,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_breaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own risk breaches" ON public.risk_breaches FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ═══════ Incidents ═══════
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  status TEXT NOT NULL DEFAULT 'open',
  title TEXT NOT NULL,
  detail TEXT,
  deployment_id UUID,
  strategy_id UUID,
  metadata JSONB DEFAULT '{}',
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own incidents" ON public.incidents FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_incidents_user_status ON public.incidents(user_id, status, created_at DESC);

-- ═══════ Quant Audit Log ═══════
CREATE TABLE IF NOT EXISTS public.quant_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  detail TEXT,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quant_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own audit log" ON public.quant_audit_log FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own audit log" ON public.quant_audit_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_quant_audit_user ON public.quant_audit_log(user_id, created_at DESC);

-- ═══════ Strategy Regime Compatibility ═══════
CREATE TABLE IF NOT EXISTS public.strategy_regime_compat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL,
  regime TEXT NOT NULL,
  win_rate NUMERIC NOT NULL DEFAULT 0,
  expectancy NUMERIC NOT NULL DEFAULT 0,
  max_drawdown NUMERIC NOT NULL DEFAULT 0,
  trade_count INT NOT NULL DEFAULT 0,
  deployable BOOLEAN NOT NULL DEFAULT false,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, strategy_id, regime)
);

ALTER TABLE public.strategy_regime_compat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own compat" ON public.strategy_regime_compat FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ═══════ Backtest Trades (persisted for downstream use) ═══════
CREATE TABLE IF NOT EXISTS public.backtest_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_time TIMESTAMPTZ NOT NULL,
  exit_time TIMESTAMPTZ NOT NULL,
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  pnl NUMERIC NOT NULL DEFAULT 0,
  pnl_pct NUMERIC NOT NULL DEFAULT 0,
  fees NUMERIC NOT NULL DEFAULT 0,
  slippage NUMERIC NOT NULL DEFAULT 0,
  mae NUMERIC DEFAULT 0,
  mfe NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.backtest_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own bt trades" ON public.backtest_trades FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_backtest_trades_run ON public.backtest_trades(run_id);
