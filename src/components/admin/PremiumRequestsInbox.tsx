import { useState, useEffect, useMemo } from 'react';
import { 
  Crown, Search, Check, X, Loader2, RefreshCw, MessageSquare, 
  Clock, User, Mail, ChevronDown, Filter, Eye 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

interface PremiumRequest {
  id: string;
  user_id: string | null;
  created_at: string | null;
  message: string | null;
  meta_json: {
    request_message?: string;
    user_email?: string;
  } | null;
  profile?: {
    display_name: string | null;
    username: string | null;
  } | null;
  status: 'pending' | 'approved' | 'rejected';
}

export function PremiumRequestsInbox() {
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<PremiumRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; request: PremiumRequest | null }>({ open: false, request: null });
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; request: PremiumRequest | null }>({ open: false, request: null });
  const [viewDialog, setViewDialog] = useState<{ open: boolean; request: PremiumRequest | null }>({ open: false, request: null });
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get premium request logs
      const { data: logs, error } = await supabase
        .from('logs')
        .select('id, user_id, created_at, message, meta_json')
        .eq('scope', 'premium_request')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user profiles for the requests
      const userIds = [...new Set((logs || []).map(l => l.user_id).filter(Boolean))];
      
      let profiles: Record<string, { display_name: string | null; username: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, display_name, username')
          .in('id', userIds);
        
        profileData?.forEach(p => {
          profiles[p.id] = { display_name: p.display_name, username: p.username };
        });
      }

      // Get premium users to determine status
      const { data: premiumRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'premium' as any);
      
      const premiumUserIds = new Set(premiumRoles?.map(r => r.user_id) || []);

      // Map requests with profiles and status
      const mappedRequests: PremiumRequest[] = (logs || []).map(log => ({
        id: log.id,
        user_id: log.user_id,
        created_at: log.created_at,
        message: log.message,
        meta_json: log.meta_json as PremiumRequest['meta_json'],
        profile: log.user_id ? profiles[log.user_id] : null,
        status: log.user_id && premiumUserIds.has(log.user_id) ? 'approved' : 'pending'
      }));

      setRequests(mappedRequests);
    } catch (error) {
      console.error('Error loading premium requests:', error);
      toast.error('Failed to load premium requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (request: PremiumRequest) => {
    if (!request.user_id) {
      toast.error('Cannot approve: No user ID associated with this request');
      return;
    }

    setIsProcessing(true);
    try {
      // Grant premium role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: request.user_id, role: 'premium' as any });

      if (error && error.code !== '23505') throw error;

      // Update local state
      setRequests(prev => prev.map(r => 
        r.id === request.id ? { ...r, status: 'approved' as const } : r
      ));

      toast.success('Premium access granted!', {
        description: `${request.profile?.display_name || 'User'} now has premium access.`
      });
      setApproveDialog({ open: false, request: null });
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to grant premium access');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (request: PremiumRequest) => {
    if (!request.user_id) {
      toast.error('Cannot reject: No user ID');
      return;
    }

    setIsProcessing(true);
    try {
      // Revoke premium if exists
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', request.user_id)
        .eq('role', 'premium' as any);

      // Update local state
      setRequests(prev => prev.map(r => 
        r.id === request.id ? { ...r, status: 'rejected' as const } : r
      ));

      toast.success('Request rejected');
      setRejectDialog({ open: false, request: null });
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to process rejection');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    let filtered = requests;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.profile?.display_name?.toLowerCase().includes(query) ||
        r.profile?.username?.toLowerCase().includes(query) ||
        r.meta_json?.user_email?.toLowerCase().includes(query) ||
        r.meta_json?.request_message?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [requests, statusFilter, searchQuery]);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

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
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
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
                <p className="text-3xl font-bold">{requests.filter(r => r.status === 'approved').length}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <X className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{requests.filter(r => r.status === 'rejected').length}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Premium Requests
                {pendingCount > 0 && (
                  <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">{pendingCount}</Badge>
                )}
              </CardTitle>
              <CardDescription>{requests.length} total requests</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Requests */}
          <ScrollArea className="h-[400px]">
            {filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No premium requests found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {statusFilter === 'pending' ? 'All pending requests have been processed' : 'Try changing the filter'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className={request.status === 'approved' 
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' 
                          : 'bg-muted'
                        }>
                          {(request.profile?.display_name || request.profile?.username || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">
                            {request.profile?.display_name || request.profile?.username || 'Unknown User'}
                          </p>
                          <Badge 
                            variant={request.status === 'approved' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'}
                            className={request.status === 'approved' ? 'bg-green-500' : ''}
                          >
                            {request.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3" />
                          {request.meta_json?.user_email || 'No email'}
                        </p>
                        {request.meta_json?.request_message && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            "{request.meta_json.request_message}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                          <Clock className="h-3 w-3" />
                          {request.created_at ? formatDistanceToNow(new Date(request.created_at), { addSuffix: true }) : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewDialog({ open: true, request })}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {request.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-500/10 hover:border-green-500/30"
                            onClick={() => setApproveDialog({ open: true, request })}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setRejectDialog({ open: true, request })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialog.open} onOpenChange={(open) => setViewDialog({ open, request: viewDialog.request })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Premium Request Details
            </DialogTitle>
          </DialogHeader>
          {viewDialog.request && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10">
                    {(viewDialog.request.profile?.display_name || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{viewDialog.request.profile?.display_name || viewDialog.request.profile?.username || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{viewDialog.request.meta_json?.user_email || 'No email'}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Request Message:</p>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm whitespace-pre-wrap">
                    {viewDialog.request.meta_json?.request_message || 'No message provided'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Submitted:</span>
                <span>{viewDialog.request.created_at ? format(new Date(viewDialog.request.created_at), 'PPpp') : 'Unknown'}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge 
                  variant={viewDialog.request.status === 'approved' ? 'default' : viewDialog.request.status === 'rejected' ? 'destructive' : 'secondary'}
                  className={viewDialog.request.status === 'approved' ? 'bg-green-500' : ''}
                >
                  {viewDialog.request.status}
                </Badge>
              </div>

              {viewDialog.request.status === 'pending' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    className="flex-1 bg-green-500 hover:bg-green-600"
                    onClick={() => {
                      setViewDialog({ open: false, request: null });
                      setApproveDialog({ open: true, request: viewDialog.request });
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setViewDialog({ open: false, request: null });
                      setRejectDialog({ open: true, request: viewDialog.request });
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <AlertDialog open={approveDialog.open} onOpenChange={(open) => setApproveDialog({ ...approveDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Approve Premium Request
            </AlertDialogTitle>
            <AlertDialogDescription>
              Grant premium access to <strong>{approveDialog.request?.profile?.display_name || 'this user'}</strong>?
              They will get unlimited AI generations and all premium features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approveDialog.request && handleApprove(approveDialog.request)}
              disabled={isProcessing}
              className="bg-green-500 hover:bg-green-600"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Premium Request</AlertDialogTitle>
            <AlertDialogDescription>
              Reject the premium request from <strong>{rejectDialog.request?.profile?.display_name || 'this user'}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejectDialog.request && handleReject(rejectDialog.request)}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
