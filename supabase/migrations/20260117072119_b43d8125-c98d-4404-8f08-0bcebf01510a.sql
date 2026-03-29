-- ADDITIONAL SECURITY HARDENING
-- Fix remaining warnings and add DENY policies for immutable tables

-- ============================================
-- 1. FIX: ai_usage - Prevent updates/deletes (immutable audit trail)
-- ============================================
DROP POLICY IF EXISTS "Users cannot update ai_usage" ON public.ai_usage;
CREATE POLICY "Users cannot update ai_usage"
  ON public.ai_usage FOR UPDATE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Users cannot delete ai_usage" ON public.ai_usage;
CREATE POLICY "Users cannot delete ai_usage"
  ON public.ai_usage FOR DELETE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Block anonymous ai_usage" ON public.ai_usage;
CREATE POLICY "Block anonymous ai_usage"
  ON public.ai_usage FOR ALL
  TO anon
  USING (false);

-- ============================================
-- 2. FIX: premium_trials - Prevent user manipulation
-- ============================================
DROP POLICY IF EXISTS "Users cannot update trials" ON public.premium_trials;
CREATE POLICY "Users cannot update trials"
  ON public.premium_trials FOR UPDATE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Users cannot delete trials" ON public.premium_trials;
CREATE POLICY "Users cannot delete trials"
  ON public.premium_trials FOR DELETE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Block anonymous premium_trials" ON public.premium_trials;
CREATE POLICY "Block anonymous premium_trials"
  ON public.premium_trials FOR ALL
  TO anon
  USING (false);

-- ============================================
-- 3. FIX: strategy_ratings - Add admin moderation policies
-- ============================================
DROP POLICY IF EXISTS "Admins can view all ratings" ON public.strategy_ratings;
CREATE POLICY "Admins can view all ratings"
  ON public.strategy_ratings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete any rating" ON public.strategy_ratings;
CREATE POLICY "Admins can delete any rating"
  ON public.strategy_ratings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Block anonymous ratings" ON public.strategy_ratings;
CREATE POLICY "Block anonymous ratings"
  ON public.strategy_ratings FOR INSERT
  TO anon
  WITH CHECK (false);

-- ============================================
-- 4. Add explicit block for anonymous on more tables
-- ============================================

-- Block anonymous on workspace_invites (all operations)
DROP POLICY IF EXISTS "Block all anonymous workspace_invites" ON public.workspace_invites;
CREATE POLICY "Block all anonymous workspace_invites"
  ON public.workspace_invites FOR ALL
  TO anon
  USING (false);

-- Block anonymous on broker_connections (all operations)
DROP POLICY IF EXISTS "Block all anonymous broker_connections" ON public.broker_connections;
CREATE POLICY "Block all anonymous broker_connections"
  ON public.broker_connections FOR ALL
  TO anon
  USING (false);

-- Block anonymous on app_settings (all operations)
DROP POLICY IF EXISTS "Block all anonymous app_settings" ON public.app_settings;
CREATE POLICY "Block all anonymous app_settings"
  ON public.app_settings FOR ALL
  TO anon
  USING (false);