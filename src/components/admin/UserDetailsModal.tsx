import { useState, useEffect } from 'react';
import { 
  User, Crown, Phone, Mail, Calendar, Activity, Eye, EyeOff, 
  Shield, Clock, Copy, Check, ExternalLink, Timer, Sparkles,
  BarChart3, FileText, Loader2, X
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';

interface UserProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_public: boolean;
  created_at: string | null;
}

interface UserDetailsModalProps {
  user: UserProfile | null;
  phone: string | null;
  role: 'admin' | 'user';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PremiumStatus {
  isPremium: boolean;
  isOnTrial: boolean;
  trialExpiresAt: string | null;
  hasUsedTrial: boolean;
}

interface ActivityLog {
  id: string;
  action: string;
  resource_type: string;
  resource_name: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface AIUsage {
  feature: string;
  tokens_used: number;
  created_at: string;
}

interface UserStats {
  strategies: number;
  datasets: number;
  runs: number;
  results: number;
}

export function UserDetailsModal({ 
  user, 
  phone, 
  role, 
  open, 
  onOpenChange 
}: UserDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [aiUsage, setAiUsage] = useState<AIUsage[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ strategies: 0, datasets: 0, runs: 0, results: 0 });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      loadUserDetails(user.id);
    }
  }, [open, user]);

  const loadUserDetails = async (userId: string) => {
    setLoading(true);
    try {
      // Load premium trial status
      const { data: trialData } = await supabase
        .from('premium_trials')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      const trial = trialData?.[0];
      const now = new Date();
      const isOnTrial = trial ? new Date(trial.expires_at) > now : false;
      const hasUsedTrial = !!trial;

      // Check if user has premium role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'premium')
        .maybeSingle();

      setPremiumStatus({
        isPremium: !!roleData || isOnTrial,
        isOnTrial,
        trialExpiresAt: trial?.expires_at || null,
        hasUsedTrial
      });

      // Load AI usage (last 30 days)
      const { data: usageData } = await supabase
        .from('ai_usage')
        .select('feature, tokens_used, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      setAiUsage((usageData || []) as AIUsage[]);

      // Load user stats - count strategies
      const { count: strategyCount } = await supabase
        .from('strategies')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Load user stats - count datasets
      const { count: datasetCount } = await supabase
        .from('datasets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Load user stats - count runs
      const { count: runCount } = await supabase
        .from('runs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Load user stats - count results
      const { count: resultCount } = await supabase
        .from('results')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      setUserStats({
        strategies: strategyCount || 0,
        datasets: datasetCount || 0,
        runs: runCount || 0,
        results: resultCount || 0
      });

      // Load recent activity from logs
      const { data: logs } = await supabase
        .from('logs')
        .select('id, scope, level, message, meta_json, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      setActivityLogs((logs || []).map(log => ({
        id: log.id,
        action: log.scope,
        resource_type: log.level || 'info',
        resource_name: log.message,
        created_at: log.created_at || '',
        metadata: log.meta_json as Record<string, unknown> | null
      })));

    } catch (error) {
      console.error('Error loading user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!user) return null;

  const initials = user.display_name?.slice(0, 2).toUpperCase() || 
                   user.username?.slice(0, 2).toUpperCase() || 'U';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className={`text-lg ${
                  role === 'admin' 
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' 
                    : 'bg-primary/10 text-primary'
                }`}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  {user.display_name || 'Unnamed User'}
                  {role === 'admin' && (
                    <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">
                      <Crown className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                  {premiumStatus?.isPremium && (
                    <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-sm">@{user.username || user.id.slice(0, 8)}</span>
                  {user.is_public ? (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-600/30">
                      <Eye className="h-2.5 w-2.5 mr-1" />
                      Public
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      <EyeOff className="h-2.5 w-2.5 mr-1" />
                      Private
                    </Badge>
                  )}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="profile" className="flex-1">
          <TabsList className="mx-6 mt-4 w-auto">
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="h-3.5 w-3.5" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Usage
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[450px] px-6 pb-6">
            {/* Profile Tab */}
            <TabsContent value="profile" className="mt-4 space-y-4">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <>
                  {/* Contact Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">User ID:</span>
                          <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                            {user.id}
                          </code>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(user.id, 'user-id')}
                        >
                          {copiedId === 'user-id' ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                      
                      {phone && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{phone}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => copyToClipboard(phone, 'phone')}
                          >
                            {copiedId === 'phone' ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Joined {user.created_at 
                            ? format(new Date(user.created_at), 'PPP') 
                            : 'Unknown'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Premium Status */}
                  <Card className={premiumStatus?.isPremium 
                    ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent' 
                    : ''
                  }>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Crown className={`h-4 w-4 ${premiumStatus?.isPremium ? 'text-amber-500' : 'text-muted-foreground'}`} />
                        Premium Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {premiumStatus?.isPremium ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="font-medium text-green-600">
                              {premiumStatus.isOnTrial ? 'Trial Active' : 'Premium Active'}
                            </span>
                          </div>
                          {premiumStatus.isOnTrial && premiumStatus.trialExpiresAt && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Timer className="h-3.5 w-3.5" />
                              <span>
                                Expires {formatDistanceToNow(new Date(premiumStatus.trialExpiresAt), { addSuffix: true })}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span>Free Plan</span>
                          </div>
                          {premiumStatus?.hasUsedTrial && (
                            <Badge variant="outline" className="text-xs">
                              Trial Used
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* User Stats */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        Platform Usage
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-muted/50 text-center">
                          <p className="text-2xl font-bold">{userStats.strategies}</p>
                          <p className="text-xs text-muted-foreground">Strategies</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50 text-center">
                          <p className="text-2xl font-bold">{userStats.datasets}</p>
                          <p className="text-xs text-muted-foreground">Datasets</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50 text-center">
                          <p className="text-2xl font-bold">{userStats.runs}</p>
                          <p className="text-xs text-muted-foreground">Backtest Runs</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50 text-center">
                          <p className="text-2xl font-bold">{userStats.results}</p>
                          <p className="text-xs text-muted-foreground">Saved Results</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No activity logs found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activityLogs.map((log) => (
                    <div 
                      key={log.id}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              log.resource_type === 'error' ? 'destructive' :
                              log.resource_type === 'warn' ? 'outline' : 'secondary'
                            } className="text-xs">
                              {log.action}
                            </Badge>
                          </div>
                          {log.resource_name && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {log.resource_name}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Usage Tab */}
            <TabsContent value="usage" className="mt-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : aiUsage.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No AI usage recorded</p>
                </div>
              ) : (
                <>
                  {/* Usage Summary */}
                  <Card className="mb-4">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total AI Tokens Used</p>
                          <p className="text-2xl font-bold">
                            {aiUsage.reduce((acc, u) => acc + (u.tokens_used || 0), 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Sparkles className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Usage List */}
                  <div className="space-y-2">
                    {aiUsage.map((usage, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium capitalize">
                              {usage.feature.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(usage.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {(usage.tokens_used || 0).toLocaleString()} tokens
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
