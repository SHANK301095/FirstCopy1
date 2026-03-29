
-- Broker requests table for "Request a Broker" feature
CREATE TABLE public.broker_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  broker_name TEXT NOT NULL,
  website_url TEXT,
  asset_classes TEXT[] DEFAULT '{}',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.broker_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own broker requests"
  ON public.broker_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create broker requests"
  ON public.broker_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add dd_mode and trading_days_done to prop_firm_challenges
ALTER TABLE public.prop_firm_challenges
  ADD COLUMN IF NOT EXISTS dd_mode TEXT NOT NULL DEFAULT 'balance',
  ADD COLUMN IF NOT EXISTS trading_days_done INTEGER NOT NULL DEFAULT 0;
