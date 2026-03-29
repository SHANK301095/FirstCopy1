-- Drop the existing view and recreate it with security_barrier
-- This ensures the view properly filters data even under RLS
DROP VIEW IF EXISTS public.public_profiles;

-- Recreate as a security barrier view - this prevents query optimization
-- from bypassing the WHERE clause filter
CREATE VIEW public.public_profiles WITH (security_barrier = true) AS
SELECT 
  id,
  username,
  display_name,
  avatar_url,
  created_at
FROM public.profiles
WHERE is_public = true;

-- Grant access only to authenticated users (not anon)
REVOKE ALL ON public.public_profiles FROM anon;
GRANT SELECT ON public.public_profiles TO authenticated;

-- Add a comment explaining the security model
COMMENT ON VIEW public.public_profiles IS 'Safe view of public profiles only. Uses security_barrier to prevent filter bypass. Phone and other PII fields are excluded.';