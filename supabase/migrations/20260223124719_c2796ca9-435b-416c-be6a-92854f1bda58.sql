-- Add sync_key column to mt5_accounts for API-key based EA auth
ALTER TABLE public.mt5_accounts ADD COLUMN IF NOT EXISTS sync_key uuid UNIQUE DEFAULT gen_random_uuid();

-- Create index for fast lookup by sync_key
CREATE INDEX IF NOT EXISTS idx_mt5_accounts_sync_key ON public.mt5_accounts(sync_key) WHERE sync_key IS NOT NULL;
