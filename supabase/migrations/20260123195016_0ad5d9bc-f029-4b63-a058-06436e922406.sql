-- =====================================================
-- MMC SaaS Architecture: Database Schema Enhancement
-- Adds visibility, usage tracking, and public library support
-- =====================================================

-- 1. Add visibility column to datasets table
ALTER TABLE public.datasets 
ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private' 
CHECK (visibility IN ('private', 'public', 'workspace'));

-- 2. Add usage tracking columns to datasets
ALTER TABLE public.datasets 
ADD COLUMN IF NOT EXISTS usage_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS description text;

-- 3. Add visibility and usage tracking to strategies
ALTER TABLE public.strategies 
ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private'
CHECK (visibility IN ('private', 'public', 'workspace'));

ALTER TABLE public.strategies
ADD COLUMN IF NOT EXISTS usage_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS asset_classes text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS compatible_timeframes text[] DEFAULT '{}';

-- 4. Add visibility and usage tracking to results  
ALTER TABLE public.results
ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private'
CHECK (visibility IN ('private', 'public', 'workspace'));

ALTER TABLE public.results
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS dataset_id uuid,
ADD COLUMN IF NOT EXISTS strategy_id uuid,
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;

-- 5. Add foreign key constraints for results
ALTER TABLE public.results
ADD CONSTRAINT results_dataset_id_fkey 
FOREIGN KEY (dataset_id) REFERENCES public.datasets(id) ON DELETE SET NULL;

ALTER TABLE public.results
ADD CONSTRAINT results_strategy_id_fkey 
FOREIGN KEY (strategy_id) REFERENCES public.strategies(id) ON DELETE SET NULL;

-- 6. Create indexes for visibility queries
CREATE INDEX IF NOT EXISTS idx_datasets_visibility ON public.datasets(visibility);
CREATE INDEX IF NOT EXISTS idx_datasets_symbol ON public.datasets(symbol);
CREATE INDEX IF NOT EXISTS idx_strategies_visibility ON public.strategies(visibility);
CREATE INDEX IF NOT EXISTS idx_strategies_category ON public.strategies(category);
CREATE INDEX IF NOT EXISTS idx_results_visibility ON public.results(visibility);

-- 7. RLS Policies for public datasets
CREATE POLICY "Users can view public datasets"
ON public.datasets FOR SELECT
USING (visibility = 'public');

-- 8. RLS Policies for workspace datasets
CREATE POLICY "Workspace members can view workspace datasets"
ON public.datasets FOR SELECT
USING (
  visibility = 'workspace' 
  AND project_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = datasets.project_id 
    AND p.workspace_id IS NOT NULL
    AND is_workspace_member(auth.uid(), p.workspace_id)
  )
);

-- 9. RLS Policies for public strategies
CREATE POLICY "Users can view public strategies"
ON public.strategies FOR SELECT
USING (visibility = 'public');

-- 10. RLS Policies for workspace strategies
CREATE POLICY "Workspace members can view workspace strategies"
ON public.strategies FOR SELECT
USING (
  visibility = 'workspace' 
  AND project_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = strategies.project_id 
    AND p.workspace_id IS NOT NULL
    AND is_workspace_member(auth.uid(), p.workspace_id)
  )
);

-- 11. RLS Policies for public results
CREATE POLICY "Users can view public results"
ON public.results FOR SELECT
USING (visibility = 'public');

-- 12. RLS Policies for workspace results
CREATE POLICY "Workspace members can view workspace results"
ON public.results FOR SELECT
USING (
  visibility = 'workspace' 
  AND run_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.runs r 
    JOIN public.datasets d ON r.dataset_id = d.id
    JOIN public.projects p ON d.project_id = p.id
    WHERE r.id = results.run_id 
    AND p.workspace_id IS NOT NULL
    AND is_workspace_member(auth.uid(), p.workspace_id)
  )
);

-- 13. Function to increment usage count
CREATE OR REPLACE FUNCTION public.increment_dataset_usage(p_dataset_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.datasets
  SET usage_count = usage_count + 1,
      last_used_at = now()
  WHERE id = p_dataset_id;
END;
$$;

-- 14. Function to increment strategy usage count
CREATE OR REPLACE FUNCTION public.increment_strategy_usage(p_strategy_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.strategies
  SET usage_count = usage_count + 1,
      last_used_at = now()
  WHERE id = p_strategy_id;
END;
$$;