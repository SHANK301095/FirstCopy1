/**
 * Cloud Sync & Teams Page
 * Collaborative backtesting, result sharing, and team management
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Cloud, Users, Share2, Download,
  RefreshCw, CheckCircle2, XCircle, Clock, Settings,
  UserPlus, AlertTriangle, HardDrive, Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useCloudSync } from '@/hooks/useCloudSync';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function CloudSync() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { 
    syncState, 
    isAuthenticated, 
    projects, 
    strategies, 
    datasets, 
    results,
    syncAll 
  } = useCloudSync();

  // Local settings state
  const [cloudSettings, setCloudSettings] = useState({
    autoSync: true,
    syncInterval: 5,
    backupEnabled: true,
  });

  // Sync on mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      syncAll();
    }
  }, [isAuthenticated, syncAll]);

  function handleSyncNow() {
    if (!isAuthenticated) {
      toast({ 
        title: 'Not Logged In', 
        description: 'Please log in to sync your data to the cloud',
        variant: 'destructive'
      });
      return;
    }
    
    syncAll().then(() => {
      toast({ title: 'Sync Complete', description: 'All data synced successfully' });
    }).catch((err) => {
      toast({ 
        title: 'Sync Failed', 
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
    });
  }

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  const getSyncStatusIcon = () => {
    if (syncState.isSyncing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (syncState.error) return <XCircle className="h-4 w-4 text-destructive" />;
    if (syncState.isOnline) return <CheckCircle2 className="h-4 w-4 text-profit" />;
    return <XCircle className="h-4 w-4 text-muted-foreground" />;
  };

  const getSyncStatusText = () => {
    if (syncState.isSyncing) return 'Syncing...';
    if (syncState.error) return 'Sync error';
    if (syncState.isOnline) return 'Synced';
    return 'Offline';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Cloud className="h-8 w-8 text-primary" />
              Cloud Sync & Teams
            </h1>
            <Badge variant="outline" className="text-warning border-warning bg-warning/10">
              <Clock className="h-3 w-3 mr-1" />
              Coming Soon
            </Badge>
          </div>
          <p className="text-muted-foreground">Team collaboration and cloud sharing features are in development</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            {getSyncStatusIcon()}
            <span className="text-muted-foreground">{getSyncStatusText()}</span>
          </div>
          <Button onClick={handleSyncNow} disabled={syncState.isSyncing} className="gap-2">
            <RefreshCw className={cn('h-4 w-4', syncState.isSyncing && 'animate-spin')} />
            Sync Now
          </Button>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-warning/10">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Team Features Coming Soon</h3>
              <p className="text-muted-foreground mb-4">
                Cloud synchronization, team collaboration, and result sharing features are currently under development. 
                For now, your data is stored locally in your browser. Use the backup feature below to export your data.
              </p>
              <Button variant="outline" asChild className="gap-2">
                <Link to="/settings">
                  <HardDrive className="h-4 w-4" />
                  Export Backup Now
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">1</div>
                <div className="text-xs text-muted-foreground">Team Members</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{projects.length + strategies.length + datasets.length}</div>
                <div className="text-xs text-muted-foreground">Cloud Resources</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{isAuthenticated ? 'Cloud' : 'Local'}</div>
                <div className="text-xs text-muted-foreground">Storage Mode</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold font-mono">
                  {syncState.lastSync?.toLocaleTimeString() || '--:--'}
                </div>
                <div className="text-xs text-muted-foreground">Last Synced</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="team" className="space-y-4">
        <TabsList>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="shared">Shared Resources</TabsTrigger>
          <TabsTrigger value="settings">Local Settings</TabsTrigger>
        </TabsList>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          {/* Invite Member - Disabled */}
          <Card className="opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Invite Team Member
                <Badge variant="outline" className="text-warning border-warning ml-2">Coming Soon</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                <Input 
                  placeholder="Email address"
                  disabled
                  className="flex-1 min-w-[200px]"
                />
                <Select disabled>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button disabled className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Invite
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Team invitations will be available when cloud sync launches
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          {/* Current User */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members (1)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-profit" />
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {displayName}
                        <Badge variant="default" className="text-xs">Owner</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user?.email || 'Local User'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shared Resources Tab */}
        <TabsContent value="shared" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Shared Resources
                <Badge variant="outline" className="text-warning border-warning ml-2">Coming Soon</Badge>
              </CardTitle>
              <CardDescription>Share backtests, strategies, and reports with your team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                  <Share2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">No Shared Resources Yet</h3>
                <p className="text-muted-foreground max-w-md mb-4">
                  Resource sharing will be available when cloud synchronization launches.
                  For now, use the Export feature to share your results manually.
                </p>
                <Button variant="outline" asChild className="gap-2">
                  <Link to="/settings">
                    <Download className="h-4 w-4" />
                    Export Data
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Local Storage Settings
              </CardTitle>
              <CardDescription>Configure how your data is stored locally</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Save</Label>
                  <p className="text-sm text-muted-foreground">Automatically save changes locally</p>
                </div>
                <Switch 
                  checked={cloudSettings.autoSync}
                  onCheckedChange={(v) => setCloudSettings(s => ({ ...s, autoSync: v }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Save Interval (minutes)</Label>
                  <p className="text-sm text-muted-foreground">How often to auto-save</p>
                </div>
                <Select 
                  value={String(cloudSettings.syncInterval)}
                  onValueChange={(v) => setCloudSettings(s => ({ ...s, syncInterval: Number(v) }))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 min</SelectItem>
                    <SelectItem value="5">5 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Local Backups</Label>
                  <p className="text-sm text-muted-foreground">Create periodic backup snapshots</p>
                </div>
                <Switch 
                  checked={cloudSettings.backupEnabled}
                  onCheckedChange={(v) => setCloudSettings(s => ({ ...s, backupEnabled: v }))}
                />
              </div>

              <div className="pt-4 border-t">
                <Button variant="outline" asChild className="gap-2 w-full">
                  <Link to="/settings">
                    <HardDrive className="h-4 w-4" />
                    Manage Backups in Settings
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
