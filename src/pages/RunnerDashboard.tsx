/**
 * Runner & Terminals Dashboard
 * Register runners, view health, manage terminals, start/stop runs
 */
import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import {
  Server, Plus, Wifi, WifiOff, Clock, RefreshCw, Copy, Eye, EyeOff,
  Terminal, Cpu, HardDrive, Activity, AlertTriangle, Play, Square,
  OctagonX, Bot, Settings2, Trash2, MemoryStick,
} from 'lucide-react';

interface Runner {
  id: string;
  name: string;
  os: string;
  ip_hint: string | null;
  runner_key: string;
  status: string;
  last_heartbeat_at: string | null;
  last_seen_version: string | null;
  created_at: string;
}

interface TerminalRow {
  id: string;
  runner_id: string;
  label: string;
  terminal_path: string | null;
  portable_mode: boolean;
  status: string;
  last_start_at: string | null;
  last_error: string | null;
  restart_count: number;
  created_at: string;
}

interface Heartbeat {
  id: string;
  cpu: number | null;
  ram: number | null;
  disk_free: number | null;
  mt5_alive: boolean;
  controller_alive: boolean;
  last_tick_at: string | null;
  created_at: string;
}

interface RunRow {
  id: string;
  symbol: string;
  timeframe: string;
  status: string;
  mode: string;
  started_at: string | null;
  stopped_at: string | null;
  last_heartbeat_at: string | null;
  last_error: string | null;
  created_at: string;
  ea_id: string;
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

function RunnerStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    online: { color: 'bg-chart-2/20 text-chart-2', label: '● Online' },
    offline: { color: 'bg-muted text-muted-foreground', label: '○ Offline' },
    error: { color: 'bg-destructive/20 text-destructive', label: '✕ Error' },
    disabled: { color: 'bg-warning/20 text-warning', label: '⊘ Disabled' },
  };
  const c = config[status] || config.offline;
  return <Badge variant="outline" className={cn('text-xs', c.color)}>{c.label}</Badge>;
}

function RunStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    queued: 'bg-muted text-muted-foreground',
    starting: 'bg-primary/20 text-primary',
    running: 'bg-chart-2/20 text-chart-2',
    stopping: 'bg-warning/20 text-warning',
    stopped: 'bg-muted text-muted-foreground',
    error: 'bg-destructive/20 text-destructive',
  };
  return <Badge variant="outline" className={cn('text-xs', colors[status] || '')}>{status.toUpperCase()}</Badge>;
}

