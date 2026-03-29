
-- MT5 Risk Configuration table for kill switch, circuit breaker, risk rules
CREATE TABLE public.mt5_risk_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID REFERENCES public.mt5_accounts(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'account' CHECK (scope IN ('global', 'account')),
  
  -- Kill Switch
  kill_switch_active BOOLEAN NOT NULL DEFAULT false,
  kill_switch_reason TEXT,
  kill_switch_at TIMESTAMPTZ,
  
  -- Circuit Breaker
  circuit_breaker_enabled BOOLEAN NOT NULL DEFAULT true,
  max_consecutive_errors INTEGER NOT NULL DEFAULT 5,
  error_window_minutes INTEGER NOT NULL DEFAULT 10,
  current_error_count INTEGER NOT NULL DEFAULT 0,
  circuit_open_until TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  
  -- Risk Rules
  max_lot_size NUMERIC DEFAULT 10.0,
  max_daily_loss_pct NUMERIC DEFAULT 5.0,
  max_positions INTEGER DEFAULT 20,
  symbol_whitelist TEXT[] DEFAULT '{}',
  session_window_start TIME,
  session_window_end TIME,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, account_id, scope)
);

-- Enable RLS
ALTER TABLE public.mt5_risk_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Block anonymous mt5_risk_config" ON public.mt5_risk_config FOR ALL USING (false);
CREATE POLICY "Users can view own risk config" ON public.mt5_risk_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own risk config" ON public.mt5_risk_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own risk config" ON public.mt5_risk_config FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own risk config" ON public.mt5_risk_config FOR DELETE USING (auth.uid() = user_id);

-- Add unique constraint on mt5_accounts for upsert
ALTER TABLE public.mt5_accounts ADD CONSTRAINT mt5_accounts_user_broker_account UNIQUE (user_id, account_number, broker_name);

-- Add unique constraint on mt5_deals for upsert  
ALTER TABLE public.mt5_deals ADD CONSTRAINT mt5_deals_account_deal_ticket UNIQUE (account_id, deal_ticket);

-- Reconciliation results table
CREATE TABLE public.mt5_reconciliation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.mt5_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reconciled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Results
  expected_positions INTEGER NOT NULL DEFAULT 0,
  actual_positions INTEGER NOT NULL DEFAULT 0,
  position_mismatches JSONB NOT NULL DEFAULT '[]',
  
  expected_orders INTEGER NOT NULL DEFAULT 0,
  actual_orders INTEGER NOT NULL DEFAULT 0,
  order_mismatches JSONB NOT NULL DEFAULT '[]',
  
  severity TEXT NOT NULL DEFAULT 'none' CHECK (severity IN ('none', 'info', 'warning', 'critical')),
  auto_healed INTEGER NOT NULL DEFAULT 0,
  manual_required INTEGER NOT NULL DEFAULT 0,
  
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE public.mt5_reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous mt5_reconciliation" ON public.mt5_reconciliation FOR ALL USING (false);
CREATE POLICY "Users can view own reconciliation" ON public.mt5_reconciliation FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reconciliation" ON public.mt5_reconciliation FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mt5_risk_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mt5_reconciliation;

-- Updated_at trigger for risk config
CREATE TRIGGER update_mt5_risk_config_updated_at
  BEFORE UPDATE ON public.mt5_risk_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
