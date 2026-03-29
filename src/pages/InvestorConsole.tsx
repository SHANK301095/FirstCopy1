/**
 * Investor Mode — Execution Console (Screen D)
 * Status pill, risk summary, events timeline, kill switch
 */
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, ShieldOff, Activity, Clock, AlertTriangle, CheckCircle2, XCircle, Power, Zap, Lock, Unlock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageTitle } from '@/components/ui/PageTitle';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Gating constants
const MIN_PAPER_TRADES = 10;
const MIN_PAPER_DAYS = 3;

export default function InvestorConsole() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const instanceId = (location.state as any)?.instanceId;

  const [instance, setInstance] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!instanceId || !user) return;
    fetchData();
  }, [instanceId, user]);

  const fetchData = async () => {
    setLoading(true);
    const [instanceRes, eventsRes] = await Promise.all([
      supabase.from('chosen_strategy_instances').select('*').eq('id', instanceId).single(),
      supabase.from('investor_executions').select('*').eq('instance_id', instanceId).order('created_at', { ascending: false }).limit(50),
    ]);
    if (instanceRes.data) setInstance(instanceRes.data);
    if (eventsRes.data) setEvents(eventsRes.data);
    setLoading(false);
  };

  const toggleKillSwitch = async () => {
    if (!instance) return;
    const currentRules = (instance.risk_ruleset || {}) as Record<string, unknown>;
    const newKS = !currentRules.killSwitch;
    const { error } = await supabase.from('chosen_strategy_instances').update({
      risk_ruleset: { ...currentRules, killSwitch: newKS },
      status: newKS ? 'paused' : 'active',
    }).eq('id', instanceId);

    if (!error) {
      await supabase.from('investor_executions').insert({
        user_id: user!.id,
        instance_id: instanceId,
        event_type: newKS ? 'kill_switch_on' : 'kill_switch_off',
        payload: {},
      });
      toast({
        title: newKS ? '🚨 Kill Switch ON' : '✅ Kill Switch OFF',
        description: newKS ? 'Sab trading ruki' : 'Trading resume ho sakti hai',
        variant: newKS ? 'destructive' : 'default',
      });
      fetchData();
    }
  };

  const canGoLive = instance && (
    (instance.paper_trades_count || 0) >= MIN_PAPER_TRADES ||
    (instance.paper_trading_days || 0) >= MIN_PAPER_DAYS
  );

  const goLive = async () => {
    if (!canGoLive || !instance) return;
    const { error } = await supabase.from('chosen_strategy_instances').update({
      mode: 'live',
      live_unlocked_at: new Date().toISOString(),
    }).eq('id', instanceId);
    if (!error) {
      await supabase.from('investor_executions').insert({
        user_id: user!.id,
        instance_id: instanceId,
        event_type: 'live_started',
        payload: {},
      });
      toast({ title: '🚀 Live Mode Activated!', description: 'Real trading shuru ho gayi' });
      fetchData();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Loading console...</div>;
  }

  if (!instance) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-muted-foreground">Instance nahi mili.</p>
        <Button onClick={() => navigate('/investor/goal')}>Start Over →</Button>
      </div>
    );
  }

  const riskRules = (instance.risk_ruleset || {}) as Record<string, unknown>;
  const isKillActive = !!riskRules.killSwitch;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-20">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/investor/goal')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageTitle title={instance.name} subtitle="Execution Console" />
      </div>

      {/* Status Pill */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge
          className={cn(
            'text-sm px-4 py-1.5',
            instance.status === 'active' ? 'bg-profit/10 text-profit border-profit/30' :
            instance.status === 'paused' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' :
            'bg-muted text-muted-foreground'
          )}
          variant="outline"
        >
          {instance.status === 'active' ? '⚡ Active' : instance.status === 'paused' ? '⏸ Paused' : instance.status}
        </Badge>
        <Badge variant="outline" className="text-sm">
          Mode: {instance.mode === 'paper' ? '📝 Paper' : '🔴 Live'}
        </Badge>
        <Badge variant="outline" className="text-sm">
          Trades: {instance.paper_trades_count || 0}
        </Badge>
        <Badge variant="outline" className="text-sm">
          Days: {instance.paper_trading_days || 0}
        </Badge>
      </div>

      {/* Risk Summary */}
      <Card className={cn(isKillActive && 'border-destructive')}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Today Risk Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Max Daily Loss</p>
              <p className="text-lg font-bold">{String(riskRules.maxDailyLossPct || 3)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Max Open</p>
              <p className="text-lg font-bold">{String(riskRules.maxOpenTrades || 3)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cooldown</p>
              <p className="text-lg font-bold">{String(riskRules.cooldownAfterLossMin || 30)}m</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kill Switch</p>
              <p className={cn('text-lg font-bold', isKillActive ? 'text-destructive' : 'text-profit')}>
                {isKillActive ? 'ON' : 'OFF'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kill Switch */}
      <Button
        variant={isKillActive ? 'outline' : 'destructive'}
        className="w-full h-14 text-base"
        onClick={toggleKillSwitch}
      >
        <Power className="h-5 w-5 mr-2" />
        {isKillActive ? 'Kill Switch OFF karein' : '🚨 KILL SWITCH — Sab roko!'}
      </Button>

      {/* Live Gating */}
      {instance.mode === 'paper' && (
        <Card className={cn('border-dashed', canGoLive ? 'border-profit' : 'border-muted')}>
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="font-medium flex items-center gap-2">
                {canGoLive ? <Unlock className="h-4 w-4 text-profit" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                Live Mode
              </p>
              <p className="text-xs text-muted-foreground">
                {canGoLive
                  ? 'Paper requirement complete — live unlock ho gaya!'
                  : `${MIN_PAPER_TRADES} trades ya ${MIN_PAPER_DAYS} din paper trading zaruri hai`
                }
              </p>
            </div>
            <Button disabled={!canGoLive} onClick={goLive} size="sm">
              {canGoLive ? 'Go Live 🚀' : 'Locked'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Events Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Koi events nahi abhi tak</p>
            ) : (
              <div className="space-y-3">
                {events.map(ev => (
                  <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="mt-0.5">
                      {ev.risk_blocked ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : ev.event_type.includes('kill') ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-profit" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{ev.event_type.replace(/_/g, ' ')}</p>
                      {ev.risk_reason && (
                        <p className="text-xs text-destructive">{ev.risk_reason}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(ev.created_at).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Reports Link */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => navigate('/investor/reports', { state: { instanceId } })}
      >
        📊 Daily Reports dekhein
      </Button>
    </div>
  );
}
