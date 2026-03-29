import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  Activity, 
  Settings, 
  Trash2,
  ArrowLeft,
  Save
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useAuth } from '@/contexts/AuthContext';
import { MembersList } from '@/components/workspace/MembersList';
import { InviteMemberDialog } from '@/components/workspace/InviteMemberDialog';
import { ActivityFeed } from '@/components/workspace/ActivityFeed';
import { useToast } from '@/hooks/use-toast';
import { PageTitle } from '@/components/ui/PageTitle';

export default function WorkspaceSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    currentWorkspace, 
    members, 
    activity,
    updateCurrentWorkspace, 
    deleteCurrentWorkspace,
    invite,
    updateRole,
    remove,
    loading 
  } = useWorkspace();

  const [name, setName] = useState(currentWorkspace?.name || '');
  const [description, setDescription] = useState(currentWorkspace?.description || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  React.useEffect(() => {
    if (currentWorkspace) {
      setName(currentWorkspace.name);
      setDescription(currentWorkspace.description || '');
    }
  }, [currentWorkspace]);

  if (!currentWorkspace) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
          <Building2 className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg">No workspace selected</p>
          <Button variant="link" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </AppLayout>
    );
  }

  const isOwner = currentWorkspace.owner_id === user?.id;
  const currentUserRole = isOwner ? 'owner' : members.find(m => m.user_id === user?.id)?.role || null;
  const canEdit = currentUserRole === 'owner' || currentUserRole === 'admin';

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCurrentWorkspace({ name, description });
      toast({
        title: 'Workspace updated',
        description: 'Your changes have been saved.',
      });
    } catch (error) {
      toast({
        title: 'Failed to update workspace',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCurrentWorkspace();
      toast({
        title: 'Workspace deleted',
        description: 'The workspace has been permanently deleted.',
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Failed to delete workspace',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <PageTitle 
            title="Workspace Settings" 
            subtitle={currentWorkspace.name}
          />
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general" className="gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              Members ({members.length})
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Workspace Details</CardTitle>
                <CardDescription>
                  Update your workspace name and description
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Name</Label>
                  <Input
                    id="workspace-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workspace-description">Description</Label>
                  <Textarea
                    id="workspace-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!canEdit}
                    rows={3}
                  />
                </div>
                {canEdit && (
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {isOwner && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>
                    Permanently delete this workspace and all its data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete Workspace
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the workspace
                          "{currentWorkspace.name}" and remove all members. Projects will be unassigned
                          but not deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDelete} 
                          disabled={deleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleting ? 'Deleting...' : 'Delete Workspace'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    Manage who has access to this workspace
                  </CardDescription>
                </div>
                {canEdit && (
                  <InviteMemberDialog onInvite={invite} />
                )}
              </CardHeader>
              <CardContent>
                <MembersList
                  members={members}
                  ownerId={currentWorkspace.owner_id}
                  currentUserRole={currentUserRole}
                  onUpdateRole={updateRole}
                  onRemove={remove}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  See what's happening in your workspace
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityFeed activities={activity} maxHeight="500px" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
