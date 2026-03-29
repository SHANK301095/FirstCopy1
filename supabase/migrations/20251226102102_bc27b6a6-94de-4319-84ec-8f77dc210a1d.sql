-- Drop and recreate the redeem function with proper signature
DROP FUNCTION IF EXISTS public.redeem_workspace_invite(text);

-- Create a secure function to verify invite tokens without exposing them
CREATE OR REPLACE FUNCTION public.verify_invite_token(p_token text)
RETURNS uuid AS $$
DECLARE
  invite_id uuid;
  computed_hash text;
BEGIN
  computed_hash := encode(sha256(p_token::bytea), 'hex');
  
  SELECT id INTO invite_id
  FROM public.workspace_invites
  WHERE token_hash = computed_hash
    AND used_at IS NULL
    AND expires_at > now();
  
  RETURN invite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the redeem function to use hash verification
CREATE FUNCTION public.redeem_workspace_invite(p_token text)
RETURNS json AS $$
DECLARE
  v_invite RECORD;
  v_user_id uuid;
  v_computed_hash text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;
  
  v_computed_hash := encode(sha256(p_token::bytea), 'hex');
  
  -- Find and lock the invite
  SELECT * INTO v_invite
  FROM public.workspace_invites
  WHERE token_hash = v_computed_hash
    AND used_at IS NULL
    AND expires_at > now()
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid or expired invite');
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = v_invite.workspace_id AND user_id = v_user_id
  ) THEN
    RETURN json_build_object('error', 'Already a member of this workspace');
  END IF;
  
  -- Mark invite as used
  UPDATE public.workspace_invites
  SET used_at = now(), accepted_at = now()
  WHERE id = v_invite.id;
  
  -- Add user as member
  INSERT INTO public.workspace_members (workspace_id, user_id, role, invited_by, accepted_at)
  VALUES (v_invite.workspace_id, v_user_id, v_invite.role, v_invite.invited_by, now());
  
  RETURN json_build_object(
    'success', true,
    'workspace_id', v_invite.workspace_id,
    'role', v_invite.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;