
-- =============================================
-- AUDIT LOGS: Immutable admin action tracking
-- =============================================
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_data JSONB,
  after_data JSONB,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for common queries
CREATE INDEX idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

-- No one can update or delete audit logs (immutable)

-- =============================================
-- FEATURE FLAGS: Database-backed feature toggles
-- =============================================
CREATE TABLE public.feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  target_groups TEXT[] NOT NULL DEFAULT '{all}',
  environment TEXT NOT NULL DEFAULT 'production',
  is_kill_switch BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feature_flags_key ON public.feature_flags(key);
CREATE INDEX idx_feature_flags_env ON public.feature_flags(environment);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read flags (needed for client-side checks)
CREATE POLICY "Authenticated users can read feature flags"
ON public.feature_flags FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage flags
CREATE POLICY "Admins can insert feature flags"
ON public.feature_flags FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update feature flags"
ON public.feature_flags FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete feature flags"
ON public.feature_flags FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- ADMIN CONFIG: Key-value config center
-- =============================================
CREATE TABLE public.admin_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_config_key ON public.admin_config(key);
CREATE INDEX idx_admin_config_category ON public.admin_config(category);

ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read non-sensitive config"
ON public.admin_config FOR SELECT
TO authenticated
USING (NOT is_sensitive OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage config"
ON public.admin_config FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update config"
ON public.admin_config FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete config"
ON public.admin_config FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- ADMIN ALERTS: System alerts for admins
-- =============================================
CREATE TABLE public.admin_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT,
  entity_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_by UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_alerts_unread ON public.admin_alerts(is_read, created_at DESC);
CREATE INDEX idx_admin_alerts_type ON public.admin_alerts(type);

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read alerts"
ON public.admin_alerts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert alerts"
ON public.admin_alerts FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update alerts"
ON public.admin_alerts FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- Helper: Log audit event function
-- =============================================
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_before_data JSONB DEFAULT NULL,
  p_after_data JSONB DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO public.audit_logs (admin_id, action, entity_type, entity_id, before_data, after_data, reason)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_before_data, p_after_data, p_reason)
  RETURNING id INTO v_audit_id;
  
  -- Create alert for high-risk actions
  IF p_action IN ('role_change', 'security_toggle', 'kill_switch', 'user_ban', 'config_change') THEN
    INSERT INTO public.admin_alerts (type, severity, title, message, entity_type, entity_id)
    VALUES (
      'audit_alert',
      CASE WHEN p_action IN ('kill_switch', 'user_ban', 'security_toggle') THEN 'critical' ELSE 'warning' END,
      'Admin Action: ' || p_action,
      'Action performed on ' || p_entity_type || ' by admin',
      p_entity_type,
      p_entity_id
    );
  END IF;
  
  RETURN v_audit_id;
END;
$$;

-- =============================================
-- Seed default feature flags
-- =============================================
INSERT INTO public.feature_flags (key, name, description, enabled, rollout_percentage, target_groups, is_kill_switch) VALUES
  ('scanner_v2', 'Scanner V2', 'New scanner engine with improved performance', true, 100, '{all}', false),
  ('ai_insights', 'AI Insights', 'AI-powered trade analysis and suggestions', true, 50, '{admins,beta}', false),
  ('realtime_alerts', 'Realtime Alerts', 'Push notifications for trading signals', false, 0, '{all}', false),
  ('maintenance_mode', 'Maintenance Mode', 'Put app in maintenance mode for all users', false, 100, '{all}', true),
  ('disable_signups', 'Disable Signups', 'Kill switch to disable new user registration', false, 100, '{all}', true);

-- =============================================
-- Seed default admin config
-- =============================================
INSERT INTO public.admin_config (key, value, category, description, requires_approval) VALUES
  ('max_datasets_per_user', '{"value": 50}', 'limits', 'Maximum datasets a user can create', false),
  ('max_strategies_per_user', '{"value": 100}', 'limits', 'Maximum strategies a user can create', false),
  ('max_file_upload_mb', '{"value": 100}', 'limits', 'Maximum file upload size in MB', false),
  ('waitlist_capacity', '{"value": 100}', 'limits', 'Maximum waitlist capacity', false),
  ('maintenance_message', '{"value": "We are performing scheduled maintenance. Please check back soon."}', 'general', 'Message shown during maintenance mode', false),
  ('onboarding_steps', '{"value": ["welcome","import_data","create_strategy","run_backtest"]}', 'general', 'Onboarding wizard steps', false);

-- Enable realtime for admin_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_alerts;
