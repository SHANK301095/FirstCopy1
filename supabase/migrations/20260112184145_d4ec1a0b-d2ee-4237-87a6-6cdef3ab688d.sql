-- Allow admins to view all user logs
CREATE POLICY "Admins can view all logs" 
ON public.logs 
FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all strategies (for stats)
CREATE POLICY "Admins can view all strategies" 
ON public.strategies 
FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all datasets (for stats)
CREATE POLICY "Admins can view all datasets" 
ON public.datasets 
FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all runs (for stats)
CREATE POLICY "Admins can view all runs" 
ON public.runs 
FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all results (for stats)
CREATE POLICY "Admins can view all results" 
ON public.results 
FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all premium trials
CREATE POLICY "Admins can view all premium trials" 
ON public.premium_trials 
FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));