/**
 * Admin Overview Dashboard
 * Premium command center with KPIs, quick actions, and activity feed
 */

import { useState, useEffect } from 'react';
import {
  Users, Crown, Activity, HardDrive, Sparkles,
  ArrowUpRight, Upload, UserPlus, ShieldCheck,
  Megaphone, BarChart3, Clock, Zap, Database,
  CheckCircle, AlertTriangle, ChevronRight, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, subDays, startOfDay } from 'date-fns';
import { motion } from 'framer-motion';

interface OverviewProps {
  onNavigateTab: (tab: string) => void;
}

interface LogEntry {
  id: string;
  scope: string;
  level: string | null;
  message: string | null;
  created_at: string | null;
  user_id: string | null;
}

export function AdminOverview({ onNavigateTab }: OverviewProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    newUsersToday: 0,
    newUsersWeek: 0,
    totalWaitlist: 0,
    totalDatasets: 0,
    totalStrategies: 0,
    totalResults: 0,
    adminCount: 0,
    premiumCount: 0,
    storageUsedMB: 0,
  });
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const today = startOfDay(new Date());
      const weekAgo = subDays(today, 7);

      const [
        { count: userCount },
        { data: recentUsers },
        { count: waitlistCount },
        { count: datasetCount },
        { count: strategyCount },
        { count: resultCount },
        { data: adminRoles },
        { data: premiumRoles },
        { data: sharedDatasets },
        { data: logs },
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id, created_at').gte('created_at', weekAgo.toISOString()),
        supabase.from('sentinel_waitlist').select('id', { count: 'exact', head: true }),
        supabase.from('datasets').select('id', { count: 'exact', head: true }),
        supabase.from('strategies').select('id', { count: 'exact', head: true }),
        supabase.from('results').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('user_id').eq('role', 'admin'),
        supabase.from('user_roles').select('user_id').eq('role', 'premium'),
        supabase.from('shared_datasets').select('file_size_bytes'),
        supabase.from('logs').select('id, scope, level, message, created_at, user_id').order('created_at', { ascending: false }).limit(20),
      ]);

      const todayUsers = (recentUsers || []).filter(u => u.created_at && new Date(u.created_at) >= today).length;
      const storageMB = (sharedDatasets || []).reduce((sum, d) => sum + (d.file_size_bytes || 0), 0) / (1024 * 1024);

      setStats({
        totalUsers: userCount || 0,
        newUsersToday: todayUsers,
        newUsersWeek: (recentUsers || []).length,
        totalWaitlist: waitlistCount || 0,
        totalDatasets: datasetCount || 0,
        totalStrategies: strategyCount || 0,
        totalResults: resultCount || 0,
        adminCount: (adminRoles || []).length,
        premiumCount: (premiumRoles || []).length,
        storageUsedMB: Math.round(storageMB * 100) / 100,
      });

      setRecentLogs((logs || []) as LogEntry[]);
    } catch (err) {
      console.error('Overview load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      sub: stats.newUsersToday > 0 ? `+${stats.newUsersToday} today` : 'No new today',
      icon: Users,
      gradient: 'from-primary/15 to-primary/5',
      iconBg: 'bg-primary/15',
      iconColor: 'text-primary',
      trend: stats.newUsersWeek,
    },
    {
      label: 'Waitlist',
      value: stats.totalWaitlist,
      sub: 'Signups pending',
      icon: UserPlus,
      gradient: 'from-blue-500/15 to-blue-500/5',
      iconBg: 'bg-blue-500/15',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Datasets',
      value: stats.totalDatasets,
      sub: `${stats.storageUsedMB.toFixed(1)} MB used`,
      icon: Database,
      gradient: 'from-emerald-500/15 to-emerald-500/5',
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-500',
    },
    {
      label: 'Backtests',
      value: stats.totalResults,
      sub: `${stats.totalStrategies} strategies`,
      icon: Activity,
      gradient: 'from-purple-500/15 to-purple-500/5',
      iconBg: 'bg-purple-500/15',
      iconColor: 'text-purple-500',
    },
  ];

  const quickActions = [
    { label: 'Upload Market Data', icon: Upload, tab: 'market-data', iconBg: 'bg-primary/10', iconColor: 'text-primary' },
    { label: 'Manage Users', icon: Users, tab: 'users', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500' },
    { label: 'Grant Premium', icon: Crown, tab: 'premium', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500' },
    { label: 'Post Announcement', icon: Megaphone, tab: 'announcements', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
    { label: 'View Analytics', icon: BarChart3, tab: 'analytics', iconBg: 'bg-purple-500/10', iconColor: 'text-purple-500' },
    { label: 'AI Usage', icon: Sparkles, tab: 'ai-usage', iconBg: 'bg-pink-500/10', iconColor: 'text-pink-500' },
  ];

  const levelIcon = (level: string | null) => {
    if (level === 'error') return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
    if (level === 'warn') return <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />;
    return <CheckCircle className="h-3.5 w-3.5 text-muted-foreground/50" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-[120px] rounded-2xl" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className={cn(
              'rounded-2xl border-border/40 hover:border-border/80 transition-all duration-300 group overflow-hidden relative',
              'hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20'
            )}>
              {/* Subtle gradient background */}
              <div className={cn('absolute inset-0 bg-gradient-to-br opacity-60', stat.gradient)} />
              <CardContent className="pt-5 pb-5 relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className="text-3xl font-bold tracking-tight">{stat.value.toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground">{stat.sub}</p>
                  </div>
                  <div className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110',
                    stat.iconBg
                  )}>
                    <stat.icon className={cn('h-5 w-5', stat.iconColor)} />
                  </div>
                </div>
                {stat.trend !== undefined && stat.trend > 0 && (
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/30">
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                    <span className="text-[11px] text-emerald-500 font-semibold">+{stat.trend} this week</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions + Activity Log */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Quick Actions */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <Card className="rounded-2xl border-border/40 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                </div>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {quickActions.map((action) => (
                <button
                  key={action.tab}
                  onClick={() => onNavigateTab(action.tab)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 active:scale-[0.995] transition-all text-left group"
                >
                  <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', action.iconBg)}>
                    <action.icon className={cn('h-4 w-4', action.iconColor)} />
                  </div>
                  <span className="text-[13px] font-medium flex-1">{action.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity Log */}
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Card className="rounded-2xl border-border/40 h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  Recent Activity
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={loadOverview} className="rounded-lg h-7 px-2">
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px]">
                {recentLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <Activity className="h-5 w-5 opacity-40" />
                    </div>
                    <p className="text-sm font-medium">No recent activity</p>
                    <p className="text-xs mt-1 text-muted-foreground/70">Events will appear here as they happen</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {recentLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/30 transition-colors">
                        {levelIcon(log.level)}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] truncate">{log.message || log.scope}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[9px] h-[16px] px-1.5 rounded-md font-mono">{log.scope}</Badge>
                            {log.created_at && (
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Platform Health Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <Card className="rounded-2xl border-border/40 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent">
          <CardContent className="py-3.5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
                  <span className="text-sm font-semibold">All Systems Operational</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> {stats.adminCount} Admin{stats.adminCount !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Crown className="h-3.5 w-3.5 text-amber-500" /> {stats.premiumCount} Premium
                  </span>
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="h-3.5 w-3.5" /> {stats.storageUsedMB.toFixed(1)} MB
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="rounded-lg text-xs h-7" onClick={() => onNavigateTab('health')}>
                System Health →
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}