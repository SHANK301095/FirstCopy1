-- Fix the public_profiles view to use security_invoker instead of security_definer
-- This ensures RLS policies of the querying user are applied, not the view creator
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true) AS
SELECT 
  id,
  username,
  display_name,
  avatar_url,
  created_at
FROM public.profiles
WHERE is_public = true;

-- Revoke from anon, only authenticated users should query
REVOKE ALL ON public.public_profiles FROM anon;
GRANT SELECT ON public.public_profiles TO authenticated;

COMMENT ON VIEW public.public_profiles IS 'Filtered view of public profiles only. Uses security_invoker to respect RLS. Excludes phone and other PII.';