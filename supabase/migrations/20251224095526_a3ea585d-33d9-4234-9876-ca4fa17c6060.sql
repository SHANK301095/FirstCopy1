-- Create strategy_versions table to track version history
CREATE TABLE public.strategy_versions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    strategy_id uuid NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
    version text NOT NULL,
    code text,
    notes text,
    parameters jsonb,
    change_summary text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    user_id uuid NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.strategy_versions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own strategy versions" 
ON public.strategy_versions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strategy versions" 
ON public.strategy_versions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strategy versions" 
ON public.strategy_versions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategy versions" 
ON public.strategy_versions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_strategy_versions_strategy_id ON public.strategy_versions(strategy_id);
CREATE INDEX idx_strategy_versions_user_id ON public.strategy_versions(user_id);