-- Create AI usage tracking table
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature text NOT NULL,
  tokens_used int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create index for efficient daily queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_feature_date ON public.ai_usage (user_id, feature, created_at);

-- Enable RLS
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own usage" 
ON public.ai_usage FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Users can insert their own usage
CREATE POLICY "Users can insert own usage" 
ON public.ai_usage FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);