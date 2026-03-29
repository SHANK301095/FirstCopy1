-- Add strategy_version_id column to results table
ALTER TABLE public.results 
ADD COLUMN strategy_version_id uuid REFERENCES public.strategy_versions(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_results_strategy_version_id ON public.results(strategy_version_id);