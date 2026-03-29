
-- User Playbook Patterns - saved patterns with alert toggle
CREATE TABLE public.user_playbook_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pattern_key TEXT NOT NULL,
  pattern_name TEXT NOT NULL,
  pattern_type TEXT NOT NULL DEFAULT 'edge',
  filters JSONB NOT NULL DEFAULT '{}',
  win_rate NUMERIC,
  expectancy NUMERIC,
  sample_size INTEGER,
  notify_on_match BOOLEAN NOT NULL DEFAULT false,
  is_saved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, pattern_key)
);

ALTER TABLE public.user_playbook_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own playbook patterns"
  ON public.user_playbook_patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playbook patterns"
  ON public.user_playbook_patterns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playbook patterns"
  ON public.user_playbook_patterns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own playbook patterns"
  ON public.user_playbook_patterns FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_playbook_user ON public.user_playbook_patterns(user_id);
