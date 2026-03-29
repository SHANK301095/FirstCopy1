/**
 * Run Console — Start/Stop/Monitor EA runs on headless MT5 terminals
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Play, Square, OctagonX, Bot, Activity, Clock, RefreshCw,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle,
  ChevronRight, Zap,
} from 'lucide-react';

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN1'];

interface EAItem { id: string; name: string; version: string; risk_tier: string; allowed_symbols: string[] | null; allowed_timeframes: string[] | null; }
interface PresetItem { id: string; ea_id: string; name: string; }
interface TerminalItem { id: string; label: string; runner_id: string; status: string; }
interface ConnectionItem { id: string; account_number: string; broker_name: string; }
interface RunItem {
  id: string; symbol: string; timeframe: string; status: string; mode: string;
  started_at: string | null; stopped_at: string | null; last_error: string | null;
  last_heartbeat_at: string | null; created_at: string; ea_id: string;
}
interface RunEvent { id: string; event_type: string; payload: any; created_at: string; }

function RunStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    queued: 'bg-muted text-muted-foreground',
    starting: 'bg-primary/20 text-primary animate-pulse',
    running: 'bg-chart-2/20 text-chart-2',
    stopping: 'bg-warning/20 text-warning',
    stopped: 'bg-muted text-muted-foreground',
    error: 'bg-destructive/20 text-destructive',
  };
  return <Badge variant="outline" className={cn('text-xs font-mono', colors[status])}>{status.toUpperCase()}</Badge>;
}

function timeAgo(d: string | null) {
  if (!d) return 'Never';
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 5000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

export default function RunConsole() {
  const { user } = useAuth();
  const [eas, setEas] = useState<EAItem[]>([]);
  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [terminals, setTerminals] = useState<TerminalItem[]>([]);
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [runEvents, setRunEvents] = useState<RunEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // New run form
  const [formEa, setFormEa] = useState('');
  const [formPreset, setFormPreset] = useState('');
  const [formTerminal, setFormTerminal] = useState('');
  const [formConnection, setFormConnection] = useState('');
  const [formSymbol, setFormSymbol] = useState('EURUSD');
  const [formTf, setFormTf] = useState('H1');
  const [formSlot, setFormSlot] = useState('1');
  const [formMode, setFormMode] = useState('paper');
  const [starting, setStarting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [eaRes, termRes, connRes, runRes] = await Promise.all([
      supabase.from('ea_library').select('id, name, version, risk_tier, allowed_symbols, allowed_timeframes').eq('user_id', user.id).eq('status', 'active'),
      supabase.from('mt5_terminals').select('id, label, runner_id, status').eq('user_id', user.id),
      supabase.from('mt5_accounts').select('id, account_number, broker_name').eq('user_id', user.id).eq('is_active', true),
      supabase.from('ea_runs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    ]);
    if (eaRes.data) setEas(eaRes.data as unknown as EAItem[]);
    if (termRes.data) setTerminals(termRes.data as unknown as TerminalItem[]);
    if (connRes.data) setConnections(connRes.data as unknown as ConnectionItem[]);
    if (runRes.data) setRuns(runRes.data as unknown as RunItem[]);
    setLoading(false);
  }, [user]);

  // Fetch presets when EA changes
  useEffect(() => {
    if (!formEa) { setPresets([]); return; }
    supabase.from('ea_presets').select('id, ea_id, name').eq('ea_id', formEa)
      .then(({ data }) => { if (data) setPresets(data as unknown as PresetItem[]); });
  }, [formEa]);

  // Fetch run events when selected
  useEffect(() => {
    if (!selectedRun) { setRunEvents([]); return; }
    supabase.from('ea_run_events').select('*').eq('run_id', selectedRun)
      .order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setRunEvents(data as unknown as RunEvent[]); });
  }, [selectedRun]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const iv = setInterval(fetchData, 8000);
    return () => clearInterval(iv);
  }, [fetchData]);

  const handleStartRun = async () => {
    if (!formEa || !formSymbol || !formTf) {
      toast.error('Select EA, symbol, and timeframe');
      return;
    }
    setStarting(true);
    try {
      const res = await supabase.functions.invoke('runner-api', {
        body: {
          action: 'start_run',
          ea_id: formEa,
          preset_id: formPreset || null,
          terminal_id: formTerminal || null,
          connection_id: formConnection || null,
          symbol: formSymbol,
          timeframe: formTf,
          slot: parseInt(formSlot) || 1,
          mode: formMode,
          risk_limits: {},
        },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success(`Run started! ID: ${(res.data as any)?.run_id?.slice(0, 8)}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start run');
    }
    setStarting(false);
  };

  const handleStopRun = async (runId: string) => {
    try {
      await supabase.functions.invoke('runner-api', {
        body: { action: 'stop_run', run_id: runId },
      });
      toast.success('Stop command sent');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handlePanicStop = async () => {
    if (!confirm('⚠️ PANIC STOP — This will stop ALL active runs. Continue?')) return;
    try {
      await supabase.functions.invoke('runner-api', {
        body: { action: 'panic_stop', terminal_id: formTerminal || null, connection_id: formConnection || null },
      });
      toast.warning('Panic stop triggered!');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const activeRuns = runs.filter(r => ['queued', 'starting', 'running', 'stopping'].includes(r.status));
  const recentRuns = runs.filter(r => ['stopped', 'error'].includes(r.status));
  const selectedRunData = runs.find(r => r.id === selectedRun);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Play className="h-8 w-8 animate-pulse text-primary mx-auto" />
          <p className="text-muted-foreground">Loading Run Console...</p>
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
            <Zap className="h-7 w-7 text-primary" />
            Run Console
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Start, stop, and monitor EA execution on headless terminals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => { fetchData(); toast.success('Refreshed'); }}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          {activeRuns.length > 0 && (
            <Button size="sm" variant="destructive" onClick={handlePanicStop}>
              <OctagonX className="h-4 w-4 mr-1" /> Panic Stop All
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: New Run Form */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="h-4 w-4 text-chart-2" /> New Run
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Expert Advisor *</Label>
              <Select value={formEa} onValueChange={setFormEa}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select EA" /></SelectTrigger>
                <SelectContent>
                  {eas.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      <span className="flex items-center gap-2">
                        <Bot className="h-3 w-3" /> {e.name} <span className="text-muted-foreground">v{e.version}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {presets.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Preset</Label>
                <Select value={formPreset} onValueChange={setFormPreset}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Default" /></SelectTrigger>
                  <SelectContent>
                    {presets.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Symbol *</Label>
                <Input value={formSymbol} onChange={e => setFormSymbol(e.target.value.toUpperCase())} className="text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Timeframe *</Label>
                <Select value={formTf} onValueChange={setFormTf}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEFRAMES.map(tf => <SelectItem key={tf} value={tf}>{tf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Mode</Label>
                <Select value={formMode} onValueChange={setFormMode}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paper">Paper</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Slot</Label>
                <Input value={formSlot} onChange={e => setFormSlot(e.target.value)} type="number" min={1} max={20} className="text-sm" />
              </div>
            </div>

            {terminals.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Terminal</Label>
                <Select value={formTerminal} onValueChange={setFormTerminal}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Auto-assign" /></SelectTrigger>
                  <SelectContent>
                    {terminals.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {connections.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">MT5 Account</Label>
                <Select value={formConnection} onValueChange={setFormConnection}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {connections.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.broker_name} #{c.account_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button className="w-full" onClick={handleStartRun} disabled={starting || !formEa}>
              <Play className="h-4 w-4 mr-1" /> {starting ? 'Starting...' : 'Start Run'}
            </Button>
          </CardContent>
        </Card>

        {/* Right: Active Runs + Events */}
        <div className="lg:col-span-2 space-y-4">
          {/* Active Runs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-chart-2" /> Active Runs ({activeRuns.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeRuns.length > 0 ? (
                <div className="space-y-2">
                  {activeRuns.map(r => (
                    <div key={r.id}
                      className={cn('flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/40',
                        selectedRun === r.id && 'border-primary bg-primary/5')}
                      onClick={() => setSelectedRun(r.id)}>
                      <div className="flex items-center gap-3">
                        <Bot className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-semibold text-sm">{r.symbol} • {r.timeframe}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{r.id.slice(0, 8)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <RunStatusBadge status={r.status} />
                        <span className="text-xs text-muted-foreground">{timeAgo(r.last_heartbeat_at)}</span>
                        {r.status !== 'stopping' && r.status !== 'stopped' && (
                          <Button size="sm" variant="ghost" className="text-destructive h-7 px-2"
                            onClick={(e) => { e.stopPropagation(); handleStopRun(r.id); }}>
                            <Square className="h-3 w-3" />
                          </Button>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <Play className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No active runs</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Timeline */}
          {selectedRunData && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Run Events — {selectedRunData.symbol} {selectedRunData.timeframe}
                  </CardTitle>
                  <RunStatusBadge status={selectedRunData.status} />
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {runEvents.length > 0 ? (
                    <div className="space-y-2">
                      {runEvents.map(ev => (
                        <div key={ev.id} className="flex items-start gap-3 py-2 border-b border-border/30">
                          <div className={cn('mt-1 h-2 w-2 rounded-full flex-shrink-0',
                            ev.event_type.includes('ERROR') ? 'bg-destructive' :
                            ev.event_type.includes('START') ? 'bg-chart-2' :
                            ev.event_type.includes('STOP') ? 'bg-warning' :
                            'bg-primary'
                          )} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-semibold">{ev.event_type}</span>
                              <span className="text-[10px] text-muted-foreground">{new Date(ev.created_at).toLocaleTimeString()}</span>
                            </div>
                            {ev.payload && Object.keys(ev.payload).length > 0 && (
                              <pre className="text-[10px] text-muted-foreground mt-1 truncate">
                                {JSON.stringify(ev.payload)}
                              </pre>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No events yet</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Recent (completed) runs */}
          {recentRuns.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Recent Runs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {recentRuns.slice(0, 10).map(r => (
                    <div key={r.id} className="flex items-center justify-between py-1.5 text-xs border-b border-border/20 cursor-pointer hover:bg-muted/30 px-2 rounded"
                      onClick={() => setSelectedRun(r.id)}>
                      <span className="font-mono">{r.symbol} {r.timeframe}</span>
                      <RunStatusBadge status={r.status} />
                      <span className="text-muted-foreground">{r.stopped_at ? new Date(r.stopped_at).toLocaleDateString() : ''}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
