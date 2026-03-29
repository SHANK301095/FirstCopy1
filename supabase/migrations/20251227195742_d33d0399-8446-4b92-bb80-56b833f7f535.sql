-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Check if email exists" ON public.sentinel_waitlist;

-- Block anonymous access completely
CREATE POLICY "Block anonymous access to waitlist"
ON public.sentinel_waitlist
FOR SELECT
TO anon
USING (false);

-- Only admins can view all waitlist entries (SELECT)
CREATE POLICY "Admins can view all waitlist entries"
ON public.sentinel_waitlist
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete entries
CREATE POLICY "Admins can delete waitlist entries"
ON public.sentinel_waitlist
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));