export default function RunnerDashboard() {
  const { user } = useAuth();
  const { copy } = useCopyToClipboard({ successMessage: 'Runner key copied!' });
  const [runners, setRunners] = useState<Runner[]>([]);
  const [terminals, setTerminals] = useState<TerminalRow[]>([]);
  const [heartbeats, setHeartbeats] = useState<Heartbeat[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [selectedRunner, setSelectedRunner] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('runners');

  // Register dialog
  const [regOpen, setRegOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regOs, setRegOs] = useState('windows');
  const [regIp, setRegIp] = useState('');

  const fetchRunners = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('mt5_runners').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) {
      setRunners(data as unknown as Runner[]);
      if (!selectedRunner && data.length > 0) setSelectedRunner(data[0].id);
    }
    setLoading(false);
  }, [user, selectedRunner]);

  const fetchRunnerData = useCallback(async () => {
    if (!selectedRunner || !user) return;
    const [termRes, hbRes, runRes] = await Promise.all([
      supabase.from('mt5_terminals').select('*').eq('runner_id', selectedRunner).order('created_at'),
      supabase.from('runner_heartbeats').select('*').eq('runner_id', selectedRunner).order('created_at', { ascending: false }).limit(20),
      supabase.from('ea_runs').select('*').eq('user_id', user.id).in('status', ['queued', 'starting', 'running', 'stopping']).order('created_at', { ascending: false }).limit(20),
    ]);
    if (termRes.data) setTerminals(termRes.data as unknown as TerminalRow[]);
    if (hbRes.data) setHeartbeats(hbRes.data as unknown as Heartbeat[]);
    if (runRes.data) setRuns(runRes.data as unknown as RunRow[]);
  }, [selectedRunner, user]);

  useEffect(() => { fetchRunners(); }, [fetchRunners]);
  useEffect(() => { fetchRunnerData(); }, [fetchRunnerData]);
  useEffect(() => {
    const iv = setInterval(() => { fetchRunners(); fetchRunnerData(); }, 10000);
    return () => clearInterval(iv);
  }, [fetchRunners, fetchRunnerData]);

  const handleRegister = async () => {
    if (!user || !regName.trim()) return;
    const { data, error } = await supabase.from('mt5_runners').insert({
      user_id: user.id,
      name: regName.trim(),
      os: regOs,
      ip_hint: regIp || null,
    } as any).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success('Runner registered! Copy the runner key below.');
    setRegOpen(false);
    setRegName('');
    setRegIp('');
    fetchRunners();
    if (data) {
      setSelectedRunner((data as any).id);
      setShowKey({ [(data as any).id]: true });
    }
  };

  const handleDeleteRunner = async (id: string) => {
    if (!confirm('Delete this runner and all its terminals?')) return;
    await supabase.from('mt5_runners').delete().eq('id', id);
    toast.success('Runner deleted');
    fetchRunners();
  };

  const currentRunner = runners.find(r => r.id === selectedRunner);
  const latestHb = heartbeats[0];
  const runnerTerminals = terminals.filter(t => t.runner_id === selectedRunner);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Server className="h-8 w-8 animate-pulse text-primary mx-auto" />
          <p className="text-muted-foreground">Loading Runner Dashboard...</p>
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
            Runners & Terminals
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage VPS runners, MT5 terminals, and active EA runs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => { fetchRunners(); fetchRunnerData(); toast.success('Refreshed'); }}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button onClick={() => setRegOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Register Runner
          </Button>
        </div>
      </div>

      {/* Runner Cards */}
      {runners.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {runners.map(r => (
            <Card key={r.id}
              className={cn('cursor-pointer transition-all hover:border-primary/40',
                selectedRunner === r.id && 'border-primary ring-1 ring-primary/20')}
              onClick={() => setSelectedRunner(r.id)}>
              <CardContent className="py-4 px-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{r.name}</span>
                  </div>
                  <RunnerStatusBadge status={r.status} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{r.os} {r.ip_hint ? `• ${r.ip_hint}` : ''}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(r.last_heartbeat_at)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-muted-foreground">Key:</span>
                    {showKey[r.id] ? (
                      <span className="text-[10px] font-mono select-all">{r.runner_key}</span>
                    ) : (
                      <span className="text-[10px] font-mono">••••••••</span>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setShowKey(prev => ({ ...prev, [r.id]: !prev[r.id] })); }}
                      className="p-0.5 hover:bg-muted rounded">
                      {showKey[r.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); copy(r.runner_key); }}
                      className="p-0.5 hover:bg-muted rounded">
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteRunner(r.id); }}
                    className="p-1 hover:bg-destructive/10 rounded text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="py-10 text-center space-y-4">
            <Server className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">No Runners Registered</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Register a Windows VPS runner to start headless MT5 execution.
              </p>
            </div>
            <Button onClick={() => setRegOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Register Runner
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Detail Tabs */}
      {currentRunner && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="runners" className="text-xs">
              <Terminal className="h-3 w-3 mr-1" /> Terminals ({runnerTerminals.length})
            </TabsTrigger>
            <TabsTrigger value="health" className="text-xs">
              <Activity className="h-3 w-3 mr-1" /> Health
            </TabsTrigger>
            <TabsTrigger value="runs" className="text-xs">
              <Play className="h-3 w-3 mr-1" /> Active Runs ({runs.length})
            </TabsTrigger>
            <TabsTrigger value="commands" className="text-xs">
              <Settings2 className="h-3 w-3 mr-1" /> Commands
            </TabsTrigger>
          </TabsList>

          <TabsContent value="runners" className="space-y-3">
            {runnerTerminals.length > 0 ? runnerTerminals.map(t => (
              <Card key={t.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Terminal className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-semibold text-sm">{t.label}</p>
                        <p className="text-xs text-muted-foreground font-mono">{t.terminal_path || 'Path not set'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('text-xs',
                        t.status === 'running' ? 'bg-chart-2/20 text-chart-2' :
                        t.status === 'error' ? 'bg-destructive/20 text-destructive' :
                        'bg-muted text-muted-foreground'
                      )}>{t.status}</Badge>
                      {t.restart_count > 3 && (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Crash loop ({t.restart_count})
                        </Badge>
                      )}
                    </div>
                  </div>
                  {t.last_error && (
                    <p className="text-xs text-destructive mt-2 font-mono">{t.last_error}</p>
                  )}
                </CardContent>
              </Card>
            )) : (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Terminal className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No terminals registered yet. Terminals are auto-created when the Runner Agent starts.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="health" className="space-y-3">
            {latestHb ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="py-3 text-center">
                    <Cpu className="h-5 w-5 text-primary mx-auto mb-1" />
                    <p className="text-2xl font-bold">{latestHb.cpu?.toFixed(1) || '—'}%</p>
                    <p className="text-xs text-muted-foreground">CPU Usage</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-3 text-center">
                    <MemoryStick className="h-5 w-5 text-primary mx-auto mb-1" />
                    <p className="text-2xl font-bold">{latestHb.ram?.toFixed(1) || '—'}%</p>
                    <p className="text-xs text-muted-foreground">RAM Usage</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-3 text-center">
                    <HardDrive className="h-5 w-5 text-primary mx-auto mb-1" />
                    <p className="text-2xl font-bold">{latestHb.disk_free?.toFixed(1) || '—'} GB</p>
                    <p className="text-xs text-muted-foreground">Disk Free</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-3 text-center">
                    <Activity className="h-5 w-5 text-primary mx-auto mb-1" />
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span className={cn('text-xs', latestHb.mt5_alive ? 'text-chart-2' : 'text-destructive')}>
                        MT5: {latestHb.mt5_alive ? '✓' : '✕'}
                      </span>
                      <span className={cn('text-xs', latestHb.controller_alive ? 'text-chart-2' : 'text-destructive')}>
                        Ctrl: {latestHb.controller_alive ? '✓' : '✕'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Services</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No heartbeat data yet. Waiting for runner to connect...</p>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recent Heartbeats</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-1">
                    {heartbeats.map(hb => (
                      <div key={hb.id} className="flex items-center justify-between text-xs py-1 border-b border-border/30">
                        <span className="text-muted-foreground">{new Date(hb.created_at).toLocaleTimeString()}</span>
                        <span>CPU: {hb.cpu?.toFixed(0)}% | RAM: {hb.ram?.toFixed(0)}%</span>
                        <span className={hb.mt5_alive ? 'text-chart-2' : 'text-destructive'}>
                          MT5 {hb.mt5_alive ? '●' : '○'}
                        </span>
                      </div>
                    ))}
                    {heartbeats.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No heartbeats</p>}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="runs" className="space-y-3">
            {runs.length > 0 ? runs.map(r => (
              <Card key={r.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bot className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-semibold text-sm">{r.symbol} • {r.timeframe}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{r.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <RunStatusBadge status={r.status} />
                      <Badge variant="outline" className="text-[10px]">{r.mode}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>Started: {r.started_at ? new Date(r.started_at).toLocaleString() : 'Pending'}</span>
                    <span>Heartbeat: {timeAgo(r.last_heartbeat_at)}</span>
                  </div>
                  {r.last_error && (
                    <p className="text-xs text-destructive mt-1 font-mono">{r.last_error}</p>
                  )}
                </CardContent>
              </Card>
            )) : (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Play className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No active runs. Start a run from the Run Console.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="commands">
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Settings2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Command queue viewer — commands are auto-managed by the Run Console.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Register Dialog */}
      <Dialog open={regOpen} onOpenChange={setRegOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" /> Register New Runner
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Runner Name *</Label>
              <Input value={regName} onChange={e => setRegName(e.target.value)} placeholder="e.g., VPS-Mumbai-01" />
            </div>
            <div className="space-y-2">
              <Label>OS</Label>
              <Select value={regOs} onValueChange={setRegOs}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="windows">Windows</SelectItem>
                  <SelectItem value="linux">Linux (Wine)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>IP Hint (optional)</Label>
              <Input value={regIp} onChange={e => setRegIp(e.target.value)} placeholder="e.g., 103.21.x.x" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegOpen(false)}>Cancel</Button>
            <Button onClick={handleRegister} disabled={!regName.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
