import React from 'react';
import { Circle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PresenceUser } from '@/hooks/useRealtimePresence';
import { cn } from '@/lib/utils';

interface OnlineUsersProps {
  users: PresenceUser[];
  maxDisplay?: number;
  className?: string;
}

export function OnlineUsers({ users, maxDisplay = 5, className }: OnlineUsersProps) {
  if (users.length === 0) return null;

  const displayUsers = users.slice(0, maxDisplay);
  const remainingCount = users.length - maxDisplay;

  return (
    <TooltipProvider>
      <div className={cn('flex items-center -space-x-2', className)}>
        {displayUsers.map((user) => (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <div className="relative">
                <Avatar className="h-6 w-6 border-[1.5px] border-background">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName || 'User'} />
                  <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                    {(user.displayName || user.email || 'U').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Circle className="absolute -bottom-0.5 -right-0.5 h-2 w-2 fill-green-500 text-green-500" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <div className="font-medium">{user.displayName || user.email}</div>
              {user.currentPage && (
                <div className="text-muted-foreground">
                  Viewing: {user.currentPage}
                </div>
              )}
              {user.currentResource && (
                <div className="text-muted-foreground">
                  {user.currentResource.type}: {user.currentResource.name || user.currentResource.id}
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
        
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-background bg-muted text-[10px] font-medium">
                +{remainingCount}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="space-y-1">
                {users.slice(maxDisplay).map((user) => (
                  <div key={user.id} className="text-xs">
                    {user.displayName || user.email}
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
