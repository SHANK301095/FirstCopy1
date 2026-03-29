-- Create workspace roles enum
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workspace members table
CREATE TABLE public.workspace_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(workspace_id, user_id)
);

-- Create workspace invites table
CREATE TABLE public.workspace_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role workspace_role NOT NULL DEFAULT 'viewer',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- Create workspace activity log for collaboration
CREATE TABLE public.workspace_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  resource_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add workspace_id to projects table
ALTER TABLE public.projects ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Enable RLS on all new tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_activity ENABLE ROW LEVEL SECURITY;

-- Function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id AND accepted_at IS NOT NULL
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = _workspace_id AND owner_id = _user_id
  )
$$;

-- Function to get workspace role
CREATE OR REPLACE FUNCTION public.get_workspace_role(_user_id UUID, _workspace_id UUID)
RETURNS workspace_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.workspaces WHERE id = _workspace_id AND owner_id = _user_id) THEN 'owner'::workspace_role
    ELSE (SELECT role FROM public.workspace_members WHERE user_id = _user_id AND workspace_id = _workspace_id AND accepted_at IS NOT NULL)
  END
$$;

-- Function to check if user can edit in workspace
CREATE OR REPLACE FUNCTION public.can_edit_workspace(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_workspace_role(_user_id, _workspace_id) IN ('owner', 'admin', 'editor')
$$;

-- RLS Policies for workspaces
CREATE POLICY "Users can view workspaces they own or are members of"
ON public.workspaces FOR SELECT
USING (owner_id = auth.uid() OR public.is_workspace_member(auth.uid(), id));

CREATE POLICY "Users can create workspaces"
ON public.workspaces FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners and admins can update workspaces"
ON public.workspaces FOR UPDATE
USING (public.get_workspace_role(auth.uid(), id) IN ('owner', 'admin'));

CREATE POLICY "Only owners can delete workspaces"
ON public.workspaces FOR DELETE
USING (owner_id = auth.uid());

-- RLS Policies for workspace_members
CREATE POLICY "Members can view workspace members"
ON public.workspace_members FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can add members"
ON public.workspace_members FOR INSERT
WITH CHECK (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can update members"
ON public.workspace_members FOR UPDATE
USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can remove members"
ON public.workspace_members FOR DELETE
USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin') OR user_id = auth.uid());

-- RLS Policies for workspace_invites
CREATE POLICY "Admins can view invites"
ON public.workspace_invites FOR SELECT
USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can create invites"
ON public.workspace_invites FOR INSERT
WITH CHECK (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can delete invites"
ON public.workspace_invites FOR DELETE
USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));

-- RLS Policies for workspace_activity
CREATE POLICY "Members can view activity"
ON public.workspace_activity FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can log activity"
ON public.workspace_activity FOR INSERT
WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id));

-- Update projects RLS to include workspace access
CREATE POLICY "Workspace members can view workspace projects"
ON public.projects FOR SELECT
USING (
  auth.uid() = user_id 
  OR (workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id))
);

CREATE POLICY "Workspace editors can update workspace projects"
ON public.projects FOR UPDATE
USING (
  auth.uid() = user_id 
  OR (workspace_id IS NOT NULL AND public.can_edit_workspace(auth.uid(), workspace_id))
);

-- Trigger to update updated_at
CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_members;