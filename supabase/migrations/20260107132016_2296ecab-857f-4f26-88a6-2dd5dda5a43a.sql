-- Tighten overly-permissive RLS policy for waitlist inserts (still public, but requires at least one identifier)

DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.sentinel_waitlist;

CREATE POLICY "Anyone can join waitlist"
ON public.sentinel_waitlist
FOR INSERT
TO public
WITH CHECK (
  (email IS NOT NULL AND length(btrim(email)) > 0)
  OR (phone IS NOT NULL AND length(btrim(phone)) > 0)
);