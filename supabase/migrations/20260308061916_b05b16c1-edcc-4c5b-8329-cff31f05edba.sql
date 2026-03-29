
-- TABLE 1: strategy_regime_snapshots
CREATE TABLE public.strategy_regime_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_symbol text NOT NULL,
  timeframe text NOT NULL,
  regime_label text NOT NULL,
  volatility_state text,
  trend_state text,
  confidence_score numeric,
  indicator_payload jsonb DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_regime_snapshots_asset ON public.strategy_regime_snapshots(asset_symbol);
CREATE INDEX idx_regime_snapshots_detected ON public.strategy_regime_snapshots(detected_at);

-- TABLE 2: strategy_selection_runs
CREATE TABLE public.strategy_selection_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL DEFAULT 'manual',
  portfolio_id uuid,
  challenge_id uuid,
  selection_version text,
  input_payload jsonb DEFAULT '{}'::jsonb,
  filters_payload jsonb DEFAULT '{}'::jsonb,
  total_candidates integer DEFAULT 0,
  selected_count integer DEFAULT 0,
  rejected_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_selection_runs_portfolio ON public.strategy_selection_runs(portfolio_id);
CREATE INDEX idx_selection_runs_created ON public.strategy_selection_runs(created_at);

-- TABLE 3: strategy_selection_decisions
CREATE TABLE public.strategy_selection_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_run_id uuid NOT NULL REFERENCES public.strategy_selection_runs(id) ON DELETE CASCADE,
  strategy_id uuid NOT NULL,
  decision text NOT NULL,
  mmc_score numeric,
  rank_at_time integer,
  correlation_score numeric,
  regime_fit_score numeric,
  execution_realism_score numeric,
  rejection_reasons jsonb DEFAULT '[]'::jsonb,
  selection_reasons jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_selection_decisions_run ON public.strategy_selection_decisions(selection_run_id);
CREATE INDEX idx_selection_decisions_strategy ON public.strategy_selection_decisions(strategy_id);

-- TABLE 4: strategy_replacement_events
CREATE TABLE public.strategy_replacement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL,
  account_id uuid,
  old_strategy_id uuid NOT NULL,
  new_strategy_id uuid NOT NULL,
  trigger_type text NOT NULL,
  trigger_payload jsonb DEFAULT '{}'::jsonb,
  old_score numeric,
  new_score numeric,
  old_rank integer,
  new_rank integer,
  action_status text NOT NULL DEFAULT 'pending',
  replaced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_replacement_portfolio ON public.strategy_replacement_events(portfolio_id);
CREATE INDEX idx_replacement_created ON public.strategy_replacement_events(created_at);

-- TABLE 5: portfolio_rebalance_runs
CREATE TABLE public.portfolio_rebalance_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL,
  rebalance_type text NOT NULL DEFAULT 'scheduled',
  old_weights jsonb DEFAULT '{}'::jsonb,
  new_weights jsonb DEFAULT '{}'::jsonb,
  turnover_pct numeric DEFAULT 0,
  diversification_score_before numeric,
  diversification_score_after numeric,
  expected_drawdown_before numeric,
  expected_drawdown_after numeric,
  status text NOT NULL DEFAULT 'pending',
  triggered_by text,
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rebalance_portfolio ON public.portfolio_rebalance_runs(portfolio_id);
CREATE INDEX idx_rebalance_created ON public.portfolio_rebalance_runs(created_at);

-- TABLE 6: portfolio_constraint_breaches
CREATE TABLE public.portfolio_constraint_breaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL,
  breach_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  current_value numeric,
  threshold_value numeric,
  affected_entities jsonb DEFAULT '[]'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_breaches_portfolio ON public.portfolio_constraint_breaches(portfolio_id);
CREATE INDEX idx_breaches_created ON public.portfolio_constraint_breaches(created_at);

-- TABLE 7: strategy_deployment_readiness
CREATE TABLE public.strategy_deployment_readiness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL,
  latest_backtest_job_id uuid,
  latest_health_run_id uuid,
  latest_walkforward_score numeric,
  latest_robustness_score numeric,
  latest_execution_realism_score numeric,
  latest_regime_robustness_score numeric,
  deployment_status text NOT NULL DEFAULT 'research_only',
  blocking_reasons jsonb DEFAULT '[]'::jsonb,
  approved_by text,
  approved_at timestamptz,
  evaluated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deploy_readiness_strategy ON public.strategy_deployment_readiness(strategy_id);

