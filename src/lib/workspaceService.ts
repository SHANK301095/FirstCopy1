import { supabase } from "@/integrations/supabase/client";

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

// WorkspaceInvite is only accessible via RPC - never directly from client
// This interface represents what list_workspace_invites returns (redacted data only)
export interface WorkspaceInviteListItem {
  id: string;
  redacted_email: string; // e.g., "a***@g***.com" - never raw email
  role: WorkspaceRole;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

// Response from create_workspace_invite RPC
export interface InviteCreationResult {
  ok: boolean;
  error?: string;
  invite_id?: string;
  token?: string; // Only returned ONCE at creation, never stored
  expires_at?: string;
}

export interface WorkspaceActivity {
  id: string;
  workspace_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

// Workspace CRUD
export async function fetchWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Workspace[];
}

export async function fetchWorkspace(id: string): Promise<Workspace | null> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  
  if (error) throw error;
  return data as Workspace | null;
}

export async function createWorkspace(name: string, description?: string): Promise<Workspace> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('workspaces')
    .insert({
      name,
      description,
      owner_id: user.id
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as Workspace;
}

export async function updateWorkspace(id: string, updates: { name?: string; description?: string }): Promise<Workspace> {
  const { data, error } = await supabase
    .from('workspaces')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Workspace;
}

export async function deleteWorkspace(id: string): Promise<void> {
  const { error } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Members
export async function fetchWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select(`
      *,
      profile:profiles(display_name, avatar_url)
    `)
    .eq('workspace_id', workspaceId)
    .order('invited_at', { ascending: false });
  
  if (error) throw error;
  return (data || []).map(m => ({
    ...m,
    profile: Array.isArray(m.profile) ? m.profile[0] : m.profile
  })) as WorkspaceMember[];
}

export async function inviteMember(workspaceId: string, email: string, role: WorkspaceRole = 'viewer'): Promise<{ token: string; expires_at: string }> {
  // Use secure RPC to create invite - returns token ONCE for sharing
  // Token is NEVER stored in DB, only hash is stored
  const { data, error } = await supabase.rpc('create_workspace_invite', {
    p_workspace_id: workspaceId,
    p_email: email,
    p_role: role
  });

  if (error) throw error;
  
  const result = data as unknown as InviteCreationResult;
  
  if (!result.ok) {
    throw new Error(result.error || 'Failed to create invite');
  }

  // Token returned here is the ONLY time it's available
  // Do not log or persist this value anywhere
  return {
    token: result.token!,
    expires_at: result.expires_at!
  };
}

// Fetch workspace invites via secure RPC - returns redacted data only
export async function fetchWorkspaceInvites(workspaceId: string): Promise<WorkspaceInviteListItem[]> {
  const { data, error } = await supabase.rpc('list_workspace_invites', {
    p_workspace_id: workspaceId
  });

  if (error) throw error;
  
  return (data || []) as WorkspaceInviteListItem[];
}

export async function acceptInvite(token: string): Promise<void> {
  // Use secure RPC function - never query workspace_invites directly
  const { data, error } = await supabase.rpc('redeem_workspace_invite', {
    p_token: token
  });

  if (error) throw error;
  
  const result = data as { ok: boolean; error?: string; workspace_id?: string };
  
  if (!result.ok) {
    throw new Error(result.error || 'Invalid or expired invite');
  }
}

export async function updateMemberRole(memberId: string, role: WorkspaceRole): Promise<void> {
  const { error } = await supabase
    .from('workspace_members')
    .update({ role })
    .eq('id', memberId);
  
  if (error) throw error;
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('id', memberId);
  
  if (error) throw error;
}

// Activity
export async function fetchWorkspaceActivity(workspaceId: string, limit = 50): Promise<WorkspaceActivity[]> {
  const { data, error } = await supabase
    .from('workspace_activity')
    .select(`
      *,
      profile:profiles(display_name, avatar_url)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return (data || []).map(a => ({
    ...a,
    profile: Array.isArray(a.profile) ? a.profile[0] : a.profile
  })) as WorkspaceActivity[];
}

export async function logActivity(
  workspaceId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  resourceName?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('workspace_activity')
    .insert({
      workspace_id: workspaceId,
      user_id: user.id,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      resource_name: resourceName
    });
}

// Assign project to workspace
export async function assignProjectToWorkspace(projectId: string, workspaceId: string | null): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ workspace_id: workspaceId })
    .eq('id', projectId);
  
  if (error) throw error;
}
