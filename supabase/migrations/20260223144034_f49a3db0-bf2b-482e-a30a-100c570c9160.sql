
-- Fix overly permissive INSERT policy on affiliate_clicks
DROP POLICY "Authenticated can insert clicks" ON public.affiliate_clicks;
CREATE POLICY "Authenticated can insert clicks" ON public.affiliate_clicks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
