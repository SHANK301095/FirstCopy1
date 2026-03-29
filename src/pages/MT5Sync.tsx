/**
 * MT5 Sync Health Dashboard v2
 * Connection matrix, sync status, positions, orders, deals, reconciliation, kill switch, circuit breaker
 */

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MQL5EATemplate } from '@/components/mt5/MQL5EATemplate';
import { MT5SetupWizard } from '@/components/mt5/MT5SetupWizard';
import {
  Activity, Wifi, WifiOff, Clock, RefreshCw, AlertTriangle, CheckCircle,
  XCircle, TrendingUp, TrendingDown, Zap, Shield, Layers,
  ArrowUpDown, Server, Signal, History, OctagonX, Gauge, ShieldAlert,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
} from 'recharts';

// ── Types ──
interface MT5Account {
  id: string;
  account_number: string;
  broker_name: string;
  server_name: string | null;
  terminal_build: string | null;
  leverage: number;
  currency: string;
  connection_status: 'connected' | 'degraded' | 'disconnected' | 'error';
  last_heartbeat_at: string | null;
  last_sync_at: string | null;
  sync_latency_ms: number | null;
  is_active: boolean;
  created_at: string;
}

interface MT5Position {
  id: string;
  ticket: number;
  symbol: string;
  direction: 'buy' | 'sell';
  volume: number;
  open_price: number;
  current_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  profit: number | null;
  swap: number | null;
  commission: number | null;
  open_time: string;
  is_open: boolean;
  synced_at: string;
}

interface MT5Order {
  id: string;
  ticket: number;
  symbol: string;
  order_type: string;
  volume: number;
  price: number;
  stop_loss: number | null;
  take_profit: number | null;
  state: string;
  order_time: string;
  synced_at: string;
}

interface MT5Deal {
  id: string;
  deal_ticket: number;
  symbol: string;
  deal_type: string;
  entry_type: string | null;
  volume: number | null;
  price: number | null;
  profit: number | null;
  deal_time: string;
  synced_at: string;
}

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  records_synced: number;
  mismatch_count: number;
  mismatch_severity: string;
  error_message: string | null;
}

interface EquitySnapshot {
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  floating_pl: number;
  snapshot_at: string;
}

interface RiskConfig {
  id: string;
  scope: string;
  kill_switch_active: boolean;
  kill_switch_reason: string | null;
  kill_switch_at: string | null;
  circuit_breaker_enabled: boolean;
  max_consecutive_errors: number;
  error_window_minutes: number;
  current_error_count: number;
  circuit_open_until: string | null;
  max_lot_size: number;
  max_daily_loss_pct: number;
  max_positions: number;
}

interface Reconciliation {
  id: string;
  reconciled_at: string;
  expected_positions: number;
  actual_positions: number;
  position_mismatches: any[];
  expected_orders: number;
  actual_orders: number;
  order_mismatches: any[];
  severity: string;
  auto_healed: number;
  manual_required: number;
}

// ── Connection Status Badge ──
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    connected: { color: 'bg-chart-2/20 text-chart-2', icon: <Wifi className="h-3 w-3" />, label: 'Connected' },
    degraded: { color: 'bg-warning/20 text-warning', icon: <Signal className="h-3 w-3" />, label: 'Degraded' },
    disconnected: { color: 'bg-muted text-muted-foreground', icon: <WifiOff className="h-3 w-3" />, label: 'Disconnected' },
    error: { color: 'bg-destructive/20 text-destructive', icon: <XCircle className="h-3 w-3" />, label: 'Error' },
  };
  const c = config[status] || config.disconnected;
  return (
    <Badge variant="outline" className={cn('flex items-center gap-1 text-xs', c.color)}>
      {c.icon} {c.label}
    </Badge>
  );
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 5000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    none: 'bg-chart-2/20 text-chart-2',
    info: 'bg-primary/20 text-primary',
    warning: 'bg-warning/20 text-warning',
    critical: 'bg-destructive/20 text-destructive',
  };
  return (
    <Badge variant="outline" className={cn('text-[10px]', colors[severity] || colors.info)}>
      {severity.toUpperCase()}
    </Badge>
  );
}

