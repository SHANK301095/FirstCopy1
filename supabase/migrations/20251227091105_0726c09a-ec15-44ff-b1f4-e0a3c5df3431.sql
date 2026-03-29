-- ============================================
-- SECURITY HARDENING: workspace_invites
-- Remove raw token storage, block all client access
-- ============================================

-- Step 1: Migrate existing invites to use token_hash only
-- (any invites with token but no hash will be hashed now)
UPDATE public.workspace_invites 
SET token_hash = encode(digest(token, 'sha256'), 'hex')
WHERE token_hash IS NULL AND token IS NOT NULL;

-- Step 2: Make token_hash NOT NULL (required)
ALTER TABLE public.workspace_invites 
ALTER COLUMN token_hash SET NOT NULL;

-- Step 3: Hash emails for privacy matching
UPDATE public.workspace_invites 
SET email_hash = encode(digest(LOWER(email), 'sha256'), 'hex')
WHERE email_hash IS NULL AND email IS NOT NULL;

-- Step 4: Remove raw token column (CRITICAL SECURITY FIX)
ALTER TABLE public.workspace_invites 
DROP COLUMN IF EXISTS token;

-- Step 5: Drop ALL existing SELECT policies on workspace_invites
-- We want NO direct client reads - only via RPC
DROP POLICY IF EXISTS "Block anonymous access to workspace_invites" ON public.workspace_invites;
DROP POLICY IF EXISTS "Admins can view invites" ON public.workspace_invites;
DROP POLICY IF EXISTS "Members can view invites" ON public.workspace_invites;

-- Step 6: Create strict RLS - block ALL client reads
CREATE POLICY "No client SELECT access to invites" 
ON public.workspace_invites 
FOR SELECT 
TO authenticated
USING (false);

CREATE POLICY "No anon access to invites" 
ON public.workspace_invites 
FOR SELECT 
TO anon
USING (false);

-- Step 7: Update create_workspace_invite RPC - ensure token never stored
CREATE OR REPLACE FUNCTION public.create_workspace_invite(
  p_workspace_id uuid, 
  p_email text, 
  p_role workspace_role DEFAULT 'viewer'::workspace_role
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role workspace_role;
  v_token text;
  v_token_hash text;
  v_email_hash text;
  v_invite_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Authentication required');
  END IF;

  -- Check if user is admin/owner of workspace
  v_user_role := public.get_workspace_role(v_user_id, p_workspace_id);
  IF v_user_role IS NULL OR v_user_role NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only admins can create invites');
  END IF;

  -- Check for existing pending invite to same email
  IF EXISTS (
    SELECT 1 FROM public.workspace_invites 
    WHERE workspace_id = p_workspace_id 
      AND LOWER(email) = LOWER(p_email)
      AND used_at IS NULL 
      AND expires_at > now()
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pending invite already exists for this email');
  END IF;

  -- Generate cryptographically secure token
  v_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
  v_email_hash := encode(digest(LOWER(p_email), 'sha256'), 'hex');

  -- Create invite - NO raw token stored
  INSERT INTO public.workspace_invites (
    workspace_id, email, email_hash, role, invited_by, token_hash, expires_at
  ) VALUES (
    p_workspace_id, p_email, v_email_hash, p_role, v_user_id, v_token_hash, now() + interval '7 days'
  )
  RETURNING id INTO v_invite_id;

  -- Return token ONCE (it is never stored in plaintext)
  RETURN jsonb_build_object(
    'ok', true, 
    'invite_id', v_invite_id,
    'token', v_token,
    'expires_at', now() + interval '7 days'
  );
END;
$$;

-- Step 8: Update list_workspace_invites RPC - redact emails
CREATE OR REPLACE FUNCTION public.list_workspace_invites(p_workspace_id uuid)
RETURNS TABLE(
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

-- Step 9: Update redeem_workspace_invite RPC - atomic, secure
CREATE OR REPLACE FUNCTION public.redeem_workspace_invite(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_user_id uuid;
  v_computed_hash text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Not authenticated');
  END IF;
  
  v_computed_hash := encode(digest(p_token, 'sha256'), 'hex');
  
  -- Find and lock the invite atomically
  SELECT * INTO v_invite
  FROM public.workspace_invites
  WHERE token_hash = v_computed_hash
    AND used_at IS NULL
    AND expires_at > now()
  FOR UPDATE SKIP LOCKED;
  
  IF NOT FOUND THEN
    -- Log failed attempt (no sensitive data)
    PERFORM public.log_security_event('invite_redeem_fail', v_user_id, jsonb_build_object('reason', 'not_found_or_used'));
    RETURN json_build_object('ok', false, 'error', 'Invalid or expired invite');
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = v_invite.workspace_id AND user_id = v_user_id
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'Already a member of this workspace');
  END IF;
  
  -- Mark invite as used atomically
  UPDATE public.workspace_invites
  SET used_at = now(), accepted_at = now()
  WHERE id = v_invite.id;
  
  -- Add user as member
  INSERT INTO public.workspace_members (workspace_id, user_id, role, invited_by, accepted_at)
  VALUES (v_invite.workspace_id, v_user_id, v_invite.role, v_invite.invited_by, now());
  
  -- Log success (no sensitive data)
  PERFORM public.log_security_event('invite_redeem_success', v_user_id, jsonb_build_object(
    'workspace_id', v_invite.workspace_id,
    'role', v_invite.role
  ));
  
  RETURN json_build_object(
    'ok', true,
    'workspace_id', v_invite.workspace_id,
    'role', v_invite.role
  );
END;
$$;

-- Step 10: Create security event logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_user_id uuid,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into logs table with sanitized data (no tokens/emails)
  INSERT INTO public.logs (user_id, scope, level, message, meta_json)
  VALUES (
    p_user_id,
    'security',
    'info',
    p_event_type,
    p_metadata
  );
EXCEPTION WHEN OTHERS THEN
  -- Silently fail logging - don't break main operation
  NULL;
END;
$$;

-- Step 11: Update verify_invite_token to be internal only
CREATE OR REPLACE FUNCTION public.verify_invite_token(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_id uuid;
  computed_hash text;
BEGIN
  computed_hash := encode(digest(p_token, 'sha256'), 'hex');
  
  SELECT id INTO invite_id
  FROM public.workspace_invites
  WHERE token_hash = computed_hash
    AND used_at IS NULL
    AND expires_at > now();
  
  RETURN invite_id;
END;
$$;

-- Step 12: Revoke direct function access from anon
REVOKE EXECUTE ON FUNCTION public.verify_invite_token(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_security_event(text, uuid, jsonb) FROM anon;