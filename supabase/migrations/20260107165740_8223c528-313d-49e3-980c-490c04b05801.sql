-- Drop the permissive insert policy
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.sentinel_waitlist;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can join waitlist" 
ON public.sentinel_waitlist 
FOR INSERT 
TO authenticated
WITH CHECK (
  ((email IS NOT NULL) AND (length(btrim(email)) > 0)) 
  OR ((phone IS NOT NULL) AND (length(btrim(phone)) > 0))
);