// ── Main Page Component ──
export default function MT5Sync() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [positions, setPositions] = useState<MT5Position[]>([]);
  const [orders, setOrders] = useState<MT5Order[]>([]);
  const [deals, setDeals] = useState<MT5Deal[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [equityData, setEquityData] = useState<EquitySnapshot[]>([]);
  const [riskConfig, setRiskConfig] = useState<RiskConfig | null>(null);
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  const fetchAccounts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('mt5_accounts').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) {
      setAccounts(data as MT5Account[]);
      if (!selectedAccount && data.length > 0) setSelectedAccount(data[0].id);
    }
    setLoading(false);
  }, [user, selectedAccount]);

  const fetchAccountData = useCallback(async () => {
    if (!selectedAccount || !user) return;
    const [posRes, ordRes, dealRes, logRes, eqRes, riskRes, reconRes] = await Promise.all([
      supabase.from('mt5_positions').select('*').eq('account_id', selectedAccount).eq('is_open', true).order('open_time', { ascending: false }),
      supabase.from('mt5_orders').select('*').eq('account_id', selectedAccount).order('order_time', { ascending: false }).limit(50),
      supabase.from('mt5_deals').select('*').eq('account_id', selectedAccount).order('deal_time', { ascending: false }).limit(100),
      supabase.from('mt5_sync_log').select('*').eq('account_id', selectedAccount).order('started_at', { ascending: false }).limit(50),
      supabase.from('mt5_equity_snapshots').select('*').eq('account_id', selectedAccount).order('snapshot_at', { ascending: false }).limit(200),
      supabase.from('mt5_risk_config').select('*').eq('user_id', user.id).eq('account_id', selectedAccount).eq('scope', 'account').maybeSingle(),
      supabase.from('mt5_reconciliation').select('*').eq('account_id', selectedAccount).order('reconciled_at', { ascending: false }).limit(20),
    ]);
    if (posRes.data) setPositions(posRes.data as MT5Position[]);
    if (ordRes.data) setOrders(ordRes.data as MT5Order[]);
    if (dealRes.data) setDeals(dealRes.data as MT5Deal[]);
    if (logRes.data) setSyncLogs(logRes.data as SyncLog[]);
    if (eqRes.data) setEquityData((eqRes.data as EquitySnapshot[]).reverse());
    if (riskRes.data) setRiskConfig(riskRes.data as RiskConfig);
    if (reconRes.data) setReconciliations(reconRes.data as Reconciliation[]);
  }, [selectedAccount, user]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);
  useEffect(() => { fetchAccountData(); }, [fetchAccountData]);

  useEffect(() => {
    if (!selectedAccount) return;
    const channel = supabase.channel(`mt5-sync-${selectedAccount}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mt5_accounts', filter: `id=eq.${selectedAccount}` }, () => fetchAccounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mt5_positions', filter: `account_id=eq.${selectedAccount}` }, () => fetchAccountData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mt5_sync_log', filter: `account_id=eq.${selectedAccount}` }, () => fetchAccountData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mt5_risk_config' }, () => fetchAccountData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mt5_reconciliation', filter: `account_id=eq.${selectedAccount}` }, () => fetchAccountData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedAccount, fetchAccounts, fetchAccountData]);

  useEffect(() => {
    const iv = setInterval(() => { fetchAccounts(); fetchAccountData(); }, 10000);
    return () => clearInterval(iv);
  }, [fetchAccounts, fetchAccountData]);

  // ── Kill Switch Toggle ──
  const toggleKillSwitch = async () => {
    if (!riskConfig || !user) return;
    const newState = !riskConfig.kill_switch_active;
    const { error } = await supabase.from('mt5_risk_config').update({
      kill_switch_active: newState,
      kill_switch_reason: newState ? 'Manual activation from dashboard' : null,
      kill_switch_at: newState ? new Date().toISOString() : null,
    }).eq('id', riskConfig.id);
    if (error) { toast.error('Failed to toggle kill switch'); return; }
    toast[newState ? 'warning' : 'success'](newState ? '⚠️ Kill switch ACTIVATED — all sync paused' : '✅ Kill switch deactivated — sync resumed');
    fetchAccountData();
  };

  // ── Circuit Breaker Reset ──
  const resetCircuitBreaker = async () => {
    if (!riskConfig) return;
    await supabase.from('mt5_risk_config').update({
      current_error_count: 0,
      circuit_open_until: null,
      last_error_at: null,
    }).eq('id', riskConfig.id);
    toast.success('Circuit breaker reset');
    fetchAccountData();
  };

  // ── Update Risk Config ──
  const updateRiskField = async (field: string, value: any) => {
    if (!riskConfig) return;
    await supabase.from('mt5_risk_config').update({ [field]: value }).eq('id', riskConfig.id);
    fetchAccountData();
  };

  const currentAccount = accounts.find(a => a.id === selectedAccount);
  const totalPL = positions.reduce((sum, p) => sum + (p.profit || 0), 0);
  const successRate = syncLogs.length > 0
    ? Math.round((syncLogs.filter(l => l.status === 'success').length / syncLogs.length) * 100) : 0;
  const avgLatency = syncLogs.filter(l => l.duration_ms).length > 0
    ? Math.round(syncLogs.filter(l => l.duration_ms).reduce((s, l) => s + (l.duration_ms || 0), 0) / syncLogs.filter(l => l.duration_ms).length) : 0;
  const isCircuitOpen = riskConfig?.circuit_open_until ? new Date(riskConfig.circuit_open_until) > new Date() : false;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Activity className="h-8 w-8 animate-pulse text-primary mx-auto" />
          <p className="text-muted-foreground">Loading MT5 Sync Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Server className="h-7 w-7 text-primary" />
            MT5 Sync Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time health, positions, reconciliation & risk guardrails
          </p>
        </div>
        <div className="flex items-center gap-2">
          {riskConfig?.kill_switch_active && (
            <Badge variant="destructive" className="animate-pulse text-xs">
              <OctagonX className="h-3 w-3 mr-1" /> KILL SWITCH ACTIVE
            </Badge>
          )}
          {isCircuitOpen && (
            <Badge variant="outline" className="text-warning border-warning/50 text-xs">
              <Gauge className="h-3 w-3 mr-1" /> CIRCUIT OPEN
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => { fetchAccounts(); fetchAccountData(); toast.success('Refreshed'); }}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          {accounts.length > 0 && (
            <select className="text-sm border rounded-lg px-3 py-1.5 bg-background"
              value={selectedAccount || ''} onChange={(e) => setSelectedAccount(e.target.value)}>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.broker_name} — #{a.account_number}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Connection Health Matrix */}
      {accounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {accounts.map(acc => (
            <Card key={acc.id}
              className={cn('cursor-pointer transition-all hover:border-primary/40',
                selectedAccount === acc.id && 'border-primary ring-1 ring-primary/20')}
              onClick={() => setSelectedAccount(acc.id)}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-bold">#{acc.account_number}</span>
                  <StatusBadge status={acc.connection_status} />
                </div>
                <p className="text-xs text-muted-foreground truncate">{acc.broker_name}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(acc.last_heartbeat_at)}</span>
                  {acc.sync_latency_ms && <span className="font-mono">{acc.sync_latency_ms}ms</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="py-10 text-center space-y-4">
            <WifiOff className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">No MT5 Accounts Connected</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Download the Sync Bridge EA below, install it on MT5, and it will auto-register.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-8">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="positions" className="text-xs">Positions ({positions.length})</TabsTrigger>
          <TabsTrigger value="orders" className="text-xs">Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="deals" className="text-xs">Deals ({deals.length})</TabsTrigger>
          <TabsTrigger value="reconciliation" className="text-xs">Reconciliation</TabsTrigger>
          <TabsTrigger value="risk" className="text-xs">Risk Guard</TabsTrigger>
          <TabsTrigger value="sync-log" className="text-xs">Sync Log</TabsTrigger>
          <TabsTrigger value="setup" className="text-xs">EA Setup</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="Connection" value={currentAccount?.connection_status || 'N/A'} icon={<Wifi className="h-4 w-4" />}
              color={currentAccount?.connection_status === 'connected' ? 'text-chart-2' : 'text-destructive'} />
            <KPICard label="Open Positions" value={String(positions.length)} icon={<Layers className="h-4 w-4" />} />
            <KPICard label="Floating P/L" value={`$${totalPL.toFixed(2)}`} icon={totalPL >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              color={totalPL >= 0 ? 'text-chart-2' : 'text-destructive'} />
            <KPICard label="Sync Success" value={`${successRate}%`} icon={<CheckCircle className="h-4 w-4" />}
              color={successRate >= 90 ? 'text-chart-2' : successRate >= 70 ? 'text-warning' : 'text-destructive'} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="Avg Latency" value={`${avgLatency}ms`} icon={<Zap className="h-4 w-4" />} />
            <KPICard label="Last Sync" value={timeAgo(currentAccount?.last_sync_at || null)} icon={<Clock className="h-4 w-4" />} />
            <KPICard label="Total Deals" value={String(deals.length)} icon={<ArrowUpDown className="h-4 w-4" />} />
            <KPICard label="Leverage" value={`1:${currentAccount?.leverage || '?'}`} icon={<Shield className="h-4 w-4" />} />
          </div>

          {equityData.length > 1 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Equity Timeline</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityData}>
                      <defs>
                        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="snapshot_at" hide />
                      <YAxis hide domain={['auto', 'auto']} />
                      <RTooltip content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-popover p-2 shadow text-xs space-y-1">
                            <p>Balance: ${d.balance?.toFixed(2)}</p>
                            <p>Equity: ${d.equity?.toFixed(2)}</p>
                            <p>Floating: ${d.floating_pl?.toFixed(2)}</p>
                          </div>
                        );
                      }} />
                      <Area type="monotone" dataKey="equity" stroke="hsl(var(--primary))" fill="url(#eqGrad)" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="balance" stroke="hsl(var(--muted-foreground))" fill="none" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Sync Activity</CardTitle></CardHeader>
            <CardContent>
              {syncLogs.length > 0 ? (
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {syncLogs.slice(0, 15).map(log => (
                    <div key={log.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-muted/30 text-xs">
                      <div className="flex items-center gap-2">
                        {log.status === 'success' ? <CheckCircle className="h-3 w-3 text-chart-2" /> :
                         log.status === 'failed' ? <XCircle className="h-3 w-3 text-destructive" /> :
                         <Clock className="h-3 w-3 text-muted-foreground" />}
                        <Badge variant="outline" className="text-[10px]">{log.sync_type}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>{log.records_synced} records</span>
                        {log.duration_ms && <span className="font-mono">{log.duration_ms}ms</span>}
                        <span>{timeAgo(log.started_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No sync activity yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Positions Tab */}
        <TabsContent value="positions">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Open Positions</CardTitle></CardHeader>
            <CardContent>
              {positions.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-background border-b">
                      <tr className="text-muted-foreground">
                        <th className="text-left py-2 px-2">Ticket</th>
                        <th className="text-left py-2 px-2">Symbol</th>
                        <th className="text-left py-2 px-2">Dir</th>
                        <th className="text-right py-2 px-2">Volume</th>
                        <th className="text-right py-2 px-2">Open</th>
                        <th className="text-right py-2 px-2">Current</th>
                        <th className="text-right py-2 px-2">SL</th>
                        <th className="text-right py-2 px-2">TP</th>
                        <th className="text-right py-2 px-2">P/L</th>
                        <th className="text-right py-2 px-2">Synced</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map(pos => (
                        <tr key={pos.id} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="py-2 px-2 font-mono">{pos.ticket}</td>
                          <td className="py-2 px-2 font-semibold">{pos.symbol}</td>
                          <td className="py-2 px-2">
                            <Badge variant="outline" className={cn('text-[10px]',
                              pos.direction === 'buy' ? 'border-chart-2/50 text-chart-2' : 'border-destructive/50 text-destructive'
                            )}>{pos.direction.toUpperCase()}</Badge>
                          </td>
                          <td className="py-2 px-2 text-right font-mono">{pos.volume}</td>
                          <td className="py-2 px-2 text-right font-mono">{pos.open_price}</td>
                          <td className="py-2 px-2 text-right font-mono">{pos.current_price || '—'}</td>
                          <td className="py-2 px-2 text-right font-mono text-muted-foreground">{pos.stop_loss || '—'}</td>
                          <td className="py-2 px-2 text-right font-mono text-muted-foreground">{pos.take_profit || '—'}</td>
                          <td className={cn('py-2 px-2 text-right font-mono font-bold',
                            (pos.profit || 0) >= 0 ? 'text-chart-2' : 'text-destructive'
                          )}>${(pos.profit || 0).toFixed(2)}</td>
                          <td className="py-2 px-2 text-right text-muted-foreground">{timeAgo(pos.synced_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No open positions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Pending Orders</CardTitle></CardHeader>
            <CardContent>
              {orders.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-background border-b">
                      <tr className="text-muted-foreground">
                        <th className="text-left py-2 px-2">Ticket</th>
                        <th className="text-left py-2 px-2">Symbol</th>
                        <th className="text-left py-2 px-2">Type</th>
                        <th className="text-right py-2 px-2">Volume</th>
                        <th className="text-right py-2 px-2">Price</th>
                        <th className="text-left py-2 px-2">State</th>
                        <th className="text-right py-2 px-2">Placed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(ord => (
                        <tr key={ord.id} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="py-2 px-2 font-mono">{ord.ticket}</td>
                          <td className="py-2 px-2 font-semibold">{ord.symbol}</td>
                          <td className="py-2 px-2">
                            <Badge variant="outline" className="text-[10px]">{ord.order_type.replace('_', ' ').toUpperCase()}</Badge>
                          </td>
                          <td className="py-2 px-2 text-right font-mono">{ord.volume}</td>
                          <td className="py-2 px-2 text-right font-mono">{ord.price}</td>
                          <td className="py-2 px-2">
                            <Badge variant="outline" className={cn('text-[10px]',
                              ord.state === 'placed' ? 'text-primary' : ord.state === 'filled' ? 'text-chart-2' : 'text-muted-foreground'
                            )}>{ord.state}</Badge>
                          </td>
                          <td className="py-2 px-2 text-right text-muted-foreground">{timeAgo(ord.order_time)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <ArrowUpDown className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No pending orders</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deals Tab */}
        <TabsContent value="deals">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Deal History</CardTitle></CardHeader>
            <CardContent>
              {deals.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-background border-b">
                      <tr className="text-muted-foreground">
                        <th className="text-left py-2 px-2">Ticket</th>
                        <th className="text-left py-2 px-2">Symbol</th>
                        <th className="text-left py-2 px-2">Type</th>
                        <th className="text-left py-2 px-2">Entry</th>
                        <th className="text-right py-2 px-2">Volume</th>
                        <th className="text-right py-2 px-2">Price</th>
                        <th className="text-right py-2 px-2">Profit</th>
                        <th className="text-right py-2 px-2">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deals.map(deal => (
                        <tr key={deal.id} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="py-2 px-2 font-mono">{deal.deal_ticket}</td>
                          <td className="py-2 px-2 font-semibold">{deal.symbol}</td>
                          <td className="py-2 px-2">
                            <Badge variant="outline" className={cn('text-[10px]',
                              deal.deal_type === 'buy' ? 'text-chart-2' : deal.deal_type === 'sell' ? 'text-destructive' : 'text-muted-foreground'
                            )}>{deal.deal_type.toUpperCase()}</Badge>
                          </td>
                          <td className="py-2 px-2 text-muted-foreground">{deal.entry_type || '—'}</td>
                          <td className="py-2 px-2 text-right font-mono">{deal.volume || '—'}</td>
                          <td className="py-2 px-2 text-right font-mono">{deal.price || '—'}</td>
                          <td className={cn('py-2 px-2 text-right font-mono font-bold',
                            (deal.profit || 0) >= 0 ? 'text-chart-2' : 'text-destructive'
                          )}>{deal.profit != null ? `$${deal.profit.toFixed(2)}` : '—'}</td>
                          <td className="py-2 px-2 text-right text-muted-foreground">{timeAgo(deal.deal_time)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No deals recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reconciliation Tab */}
        <TabsContent value="reconciliation" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-primary" /> Reconciliation History
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {reconciliations.filter(r => r.severity === 'none').length}/{reconciliations.length} clean
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {reconciliations.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {reconciliations.map(r => (
                      <div key={r.id} className="border rounded-lg p-3 space-y-2 hover:bg-muted/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <SeverityBadge severity={r.severity} />
                            <span className="text-xs text-muted-foreground">{timeAgo(r.reconciled_at)}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span>Positions: {r.actual_positions}/{r.expected_positions}</span>
                            <span>Orders: {r.actual_orders}/{r.expected_orders}</span>
                          </div>
                        </div>
                        {r.position_mismatches && (r.position_mismatches as any[]).length > 0 && (
                          <div className="space-y-1">
                            {(r.position_mismatches as any[]).map((m: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-muted/30">
                                <Badge variant="outline" className={cn('text-[10px]',
                                  m.severity === 'critical' ? 'text-destructive' : 'text-warning'
                                )}>{m.type}</Badge>
                                <span className="font-mono">Ticket #{m.ticket}</span>
                                <span className="text-muted-foreground">{m.detail}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {r.severity === 'none' && (
                          <p className="text-xs text-chart-2 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> All clear — no mismatches
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No reconciliation data yet</p>
                  <p className="text-xs mt-1">EA will auto-reconcile during sync cycles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Guard Tab */}
        <TabsContent value="risk" className="space-y-4">
          {/* Kill Switch */}
          <Card className={cn(riskConfig?.kill_switch_active && 'border-destructive/50 bg-destructive/5')}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <OctagonX className="h-4 w-4 text-destructive" /> Emergency Kill Switch
                </CardTitle>
                <Switch checked={riskConfig?.kill_switch_active || false} onCheckedChange={toggleKillSwitch} />
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {riskConfig?.kill_switch_active ? (
                <div className="space-y-1">
                  <p className="text-destructive font-semibold">⚠️ All sync operations are PAUSED</p>
                  <p>Reason: {riskConfig.kill_switch_reason || 'Manual activation'}</p>
                  <p>Activated: {timeAgo(riskConfig.kill_switch_at)}</p>
                </div>
              ) : (
                <p>Activate to immediately pause all sync operations for this account. EA heartbeats will still be received.</p>
              )}
            </CardContent>
          </Card>

          {/* Circuit Breaker */}
          <Card className={cn(isCircuitOpen && 'border-warning/50 bg-warning/5')}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-warning" /> Circuit Breaker
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Switch checked={riskConfig?.circuit_breaker_enabled || false}
                    onCheckedChange={(v) => updateRiskField('circuit_breaker_enabled', v)} />
                  {isCircuitOpen && (
                    <Button size="sm" variant="outline" onClick={resetCircuitBreaker} className="text-xs h-7">Reset</Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Error Count</Label>
                  <p className={cn('font-mono text-lg font-bold',
                    (riskConfig?.current_error_count || 0) >= (riskConfig?.max_consecutive_errors || 5) ? 'text-destructive' : 'text-foreground'
                  )}>{riskConfig?.current_error_count || 0} / {riskConfig?.max_consecutive_errors || 5}</p>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Error Window</Label>
                  <p className="font-mono text-lg font-bold">{riskConfig?.error_window_minutes || 10}min</p>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Status</Label>
                  <p className={cn('text-lg font-bold', isCircuitOpen ? 'text-warning' : 'text-chart-2')}>
                    {isCircuitOpen ? 'OPEN' : 'CLOSED'}
                  </p>
                </div>
              </div>
              {isCircuitOpen && (
                <p className="text-xs text-warning mt-2">
                  Circuit opens until: {new Date(riskConfig!.circuit_open_until!).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Risk Rules */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Risk Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Max Lot Size</Label>
                  <Input type="number" className="h-8 text-sm font-mono" value={riskConfig?.max_lot_size || 10}
                    onChange={(e) => updateRiskField('max_lot_size', parseFloat(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max Daily Loss %</Label>
                  <Input type="number" className="h-8 text-sm font-mono" value={riskConfig?.max_daily_loss_pct || 5}
                    onChange={(e) => updateRiskField('max_daily_loss_pct', parseFloat(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max Open Positions</Label>
                  <Input type="number" className="h-8 text-sm font-mono" value={riskConfig?.max_positions || 20}
                    onChange={(e) => updateRiskField('max_positions', parseInt(e.target.value))} />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3">These rules are enforced server-side during outbound sync (Phase B).</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Log Tab */}
        <TabsContent value="sync-log">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Sync Audit Trail</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Success Rate: {successRate}%</Badge>
                  <Badge variant="outline" className="text-xs font-mono">Avg: {avgLatency}ms</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {syncLogs.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-1">
                    {syncLogs.map(log => (
                      <div key={log.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/20 text-xs border-b border-border/20">
                        <div className="flex items-center gap-3">
                          {log.status === 'success' ? <CheckCircle className="h-3.5 w-3.5 text-chart-2" /> :
                           log.status === 'failed' ? <XCircle className="h-3.5 w-3.5 text-destructive" /> :
                           log.status === 'partial' ? <AlertTriangle className="h-3.5 w-3.5 text-warning" /> :
                           <Clock className="h-3.5 w-3.5 text-muted-foreground animate-pulse" />}
                          <Badge variant="outline" className="text-[10px] font-mono">{log.sync_type}</Badge>
                          <span className="text-muted-foreground">{log.records_synced} records</span>
                          {log.mismatch_count > 0 && (
                            <Badge variant="outline" className={cn('text-[10px]',
                              log.mismatch_severity === 'critical' ? 'text-destructive' :
                              log.mismatch_severity === 'warning' ? 'text-warning' : 'text-muted-foreground'
                            )}>{log.mismatch_count} mismatches</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          {log.error_message && <span className="text-destructive truncate max-w-[150px]">{log.error_message}</span>}
                          {log.duration_ms != null && <span className="font-mono">{log.duration_ms}ms</span>}
                          <span>{timeAgo(log.started_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No sync logs yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EA Setup Tab — Guided Wizard + Advanced EA Template */}
        <TabsContent value="setup" className="space-y-6">
          <MT5SetupWizard onComplete={() => { setTab('overview'); fetchAccounts(); }} />
          <Separator />
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 py-2">
              <Shield className="h-4 w-4" /> Advanced: Full EA Template & WebRequest Setup
            </summary>
            <div className="mt-4 space-y-4">
              <MQL5EATemplate />
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" /> MT5 WebRequest Setup
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p>MT5 requires you to whitelist URLs for WebRequest:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open MT5 → Tools → Options → Expert Advisors tab</li>
                    <li>Check "Allow WebRequest for listed URL"</li>
                    <li>Add your sync endpoint URL (shown in the EA template above)</li>
                    <li>Click OK and restart the EA</li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          </details>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPICard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color?: string }) {
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">{icon}{label}</div>
        <div className={cn('text-lg font-mono font-bold', color)}>{value}</div>
      </CardContent>
    </Card>
  );
}
