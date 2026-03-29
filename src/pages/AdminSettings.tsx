import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  Shield, Settings, Save, Loader2, AlertTriangle, Users, Phone, ExternalLink,
  BarChart3, Download, Search, TrendingUp, UserCheck, Clock, Activity,
  ShieldCheck, Mail, Calendar, RefreshCw, FileDown, Trash2, UserPlus, UserMinus,
  Crown, Eye, EyeOff, MoreHorizontal, Copy, Check, XCircle, AlertCircle,
  Database, Server, Zap, Globe, Lock, Unlock, ChevronDown, Filter,
  Megaphone, ToggleLeft, Store, HeartPulse, Sparkles, MessageSquare, HardDrive
} from 'lucide-react';
import { SystemHealthMonitor } from '@/components/admin/SystemHealthMonitor';
import { SystemAnnouncements } from '@/components/admin/SystemAnnouncements';
import { FeatureFlags } from '@/components/admin/FeatureFlags';
import { MarketplaceModeration } from '@/components/admin/MarketplaceModeration';
import { PremiumManagement } from '@/components/admin/PremiumManagement';
import { PremiumRequestsInbox } from '@/components/admin/PremiumRequestsInbox';
import { AIUsageAnalytics } from '@/components/admin/AIUsageAnalytics';
import { UserDetailsModal } from '@/components/admin/UserDetailsModal';
import { SharedDataManager } from '@/components/admin/SharedDataManager';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { DataUploadWizard } from '@/components/admin/DataUploadWizard';
import { ActivityLogViewer } from '@/components/admin/ActivityLogViewer';
import { BulkDataManager } from '@/components/admin/BulkDataManager';
import { AdminRealtimeNotifications } from '@/components/admin/AdminRealtimeNotifications';
import { AdminAnalyticsCharts } from '@/components/admin/AdminAnalyticsCharts';
import { CopilotTrainingManager } from '@/components/admin/CopilotTrainingManager';
import { TestimonialsManager } from '@/components/admin/TestimonialsManager';
import { AffiliatesManager } from '@/components/admin/AffiliatesManager';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';
import { AdminConfigCenter } from '@/components/admin/AdminConfigCenter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, startOfDay, formatDistanceToNow } from 'date-fns';

interface WaitlistEntry {
  id: string;
  phone: string | null;
  email: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_public: boolean;
  created_at: string | null;
}

interface UserPrivateData {
  user_id: string;
  phone: string | null;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'user';
}

interface DailySignup {
  date: string;
  count: number;
}

