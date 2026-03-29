
-- Testimonials table
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  stats_text TEXT,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved testimonials (for landing page)
CREATE POLICY "Anyone can read approved testimonials" ON public.testimonials
  FOR SELECT USING (approved = true);

-- Authenticated users can insert own testimonials
CREATE POLICY "Users can insert own testimonials" ON public.testimonials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view own testimonials
CREATE POLICY "Users can view own testimonials" ON public.testimonials
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all testimonials
CREATE POLICY "Admins can view all testimonials" ON public.testimonials
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update testimonials (approve/reject)
CREATE POLICY "Admins can update testimonials" ON public.testimonials
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete testimonials
CREATE POLICY "Admins can delete testimonials" ON public.testimonials
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create a DB function for public platform stats (no auth needed)
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'total_trades', (SELECT COUNT(*) FROM public.trades),
    'total_backtests', (SELECT COUNT(*) FROM public.results)
  );
$$;
