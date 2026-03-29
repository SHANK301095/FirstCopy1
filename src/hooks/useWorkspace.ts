import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { secureLogger } from '@/lib/secureLogger';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceActivity,
  WorkspaceRole,
  fetchWorkspaces,
  fetchWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  fetchWorkspaceMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  fetchWorkspaceActivity,
  logActivity,
  assignProjectToWorkspace
} from '@/lib/workspaceService';

export interface UseWorkspaceReturn {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  members: WorkspaceMember[];
  activity: WorkspaceActivity[];
  loading: boolean;
  error: string | null;
  
  // Workspace actions
  loadWorkspaces: () => Promise<void>;
  selectWorkspace: (id: string) => Promise<void>;
  createNewWorkspace: (name: string, description?: string) => Promise<Workspace>;
  updateCurrentWorkspace: (updates: Partial<Workspace>) => Promise<void>;
  deleteCurrentWorkspace: () => Promise<void>;
  
  // Member actions
  loadMembers: () => Promise<void>;
  invite: (email: string, role: WorkspaceRole) => Promise<void>;
  updateRole: (memberId: string, role: WorkspaceRole) => Promise<void>;
  remove: (memberId: string) => Promise<void>;
  
  // Activity
  loadActivity: () => Promise<void>;
  log: (action: string, resourceType: string, resourceId?: string, resourceName?: string) => Promise<void>;
  
  // Project assignment
  assignProject: (projectId: string) => Promise<void>;
  unassignProject: (projectId: string) => Promise<void>;
}

// Module-level cache for workspaces (similar pattern to usePremiumStatus)
interface WorkspaceCacheEntry {
  workspaces: Workspace[];
  userId: string;
  timestamp: number;
}

let workspacesCache: WorkspaceCacheEntry | null = null;
const CACHE_TTL = 60000; // 60 seconds (aligned with premium status cache)

// Export for manual invalidation when needed (e.g., after creating/deleting workspace)
export function invalidateWorkspaceCache() {
  workspacesCache = null;
}

export function useWorkspace(): UseWorkspaceReturn {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>(
    workspacesCache?.workspaces || []
  );
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [activity, setActivity] = useState<WorkspaceActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspaces = useCallback(async (force = false) => {
    if (!user) return;
    
    // Use cache if available, valid for user, and not expired
    const now = Date.now();
    if (
      !force && 
      workspacesCache && 
      workspacesCache.userId === user.id &&
      (now - workspacesCache.timestamp) < CACHE_TTL
    ) {
      setWorkspaces(workspacesCache.workspaces);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWorkspaces();
      workspacesCache = {
        workspaces: data,
        userId: user.id,
        timestamp: now
      };
      setWorkspaces(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const selectWorkspace = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const workspace = await fetchWorkspace(id);
      setCurrentWorkspace(workspace);
      if (workspace) {
        const [membersData, activityData] = await Promise.all([
          fetchWorkspaceMembers(id),
          fetchWorkspaceActivity(id)
        ]);
        setMembers(membersData);
        setActivity(activityData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  }, []);

  const createNewWorkspace = useCallback(async (name: string, description?: string) => {
    setLoading(true);
    setError(null);
    try {
      const workspace = await createWorkspace(name, description);
      // Invalidate cache to force refresh
      invalidateWorkspaceCache();
      setWorkspaces(prev => [workspace, ...prev]);
      setCurrentWorkspace(workspace);
      return workspace;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCurrentWorkspace = useCallback(async (updates: Partial<Workspace>) => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      const updated = await updateWorkspace(currentWorkspace.id, updates);
      setCurrentWorkspace(updated);
      setWorkspaces(prev => prev.map(w => w.id === updated.id ? updated : w));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workspace');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  const deleteCurrentWorkspace = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      await deleteWorkspace(currentWorkspace.id);
      // Invalidate cache to force refresh
      invalidateWorkspaceCache();
      setWorkspaces(prev => prev.filter(w => w.id !== currentWorkspace.id));
      setCurrentWorkspace(null);
      setMembers([]);
      setActivity([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workspace');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  const loadMembers = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const data = await fetchWorkspaceMembers(currentWorkspace.id);
      setMembers(data);
    } catch (err) {
      secureLogger.error('db', 'Failed to load members', { error: err });
    }
  }, [currentWorkspace]);

  const invite = useCallback(async (email: string, role: WorkspaceRole) => {
    if (!currentWorkspace) throw new Error('No workspace selected');
    await inviteMember(currentWorkspace.id, email, role);
    await logActivity(currentWorkspace.id, 'invited', 'member', undefined, email);
  }, [currentWorkspace]);

  const updateRole = useCallback(async (memberId: string, role: WorkspaceRole) => {
    if (!currentWorkspace) return;
    await updateMemberRole(memberId, role);
    await loadMembers();
    await logActivity(currentWorkspace.id, 'updated_role', 'member', memberId);
  }, [currentWorkspace, loadMembers]);

  const remove = useCallback(async (memberId: string) => {
    if (!currentWorkspace) return;
    await removeMember(memberId);
    await loadMembers();
    await logActivity(currentWorkspace.id, 'removed', 'member', memberId);
  }, [currentWorkspace, loadMembers]);

  const loadActivity = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const data = await fetchWorkspaceActivity(currentWorkspace.id);
      setActivity(data);
    } catch (err) {
      secureLogger.error('db', 'Failed to load activity', { error: err });
    }
  }, [currentWorkspace]);

  const log = useCallback(async (action: string, resourceType: string, resourceId?: string, resourceName?: string) => {
    if (!currentWorkspace) return;
    await logActivity(currentWorkspace.id, action, resourceType, resourceId, resourceName);
  }, [currentWorkspace]);

  const assignProject = useCallback(async (projectId: string) => {
    if (!currentWorkspace) return;
    await assignProjectToWorkspace(projectId, currentWorkspace.id);
    await logActivity(currentWorkspace.id, 'added', 'project', projectId);
  }, [currentWorkspace]);

  const unassignProject = useCallback(async (projectId: string) => {
    if (!currentWorkspace) return;
    await assignProjectToWorkspace(projectId, null);
    await logActivity(currentWorkspace.id, 'removed', 'project', projectId);
  }, [currentWorkspace]);

  // Real-time subscriptions
  useEffect(() => {
    if (!currentWorkspace) return;

    const activityChannel = supabase
      .channel(`workspace-activity-${currentWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workspace_activity',
          filter: `workspace_id=eq.${currentWorkspace.id}`
        },
        (payload) => {
          setActivity(prev => [payload.new as WorkspaceActivity, ...prev]);
        }
      )
      .subscribe();

    const membersChannel = supabase
      .channel(`workspace-members-${currentWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
          filter: `workspace_id=eq.${currentWorkspace.id}`
        },
        () => {
          loadMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(activityChannel);
      supabase.removeChannel(membersChannel);
    };
  }, [currentWorkspace, loadMembers]);

  // Load workspaces on mount
  useEffect(() => {
    if (user) {
      loadWorkspaces();
    }
  }, [user, loadWorkspaces]);

  return {
    workspaces,
    currentWorkspace,
    members,
    activity,
    loading,
    error,
    loadWorkspaces,
    selectWorkspace,
    createNewWorkspace,
    updateCurrentWorkspace,
    deleteCurrentWorkspace,
    loadMembers,
    invite,
    updateRole,
    remove,
    loadActivity,
    log,
    assignProject,
    unassignProject
  };
}