-- TABLE 8: research_artifacts
CREATE TABLE public.research_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL,
  artifact_type text NOT NULL,
  source_job_id uuid,
  artifact_title text,
  artifact_path text,
  artifact_metadata jsonb DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_artifacts_strategy ON public.research_artifacts(strategy_id);
CREATE INDEX idx_artifacts_created ON public.research_artifacts(created_at);

-- TABLE 9: risk_incidents
CREATE TABLE public.risk_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid,
  portfolio_id uuid,
  strategy_id uuid,
  incident_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  source text,
  metric_value numeric,
  threshold_value numeric,
  incident_payload jsonb DEFAULT '{}'::jsonb,
  incident_status text NOT NULL DEFAULT 'open',
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_incidents_portfolio ON public.risk_incidents(portfolio_id);
CREATE INDEX idx_incidents_strategy ON public.risk_incidents(strategy_id);
CREATE INDEX idx_incidents_created ON public.risk_incidents(created_at);

-- TABLE 10: risk_actions
CREATE TABLE public.risk_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_incident_id uuid NOT NULL REFERENCES public.risk_incidents(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_type text,
  target_id uuid,
  action_payload jsonb DEFAULT '{}'::jsonb,
  execution_status text NOT NULL DEFAULT 'pending',
  executed_by text,
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_risk_actions_incident ON public.risk_actions(risk_incident_id);

-- TABLE 11: prop_challenge_daily_snapshots
CREATE TABLE public.prop_challenge_daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL,
  snapshot_date date NOT NULL,
  balance numeric DEFAULT 0,
  equity numeric DEFAULT 0,
  daily_loss_used numeric DEFAULT 0,
  total_drawdown_used numeric DEFAULT 0,
  profit_target_progress numeric DEFAULT 0,
  trading_days_completed integer DEFAULT 0,
  pass_probability numeric DEFAULT 0,
  breach_risk_level text DEFAULT 'safe',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_challenge_snapshots_challenge ON public.prop_challenge_daily_snapshots(challenge_id);
CREATE INDEX idx_challenge_snapshots_date ON public.prop_challenge_daily_snapshots(snapshot_date);

-- TABLE 12: command_center_snapshots
CREATE TABLE public.command_center_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_type text NOT NULL DEFAULT 'periodic',
  portfolio_value numeric DEFAULT 0,
  daily_pnl numeric DEFAULT 0,
  active_strategies integer DEFAULT 0,
  risk_status text DEFAULT 'normal',
  top_regimes jsonb DEFAULT '[]'::jsonb,
  top_alerts jsonb DEFAULT '[]'::jsonb,
  top_strategies jsonb DEFAULT '[]'::jsonb,
  allocation_summary jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cc_snapshots_created ON public.command_center_snapshots(created_at);

-- TABLE 13: notification_deliveries
CREATE TABLE public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL,
  channel text NOT NULL,
  recipient text,
  delivery_status text NOT NULL DEFAULT 'pending',
  provider_response jsonb DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deliveries_notification ON public.notification_deliveries(notification_id);

-- TABLE 14: scheduled_jobs
CREATE TABLE public.scheduled_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  job_type text NOT NULL,
  schedule_expression text,
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_status text,
  job_payload jsonb DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- TABLE 15: job_run_history
CREATE TABLE public.job_run_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_job_id uuid NOT NULL REFERENCES public.scheduled_jobs(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  job_ref_id uuid,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  error_message text,
  output_summary jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_history_job ON public.job_run_history(scheduled_job_id);
CREATE INDEX idx_job_history_created ON public.job_run_history(created_at);

-- Enable RLS on all new tables
ALTER TABLE public.strategy_regime_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_selection_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_selection_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_replacement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_rebalance_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_constraint_breaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_deployment_readiness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prop_challenge_daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_center_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_run_history ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can read all orchestration data
CREATE POLICY "Authenticated read" ON public.strategy_regime_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.strategy_selection_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.strategy_selection_decisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.strategy_replacement_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.portfolio_rebalance_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.portfolio_constraint_breaches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.strategy_deployment_readiness FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.research_artifacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.risk_incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.risk_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.prop_challenge_daily_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.command_center_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.notification_deliveries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.scheduled_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.job_run_history FOR SELECT TO authenticated USING (true);
