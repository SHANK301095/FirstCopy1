import React, { useState } from 'react';
import { MoreVertical, Shield, Edit, Eye, Crown, UserMinus, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { WorkspaceMember, WorkspaceRole } from '@/lib/workspaceService';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface MembersListProps {
  members: WorkspaceMember[];
  ownerId: string;
  currentUserRole: WorkspaceRole | null;
  onUpdateRole: (memberId: string, role: WorkspaceRole) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
  className?: string;
}

const roleIcons: Record<WorkspaceRole, React.ReactNode> = {
  owner: <Crown className="h-4 w-4 text-yellow-500" />,
  admin: <Shield className="h-4 w-4 text-blue-500" />,
  editor: <Edit className="h-4 w-4 text-green-500" />,
  viewer: <Eye className="h-4 w-4 text-muted-foreground" />,
};

const roleLabels: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

export function MembersList({ 
  members, 
  ownerId, 
  currentUserRole,
  onUpdateRole, 
  onRemove, 
  className 
}: MembersListProps) {
  const { user } = useAuth();
  const [removingMember, setRemovingMember] = useState<WorkspaceMember | null>(null);
  const [loading, setLoading] = useState(false);

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  const handleRoleChange = async (memberId: string, role: WorkspaceRole) => {
    setLoading(true);
    try {
      await onUpdateRole(memberId, role);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!removingMember) return;
    setLoading(true);
    try {
      await onRemove(removingMember.id);
    } finally {
      setLoading(false);
      setRemovingMember(null);
    }
  };

  return (
    <>
      <div className={cn('space-y-2', className)}>
        {members.map((member) => {
          const isOwner = member.user_id === ownerId;
          const isSelf = member.user_id === user?.id;
          const isPending = !member.accepted_at;

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.profile?.avatar_url || undefined} />
                <AvatarFallback>
                  {(member.profile?.display_name || 'U').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {member.profile?.display_name || 'Unknown'}
                  </span>
                  {isSelf && (
                    <Badge variant="outline" className="text-xs">You</Badge>
                  )}
                  {isPending && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Mail className="h-3 w-3" />
                      Pending
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  {roleIcons[isOwner ? 'owner' : member.role]}
                  <span>{roleLabels[isOwner ? 'owner' : member.role]}</span>
                </div>
              </div>

              {canManageMembers && !isOwner && !isSelf && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={loading}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'admin')}>
                      <Shield className="h-4 w-4 mr-2 text-blue-500" />
                      Make Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'editor')}>
                      <Edit className="h-4 w-4 mr-2 text-green-500" />
                      Make Editor
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'viewer')}>
                      <Eye className="h-4 w-4 mr-2" />
                      Make Viewer
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setRemovingMember(member)}
                      className="text-destructive"
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove Member
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removingMember?.profile?.display_name || 'this member'} from the workspace?
              They will lose access to all workspace resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={loading}>
              {loading ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
