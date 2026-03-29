-- Create storage bucket for shared market data (internal, not public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('market-data', 'market-data', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: Only admins can upload/manage, edge functions can read
CREATE POLICY "Admins can upload market data"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'market-data' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update market data"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'market-data' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete market data"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'market-data' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Service role (edge functions) can read - no direct user access
CREATE POLICY "Service role can read market data"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'market-data');

-- Create shared_datasets metadata table
CREATE TABLE public.shared_datasets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  range_from_ts BIGINT NOT NULL,
  range_to_ts BIGINT NOT NULL,
  columns_map JSONB DEFAULT '{"timestamp":"timestamp","open":"open","high":"high","low":"low","close":"close","volume":"volume"}'::jsonb,
  description TEXT,
  source_info TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_datasets ENABLE ROW LEVEL SECURITY;

-- RLS: All authenticated users can SELECT metadata (but not download files)
CREATE POLICY "All users can view shared dataset metadata"
ON public.shared_datasets FOR SELECT
TO authenticated
USING (is_active = true);

-- RLS: Only admins can manage datasets
CREATE POLICY "Admins can insert shared datasets"
ON public.shared_datasets FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update shared datasets"
ON public.shared_datasets FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete shared datasets"
ON public.shared_datasets FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookups
CREATE INDEX idx_shared_datasets_symbol ON public.shared_datasets(symbol);
CREATE INDEX idx_shared_datasets_symbol_timeframe ON public.shared_datasets(symbol, timeframe);
CREATE INDEX idx_shared_datasets_active ON public.shared_datasets(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_shared_datasets_updated_at
  BEFORE UPDATE ON public.shared_datasets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.shared_datasets IS 'Shared market data (OHLCV) available to all users for backtesting. Files stored in market-data bucket, accessible only via edge functions.';