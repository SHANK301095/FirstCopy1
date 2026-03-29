-- Allow admins to view all AI usage for analytics
CREATE POLICY "Admins can view all AI usage" 
ON public.ai_usage FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'admin'));