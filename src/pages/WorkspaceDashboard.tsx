import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  FolderOpen, 
  Activity, 
  Clock, 
  Plus, 
  Settings, 
  UserPlus,
  TrendingUp,
  FileText,
  Play,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageTitle } from '@/components/ui/PageTitle';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useRealtimePresence } from '@/hooks/useRealtimePresence';
import { OnlineUsers } from '@/components/workspace/OnlineUsers';
import { ActivityFeed } from '@/components/workspace/ActivityFeed';
import { InviteMemberDialog } from '@/components/workspace/InviteMemberDialog';
import { formatDistanceToNow } from 'date-fns';

export default function WorkspaceDashboard() {
  const navigate = useNavigate();
  const { 
    currentWorkspace, 
    workspaces, 
    members, 
    activity, 
    loading,
    loadMembers,
    loadActivity,
    invite
  } = useWorkspace();
  
  const { onlineUsers } = useRealtimePresence(currentWorkspace?.id || null);

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadMembers();
      loadActivity();
    }
  }, [currentWorkspace?.id, loadMembers, loadActivity]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Workspace Selected</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Create or select a workspace to start collaborating with your team.
        </p>
        <Button onClick={() => navigate('/workspace-settings')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Workspace
        </Button>
      </div>
    );
  }

  const stats = [
    {
      label: 'Team Members',
      value: members.length,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Online Now',
      value: onlineUsers.length,
      icon: Activity,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Recent Activities',
      value: activity.length,
      icon: Clock,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Workspaces',
      value: workspaces.length,
      icon: FolderOpen,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  const quickActions = [
    {
      label: 'New Strategy',
      description: 'Create a new trading strategy',
      icon: FileText,
      path: '/strategies',
      color: 'text-blue-500',
    },
    {
      label: 'Run Backtest',
      description: 'Start a new backtest run',
      icon: Play,
      path: '/',
      color: 'text-green-500',
    },
    {
      label: 'View Analytics',
      description: 'Analyze your performance',
      icon: TrendingUp,
      path: '/analytics',
      color: 'text-orange-500',
    },
    {
      label: 'Invite Member',
      description: 'Add team members',
      icon: UserPlus,
      path: '/workspace-settings',
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{currentWorkspace.name}</h1>
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Workspace
            </Badge>
          </div>
          {currentWorkspace.description && (
            <p className="text-muted-foreground mt-1">{currentWorkspace.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <OnlineUsers users={onlineUsers} maxDisplay={5} />
          <InviteMemberDialog onInvite={invite} />
          <Button variant="outline" size="sm" asChild>
            <Link to="/workspace-settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
       <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${stat.bgColor}`} />
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Get started with common tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.path}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent/50 hover:border-primary/20 transition-all group"
              >
                <div className="p-2 rounded-lg bg-muted">
                  <action.icon className={`h-4 w-4 ${action.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {action.description}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Team Members
              </CardTitle>
              <CardDescription>
                {members.length} member{members.length !== 1 ? 's' : ''} in workspace
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/workspace-settings">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.slice(0, 5).map((member) => {
                const isOnline = onlineUsers.some(u => u.id === member.user_id);
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {(member.profile?.display_name || 'U').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {member.profile?.display_name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {member.role}
                      </p>
                    </div>
                    {isOnline && (
                      <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500">
                        Online
                      </Badge>
                    )}
                  </div>
                );
              })}
              {members.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No team members yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest updates from your team
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/workspace-settings">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activity.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="p-1.5 rounded-lg bg-muted mt-0.5">
                    <Activity className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{item.action}</span>
                      {item.resource_name && (
                        <span className="text-muted-foreground"> on {item.resource_name}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
              {activity.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>
            Complete activity history for {currentWorkspace.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed activities={activity} />
        </CardContent>
      </Card>
    </div>
  );
}
