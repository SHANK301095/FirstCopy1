-- SECURITY HARDENING MIGRATION
-- Fixes all remaining security warnings from audit

-- ============================================
-- 1. FIX: sentinel_waitlist - Remove public PII exposure
-- Drop and recreate with hardened policies
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can join waitlist" ON public.sentinel_waitlist;
DROP POLICY IF EXISTS "Block anonymous access to waitlist" ON public.sentinel_waitlist;

-- Only authenticated users can insert their own waitlist entry (prevents spam)
CREATE POLICY "Authenticated users can join waitlist"
  ON public.sentinel_waitlist FOR INSERT
  TO authenticated
  WITH CHECK (
    ((email IS NOT NULL) AND (length(btrim(email)) > 0)) OR 
    ((phone IS NOT NULL) AND (length(btrim(phone)) > 0))
  );

-- Block ALL select access except admins
CREATE POLICY "Only admins can view waitlist"
  ON public.sentinel_waitlist FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Block anonymous completely
CREATE POLICY "Block anonymous insert to waitlist"
  ON public.sentinel_waitlist FOR INSERT
  TO anon
  WITH CHECK (false);

-- ============================================
-- 2. FIX: broker_connections_safe view - Add RLS via security invoker
-- ============================================
DROP VIEW IF EXISTS public.broker_connections_safe;

CREATE VIEW public.broker_connections_safe
WITH (security_invoker = on) AS
  SELECT 
    id,
    user_id,
    broker_type,
    account_id,
    display_name,
    status,
    token_expiry,
    last_sync_at,
    metadata,
    created_at,
    updated_at
  FROM public.broker_connections;

-- Grant access to view
GRANT SELECT ON public.broker_connections_safe TO authenticated;

-- ============================================
-- 3. FIX: public_profiles view - Ensure proper filtering
-- ============================================
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = on) AS
  SELECT 
    id,
    display_name,
    avatar_url,
    username,
    created_at
  FROM public.profiles
  WHERE is_public = true;

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- ============================================
-- 4. FIX: marketplace_strategies_public view - Ensure proper filtering
-- ============================================
DROP VIEW IF EXISTS public.marketplace_strategies_public;

CREATE VIEW public.marketplace_strategies_public
WITH (security_invoker = on) AS
  SELECT 
    id,
    title,
    description,
    category,
    tags,
    author_id,
    price,
    is_free,
    is_verified,
    is_featured,
    rating_avg,
    rating_count,
    download_count,
    preview_image_url,
    created_at,
    updated_at
  FROM public.marketplace_strategies
  WHERE visibility = 'public';

GRANT SELECT ON public.marketplace_strategies_public TO authenticated, anon;

-- ============================================
-- 5. FIX: profile_private_data - Add missing block for anonymous
-- ============================================
DROP POLICY IF EXISTS "Block anonymous access to profile_private_data" ON public.profile_private_data;

CREATE POLICY "Block anonymous access to profile_private_data"
  ON public.profile_private_data FOR SELECT
  TO anon
  USING (false);

-- ============================================
-- 6. HARDEN: app_settings - Ensure sensitive keys are protected
-- Create a view for non-sensitive settings only
-- ============================================
DROP VIEW IF EXISTS public.app_settings_safe;

CREATE VIEW public.app_settings_safe
WITH (security_invoker = on) AS
  SELECT 
    id,
    key,
    value,
    updated_at
  FROM public.app_settings
  WHERE key NOT LIKE '%secret%'
    AND key NOT LIKE '%api_key%'
    AND key NOT LIKE '%token%'
    AND key NOT LIKE '%password%'
    AND key NOT LIKE '%private%';

GRANT SELECT ON public.app_settings_safe TO authenticated;

-- Update app_settings policy to be more restrictive
DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.app_settings;

CREATE POLICY "Authenticated users can read non-sensitive settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (
    key NOT LIKE '%secret%'
    AND key NOT LIKE '%api_key%'
    AND key NOT LIKE '%token%'
    AND key NOT LIKE '%password%'
    AND key NOT LIKE '%private%'
  );

-- ============================================
-- 7. HARDEN: Block anonymous on all sensitive tables
-- ============================================

-- Block anonymous on profile_private_data INSERT
DROP POLICY IF EXISTS "Block anonymous insert to profile_private_data" ON public.profile_private_data;
CREATE POLICY "Block anonymous insert to profile_private_data"
  ON public.profile_private_data FOR INSERT
  TO anon
  WITH CHECK (false);

-- Block anonymous on profile_private_data UPDATE
DROP POLICY IF EXISTS "Block anonymous update to profile_private_data" ON public.profile_private_data;
CREATE POLICY "Block anonymous update to profile_private_data"
  ON public.profile_private_data FOR UPDATE
  TO anon
  USING (false);

-- Block anonymous on profile_private_data DELETE
DROP POLICY IF EXISTS "Block anonymous delete to profile_private_data" ON public.profile_private_data;
CREATE POLICY "Block anonymous delete to profile_private_data"
  ON public.profile_private_data FOR DELETE
  TO anon
  USING (false);