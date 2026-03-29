import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Activity, 
  UserPlus, 
  UserMinus, 
  Settings, 
  FileText, 
  FolderPlus,
  Edit,
  Trash2,
  Play
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WorkspaceActivity } from '@/lib/workspaceService';
import { cn } from '@/lib/utils';

interface ActivityFeedProps {
  activities: WorkspaceActivity[];
  className?: string;
  maxHeight?: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  invited: <UserPlus className="h-4 w-4 text-green-500" />,
  removed: <UserMinus className="h-4 w-4 text-red-500" />,
  updated_role: <Settings className="h-4 w-4 text-blue-500" />,
  created: <FolderPlus className="h-4 w-4 text-green-500" />,
  updated: <Edit className="h-4 w-4 text-yellow-500" />,
  deleted: <Trash2 className="h-4 w-4 text-red-500" />,
  added: <FileText className="h-4 w-4 text-blue-500" />,
  ran: <Play className="h-4 w-4 text-purple-500" />,
};

function getActionDescription(activity: WorkspaceActivity): string {
  const { action, resource_type, resource_name } = activity;
  const name = resource_name || resource_type;
  
  switch (action) {
    case 'invited':
      return `invited ${name} to the workspace`;
    case 'removed':
      return `removed ${name} from the workspace`;
    case 'updated_role':
      return `updated ${name}'s role`;
    case 'created':
      return `created ${resource_type} "${name}"`;
    case 'updated':
      return `updated ${resource_type} "${name}"`;
    case 'deleted':
      return `deleted ${resource_type} "${name}"`;
    case 'added':
      return `added ${resource_type} to workspace`;
    case 'ran':
      return `ran backtest on ${name}`;
    default:
      return `${action} ${resource_type}`;
  }
}

export function ActivityFeed({ activities, className, maxHeight = '400px' }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 text-muted-foreground', className)}>
        <Activity className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className={className} style={{ maxHeight }}>
      <div className="space-y-4 pr-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={activity.profile?.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {(activity.profile?.display_name || 'U').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {actionIcons[activity.action] || <Activity className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm">
                  <span className="font-medium">
                    {activity.profile?.display_name || 'Unknown user'}
                  </span>{' '}
                  <span className="text-muted-foreground">
                    {getActionDescription(activity)}
                  </span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
