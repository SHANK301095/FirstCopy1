
-- Add trade grading columns (Phase 3 prep)
ALTER TABLE public.trades 
  ADD COLUMN IF NOT EXISTS trade_grade text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS grade_details jsonb DEFAULT NULL;

-- Add index for grade filtering
CREATE INDEX IF NOT EXISTS idx_trades_trade_grade ON public.trades(trade_grade) WHERE trade_grade IS NOT NULL;

-- Create trade-screenshots storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('trade-screenshots', 'trade-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: users can view their own screenshots
CREATE POLICY "Users can view own trade screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: users can upload their own screenshots
CREATE POLICY "Users can upload own trade screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: users can delete their own screenshots
CREATE POLICY "Users can delete own trade screenshots"
ON storage.objects FOR DELETE
USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: users can update their own screenshots
CREATE POLICY "Users can update own trade screenshots"
ON storage.objects FOR UPDATE
USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
