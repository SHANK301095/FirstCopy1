
-- ============================================
-- MMCai.app Projournx Feature Tables
-- ============================================

-- 1) TRADES - Core trade journal table
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID REFERENCES public.broker_connections(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  quantity NUMERIC NOT NULL DEFAULT 1,
  lot_size NUMERIC,
  entry_time TIMESTAMPTZ NOT NULL,
  exit_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  pnl NUMERIC DEFAULT 0,
  pnl_pips NUMERIC,
  fees NUMERIC DEFAULT 0,
  net_pnl NUMERIC GENERATED ALWAYS AS (COALESCE(pnl, 0) - COALESCE(fees, 0)) STORED,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  risk_reward NUMERIC,
  r_multiple NUMERIC,
  strategy_tag TEXT,
  session_tag TEXT CHECK (session_tag IN ('asia', 'europe', 'us', 'overlap', NULL)),
  timeframe TEXT,
  setup_type TEXT,
  notes TEXT,
  mindset_rating INTEGER CHECK (mindset_rating BETWEEN 1 AND 5),
  quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 5),
  emotions TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  broker_trade_id TEXT,
  import_source TEXT DEFAULT 'manual' CHECK (import_source IN ('manual', 'csv', 'mt4', 'mt5', 'zerodha', 'api')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trades" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trades" ON public.trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trades" ON public.trades FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all trades" ON public.trades FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Block anonymous trades" ON public.trades FOR ALL USING (false);

CREATE INDEX idx_trades_user_id ON public.trades(user_id);
CREATE INDEX idx_trades_entry_time ON public.trades(entry_time);
CREATE INDEX idx_trades_symbol ON public.trades(symbol);
CREATE INDEX idx_trades_strategy ON public.trades(strategy_tag);
CREATE UNIQUE INDEX idx_trades_broker_dedupe ON public.trades(user_id, broker_trade_id) WHERE broker_trade_id IS NOT NULL;

-- 2) TRADE SCREENSHOTS
CREATE TABLE public.trade_screenshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('before', 'after', 'setup', 'result')),
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trade_screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own screenshots" ON public.trade_screenshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own screenshots" ON public.trade_screenshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own screenshots" ON public.trade_screenshots FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Block anonymous screenshots" ON public.trade_screenshots FOR ALL USING (false);

-- 3) JOURNAL ENTRIES (daily journal)
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  summary TEXT,
  lessons TEXT,
  goals TEXT,
  confidence INTEGER CHECK (confidence BETWEEN 1 AND 5),
  focus_level INTEGER CHECK (focus_level BETWEEN 1 AND 5),
  overall_mood TEXT CHECK (overall_mood IN ('great', 'good', 'neutral', 'bad', 'terrible', NULL)),
  pre_market_plan TEXT,
  post_market_review TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journal" ON public.journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own journal" ON public.journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own journal" ON public.journal_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own journal" ON public.journal_entries FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Block anonymous journal" ON public.journal_entries FOR ALL USING (false);

-- 4) PROP FIRM CHALLENGES
CREATE TABLE public.prop_firm_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID REFERENCES public.broker_connections(id) ON DELETE SET NULL,
  firm_name TEXT NOT NULL,
  challenge_name TEXT,
  phase TEXT NOT NULL DEFAULT 'phase1' CHECK (phase IN ('phase1', 'phase2', 'funded', 'completed', 'failed')),
  initial_balance NUMERIC NOT NULL,
  current_balance NUMERIC NOT NULL,
  profit_target_pct NUMERIC NOT NULL DEFAULT 8.0,
  max_daily_dd_pct NUMERIC NOT NULL DEFAULT 5.0,
  max_total_dd_pct NUMERIC NOT NULL DEFAULT 10.0,
  min_trading_days INTEGER DEFAULT 0,
  profit_split_pct NUMERIC DEFAULT 80.0,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'passed', 'failed', 'expired')),
  rules_config JSONB DEFAULT '{}',
  progress_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prop_firm_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenges" ON public.prop_firm_challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own challenges" ON public.prop_firm_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own challenges" ON public.prop_firm_challenges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own challenges" ON public.prop_firm_challenges FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Block anonymous challenges" ON public.prop_firm_challenges FOR ALL USING (false);

-- 5) AI PATTERNS (detected patterns)
CREATE TABLE public.ai_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pattern_name TEXT NOT NULL,
  pattern_type TEXT NOT NULL DEFAULT 'combo',
  filters JSONB NOT NULL DEFAULT '{}',
  win_rate NUMERIC,
  avg_r NUMERIC,
  expectancy NUMERIC,
  sample_size INTEGER DEFAULT 0,
  confidence NUMERIC,
  description TEXT,
  recommendation TEXT,
  is_playbook BOOLEAN DEFAULT false,
  last_computed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own patterns" ON public.ai_patterns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own patterns" ON public.ai_patterns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own patterns" ON public.ai_patterns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own patterns" ON public.ai_patterns FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Block anonymous patterns" ON public.ai_patterns FOR ALL USING (false);

-- 6) AI INSIGHTS
CREATE TABLE public.ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'daily' CHECK (type IN ('daily', 'weekly', 'pattern', 'alert', 'playbook')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  linked_pattern_id UUID REFERENCES public.ai_patterns(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights" ON public.ai_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own insights" ON public.ai_insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own insights" ON public.ai_insights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Block anonymous insights" ON public.ai_insights FOR ALL USING (false);

-- 7) SUBSCRIPTIONS (plan gating)
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  trade_count_this_month INTEGER DEFAULT 0,
  month_reset_at TIMESTAMPTZ DEFAULT date_trunc('month', now()) + interval '1 month',
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Block anonymous subscriptions" ON public.subscriptions FOR ALL USING (false);

-- 8) TRADE ALERTS
CREATE TABLE public.trade_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pattern_match', 'dd_warning', 'prop_limit', 'overtrading', 'streak', 'custom')),
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'push')),
  title TEXT NOT NULL,
  message TEXT,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  is_read BOOLEAN DEFAULT false,
  linked_entity_id UUID,
  linked_entity_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trade_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts" ON public.trade_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alerts" ON public.trade_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON public.trade_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON public.trade_alerts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Block anonymous trade_alerts" ON public.trade_alerts FOR ALL USING (false);

-- Trigger for updated_at on trades
CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prop_firm_updated_at BEFORE UPDATE ON public.prop_firm_challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for trades and alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_alerts;
