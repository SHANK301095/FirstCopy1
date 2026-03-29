import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  Database, 
  FileText, 
  TrendingUp, 
  Activity,
  ArrowRight,
  Play,
  FolderKanban,
  ArrowUpRight,
  ArrowDownRight,
  BookOpen,
  Flame,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { secureLogger } from '@/lib/secureLogger';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileDashboard } from '@/components/dashboard/MobileDashboard';
import { PageTitle } from '@/components/ui/PageTitle';
import { QuickStartChecklist } from '@/components/onboarding/QuickStartChecklist';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { DashboardSkeleton } from '@/components/skeletons/PageSkeletons';
import { StaggeredList, StaggeredItem } from '@/components/ui/StaggeredList';
import { useTradesDB } from '@/hooks/useTradesDB';

interface DashboardStats {
  totalStrategies: number;
  totalDatasets: number;
  totalRuns: number;
  totalResults: number;
  totalProjects: number;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'strategy' | 'dataset' | 'run' | 'result' | 'project';
  name: string;
  action: string;
  timestamp: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { trades: allTrades } = useTradesDB();
  const [stats, setStats] = useState<DashboardStats>({
    totalStrategies: 0,
    totalDatasets: 0,
    totalRuns: 0,
    totalResults: 0,
    totalProjects: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [todayJournalExists, setTodayJournalExists] = useState(false);
  const [journalStreak, setJournalStreak] = useState(0);

  const todayKey = format(new Date(), 'yyyy-MM-dd');

  // Today's trading summary
  const todaySummary = useMemo(() => {
    const todayTrades = allTrades.filter(t => t.entry_time.slice(0, 10) === todayKey && t.status === 'closed');
    const pnl = todayTrades.reduce((s, t) => s + t.net_pnl, 0);
    const wins = todayTrades.filter(t => t.net_pnl > 0).length;
    const losses = todayTrades.filter(t => t.net_pnl < 0).length;
    const winRate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
    return { count: todayTrades.length, pnl, wins, losses, winRate };
  }, [allTrades, todayKey]);

  // Fetch journal status
  useEffect(() => {
    if (!user) return;
    (async () => {
      // Check today's journal
      const { data: todayEntry } = await supabase.from('journal_entries').select('id').eq('user_id', user.id).eq('date', todayKey).maybeSingle();
      setTodayJournalExists(!!todayEntry);
      // Calculate streak
      const { data: entries } = await supabase.from('journal_entries').select('date').eq('user_id', user.id).order('date', { ascending: false }).limit(90);
      if (entries) {
        const dates = new Set(entries.map((e: any) => e.date));
        let streak = 0;
        let d = new Date();
        while (dates.has(format(d, 'yyyy-MM-dd'))) { streak++; d = new Date(d.getTime() - 86400000); }
        setJournalStreak(streak);
      }
    })();
  }, [user, todayKey]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      const [strategiesRes, datasetsRes, runsRes, resultsRes, projectsRes] = await Promise.all([
        supabase.from('strategies').select('id, name, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
        supabase.from('datasets').select('id, name, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
        supabase.from('runs').select('id, status, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
        supabase.from('results').select('id, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
        supabase.from('projects').select('id, name, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
      ]);

      const activity: ActivityItem[] = [];
      
      if (strategiesRes.data) {
        strategiesRes.data.forEach(s => {
          activity.push({
            id: s.id,
            type: 'strategy',
            name: s.name,
            action: 'Strategy created',
            timestamp: s.created_at || '',
          });
        });
      }
      
      if (datasetsRes.data) {
        datasetsRes.data.forEach(d => {
          activity.push({
            id: d.id,
            type: 'dataset',
            name: d.name,
            action: 'Dataset uploaded',
            timestamp: d.created_at || '',
          });
        });
      }
      
      if (runsRes.data) {
        runsRes.data.forEach(r => {
          activity.push({
            id: r.id,
            type: 'run',
            name: `Run ${r.id.slice(0, 8)}`,
            action: `Backtest ${r.status || 'queued'}`,
            timestamp: r.created_at || '',
          });
        });
      }

      if (projectsRes.data) {
        projectsRes.data.forEach(p => {
          activity.push({
            id: p.id,
            type: 'project',
            name: p.name,
            action: 'Project created',
            timestamp: p.created_at || '',
          });
        });
      }

      activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setStats({
        totalStrategies: strategiesRes.count || 0,
        totalDatasets: datasetsRes.count || 0,
        totalRuns: runsRes.count || 0,
        totalResults: resultsRes.count || 0,
        totalProjects: projectsRes.count || 0,
        recentActivity: activity.slice(0, 10),
      });
    } catch (error) {
      secureLogger.error('db', 'Error fetching dashboard stats', { error });
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'strategy': return FileText;
      case 'dataset': return Database;
      case 'run': return Play;
      case 'result': return BarChart3;
      case 'project': return FolderKanban;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'strategy': return 'text-primary bg-primary/10';
      case 'dataset': return 'text-success bg-success/10';
      case 'run': return 'text-primary bg-primary/10';
      case 'result': return 'text-warning bg-warning/10';
      case 'project': return 'text-destructive bg-destructive/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  // Show skeleton while loading
  if (loading) {
    return <DashboardSkeleton />;
  }

  // Mobile layout
  if (isMobile) {
    return <MobileDashboard stats={stats} loading={loading} onRefresh={fetchStats} />;
  }

  const statCards = [
    { 
      title: 'Strategies', 
      value: stats.totalStrategies, 
      icon: FileText, 
      href: '/strategies',
      change: null,
    },
    { 
      title: 'Datasets', 
      value: stats.totalDatasets, 
      icon: Database, 
      href: '/data',
      change: null,
    },
    { 
      title: 'Backtest Runs', 
      value: stats.totalRuns, 
      icon: Play, 
      href: '/workflow',
      change: null,
    },
    { 
      title: 'Results', 
      value: stats.totalResults, 
      icon: BarChart3, 
      href: '/saved-results',
      change: null,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <WelcomeModal />
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <PageTitle 
          title="Today's Snapshot" 
          subtitle="Track performance and active risk at a glance."
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <Link to="/analytics">
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
              Analytics
            </Link>
          </Button>
          <Button size="sm" className="h-8 text-xs" asChild>
            <Link to="/workflow">
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Run Backtest
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards - Top row with staggered animation */}
      <StaggeredList 
        className="grid gap-4 grid-cols-2 lg:grid-cols-4"
        stagger={0.08}
      >
        {statCards.map((stat) => (
          <StaggeredItem key={stat.title} variant="scale">
            <Link to={stat.href}>
              <Card variant="stat" className="group p-5 cursor-pointer h-full relative overflow-hidden">
                {/* Subtle gradient accent on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="space-y-2 min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">{stat.title}</p>
                    <p className="text-3xl font-bold tabular-nums tracking-tight">{stat.value}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-primary/8 group-hover:bg-primary/15 transition-colors duration-200 shrink-0">
                    <stat.icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                </div>
                {stat.change !== null && (
                  <div className="relative mt-3 flex items-center text-xs">
                    {stat.change >= 0 ? (
                      <>
                        <ArrowUpRight className="h-3.5 w-3.5 text-profit mr-1" />
                        <span className="font-medium text-profit">+{stat.change}%</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="h-3.5 w-3.5 text-destructive mr-1" />
                        <span className="font-medium text-destructive">{stat.change}%</span>
                      </>
                    )}
                    <span className="text-muted-foreground ml-1.5">vs last week</span>
                  </div>
                )}
              </Card>
            </Link>
          </StaggeredItem>
        ))}
      </StaggeredList>

      {/* Today's Summary Card */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Today
            </h3>
            <Badge variant="secondary" className="text-[10px]">{format(new Date(), 'EEE, MMM d')}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* LEFT: Trading Summary */}
            <div className="space-y-2">
              {todaySummary.count > 0 ? (
                <>
                  <p className={cn('text-2xl font-bold font-mono', todaySummary.pnl >= 0 ? 'text-profit' : 'text-loss')}>
                    {todaySummary.pnl >= 0 ? '+' : ''}₹{todaySummary.pnl.toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {todaySummary.count} trade{todaySummary.count !== 1 ? 's' : ''} · {todaySummary.winRate}% WR ({todaySummary.wins}W/{todaySummary.losses}L)
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No trades today</p>
              )}
            </div>
            {/* RIGHT: Journal Status */}
            <div className="space-y-2">
              {todayJournalExists ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-profit" />
                  <span className="text-sm font-medium text-profit">Journal written ✅</span>
                  <Link to={`/journal?date=${todayKey}`} className="text-xs text-primary hover:underline ml-auto">View entry →</Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="text-sm text-warning">Journal not written ⚠️</span>
                  <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" asChild>
                    <Link to={`/journal?date=${todayKey}`}>Write Today's Journal</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
          {/* Bottom: Streak */}
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              {journalStreak > 0 ? (
                <><Flame className="inline h-3.5 w-3.5 text-warning mr-1" />{journalStreak} day streak{journalStreak >= 7 ? ' 🔥' : ''}</>
              ) : (
                'Start your streak today'
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Two column layout: Activity + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="p-4 rounded-2xl bg-muted/30 mb-4">
                  <Activity className="h-7 w-7 opacity-30" />
                </div>
                <p className="text-sm font-medium text-foreground/70">No activity yet</p>
                <p className="text-xs mt-1.5 text-muted-foreground/50 max-w-[200px] text-center">Upload data or create a strategy to get started</p>
              </div>
            ) : (
              <div className="space-y-1">
                {stats.recentActivity.slice(0, 8).map((item) => {
                  const Icon = getActivityIcon(item.type);
                  return (
                    <div 
                      key={item.id} 
                      className="flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-muted/30 transition-all duration-150 group/item"
                    >
                      <div className={cn("p-1.5 rounded-lg transition-colors", getActivityColor(item.type))}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground/60">{item.action}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground/50 whitespace-nowrap">
                        {item.timestamp && formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {[
                { to: '/workflow', icon: Play, label: 'Start Backtest', desc: 'Upload data and analyze' },
                { to: '/strategies', icon: FileText, label: 'Create Strategy', desc: 'Build trading strategy' },
                { to: '/data', icon: Database, label: 'Import Dataset', desc: 'Upload market data' },
                { to: '/optimizer', icon: TrendingUp, label: 'Optimize Strategy', desc: 'Find optimal parameters' },
                { to: '/reports', icon: BarChart3, label: 'Generate Report', desc: 'Create PDF reports' },
              ].map((action) => (
                <Link key={action.to} to={action.to}>
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/30 transition-all duration-200 group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/8 group-hover:bg-primary/15 transition-colors duration-200">
                        <action.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium group-hover:text-primary transition-colors">{action.label}</p>
                        <p className="text-[11px] text-muted-foreground/60">{action.desc}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started - Only for new users */}
      {!loading && stats.totalStrategies === 0 && stats.totalDatasets === 0 && (
        <>
          <QuickStartChecklist />
          
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="p-4 rounded-xl bg-primary/10 mb-4">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Get Started</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                Upload your historical data or create your first trading strategy.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/data">
                    <Database className="h-4 w-4 mr-1.5" />
                    Upload Data
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/strategies">
                    <FileText className="h-4 w-4 mr-1.5" />
                    Create Strategy
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