export default function AdminSettings() {
  const { user } = useAuth();
  // Admin access is enforced by AdminRoute wrapper — no need to re-check here
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Data states
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [userPrivateData, setUserPrivateData] = useState<UserPrivateData[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Filter states
  const [waitlistSearch, setWaitlistSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'admin' | 'user'>('all');
  
  // Selection states
  const [selectedWaitlist, setSelectedWaitlist] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [grantAdminDialog, setGrantAdminDialog] = useState<{open: boolean; userId: string; name: string}>({open: false, userId: '', name: ''});
  const [revokeAdminDialog, setRevokeAdminDialog] = useState<{open: boolean; userId: string; name: string}>({open: false, userId: '', name: ''});
  const [deleteWaitlistDialog, setDeleteWaitlistDialog] = useState<{open: boolean; ids: string[]}>({open: false, ids: []});
  const [userDetailsModal, setUserDetailsModal] = useState<{open: boolean; user: UserProfile | null}>({open: false, user: null});
  
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;

    // Admin access already verified by AdminRoute — load data directly
    const { data: settings } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'sentinel_webhook_url')
      .maybeSingle();

    if (settings?.value) setWebhookUrl(settings.value);

    const { data: waitlist } = await supabase
      .from('sentinel_waitlist')
      .select('id, phone, email, created_at')
      .order('created_at', { ascending: false });
    setWaitlistEntries(waitlist || []);

    const { data: profiles, count } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, is_public, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(500);
    setUserProfiles(profiles || []);
    setTotalUsers(count || 0);
    
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    setUserRoles((roles || []) as UserRole[]);
    
    const { data: privateData } = await supabase.from('profile_private_data').select('user_id, phone');
    setUserPrivateData((privateData || []) as UserPrivateData[]);

    setIsLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    toast.success('Data refreshed');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'sentinel_webhook_url', value: webhookUrl, updated_at: new Date().toISOString(), updated_by: user?.id }, { onConflict: 'key' });
      if (error) throw error;
      toast.success('Settings saved successfully!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const getUserRole = (userId: string): 'admin' | 'user' => {
    return userRoles.find(r => r.user_id === userId && r.role === 'admin') ? 'admin' : 'user';
  };

  const getUserPhone = (userId: string): string | null => {
    return userPrivateData.find(p => p.user_id === userId)?.phone || null;
  };

  const handleGrantAdmin = async (userId: string) => {
    try {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' });
      if (error && error.code !== '23505') throw error;
      await supabase.rpc('log_audit_event', {
        p_action: 'role_change',
        p_entity_type: 'user',
        p_entity_id: userId,
        p_after_data: { role: 'admin', action: 'grant' },
      });
      setUserRoles(prev => [...prev.filter(r => !(r.user_id === userId && r.role === 'admin')), { user_id: userId, role: 'admin' }]);
      toast.success('Admin role granted');
      setGrantAdminDialog({open: false, userId: '', name: ''});
    } catch {
      toast.error('Failed to grant admin role');
    }
  };

  const handleRevokeAdmin = async (userId: string) => {
    if (userId === user?.id) { toast.error("You can't revoke your own admin access"); return; }
    try {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
      if (error) throw error;
      await supabase.rpc('log_audit_event', {
        p_action: 'role_change',
        p_entity_type: 'user',
        p_entity_id: userId,
        p_after_data: { role: 'admin', action: 'revoke' },
      });
      setUserRoles(prev => prev.filter(r => !(r.user_id === userId && r.role === 'admin')));
      toast.success('Admin role revoked');
      setRevokeAdminDialog({open: false, userId: '', name: ''});
    } catch {
      toast.error('Failed to revoke admin role');
    }
  };

  const handleDeleteWaitlist = async (ids: string[]) => {
    try {
      const { error } = await supabase.from('sentinel_waitlist').delete().in('id', ids);
      if (error) throw error;
      setWaitlistEntries(prev => prev.filter(e => !ids.includes(e.id)));
      setSelectedWaitlist(new Set());
      toast.success(`${ids.length} ${ids.length === 1 ? 'entry' : 'entries'} deleted`);
      setDeleteWaitlistDialog({open: false, ids: []});
    } catch {
      toast.error('Failed to delete entries');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportWaitlistCSV = () => {
    const headers = ['Phone', 'Email', 'Signed Up'];
    const rows = waitlistEntries.map(e => [e.phone || '', e.email || '', format(new Date(e.created_at), 'yyyy-MM-dd HH:mm')]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `sentinel-waitlist-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Waitlist exported!');
  };

  const exportUsersCSV = () => {
    const headers = ['ID', 'Display Name', 'Username', 'Role', 'Public Profile', 'Joined'];
    const rows = userProfiles.map(u => [u.id, u.display_name || '', u.username || '', getUserRole(u.id), u.is_public ? 'Yes' : 'No', u.created_at ? format(new Date(u.created_at), 'yyyy-MM-dd HH:mm') : '']);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `users-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Users exported!');
  };

  const filteredWaitlist = useMemo(() => {
    if (!waitlistSearch) return waitlistEntries;
    const search = waitlistSearch.toLowerCase();
    return waitlistEntries.filter(e => e.phone?.toLowerCase().includes(search) || e.email?.toLowerCase().includes(search));
  }, [waitlistEntries, waitlistSearch]);

  const filteredUsers = useMemo(() => {
    let users = userProfiles;
    if (userFilter === 'admin') users = users.filter(u => getUserRole(u.id) === 'admin');
    else if (userFilter === 'user') users = users.filter(u => getUserRole(u.id) === 'user');
    if (userSearch) {
      const search = userSearch.toLowerCase();
      users = users.filter(u => u.display_name?.toLowerCase().includes(search) || u.username?.toLowerCase().includes(search) || u.id.toLowerCase().includes(search));
    }
    return users;
  }, [userProfiles, userSearch, userFilter, userRoles]);

  const analytics = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const last7Days = subDays(today, 7);
    const last30Days = subDays(today, 30);
    const todaySignups = waitlistEntries.filter(e => new Date(e.created_at) >= today).length;
    const last7DaysSignups = waitlistEntries.filter(e => new Date(e.created_at) >= last7Days).length;
    const previousWeek = waitlistEntries.filter(e => { const c = new Date(e.created_at); return c >= subDays(last7Days, 7) && c < last7Days; }).length;
    const growthRate = previousWeek > 0 ? Math.round(((last7DaysSignups - previousWeek) / previousWeek) * 100) : last7DaysSignups > 0 ? 100 : 0;
    const todayUsers = userProfiles.filter(u => u.created_at && new Date(u.created_at) >= today).length;
    const adminCount = userRoles.filter(r => r.role === 'admin').length;
    return { total: waitlistEntries.length, todaySignups, growthRate, freeSpotsLeft: Math.max(0, 100 - waitlistEntries.length), todayUsers, adminCount };
  }, [waitlistEntries, userProfiles, userRoles]);

  const toggleWaitlistSelection = (id: string) => {
    setSelectedWaitlist(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  };

  const selectAllWaitlist = () => {
    setSelectedWaitlist(prev => prev.size === filteredWaitlist.length ? new Set() : new Set(filteredWaitlist.map(e => e.id)));
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-64" /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  // Auth + admin check handled by ProtectedRoute + AdminRoute wrappers

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AdminOverview onNavigateTab={setActiveTab} />;
      case 'analytics':
        return <AdminAnalyticsCharts />;
      case 'audit':
        return <AuditLogViewer />;
      case 'users':
        return renderUsersTab();
      case 'waitlist':
        return renderWaitlistTab();
      case 'roles':
        return renderRolesTab();
      case 'premium':
        return <PremiumManagement />;
      case 'requests':
        return <PremiumRequestsInbox />;
      case 'flags':
        return <FeatureFlags />;
      case 'config':
        return <AdminConfigCenter />;
      case 'announcements':
        return <SystemAnnouncements />;
      case 'moderation':
        return <MarketplaceModeration />;
      case 'testimonials':
        return <TestimonialsManager />;
      case 'affiliates':
        return <AffiliatesManager />;
      case 'market-data':
        return (
          <div className="space-y-6">
            <DataUploadWizard onComplete={handleRefresh} />
            <BulkDataManager />
            <SharedDataManager />
          </div>
        );
      case 'ai-usage':
        return <AIUsageAnalytics />;
      case 'copilot':
        return <CopilotTrainingManager />;
      case 'health':
        return <SystemHealthMonitor />;
      case 'logs':
        return <ActivityLogViewer />;
      case 'settings':
        return renderSettingsTab();
      default:
        return <AdminOverview onNavigateTab={setActiveTab} />;
    }
  };

  const renderWaitlistTab = () => (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">Sentinel Waitlist {selectedWaitlist.size > 0 && <Badge variant="default">{selectedWaitlist.size} selected</Badge>}</CardTitle>
            <CardDescription>{waitlistEntries.length} entries total</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {selectedWaitlist.size > 0 && (
              <Button variant="destructive" size="sm" onClick={() => setDeleteWaitlistDialog({open: true, ids: Array.from(selectedWaitlist)})}>
                <Trash2 className="h-4 w-4 mr-2" />Delete ({selectedWaitlist.size})
              </Button>
            )}
            <Button onClick={exportWaitlistCSV} variant="outline" size="sm"><FileDown className="h-4 w-4 mr-2" />Export CSV</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by phone or email..." value={waitlistSearch} onChange={(e) => setWaitlistSearch(e.target.value)} className="pl-10" />
          </div>
        </div>
        <div className="border rounded-xl overflow-hidden">
          <ScrollArea className="h-[500px]">
            <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <TableRow>
                  <TableHead className="w-12"><input type="checkbox" checked={selectedWaitlist.size === filteredWaitlist.length && filteredWaitlist.length > 0} onChange={selectAllWaitlist} className="rounded border-muted-foreground/50" /></TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="w-20">Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Signed Up</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWaitlist.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12"><div className="flex flex-col items-center gap-2 text-muted-foreground"><Users className="h-8 w-8" /><p>No entries found</p></div></TableCell></TableRow>
                ) : (
                  filteredWaitlist.map((entry) => (
                    <TableRow key={entry.id} className={selectedWaitlist.has(entry.id) ? 'bg-primary/5' : ''}>
                      <TableCell><input type="checkbox" checked={selectedWaitlist.has(entry.id)} onChange={() => toggleWaitlistSelection(entry.id)} className="rounded border-muted-foreground/50" /></TableCell>
                      <TableCell className="font-mono text-sm truncate max-w-[150px]">{entry.phone || entry.email || 'N/A'}</TableCell>
                      <TableCell><Badge variant={entry.phone ? 'default' : 'secondary'} className="gap-1">{entry.phone ? <Phone className="h-3 w-3" /> : <Mail className="h-3 w-3" />}{entry.phone ? 'Phone' : entry.email ? 'Email' : 'Unknown'}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden sm:table-cell"><span title={format(new Date(entry.created_at), 'PPpp')}>{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</span></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border z-50">
                            <DropdownMenuItem onClick={() => copyToClipboard(entry.phone || entry.email || '', entry.id)}>{copiedId === entry.id ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}Copy</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteWaitlistDialog({open: true, ids: [entry.id]})}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );

  const renderUsersTab = () => (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div><CardTitle>Registered Users</CardTitle><CardDescription>{totalUsers} users in the platform</CardDescription></div>
          <Button onClick={exportUsersCSV} variant="outline" size="sm"><FileDown className="h-4 w-4 mr-2" />Export Users</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, username or ID..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={userFilter} onValueChange={(v: 'all' | 'admin' | 'user') => setUserFilter(v)}>
            <SelectTrigger className="w-[140px]"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="admin">Admins Only</SelectItem>
              <SelectItem value="user">Users Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="border rounded-xl overflow-hidden">
          <ScrollArea className="h-[500px]">
            <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden sm:table-cell">Visibility</TableHead>
                  <TableHead className="hidden sm:table-cell">Joined</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12"><div className="flex flex-col items-center gap-2 text-muted-foreground"><Users className="h-8 w-8" /><p>No users found</p></div></TableCell></TableRow>
                ) : (
                  filteredUsers.map((profile) => {
                    const role = getUserRole(profile.id);
                    const phone = getUserPhone(profile.id);
                    const isCurrentUser = profile.id === user?.id;
                    return (
                      <TableRow key={profile.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setUserDetailsModal({open: true, user: profile})}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9"><AvatarFallback className={role === 'admin' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}>{profile.display_name?.charAt(0).toUpperCase() || '?'}</AvatarFallback></Avatar>
                            <div>
                              <p className="font-medium text-sm flex items-center gap-2">{profile.display_name || 'Unnamed'}{isCurrentUser && <Badge variant="outline" className="text-[10px]">You</Badge>}</p>
                              <p className="text-xs text-muted-foreground">@{profile.username || profile.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {phone ? <span className="text-xs font-mono">{phone}</span> : <span className="text-xs text-muted-foreground">No phone</span>}
                        </TableCell>
                        <TableCell><Badge variant={role === 'admin' ? 'default' : 'secondary'} className="gap-1">{role === 'admin' ? <Crown className="h-3 w-3" /> : <Users className="h-3 w-3" />}{role === 'admin' ? 'Admin' : 'User'}</Badge></TableCell>
                        <TableCell className="hidden sm:table-cell">{profile.is_public ? <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-600/30"><Eye className="h-3 w-3" />Public</Badge> : <Badge variant="outline" className="gap-1"><EyeOff className="h-3 w-3" />Private</Badge>}</TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">{profile.created_at ? formatDistanceToNow(new Date(profile.created_at), { addSuffix: true }) : '-'}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => copyToClipboard(profile.id, profile.id)}>{copiedId === profile.id ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}Copy User ID</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {role === 'admin' ? (
                                <DropdownMenuItem disabled={isCurrentUser} className="text-destructive focus:text-destructive" onClick={() => setRevokeAdminDialog({open: true, userId: profile.id, name: profile.display_name || 'this user'})}><UserMinus className="h-4 w-4 mr-2" />Revoke Admin</DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => setGrantAdminDialog({open: true, userId: profile.id, name: profile.display_name || 'this user'})}><Crown className="h-4 w-4 mr-2" />Make Admin</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );

  const renderRolesTab = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="rounded-2xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" />Admin Users</CardTitle>
          <CardDescription>Users with administrative privileges</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userProfiles.filter(u => getUserRole(u.id) === 'admin').length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No admin users</p>
            ) : (
              userProfiles.filter(u => getUserRole(u.id) === 'admin').map(profile => (
                <div key={profile.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9"><AvatarFallback className="bg-amber-500/10 text-amber-500">{profile.display_name?.charAt(0).toUpperCase() || 'A'}</AvatarFallback></Avatar>
                    <div>
                      <p className="font-medium text-sm flex items-center gap-2">{profile.display_name || 'Unnamed'}{profile.id === user?.id && <Badge variant="outline" className="text-xs">You</Badge>}</p>
                      <p className="text-xs text-muted-foreground">@{profile.username || profile.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  {profile.id !== user?.id && (
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setRevokeAdminDialog({open: true, userId: profile.id, name: profile.display_name || 'this user'})}>
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Role Permissions</CardTitle>
          <CardDescription>What each role can do</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 mb-3"><Crown className="h-4 w-4 text-amber-500" /><span className="font-semibold">Admin</span></div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {['View all users and profiles', 'Manage waitlist entries', 'Grant/revoke admin roles', 'Access analytics & settings', 'Configure app settings', 'View audit trail'].map(p => (
                <li key={p} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" />{p}</li>
              ))}
            </ul>
          </div>
          <div className="p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3"><Users className="h-4 w-4" /><span className="font-semibold">User</span></div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {['Access personal dashboard', 'Manage own profile & settings', 'View public profiles'].map(p => (
                <li key={p} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" />{p}</li>
              ))}
              <li className="flex items-center gap-2"><XCircle className="h-3.5 w-3.5 text-muted-foreground/50" />No admin panel access</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="rounded-2xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-amber-500" />WhatsApp Notifications</CardTitle>
          <CardDescription>Get instant notifications when someone joins the waitlist</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook">Zapier/Make Webhook URL</Label>
            <Input id="webhook" type="url" placeholder="https://hooks.zapier.com/hooks/catch/..." value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="w-full">{isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Save Settings</Button>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <Alert className="w-full"><ExternalLink className="h-4 w-4" /><AlertDescription><a href="https://zapier.com/apps/webhooks/integrations" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline font-medium">Create a Zapier Webhook →</a></AlertDescription></Alert>
        </CardFooter>
      </Card>
      <Card className="rounded-2xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5 text-blue-500" />System Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Total Admins', value: analytics.adminCount },
            { label: 'Total Users', value: totalUsers },
            { label: 'Waitlist Entries', value: waitlistEntries.length },
            { label: 'Free Spots Left', value: analytics.freeSpotsLeft },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <Badge variant="secondary">{item.value}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        stats={{ waitlistCount: waitlistEntries.length, userCount: totalUsers }}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border/40 bg-gradient-to-r from-card/80 to-card/40 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
              <ShieldCheck className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">Command Center</h1>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Admin</span>
                <span className="text-border">/</span>
                <span className="capitalize font-medium text-foreground/80">{activeTab.replace(/-/g, ' ')}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 px-2.5 py-1 rounded-lg border-amber-500/30 bg-amber-500/5 text-xs">
              <Crown className="h-3 w-3 text-amber-500" /><span className="font-semibold">Admin</span>
            </Badge>
            <AdminRealtimeNotifications />
            <Button variant="ghost" onClick={handleRefresh} disabled={isRefreshing} size="icon" className="h-8 w-8 rounded-lg hover:bg-muted/60">
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-[1400px]">
            {renderContent()}
          </div>
        </ScrollArea>
      </div>

      {/* Dialogs */}
      <AlertDialog open={grantAdminDialog.open} onOpenChange={(open) => setGrantAdminDialog({...grantAdminDialog, open})}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Grant Admin Role</AlertDialogTitle>
            <AlertDialogDescription>Make <strong>{grantAdminDialog.name}</strong> an admin? They will have full access to the admin dashboard.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleGrantAdmin(grantAdminDialog.userId)}><Crown className="h-4 w-4 mr-2" />Grant Admin</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={revokeAdminDialog.open} onOpenChange={(open) => setRevokeAdminDialog({...revokeAdminDialog, open})}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Admin Role</AlertDialogTitle>
            <AlertDialogDescription>Remove admin privileges from <strong>{revokeAdminDialog.name}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleRevokeAdmin(revokeAdminDialog.userId)}><UserMinus className="h-4 w-4 mr-2" />Revoke Admin</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteWaitlistDialog.open} onOpenChange={(open) => setDeleteWaitlistDialog({open, ids: deleteWaitlistDialog.ids})}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Waitlist {deleteWaitlistDialog.ids.length === 1 ? 'Entry' : 'Entries'}</AlertDialogTitle>
            <AlertDialogDescription>Delete {deleteWaitlistDialog.ids.length} {deleteWaitlistDialog.ids.length === 1 ? 'entry' : 'entries'}? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDeleteWaitlist(deleteWaitlistDialog.ids)}><Trash2 className="h-4 w-4 mr-2" />Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserDetailsModal
        user={userDetailsModal.user}
        phone={userDetailsModal.user ? getUserPhone(userDetailsModal.user.id) : null}
        role={userDetailsModal.user ? getUserRole(userDetailsModal.user.id) : 'user'}
        open={userDetailsModal.open}
        onOpenChange={(open) => setUserDetailsModal({ open, user: open ? userDetailsModal.user : null })}
      />
    </div>
  );
}
