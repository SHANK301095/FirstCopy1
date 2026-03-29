-- ============================================================
-- FIX SECURITY LINTER ISSUES
-- 1. Views: Change to SECURITY INVOKER (default, explicit)
-- 2. Functions: Add search_path
-- ============================================================

-- Drop and recreate views with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  username,
  display_name,
  avatar_url,
  created_at
FROM public.profiles
WHERE is_public = true;

-- Grant select on view
GRANT SELECT ON public.public_profiles TO authenticated;

-- Drop and recreate marketplace view with SECURITY INVOKER
DROP VIEW IF EXISTS public.marketplace_strategies_public;
CREATE VIEW public.marketplace_strategies_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  title,
  description,
  category,
  tags,
  preview_image_url,
  is_free,
  price,
  rating_avg,
  rating_count,
  download_count,
  is_verified,
  is_featured,
  author_id,
  created_at,
  updated_at
FROM public.marketplace_strategies
WHERE visibility = 'public';

-- Grant select on view
GRANT SELECT ON public.marketplace_strategies_public TO authenticated;
GRANT SELECT ON public.marketplace_strategies_public TO anon;

-- Fix redact_email function with proper search_path
CREATE OR REPLACE FUNCTION public.redact_email(email text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF email IS NULL OR email = '' THEN
    RETURN NULL;
  END IF;
  RETURN CONCAT(
    LEFT(SPLIT_PART(email, '@', 1), 2),
    '***@',
    SPLIT_PART(email, '@', 2)
  );
END;
$$;