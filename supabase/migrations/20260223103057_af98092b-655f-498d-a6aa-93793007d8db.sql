
-- Notebook notes table (migrate from localStorage)
CREATE TABLE public.notebook_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Note',
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  tags text[] NOT NULL DEFAULT '{}',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notebook_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes" ON public.notebook_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.notebook_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.notebook_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.notebook_notes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Block anonymous notebook" ON public.notebook_notes FOR ALL USING (false);

CREATE INDEX idx_notebook_notes_user ON public.notebook_notes(user_id);

CREATE TRIGGER update_notebook_notes_updated_at
  BEFORE UPDATE ON public.notebook_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
