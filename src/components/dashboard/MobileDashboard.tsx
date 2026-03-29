import { Link, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { 
  BarChart3, 
  Database, 
  FileText, 
  TrendingUp, 
  Activity,
  Zap,
  Play,
  FolderKanban,
  Settings,
  Wifi,
  Cpu,
  Target,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import { MobileCard, MobileCardGroup, MobileCardRow } from '@/components/mobile/MobileCard';
import { MobileSkeletonCard, MobileEmptyState } from '@/components/mobile/MobileLoadingStates';
import { PullToRefreshContainer } from '@/components/mobile/PullToRefreshContainer';
import { triggerHaptic } from '@/hooks/useTouchGestures';
import { StatCardClean, StatCardGrid } from '@/components/ui/StatCardClean';
import { GoalRingsGrid } from '@/components/dashboard/GoalProgressRings';

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

interface MobileDashboardProps {
  stats: DashboardStats;
  loading: boolean;
  onRefresh?: () => Promise<void>;
}

export function MobileDashboard({ stats, loading, onRefresh }: MobileDashboardProps) {
  const navigate = useNavigate();

  const handleRefresh = useCallback(async () => {
    triggerHaptic('medium');
    if (onRefresh) {
      await onRefresh();
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }, [onRefresh]);

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
      case 'strategy': return 'text-purple-500 bg-purple-500/10';
      case 'dataset': return 'text-emerald-500 bg-emerald-500/10';
      case 'run': return 'text-blue-500 bg-blue-500/10';
      case 'result': return 'text-amber-500 bg-amber-500/10';
      case 'project': return 'text-rose-500 bg-rose-500/10';
      default: return 'text-primary bg-primary/10';
    }
  };

  const handleNavigation = (href: string) => {
    triggerHaptic('light');
    navigate(href);
  };

  const quickActions = [
    { to: '/workflow', icon: Play, label: 'Start Backtest', desc: 'Run analysis', gradient: 'from-primary to-cyan-500' },
    { to: '/strategies', icon: FileText, label: 'Create Strategy', desc: 'Build strategy', gradient: 'from-purple-500 to-pink-500' },
    { to: '/data', icon: Database, label: 'Import Dataset', desc: 'Upload data', gradient: 'from-emerald-500 to-primary' },
    { to: '/optimizer', icon: TrendingUp, label: 'Optimize', desc: 'Find params', gradient: 'from-amber-500 to-orange-500' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics', desc: 'View insights', gradient: 'from-blue-500 to-purple-500' },
    { to: '/scanner', icon: Target, label: 'Scanner', desc: 'Scan patterns', gradient: 'from-pink-500 to-rose-500' },
  ];

  const content = (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <MobilePageHeader 
        title="Dashboard"
        subtitle="Your trading intelligence"
        actions={
          <button
            onClick={() => navigate('/settings')}
            className="p-2.5 rounded-xl bg-card/60 border border-border/40 active:scale-95 transition-transform touch-manipulation"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
          </button>
        }
      />

      <div className="px-4 space-y-6">
        {/* Cyber Stats Grid - Same as Desktop */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
            Overview
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <MobileSkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <StatCardGrid columns={2}>
              <StatCardClean
                label="Strategies"
                value={stats.totalStrategies}
                icon={FileText}
                variant="default"
                subtitle="Trading strategies"
              />
              <StatCardClean
                label="Datasets"
                value={stats.totalDatasets}
                icon={Database}
                variant="success"
                subtitle="Data files"
              />
              <StatCardClean
                label="Runs"
                value={stats.totalRuns}
                icon={Play}
                variant="default"
                subtitle="Backtests"
              />
              <StatCardClean
                label="Results"
                value={stats.totalResults}
                icon={BarChart3}
                variant="warning"
                subtitle="Saved"
              />
            </StatCardGrid>
          )}
        </section>

        {/* System Status - Same as Desktop */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
            System Status
          </h2>
          <StatCardGrid columns={3}>
            <StatCardClean
              label="System"
              value="Online"
              icon={Wifi}
              variant="success"
              compact
            />
            <StatCardClean
              label="Engine"
              value="Ready"
              icon={Cpu}
              variant="default"
              compact
            />
            <StatCardClean
              label="Last"
              value={stats.recentActivity[0]?.timestamp 
                ? formatDistanceToNow(new Date(stats.recentActivity[0].timestamp), { addSuffix: false })
                : 'N/A'}
              icon={Activity}
              variant="default"
              compact
            />
          </StatCardGrid>
        </section>

        {/* Goal Progress Rings - Same as Desktop */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
            Progress Goals
          </h2>
          <GoalRingsGrid
            goals={[
              { label: 'Strategies', current: stats.totalStrategies, target: 10, color: 'primary' },
              { label: 'Datasets', current: stats.totalDatasets, target: 5, color: 'profit' },
              { label: 'Backtests', current: stats.totalRuns, target: 20, color: 'warning' },
              { label: 'Results', current: stats.totalResults, target: 15, color: 'loss' },
            ]}
            compact
          />
        </section>

        {/* Quick Actions - Enhanced */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1 flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <Link key={action.to} to={action.to}>
                <MobileCard 
                  variant="elevated" 
                  className="p-3 active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg bg-gradient-to-br shadow-sm", action.gradient)}>
                      <action.icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{action.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{action.desc}</p>
                    </div>
                  </div>
                </MobileCard>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Activity
            </h2>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
              Last 10
            </Badge>
          </div>
          
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <MobileSkeletonCard key={i} />
              ))}
            </div>
          ) : stats.recentActivity.length > 0 ? (
            <MobileCardGroup>
              {stats.recentActivity.slice(0, 6).map((item) => {
                const Icon = getActivityIcon(item.type);
                const colorClass = getActivityColor(item.type);
                return (
                  <MobileCardRow key={`${item.type}-${item.id}`} showArrow={false}>
                    <div className="flex items-center gap-3 py-1">
                      <div className={cn('p-2.5 rounded-xl shrink-0', colorClass.split(' ')[1])}>
                        <Icon className={cn('h-4 w-4', colorClass.split(' ')[0])} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{item.action}</span>
                          <span className="text-[10px] text-muted-foreground/50">•</span>
                          <span className="text-[10px] text-muted-foreground/60 font-mono">
                            {item.timestamp && formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </MobileCardRow>
                );
              })}
            </MobileCardGroup>
          ) : (
            <MobileEmptyState
              icon={<Activity className="h-10 w-10 text-muted-foreground/60" />}
              title="No recent activity"
              description="Start by creating a strategy or uploading data"
              action={
                <button
                  onClick={() => navigate('/workflow')}
                  className="px-5 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground active:scale-95 transition-transform touch-manipulation min-h-[44px]"
                >
                  Start Backtest
                </button>
              }
            />
          )}
        </section>

        {/* Getting Started - Only show if new user */}
        {!loading && stats.totalStrategies === 0 && stats.totalDatasets === 0 && (
          <section>
            <MobileCard variant="outlined" className="border-dashed border-2">
              <div className="flex flex-col items-center text-center py-6 px-4">
                <div className="p-4 rounded-2xl bg-primary/10 mb-4">
                  <Zap className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Welcome!</h3>
                <p className="text-sm text-muted-foreground mb-5 max-w-[260px] leading-relaxed">
                  Get started by uploading your trading data or creating a strategy.
                </p>
                <div className="flex gap-3 w-full max-w-[280px]">
                  <button
                    onClick={() => handleNavigation('/data')}
                    className="flex-1 px-4 py-3 text-sm font-medium rounded-xl border border-border bg-card active:scale-95 transition-transform touch-manipulation min-h-[48px]"
                  >
                    Upload Data
                  </button>
                  <button
                    onClick={() => handleNavigation('/strategies')}
                    className="flex-1 px-4 py-3 text-sm font-medium rounded-xl bg-primary text-primary-foreground active:scale-95 transition-transform touch-manipulation min-h-[48px]"
                  >
                    Create Strategy
                  </button>
                </div>
              </div>
            </MobileCard>
          </section>
        )}
      </div>
    </div>
  );

  if (onRefresh) {
    return (
      <PullToRefreshContainer onRefresh={handleRefresh} className="h-full">
        {content}
      </PullToRefreshContainer>
    );
  }

  return content;
}
