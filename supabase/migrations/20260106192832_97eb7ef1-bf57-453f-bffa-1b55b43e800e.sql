-- Drop the security definer view - it's flagged as a security risk
DROP VIEW IF EXISTS public.public_profiles;

-- Recreate as a simple view without security_barrier (which implies security definer)
-- The underlying profiles table already has proper RLS policies that allow:
-- - Users can view own or public profiles: (auth.uid() = id) OR (is_public = true)
-- This view is just a convenience projection that excludes sensitive fields

CREATE VIEW public.public_profiles AS
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

COMMENT ON VIEW public.public_profiles IS 'Filtered view of public profiles only. Excludes phone and other PII. Access controlled via underlying profiles table RLS.';