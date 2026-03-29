import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Loader2, RefreshCw, TrendingUp, Users, Zap, Calendar, Clock, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays, startOfDay, formatDistanceToNow } from 'date-fns';

interface AIUsageEntry {
  id: string;
  user_id: string;
  feature: string;
  tokens_used: number;
  created_at: string;
}

interface UserProfile {
  id: string;
  display_name: string | null;
  username: string | null;
}

interface DailyUsage {
  date: string;
  count: number;
}

interface TopUser {
  user_id: string;
  count: number;
  profile: UserProfile | null;
}

export function AIUsageAnalytics() {
  const [isLoading, setIsLoading] = useState(true);
  const [usageData, setUsageData] = useState<AIUsageEntry[]>([]);
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    try {
      // Load AI usage data (last 30 days)
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data: usage, error } = await supabase
        .from('ai_usage')
        .select('*')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      setUsageData(usage || []);

      // Get unique user IDs and fetch profiles
      const userIds = [...new Set((usage || []).map(u => u.user_id))];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, display_name, username')
          .in('id', userIds);

        const profileMap = new Map<string, UserProfile>();
        (profileData || []).forEach(p => profileMap.set(p.id, p));
        setProfiles(profileMap);
      }
    } catch (error) {
      console.error('Error loading AI usage:', error);
      toast.error('Failed to load AI usage analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    toast.success('Analytics refreshed');
  };

  // Calculate analytics
  const analytics = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const last7Days = subDays(today, 7);

    // Total generations
    const totalGenerations = usageData.length;

    // Today's generations
    const todayGenerations = usageData.filter(u =>
      new Date(u.created_at) >= today
    ).length;

    // Last 7 days
    const last7DaysGenerations = usageData.filter(u =>
      new Date(u.created_at) >= last7Days
    ).length;

    // Unique users today
    const uniqueUsersToday = new Set(
      usageData.filter(u => new Date(u.created_at) >= today).map(u => u.user_id)
    ).size;

    // Unique users total
    const uniqueUsersTotal = new Set(usageData.map(u => u.user_id)).size;

    // Daily breakdown (7 days)
    const dailyUsage: DailyUsage[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const nextDate = subDays(today, i - 1);
      const count = usageData.filter(u => {
        const created = new Date(u.created_at);
        return created >= date && created < nextDate;
      }).length;
      dailyUsage.push({
        date: format(date, 'EEE'),
        count
      });
    }

    // Feature breakdown
    const featureCounts = usageData.reduce((acc, u) => {
      acc[u.feature] = (acc[u.feature] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top users
    const userCounts = usageData.reduce((acc, u) => {
      acc[u.user_id] = (acc[u.user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topUsers: TopUser[] = Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userId, count]) => ({
        user_id: userId,
        count,
        profile: profiles.get(userId) || null
      }));

    // Average per user
    const avgPerUser = uniqueUsersTotal > 0 ? Math.round(totalGenerations / uniqueUsersTotal * 10) / 10 : 0;

    return {
      totalGenerations,
      todayGenerations,
      last7DaysGenerations,
      uniqueUsersToday,
      uniqueUsersTotal,
      dailyUsage,
      featureCounts,
      topUsers,
      avgPerUser
    };
  }, [usageData, profiles]);

  // Recent activity
  const recentActivity = useMemo(() => {
    return usageData.slice(0, 20).map(u => ({
      ...u,
      profile: profiles.get(u.user_id)
    }));
  }, [usageData, profiles]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Usage Analytics
          </h3>
          <p className="text-sm text-muted-foreground">Track AI feature usage across your platform</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold">{analytics.totalGenerations}</p>
                <p className="text-sm text-muted-foreground">Total Generations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{analytics.todayGenerations}</p>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{analytics.uniqueUsersTotal}</p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{analytics.avgPerUser}</p>
                <p className="text-sm text-muted-foreground">Avg per User</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Usage Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Daily Generations (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {analytics.dailyUsage.map((day, i) => {
                const maxCount = Math.max(...analytics.dailyUsage.map(d => d.count), 1);
                const height = (day.count / maxCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      {day.count}
                    </span>
                    <div
                      className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-lg transition-all group-hover:from-primary/90"
                      style={{ height: `${Math.max(height, 8)}%` }}
                    />
                    <span className="text-xs text-muted-foreground font-medium">{day.date}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Top Users
            </CardTitle>
            <CardDescription>Users with most AI generations</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {analytics.topUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No usage data yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {analytics.topUsers.map((user, i) => (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-4">
                          {i + 1}
                        </span>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {(user.profile?.display_name || user.profile?.username || 'U')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {user.profile?.display_name || user.profile?.username || user.user_id.slice(0, 8)}
                        </span>
                      </div>
                      <Badge variant="secondary">{user.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Feature Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Feature Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(analytics.featureCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full text-center py-4">
                No feature usage data yet
              </p>
            ) : (
              Object.entries(analytics.featureCounts).map(([feature, count]) => (
                <div
                  key={feature}
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                >
                  <div>
                    <p className="font-medium text-sm capitalize">{feature.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((count / analytics.totalGenerations) * 100)}% of total
                    </p>
                  </div>
                  <Badge>{count}</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <CardDescription>Latest AI generations across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No activity yet
                    </TableCell>
                  </TableRow>
                ) : (
                  recentActivity.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs">
                              {(activity.profile?.display_name || activity.profile?.username || 'U')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {activity.profile?.display_name || activity.profile?.username || activity.user_id.slice(0, 8)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {activity.feature.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
