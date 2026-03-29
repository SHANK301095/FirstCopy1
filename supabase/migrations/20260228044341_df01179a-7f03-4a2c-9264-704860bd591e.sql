
-- ============================================
-- INVESTOR MODE: Phase 1 Schema
-- ============================================

-- 1) Extend strategies table with investor metadata
ALTER TABLE public.strategies 
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS style text DEFAULT 'intraday',
  ADD COLUMN IF NOT EXISTS risk_profile text DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS expected_trade_frequency text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS typical_hold_time text,
  ADD COLUMN IF NOT EXISTS min_capital numeric,
  ADD COLUMN IF NOT EXISTS max_recommended_dd_pct numeric,
  ADD COLUMN IF NOT EXISTS strategy_logic jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS export_capabilities jsonb DEFAULT '{"mt5EA": false}',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 2) strategy_tags table
CREATE TABLE IF NOT EXISTS public.strategy_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(strategy_id, tag)
);
ALTER TABLE public.strategy_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read strategy tags" ON public.strategy_tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owner can manage strategy tags" ON public.strategy_tags
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.strategies s WHERE s.id = strategy_id AND s.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.strategies s WHERE s.id = strategy_id AND s.user_id = auth.uid())
  );

-- 3) investor_profiles table
CREATE TABLE IF NOT EXISTS public.investor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  capital numeric NOT NULL DEFAULT 10000,
  horizon_days integer NOT NULL DEFAULT 90,
  risk_level text NOT NULL DEFAULT 'moderate',
  max_drawdown_pct numeric NOT NULL DEFAULT 15,
  preferred_assets text[] DEFAULT '{"forex"}',
  experience text DEFAULT 'beginner',
  target_return_band jsonb DEFAULT '{"min": 5, "max": 15}',
  goal_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own investor profile" ON public.investor_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4) recommendation_runs table (audit + explainability)
CREATE TABLE IF NOT EXISTS public.recommendation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_snapshot jsonb NOT NULL DEFAULT '{}',
  goal_text text,
  top_matches jsonb NOT NULL DEFAULT '[]',
  chosen_strategy_id uuid REFERENCES public.strategies(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.recommendation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recommendation runs" ON public.recommendation_runs
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5) chosen_strategy_instances table
CREATE TABLE IF NOT EXISTS public.chosen_strategy_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_strategy_id uuid NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  name text NOT NULL,
  overrides jsonb DEFAULT '{}',
  risk_ruleset jsonb DEFAULT '{"maxDailyLossPct": 3, "maxOpenTrades": 3, "cooldownAfterLossMin": 30, "killSwitch": false}',
  mode text NOT NULL DEFAULT 'paper',
  status text NOT NULL DEFAULT 'draft',
  paper_trades_count integer DEFAULT 0,
  paper_trading_days integer DEFAULT 0,
  paper_started_at timestamptz,
  live_unlocked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.chosen_strategy_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own strategy instances" ON public.chosen_strategy_instances
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 6) investor_executions table (event log)
CREATE TABLE IF NOT EXISTS public.investor_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_id uuid NOT NULL REFERENCES public.chosen_strategy_instances(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}',
  risk_blocked boolean DEFAULT false,
  risk_reason text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.investor_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own executions" ON public.investor_executions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 7) investor_daily_reports table
CREATE TABLE IF NOT EXISTS public.investor_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_id uuid NOT NULL REFERENCES public.chosen_strategy_instances(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  return_pct numeric DEFAULT 0,
  pnl numeric DEFAULT 0,
  drawdown_pct numeric DEFAULT 0,
  exposure_pct numeric DEFAULT 0,
  fees_estimate numeric DEFAULT 0,
  trade_count integer DEFAULT 0,
  red_flags text[] DEFAULT '{}',
  summary text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(instance_id, report_date)
);
ALTER TABLE public.investor_daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own daily reports" ON public.investor_daily_reports
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER set_investor_profiles_updated_at
  BEFORE UPDATE ON public.investor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_chosen_strategy_instances_updated_at
  BEFORE UPDATE ON public.chosen_strategy_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
