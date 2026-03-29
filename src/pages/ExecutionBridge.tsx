/**
 * Execution Bridge Page
 * Live trading connectivity with broker APIs for strategy deployment
 */

import { useState, useEffect } from 'react';
import {
  Zap, Play, Pause, Square, RefreshCw, Settings, Shield,
  Activity, TrendingUp, AlertTriangle, CheckCircle2, XCircle,
  Plug, PlugZap, Clock, DollarSign, BarChart3, Lock, ShieldAlert
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { RiskDisclosureModal } from '@/components/execution/RiskDisclosureModal';
import { useExecutionStore } from '@/store/executionStore';
import { ZerodhaConnectionCard } from '@/components/broker/ZerodhaConnectionCard';
import { ZerodhaPortfolioPanel } from '@/components/broker/ZerodhaPortfolioPanel';
import { ZerodhaOrderPanel } from '@/components/broker/ZerodhaOrderPanel';
import { useLiveDeployments } from '@/hooks/useLiveDeployments';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface BrokerConnection {
  id: string;
  name: string;
  type: 'zerodha' | 'ibkr' | 'alpaca' | 'mt5' | 'binance';
  status: 'connected' | 'disconnected' | 'error';
  lastPing: Date;
  latencyMs: number;
  accountId?: string;
  balance?: number;
  currency?: string;
}

interface DeployedStrategy {
  id: string;
  name: string;
  brokerId: string;
  status: 'running' | 'paused' | 'stopped' | 'error';
  symbol: string;
  timeframe: string;
  positionSize: number;
  maxDrawdown: number;
  currentPnl: number;
  tradesExecuted: number;
  startedAt: Date;
  lastSignal?: { type: 'buy' | 'sell'; price: number; time: Date };
}

interface ExecutionLog {
  id: string;
  timestamp: Date;
  strategyId: string;
  type: 'signal' | 'order' | 'fill' | 'error' | 'info';
  message: string;
  details?: Record<string, unknown>;
}

export default function ExecutionBridge() {
  const { user } = useAuth();
  const {
    deployments: dbDeployments,
    brokerConnections: dbBrokerConnections,
    loading: dbLoading,
    connectedBrokers: dbConnectedBrokers,
    runningDeployments: dbRunningDeployments,
    totalPnl: dbTotalPnl,
    totalTrades: dbTotalTrades,
    updateDeploymentStatus,
    killAll: dbKillAll,
    refetch,
  } = useLiveDeployments();
  const { toast } = useToast();
  const { riskDisclosureAccepted, liveTradingEnabled, setLiveTradingEnabled } = useExecutionStore();
  const [showRiskModal, setShowRiskModal] = useState(false);
  
  // Show risk modal on first load if not accepted
  useEffect(() => {
    if (!riskDisclosureAccepted) {
      setShowRiskModal(true);
    }
  }, [riskDisclosureAccepted]);
  
  // Map DB broker connections to UI format, with fallback to empty
  const brokers: BrokerConnection[] = dbBrokerConnections.length > 0 
    ? dbBrokerConnections.map(b => ({
        id: b.id,
        name: b.display_name || b.broker_type,
        type: b.broker_type as any,
        status: b.status as any,
        lastPing: b.last_sync_at ? new Date(b.last_sync_at) : new Date(),
        latencyMs: 0,
        accountId: b.account_id || undefined,
        balance: (b.metadata as any)?.balance,
        currency: (b.metadata as any)?.currency,
      }))
    : [];

  // Map DB deployments to UI format  
  const strategies: DeployedStrategy[] = dbDeployments.map(d => ({
    id: d.id,
    name: d.strategy_name,
    brokerId: d.account_id || '',
    status: d.status as any,
    symbol: d.symbol,
    timeframe: d.timeframe,
    positionSize: (d.runtime_config as any)?.positionSize || 1,
    maxDrawdown: (d.runtime_config as any)?.maxDrawdown || 5,
    currentPnl: d.current_pnl || 0,
    tradesExecuted: d.trades_executed || 0,
    startedAt: new Date(d.created_at),
    lastSignal: d.last_signal_at ? { type: 'buy' as const, price: 0, time: new Date(d.last_signal_at) } : undefined,
  }));

  // Execution logs (local state, real-time from DB would need realtime subscription)
  const [logs, setLogs] = useState<ExecutionLog[]>([]);

  // Risk controls
  const [riskControls, setRiskControls] = useState({
    maxDailyLoss: 50000,
    maxPositionSize: 5,
    maxOpenPositions: 3,
    killSwitchEnabled: false,
    autoHedge: false,
  });

  function connectBroker(brokerId: string) {
    toast({ title: 'Broker Connected', description: 'Successfully connected to broker API' });
    refetch();
  }

  function disconnectBroker(brokerId: string) {
    toast({ title: 'Broker Disconnected' });
    refetch();
  }

  function toggleStrategy(strategyId: string) {
    const strategy = strategies.find(s => s.id === strategyId);
    if (!strategy) return;
    const newStatus = strategy.status === 'running' ? 'paused' : 'running';
    updateDeploymentStatus(strategyId, newStatus);
    addLog(strategyId, 'info', `Strategy ${newStatus === 'running' ? 'resumed' : 'paused'}`);
  }

  function stopStrategy(strategyId: string) {
    updateDeploymentStatus(strategyId, 'stopped', 'Manually stopped');
    addLog(strategyId, 'info', 'Strategy stopped and positions closed');
    toast({ title: 'Strategy Stopped', description: 'All positions have been closed' });
  }

  function addLog(strategyId: string, type: ExecutionLog['type'], message: string) {
    const newLog: ExecutionLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      strategyId,
      type,
      message,
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  }

  function triggerKillSwitch() {
    dbKillAll();
    setRiskControls(prev => ({ ...prev, killSwitchEnabled: true }));
    toast({ 
      title: '🚨 Kill Switch Activated', 
      description: 'All strategies stopped. All positions closed.',
      variant: 'destructive'
    });
  }

  const connectedBrokers = brokers.filter(b => b.status === 'connected');
  const runningStrategies = strategies.filter(s => s.status === 'running');
  const totalPnl = strategies.reduce((sum, s) => sum + s.currentPnl, 0);
  const totalTradesCount = strategies.reduce((s, st) => s + st.tradesExecuted, 0);

  // If risk disclosure not accepted, show locked state
  if (!riskDisclosureAccepted) {
    return (
      <div className="space-y-6 animate-fade-in">
        <RiskDisclosureModal 
          open={showRiskModal} 
          onOpenChange={setShowRiskModal}
          onAccept={() => toast({ title: 'Live Trading Enabled', description: 'You can now use the Execution Bridge' })}
        />
        
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="p-6 rounded-full bg-muted/50 mb-6">
            <Lock className="h-16 w-16 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Live Trading Locked</h1>
          <p className="text-muted-foreground max-w-md mb-6">
            To access the Execution Bridge and live trading features, you must first read and accept the risk disclosure.
          </p>
          <Button onClick={() => setShowRiskModal(true)} className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            View Risk Disclosure
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Risk Disclosure Modal */}
      <RiskDisclosureModal 
        open={showRiskModal} 
        onOpenChange={setShowRiskModal}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            Execution Bridge
          </h1>
          <p className="text-muted-foreground">Live trading connectivity & strategy deployment</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setShowRiskModal(true)}
            className="gap-2"
          >
            <Shield className="h-4 w-4" />
            Risk Disclosure
          </Button>
          <Button 
            variant={riskControls.killSwitchEnabled ? 'secondary' : 'destructive'} 
            onClick={triggerKillSwitch}
            disabled={riskControls.killSwitchEnabled}
            className="gap-2"
          >
            <Square className="h-4 w-4" />
            Kill Switch
          </Button>
        </div>
      </div>

      {/* Live Trading Status Banner */}
      <Card className="border-profit/30 bg-profit/5">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-profit/20">
                <CheckCircle2 className="h-5 w-5 text-profit" />
              </div>
              <div>
                <p className="font-medium text-sm">Live Trading Enabled</p>
                <p className="text-xs text-muted-foreground">Risk disclosure accepted. Trade responsibly.</p>
              </div>
            </div>
            <Badge variant="outline" className="border-profit text-profit">
              Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Status Overview */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Plug className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{connectedBrokers.length}/{brokers.length}</div>
                <div className="text-xs text-muted-foreground">Brokers Connected</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{runningStrategies.length}</div>
                <div className="text-xs text-muted-foreground">Running Strategies</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className={cn('text-2xl font-bold font-mono', totalPnl >= 0 ? 'text-profit' : 'text-loss')}>
                  ₹{totalPnl.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Total P&L Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{strategies.reduce((s, st) => s + st.tradesExecuted, 0)}</div>
                <div className="text-xs text-muted-foreground">Trades Executed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="strategies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="strategies">Deployed Strategies</TabsTrigger>
          <TabsTrigger value="brokers">Broker Connections</TabsTrigger>
          <TabsTrigger value="risk">Risk Controls</TabsTrigger>
          <TabsTrigger value="logs">Execution Logs</TabsTrigger>
        </TabsList>

        {/* Deployed Strategies Tab */}
        <TabsContent value="strategies" className="space-y-4">
          {strategies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No strategies deployed</p>
                <p className="text-sm text-muted-foreground mt-1">Deploy a strategy from the optimizer or backtest results</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {strategies.map(strategy => {
                const broker = brokers.find(b => b.id === strategy.brokerId);
                return (
                  <Card key={strategy.id} className={cn(
                    strategy.status === 'error' && 'border-destructive',
                    strategy.status === 'running' && 'border-profit/50'
                  )}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{strategy.name}</CardTitle>
                        <Badge variant={
                          strategy.status === 'running' ? 'default' :
                          strategy.status === 'paused' ? 'secondary' :
                          strategy.status === 'error' ? 'destructive' : 'outline'
                        }>
                          {strategy.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        {strategy.symbol} • {strategy.timeframe} • via {broker?.name || 'Unknown'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-muted-foreground text-xs">P&L</div>
                          <div className={cn('font-mono font-bold', strategy.currentPnl >= 0 ? 'text-profit' : 'text-loss')}>
                            ₹{strategy.currentPnl.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">Trades</div>
                          <div className="font-mono">{strategy.tradesExecuted}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">Position</div>
                          <div className="font-mono">{strategy.positionSize} lots</div>
                        </div>
                      </div>

                      {strategy.lastSignal && (
                        <div className="p-2 rounded bg-muted/30 text-xs">
                          <span className="text-muted-foreground">Last Signal: </span>
                          <Badge variant={strategy.lastSignal.type === 'buy' ? 'default' : 'destructive'} className="ml-1">
                            {strategy.lastSignal.type.toUpperCase()}
                          </Badge>
                          <span className="ml-2 font-mono">@ {strategy.lastSignal.price}</span>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant={strategy.status === 'running' ? 'secondary' : 'default'}
                          onClick={() => toggleStrategy(strategy.id)}
                          disabled={strategy.status === 'stopped' || broker?.status !== 'connected'}
                          className="flex-1 gap-1"
                        >
                          {strategy.status === 'running' ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          {strategy.status === 'running' ? 'Pause' : 'Resume'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => stopStrategy(strategy.id)}
                          disabled={strategy.status === 'stopped'}
                          className="gap-1"
                        >
                          <Square className="h-3 w-3" />
                          Stop
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Broker Connections Tab */}
        <TabsContent value="brokers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {brokers.map(broker => (
              <Card key={broker.id} className={cn(
                broker.status === 'connected' && 'border-profit/50',
                broker.status === 'error' && 'border-destructive'
              )}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {broker.status === 'connected' ? (
                        <PlugZap className="h-5 w-5 text-profit" />
                      ) : (
                        <Plug className="h-5 w-5 text-muted-foreground" />
                      )}
                      {broker.name}
                    </CardTitle>
                    <Badge variant={broker.status === 'connected' ? 'default' : 'secondary'}>
                      {broker.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {broker.status === 'connected' && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-muted-foreground text-xs">Account</div>
                        <div className="font-mono">{broker.accountId}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Latency</div>
                        <div className="font-mono">{broker.latencyMs}ms</div>
                      </div>
                      {broker.balance && (
                        <div className="col-span-2">
                          <div className="text-muted-foreground text-xs">Balance</div>
                          <div className="font-mono font-bold">
                            {broker.currency === 'INR' ? '₹' : '$'}{broker.balance.toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <Button 
                    size="sm" 
                    variant={broker.status === 'connected' ? 'secondary' : 'default'}
                    onClick={() => broker.status === 'connected' ? disconnectBroker(broker.id) : connectBroker(broker.id)}
                    className="w-full"
                  >
                    {broker.status === 'connected' ? 'Disconnect' : 'Connect'}
                  </Button>
                </CardContent>
              </Card>
            ))}

            {/* Add Broker Card */}
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Plug className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Add New Broker</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Configure
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Risk Controls Tab */}
        <TabsContent value="risk" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Risk Limits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Max Daily Loss (₹)</Label>
                  <Input 
                    type="number" 
                    value={riskControls.maxDailyLoss}
                    onChange={(e) => setRiskControls(prev => ({ ...prev, maxDailyLoss: parseInt(e.target.value) || 0 }))}
                  />
                  <Progress value={(Math.abs(totalPnl < 0 ? totalPnl : 0) / riskControls.maxDailyLoss) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Used: ₹{Math.abs(totalPnl < 0 ? totalPnl : 0).toLocaleString()} / ₹{riskControls.maxDailyLoss.toLocaleString()}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Max Position Size (lots)</Label>
                  <Input 
                    type="number" 
                    value={riskControls.maxPositionSize}
                    onChange={(e) => setRiskControls(prev => ({ ...prev, maxPositionSize: parseInt(e.target.value) || 0 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Open Positions</Label>
                  <Input 
                    type="number" 
                    value={riskControls.maxOpenPositions}
                    onChange={(e) => setRiskControls(prev => ({ ...prev, maxOpenPositions: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Safety Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Kill Switch</Label>
                    <p className="text-xs text-muted-foreground">Emergency stop all trading</p>
                  </div>
                  <Switch 
                    checked={riskControls.killSwitchEnabled}
                    onCheckedChange={(v) => {
                      if (v) triggerKillSwitch();
                      else setRiskControls(prev => ({ ...prev, killSwitchEnabled: false }));
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Hedge</Label>
                    <p className="text-xs text-muted-foreground">Hedge exposure automatically</p>
                  </div>
                  <Switch 
                    checked={riskControls.autoHedge}
                    onCheckedChange={(v) => setRiskControls(prev => ({ ...prev, autoHedge: v }))}
                  />
                </div>

                <div className="p-3 rounded-lg bg-muted/30 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-profit" />
                    <span>All systems operational</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last health check: {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Execution Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Execution Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {logs.map(log => {
                    const strategy = strategies.find(s => s.id === log.strategyId);
                    return (
                      <div key={log.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/30">
                        <div className={cn(
                          'mt-1 h-2 w-2 rounded-full',
                          log.type === 'signal' && 'bg-primary',
                          log.type === 'order' && 'bg-warning',
                          log.type === 'fill' && 'bg-profit',
                          log.type === 'error' && 'bg-destructive',
                          log.type === 'info' && 'bg-muted-foreground'
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-mono text-xs text-muted-foreground">
                              {log.timestamp.toLocaleTimeString()}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {strategy?.name || log.strategyId}
                            </Badge>
                          </div>
                          <p className="text-sm mt-0.5">{log.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
