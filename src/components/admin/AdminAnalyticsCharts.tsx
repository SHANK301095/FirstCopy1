/**
 * Admin Analytics Charts
 * Recharts-based dashboards: user growth, waitlist trends, backtest volume
 */

import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Users, TrendingUp, Activity, Calendar, Loader2, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subMonths, startOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  users: 'hsl(217, 91%, 60%)',       // blue
  waitlist: 'hsl(142, 71%, 45%)',     // green
  backtests: 'hsl(262, 83%, 58%)',    // purple
  strategies: 'hsl(25, 95%, 53%)',    // orange
  datasets: 'hsl(173, 80%, 40%)',     // teal
  muted: 'hsl(var(--muted-foreground))',
};

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(222, 47%, 8%)',
  border: '1px solid hsl(222, 30%, 18%)',
  borderRadius: '12px',
  fontSize: '12px',
  padding: '8px 12px',
};

type TimeRange = '7d' | '30d' | '90d' | '6m' | '1y';

export function AdminAnalyticsCharts() {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>('30d');
  const [rawProfiles, setRawProfiles] = useState<{ created_at: string }[]>([]);
  const [rawWaitlist, setRawWaitlist] = useState<{ created_at: string }[]>([]);
  const [rawResults, setRawResults] = useState<{ created_at: string }[]>([]);
  const [rawStrategies, setRawStrategies] = useState<{ created_at: string }[]>([]);
  const [rawDatasets, setRawDatasets] = useState<{ created_at: string }[]>([]);
  const [roleCounts, setRoleCounts] = useState<{ role: string; count: number }[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const since = subMonths(new Date(), 12).toISOString();
    const [profiles, waitlist, results, strategies, datasets, roles] = await Promise.all([
      supabase.from('profiles').select('created_at').gte('created_at', since).order('created_at'),
      supabase.from('sentinel_waitlist').select('created_at').gte('created_at', since).order('created_at'),
      supabase.from('results').select('created_at').gte('created_at', since).order('created_at'),
      supabase.from('strategies').select('created_at').gte('created_at', since).order('created_at'),
      supabase.from('datasets').select('created_at').gte('created_at', since).order('created_at'),
      supabase.from('user_roles').select('role'),
    ]);
    setRawProfiles((profiles.data || []) as { created_at: string }[]);
    setRawWaitlist((waitlist.data || []) as { created_at: string }[]);
    setRawResults((results.data || []) as { created_at: string }[]);
    setRawStrategies((strategies.data || []) as { created_at: string }[]);
    setRawDatasets((datasets.data || []) as { created_at: string }[]);

    // Role distribution
    const roleMap = new Map<string, number>();
    (roles.data || []).forEach((r: any) => {
      roleMap.set(r.role, (roleMap.get(r.role) || 0) + 1);
    });
    setRoleCounts(Array.from(roleMap, ([role, count]) => ({ role, count })));
    setLoading(false);
  };

  const rangeConfig = useMemo(() => {
    const now = new Date();
    switch (range) {
      case '7d': return { start: subDays(now, 7), label: '7 Days', fmt: 'EEE' };
      case '30d': return { start: subDays(now, 30), label: '30 Days', fmt: 'MMM d' };
      case '90d': return { start: subDays(now, 90), label: '90 Days', fmt: 'MMM d' };
      case '6m': return { start: subMonths(now, 6), label: '6 Months', fmt: 'MMM' };
      case '1y': return { start: subMonths(now, 12), label: '1 Year', fmt: 'MMM yy' };
    }
  }, [range]);

  const bucketData = useMemo(() => {
    const { start, fmt } = rangeConfig;
    const end = new Date();
    const days = eachDayOfInterval({ start, end });

    const bucket = (items: { created_at: string }[], day: Date) => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      return items.filter(i => {
        const d = new Date(i.created_at!);
        return d >= dayStart && d < dayEnd;
      }).length;
    };

    return days.map(day => ({
      date: format(day, fmt),
      fullDate: format(day, 'yyyy-MM-dd'),
      users: bucket(rawProfiles, day),
      waitlist: bucket(rawWaitlist, day),
      backtests: bucket(rawResults, day),
      strategies: bucket(rawStrategies, day),
      datasets: bucket(rawDatasets, day),
    }));
  }, [rawProfiles, rawWaitlist, rawResults, rawStrategies, rawDatasets, rangeConfig]);

  // Cumulative data for growth chart
  const cumulativeData = useMemo(() => {
    let uTotal = 0, wTotal = 0;
    return bucketData.map(d => ({
      date: d.date,
      users: (uTotal += d.users),
      waitlist: (wTotal += d.waitlist),
    }));
  }, [bucketData]);

  // Summary KPIs
  const kpis = useMemo(() => {
    const total = (arr: { created_at: string }[]) => {
      const { start } = rangeConfig;
      return arr.filter(i => new Date(i.created_at!) >= start).length;
    };
    const prevStart = subDays(rangeConfig.start, Math.round((Date.now() - rangeConfig.start.getTime()) / 86400000));
    const prev = (arr: { created_at: string }[]) =>
      arr.filter(i => { const d = new Date(i.created_at!); return d >= prevStart && d < rangeConfig.start; }).length;

    const growth = (curr: number, p: number) => p > 0 ? Math.round(((curr - p) / p) * 100) : curr > 0 ? 100 : 0;

    const uCurr = total(rawProfiles), uPrev = prev(rawProfiles);
    const wCurr = total(rawWaitlist), wPrev = prev(rawWaitlist);
    const bCurr = total(rawResults), bPrev = prev(rawResults);

    return [
      { label: 'New Users', value: uCurr, growth: growth(uCurr, uPrev), color: CHART_COLORS.users, icon: Users },
      { label: 'Waitlist Joins', value: wCurr, growth: growth(wCurr, wPrev), color: CHART_COLORS.waitlist, icon: TrendingUp },
      { label: 'Backtests Run', value: bCurr, growth: growth(bCurr, bPrev), color: CHART_COLORS.backtests, icon: Activity },
    ];
  }, [rawProfiles, rawWaitlist, rawResults, rangeConfig]);

  const PIE_COLORS = ['hsl(217, 91%, 60%)', 'hsl(262, 83%, 58%)', 'hsl(25, 95%, 53%)', 'hsl(142, 71%, 45%)'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Platform Analytics
          </h3>
          <p className="text-sm text-muted-foreground">Growth metrics & trends for {rangeConfig.label.toLowerCase()}</p>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as TimeRange)}>
          <SelectTrigger className="w-[140px] h-9 rounded-xl">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="6m">Last 6 months</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="rounded-2xl border-border/50">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-3xl font-bold mt-1">{kpi.value}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    {kpi.growth > 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                    ) : kpi.growth < 0 ? (
                      <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
                    ) : (
                      <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className={cn(
                      'text-xs font-medium',
                      kpi.growth > 0 ? 'text-emerald-500' : kpi.growth < 0 ? 'text-destructive' : 'text-muted-foreground'
                    )}>
                      {kpi.growth > 0 ? '+' : ''}{kpi.growth}% vs prev
                    </span>
                  </div>
                </div>
                <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: kpi.color + '20' }}>
                  <kpi.icon className="h-5 w-5" style={{ color: kpi.color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Growth + Waitlist Cumulative */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Cumulative Growth</CardTitle>
          <CardDescription className="text-xs">Total users & waitlist over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={cumulativeData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="grad-users" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.users} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CHART_COLORS.users} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-waitlist" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.waitlist} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CHART_COLORS.waitlist} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
              <XAxis dataKey="date" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} width={45} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="users" name="Users" stroke={CHART_COLORS.users} strokeWidth={2} fill="url(#grad-users)" />
              <Area type="monotone" dataKey="waitlist" name="Waitlist" stroke={CHART_COLORS.waitlist} strokeWidth={2} fill="url(#grad-waitlist)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Activity Bars */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily Signups</CardTitle>
            <CardDescription className="text-xs">New users & waitlist per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bucketData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }} width={35} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="users" name="Users" fill={CHART_COLORS.users} radius={[4, 4, 0, 0]} />
                <Bar dataKey="waitlist" name="Waitlist" fill={CHART_COLORS.waitlist} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Backtest & Strategy Volume</CardTitle>
            <CardDescription className="text-xs">Daily activity</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bucketData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }} width={35} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="backtests" name="Backtests" fill={CHART_COLORS.backtests} radius={[4, 4, 0, 0]} />
                <Bar dataKey="strategies" name="Strategies" fill={CHART_COLORS.strategies} radius={[4, 4, 0, 0]} />
                <Bar dataKey="datasets" name="Datasets" fill={CHART_COLORS.datasets} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Role Distribution Pie */}
      {roleCounts.length > 0 && (
        <Card className="rounded-2xl border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">User Role Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-8">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={roleCounts}
                    dataKey="count"
                    nameKey="role"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {roleCounts.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {roleCounts.map((r, i) => (
                  <div key={r.role} className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-sm capitalize font-medium">{r.role}</span>
                    <Badge variant="outline" className="text-xs">{r.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
