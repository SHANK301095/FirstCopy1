-- Performance indexes for trades table
CREATE INDEX IF NOT EXISTS idx_trades_user_entry_time ON public.trades (user_id, entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_status ON public.trades (user_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_account_entry ON public.trades (account_id, entry_time DESC);

-- Performance index for prop firm challenges
CREATE INDEX IF NOT EXISTS idx_prop_firm_user_status ON public.prop_firm_challenges (user_id, status);

-- Performance index for journal entries
CREATE INDEX IF NOT EXISTS idx_journal_user_date ON public.journal_entries (user_id, date DESC);