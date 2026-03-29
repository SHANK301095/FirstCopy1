
-- =============================================
-- MT5 Sync V3 Phase A: Database Schema
-- Multi-account, read-only sync foundation
-- =============================================

-- 1. MT5 Accounts (multi-account support)
CREATE TABLE public.mt5_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_number TEXT NOT NULL,
  broker_name TEXT NOT NULL,
  server_name TEXT,
  terminal_build TEXT,
  leverage INTEGER DEFAULT 100,
  currency TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'UTC',
  connection_status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (connection_status IN ('connected', 'degraded', 'disconnected', 'error')),
  last_heartbeat_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  sync_latency_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, account_number, broker_name)
);

ALTER TABLE public.mt5_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own MT5 accounts" ON public.mt5_accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own MT5 accounts" ON public.mt5_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own MT5 accounts" ON public.mt5_accounts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own MT5 accounts" ON public.mt5_accounts
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all MT5 accounts" ON public.mt5_accounts
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Block anonymous mt5_accounts" ON public.mt5_accounts
  FOR ALL USING (false);

-- 2. MT5 Positions (open positions snapshot)
CREATE TABLE public.mt5_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.mt5_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  ticket BIGINT NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  volume NUMERIC(15,5) NOT NULL,
  open_price NUMERIC(20,8) NOT NULL,
  current_price NUMERIC(20,8),
  stop_loss NUMERIC(20,8),
  take_profit NUMERIC(20,8),
  swap NUMERIC(15,4) DEFAULT 0,
  profit NUMERIC(15,4),
  commission NUMERIC(15,4) DEFAULT 0,
  magic_number BIGINT,
  comment TEXT,
  open_time TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_open BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.mt5_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own positions" ON public.mt5_positions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own positions" ON public.mt5_positions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own positions" ON public.mt5_positions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own positions" ON public.mt5_positions
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Block anonymous mt5_positions" ON public.mt5_positions
  FOR ALL USING (false);

CREATE INDEX idx_mt5_positions_account ON public.mt5_positions(account_id);
CREATE INDEX idx_mt5_positions_ticket ON public.mt5_positions(account_id, ticket);

-- 3. MT5 Orders (pending orders)
CREATE TABLE public.mt5_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.mt5_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  ticket BIGINT NOT NULL,
  symbol TEXT NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN (
    'buy_limit', 'sell_limit', 'buy_stop', 'sell_stop',
    'buy_stop_limit', 'sell_stop_limit'
  )),
  volume NUMERIC(15,5) NOT NULL,
  price NUMERIC(20,8) NOT NULL,
  stop_loss NUMERIC(20,8),
  take_profit NUMERIC(20,8),
  stop_limit NUMERIC(20,8),
  magic_number BIGINT,
  comment TEXT,
  order_time TIMESTAMPTZ NOT NULL,
  expiration TIMESTAMPTZ,
  state TEXT DEFAULT 'placed' CHECK (state IN ('placed', 'partial', 'filled', 'canceled', 'rejected', 'expired')),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.mt5_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders" ON public.mt5_orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON public.mt5_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own orders" ON public.mt5_orders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own orders" ON public.mt5_orders
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Block anonymous mt5_orders" ON public.mt5_orders
  FOR ALL USING (false);

CREATE INDEX idx_mt5_orders_account ON public.mt5_orders(account_id);
CREATE INDEX idx_mt5_orders_ticket ON public.mt5_orders(account_id, ticket);

-- 4. MT5 Deals (executed fills / trade history)
CREATE TABLE public.mt5_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.mt5_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  deal_ticket BIGINT NOT NULL,
  order_ticket BIGINT,
  position_ticket BIGINT,
  symbol TEXT NOT NULL,
  deal_type TEXT NOT NULL CHECK (deal_type IN ('buy', 'sell', 'balance', 'credit', 'charge', 'correction', 'commission')),
  entry_type TEXT CHECK (entry_type IN ('in', 'out', 'inout', 'out_by')),
  volume NUMERIC(15,5),
  price NUMERIC(20,8),
  profit NUMERIC(15,4),
  swap NUMERIC(15,4) DEFAULT 0,
  commission NUMERIC(15,4) DEFAULT 0,
  fee NUMERIC(15,4) DEFAULT 0,
  magic_number BIGINT,
  comment TEXT,
  deal_time TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(account_id, deal_ticket)
);

ALTER TABLE public.mt5_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deals" ON public.mt5_deals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deals" ON public.mt5_deals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own deals" ON public.mt5_deals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own deals" ON public.mt5_deals
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Block anonymous mt5_deals" ON public.mt5_deals
  FOR ALL USING (false);

CREATE INDEX idx_mt5_deals_account ON public.mt5_deals(account_id);
CREATE INDEX idx_mt5_deals_time ON public.mt5_deals(account_id, deal_time DESC);
CREATE INDEX idx_mt5_deals_ticket ON public.mt5_deals(account_id, deal_ticket);

-- 5. MT5 Sync Log (audit trail for every sync cycle)
CREATE TABLE public.mt5_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.mt5_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'heartbeat', 'reconciliation')),
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'success', 'partial', 'failed', 'timeout')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  records_synced INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_deleted INTEGER DEFAULT 0,
  mismatches JSONB DEFAULT '[]'::jsonb,
  mismatch_count INTEGER DEFAULT 0,
  mismatch_severity TEXT DEFAULT 'none' CHECK (mismatch_severity IN ('none', 'info', 'warn', 'critical')),
  error_message TEXT,
  watermark JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.mt5_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync logs" ON public.mt5_sync_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sync logs" ON public.mt5_sync_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sync logs" ON public.mt5_sync_log
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all sync logs" ON public.mt5_sync_log
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Block anonymous mt5_sync_log" ON public.mt5_sync_log
  FOR ALL USING (false);

CREATE INDEX idx_mt5_sync_log_account ON public.mt5_sync_log(account_id);
CREATE INDEX idx_mt5_sync_log_time ON public.mt5_sync_log(account_id, started_at DESC);

-- 6. Balance/Equity Timeline (account snapshots)
CREATE TABLE public.mt5_equity_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.mt5_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  balance NUMERIC(15,4) NOT NULL,
  equity NUMERIC(15,4) NOT NULL,
  margin NUMERIC(15,4) DEFAULT 0,
  free_margin NUMERIC(15,4) DEFAULT 0,
  margin_level NUMERIC(10,2),
  floating_pl NUMERIC(15,4) DEFAULT 0,
  positions_count INTEGER DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mt5_equity_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots" ON public.mt5_equity_snapshots
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own snapshots" ON public.mt5_equity_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Block anonymous mt5_equity_snapshots" ON public.mt5_equity_snapshots
  FOR ALL USING (false);

CREATE INDEX idx_mt5_equity_account_time ON public.mt5_equity_snapshots(account_id, snapshot_at DESC);

-- 7. Updated_at triggers
CREATE TRIGGER update_mt5_accounts_updated_at
  BEFORE UPDATE ON public.mt5_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Enable realtime for live sync status
ALTER PUBLICATION supabase_realtime ADD TABLE public.mt5_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mt5_positions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mt5_sync_log;
