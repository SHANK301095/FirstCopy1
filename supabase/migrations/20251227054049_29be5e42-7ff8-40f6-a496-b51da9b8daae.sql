-- ============================================================
-- SECURITY HARDENING MIGRATION
-- 1. Profiles: default private + optional public discoverability
-- 2. workspace_invites: token security improvements
-- 3. marketplace_strategies: owner-based visibility
-- ============================================================

-- ============================================================
-- PART 1: PROFILES - Default Private + Public Discoverability
-- ============================================================

-- Add is_public column (default false = private)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Create helper function to redact email for display
CREATE OR REPLACE FUNCTION public.redact_email(email text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF email IS NULL OR email = '' THEN
    RETURN NULL;
  END IF;
  -- Show first 2 chars + *** + domain
  RETURN CONCAT(
    LEFT(SPLIT_PART(email, '@', 1), 2),
    '***@',
    SPLIT_PART(email, '@', 2)
  );
END;
$$;

-- Create public profiles view (only safe fields, only public profiles)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  username,
  display_name,
  avatar_url,
  created_at
FROM public.profiles
WHERE is_public = true;

-- Grant select on view to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Update profiles RLS: authenticated users can see public profiles OR their own
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own or public profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id OR is_public = true);

-- ============================================================
-- PART 2: WORKSPACE_INVITES - Token Security
-- ============================================================

-- email_hash for lookup without exposing email
ALTER TABLE public.workspace_invites 
ADD COLUMN IF NOT EXISTS email_hash text;

-- Create index on email_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_workspace_invites_email_hash 
ON public.workspace_invites(email_hash);

-- Create index on token_hash (already exists but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_workspace_invites_token_hash 
ON public.workspace_invites(token_hash);

-- Update existing rows to have email_hash
UPDATE public.workspace_invites 
SET email_hash = encode(sha256(lower(email)::bytea), 'hex')
WHERE email_hash IS NULL;

-- Drop old permissive policies and create restrictive ones
DROP POLICY IF EXISTS "Admins can view invites" ON public.workspace_invites;

-- Admins can view invites but with redacted email (via RPC instead)
-- We'll use RPC for listing, so no direct SELECT policy needed beyond admin check

-- Create RPC for listing invites with redacted emails
CREATE OR REPLACE FUNCTION public.list_workspace_invites(p_workspace_id uuid)
RETURNS TABLE (
  id uuid,
  redacted_email text,
  role workspace_role,
  created_at timestamptz,
  expires_at timestamptz,
  used_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin/owner
  IF NOT (get_workspace_role(auth.uid(), p_workspace_id) IN ('owner', 'admin')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    wi.id,
    public.redact_email(wi.email) as redacted_email,
    wi.role,
    wi.created_at,
    wi.expires_at,
    wi.used_at
  FROM public.workspace_invites wi
  WHERE wi.workspace_id = p_workspace_id
  ORDER BY wi.created_at DESC;
END;
$$;

-- ============================================================
-- PART 3: MARKETPLACE_STRATEGIES - Owner-based Visibility
-- ============================================================

-- Add visibility column
ALTER TABLE public.marketplace_strategies 
ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private'
CHECK (visibility IN ('private', 'public', 'unlisted'));

-- Add owner_id if not exists (fallback to author_id)
-- Note: author_id already exists, we'll use that as owner

-- Drop the overly permissive "Anyone can view" policy
DROP POLICY IF EXISTS "Anyone can view marketplace strategies" ON public.marketplace_strategies;

-- Owner can always see their own strategies
CREATE POLICY "Owners can view own strategies"
ON public.marketplace_strategies
FOR SELECT
TO authenticated
USING (author_id = auth.uid());

-- Public visibility policy (separate so both apply)
CREATE POLICY "Anyone can view public strategies"
ON public.marketplace_strategies
FOR SELECT
TO authenticated
USING (visibility = 'public');

-- Create safe public view for marketplace browsing
CREATE OR REPLACE VIEW public.marketplace_strategies_public AS
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

-- ============================================================
-- CLEANUP: Ensure all tables have proper RLS
-- ============================================================

-- Ensure RLS is enabled on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_strategies ENABLE ROW LEVEL SECURITY;