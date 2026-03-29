
-- Strategy Health Scores table
CREATE TABLE public.strategy_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'global',
  symbol text NOT NULL DEFAULT '',
  timeframe text NOT NULL DEFAULT '',
  score integer NOT NULL DEFAULT 0,
  grade text NOT NULL DEFAULT 'risky',
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  reasons text[] NOT NULL DEFAULT '{}',
  warnings text[] NOT NULL DEFAULT '{}',
  computed_from text NOT NULL DEFAULT 'backtest',
  sample_size integer NOT NULL DEFAULT 0,
  last_computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(strategy_id, scope, symbol, timeframe)
);

-- Strategy Health Runs audit table
CREATE TABLE public.strategy_health_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  strategies_processed integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  error text,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.strategy_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_health_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can read health scores" ON public.strategy_health_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage health scores" ON public.strategy_health_scores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read health runs" ON public.strategy_health_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage health runs" ON public.strategy_health_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger
CREATE TRIGGER update_strategy_health_scores_updated_at BEFORE UPDATE ON public.strategy_health_scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_health_scores_strategy ON public.strategy_health_scores(strategy_id);
CREATE INDEX idx_health_scores_grade ON public.strategy_health_scores(grade);
CREATE INDEX idx_health_scores_score ON public.strategy_health_scores(score DESC);
