-- Enable pgcrypto for token hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Add DELETE RLS policy for logs table
DROP POLICY IF EXISTS "Users can delete own logs" ON public.logs;

CREATE POLICY "Users can delete own logs"
ON public.logs
FOR DELETE
USING (auth.uid() = user_id);

-- 2. Harden workspace_invites - add secure columns
-- Note: token_hash, expires_at, accepted_at already exist per schema
-- Add used_at for single-use enforcement if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'workspace_invites' AND column_name = 'used_at') THEN
    ALTER TABLE public.workspace_invites ADD COLUMN used_at timestamptz;
  END IF;
END $$;

-- Add token_hash column if not exists (for migration from plaintext token)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'workspace_invites' AND column_name = 'token_hash') THEN
    ALTER TABLE public.workspace_invites ADD COLUMN token_hash text;
  END IF;
END $$;

-- Create index for fast token_hash lookup
CREATE INDEX IF NOT EXISTS workspace_invites_token_hash_idx 
  ON public.workspace_invites(token_hash);

CREATE INDEX IF NOT EXISTS workspace_invites_expires_idx 
  ON public.workspace_invites(expires_at);

-- Backfill existing tokens with hashed versions (one-time migration)
UPDATE public.workspace_invites 
SET token_hash = encode(digest(token, 'sha256'), 'hex')
WHERE token IS NOT NULL AND token_hash IS NULL;

-- 3. Create secure RPC for invite redemption
CREATE OR REPLACE FUNCTION public.redeem_workspace_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
  v_invite record;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Authentication required');
  END IF;

  -- Hash the provided token
  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  -- Find valid invite
  SELECT *
    INTO v_invite
  FROM public.workspace_invites
  WHERE token_hash = v_hash
    AND (expires_at IS NULL OR expires_at > now())
    AND used_at IS NULL
    AND accepted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or expired invite');
  END IF;

  -- Mark as used (single-use)
  UPDATE public.workspace_invites
  SET used_at = now(),
      accepted_at = now()
  WHERE id = v_invite.id;

  -- Add user to workspace members
  INSERT INTO public.workspace_members (user_id, workspace_id, role, invited_by, accepted_at)
  VALUES (v_user_id, v_invite.workspace_id, v_invite.role, v_invite.invited_by, now())
  ON CONFLICT (user_id, workspace_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'workspace_id', v_invite.workspace_id);
END;
$$;

-- Restrict function access
REVOKE ALL ON FUNCTION public.redeem_workspace_invite(text) FROM public;
GRANT EXECUTE ON FUNCTION public.redeem_workspace_invite(text) TO authenticated;

-- 4. Create function to generate secure invite (admin only)
CREATE OR REPLACE FUNCTION public.create_workspace_invite(
  p_workspace_id uuid,
  p_email text,
  p_role workspace_role DEFAULT 'viewer'
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

  -- Generate secure token
  v_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  -- Create invite
  INSERT INTO public.workspace_invites (
    workspace_id, email, role, invited_by, token, token_hash, expires_at
  ) VALUES (
    p_workspace_id, p_email, p_role, v_user_id, v_token, v_token_hash, now() + interval '7 days'
  )
  RETURNING id INTO v_invite_id;

  -- Return token ONCE (never stored in plaintext after this)
  RETURN jsonb_build_object(
    'ok', true, 
    'invite_id', v_invite_id,
    'token', v_token,
    'expires_at', now() + interval '7 days'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_workspace_invite(uuid, text, workspace_role) FROM public;
GRANT EXECUTE ON FUNCTION public.create_workspace_invite(uuid, text, workspace_role) TO authenticated;

-- 5. Update RLS to prevent token/token_hash selection
-- Drop existing policy and recreate with restricted columns
DROP POLICY IF EXISTS "Admins can view invites" ON public.workspace_invites;

CREATE POLICY "Admins can view invites"
ON public.workspace_invites
FOR SELECT
USING (
  get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin')
);