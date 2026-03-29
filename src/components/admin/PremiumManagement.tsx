import { useState, useEffect, useMemo } from 'react';
import { Crown, Search, UserPlus, UserMinus, Sparkles, Check, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

interface UserProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

interface PremiumUser {
  user_id: string;
  profile: UserProfile | null;
  granted_at: string | null;
}

export function PremiumManagement() {
  const [isLoading, setIsLoading] = useState(true);
  const [premiumUsers, setPremiumUsers] = useState<PremiumUser[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [grantDialog, setGrantDialog] = useState<{ open: boolean; userId: string; name: string }>({ open: false, userId: '', name: '' });
  const [revokeDialog, setRevokeDialog] = useState<{ open: boolean; userId: string; name: string }>({ open: false, userId: '', name: '' });
  const [isGranting, setIsGranting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get premium roles
      const { data: premiumRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'premium' as any);

      const premiumUserIds = premiumRoles?.map(r => r.user_id) || [];

      // Get all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, created_at')
        .order('created_at', { ascending: false });

      setAllUsers(profiles || []);

      // Map premium users with profiles
      const premiumWithProfiles = premiumUserIds.map(userId => ({
        user_id: userId,
        profile: profiles?.find(p => p.id === userId) || null,
        granted_at: null, // We don't track this yet
      }));

      setPremiumUsers(premiumWithProfiles);
    } catch (error) {
      console.error('Error loading premium data:', error);
      toast.error('Failed to load premium users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGrantPremium = async (userId: string) => {
    setIsGranting(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'premium' as any });

      if (error && error.code !== '23505') throw error;

      await loadData();
      toast.success('Premium access granted!');
      setGrantDialog({ open: false, userId: '', name: '' });
    } catch (error) {
      console.error('Error granting premium:', error);
      toast.error('Failed to grant premium access');
    } finally {
      setIsGranting(false);
    }
  };

  const handleRevokePremium = async (userId: string) => {
    setIsRevoking(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'premium' as any);

      if (error) throw error;

      await loadData();
      toast.success('Premium access revoked');
      setRevokeDialog({ open: false, userId: '', name: '' });
    } catch (error) {
      console.error('Error revoking premium:', error);
      toast.error('Failed to revoke premium access');
    } finally {
      setIsRevoking(false);
    }
  };

  // Non-premium users for granting
  const nonPremiumUsers = useMemo(() => {
    const premiumIds = new Set(premiumUsers.map(p => p.user_id));
    let users = allUsers.filter(u => !premiumIds.has(u.id));

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      users = users.filter(u =>
        u.display_name?.toLowerCase().includes(query) ||
        u.username?.toLowerCase().includes(query) ||
        u.id.toLowerCase().includes(query)
      );
    }

    return users.slice(0, 50); // Limit for performance
  }, [allUsers, premiumUsers, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold">{premiumUsers.length}</p>
                <p className="text-sm text-muted-foreground">Premium Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{allUsers.length}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">
                  {allUsers.length > 0 ? Math.round((premiumUsers.length / allUsers.length) * 100) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Premium Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current Premium Users */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Premium Users
                </CardTitle>
                <CardDescription>{premiumUsers.length} users with premium access</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              {premiumUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Crown className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">No premium users yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Grant premium access to users on the right</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {premiumUsers.map((pu) => (
                    <div
                      key={pu.user_id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                            {(pu.profile?.display_name || pu.profile?.username || 'U')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {pu.profile?.display_name || pu.profile?.username || 'Unknown User'}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {pu.user_id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setRevokeDialog({
                          open: true,
                          userId: pu.user_id,
                          name: pu.profile?.display_name || pu.profile?.username || 'this user'
                        })}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Grant Premium */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Grant Premium Access
            </CardTitle>
            <CardDescription>Search users to grant premium access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, username, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <ScrollArea className="h-[300px]">
                {nonPremiumUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'No users found' : 'Search for users to grant premium'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {nonPremiumUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>
                              {(user.display_name || user.username || 'U')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {user.display_name || user.username || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Joined {user.created_at ? formatDistanceToNow(new Date(user.created_at), { addSuffix: true }) : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 hover:border-amber-500/30"
                          onClick={() => setGrantDialog({
                            open: true,
                            userId: user.id,
                            name: user.display_name || user.username || 'this user'
                          })}
                        >
                          <Crown className="h-4 w-4 mr-1" />
                          Grant
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Premium Benefits Info */}
      <Card className="bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-rose-500/5 border-amber-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Premium Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>Unlimited AI generations</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>Priority processing</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>All future AI features</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>Premium support</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grant Dialog */}
      <AlertDialog open={grantDialog.open} onOpenChange={(open) => setGrantDialog({ ...grantDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Grant Premium Access
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to grant premium access to <strong>{grantDialog.name}</strong>?
              They will get unlimited AI generations and all premium features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isGranting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleGrantPremium(grantDialog.userId)}
              disabled={isGranting}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              {isGranting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
              Grant Premium
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Dialog */}
      <AlertDialog open={revokeDialog.open} onOpenChange={(open) => setRevokeDialog({ ...revokeDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Premium Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke premium access from <strong>{revokeDialog.name}</strong>?
              They will be limited to 3 AI generations per day.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleRevokePremium(revokeDialog.userId)}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserMinus className="h-4 w-4 mr-2" />}
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
