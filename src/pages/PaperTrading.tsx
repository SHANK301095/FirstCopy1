/**
 * Paper Trading Mode — Phase 3 Upgrade
 * Real fill model + replay engine + order lifecycle
 * Modes: Historical Replay (dataset-driven) | Live Paper (simulated feed, labeled)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Play, Pause, RotateCcw, TrendingUp, TrendingDown, Target, AlertTriangle, Library, SkipForward, History, Radio, Settings2, Zap, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { StaggerContainer, HoverCard } from '@/components/ui/micro-interactions';
import { PageTitle } from '@/components/ui/PageTitle';
import { UniversalAssetSelector, AssetOption } from '@/components/selectors/UniversalAssetSelector';
import { SharedDatasetSelector } from '@/components/backtest/SharedDatasetSelector';
import { usePaperAccount } from '@/hooks/usePaperAccount';
import { useAuth } from '@/contexts/AuthContext';
import { ReplayEngine, type OHLCV } from '@/services/replayEngine';
import { PaperOrderEngine, type PaperAccountState, type EventLogEntry } from '@/services/paperOrderEngine';
import type { FillMode } from '@/services/fillModelService';
import type { SharedDataset } from '@/lib/sharedDataService';

type PaperMode = 'replay' | 'live_paper';

const SPEED_OPTIONS = [1, 2, 5, 10, 25] as const;
const FILL_MODES: { value: FillMode; label: string; desc: string }[] = [
  { value: 'optimistic', label: 'Optimistic', desc: 'Tight spreads, minimal slippage' },
  { value: 'realistic', label: 'Realistic', desc: 'Market-like fills with realistic costs' },
  { value: 'conservative', label: 'Conservative', desc: 'Wide spreads, high slippage stress test' },
];

const LIVE_SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'XAUUSD', 'BTCUSD'];

export default function PaperTrading() {
  const { user } = useAuth();
  const { account: dbAccount, placeOrder: dbPlaceOrder, closeOrder: dbCloseOrder, resetAccount: dbResetAccount, loading: accountLoading } = usePaperAccount();
  const { toast } = useToast();

  // ─── Mode & Config ─────────────────
  const [mode, setMode] = useState<PaperMode>('replay');
  const [fillMode, setFillMode] = useState<FillMode>('realistic');
  const [speed, setSpeed] = useState(1);
  const [selectedSymbol, setSelectedSymbol] = useState('EURUSD');
  const [orderSize, setOrderSize] = useState('0.1');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [selectedStrategyAsset, setSelectedStrategyAsset] = useState<AssetOption | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // ─── Dataset (Replay Mode) ─────────
  const [selectedDataset, setSelectedDataset] = useState<SharedDataset | null>(null);
  const [datasetBars, setDatasetBars] = useState<OHLCV[]>([]);

  // ─── Engines ───────────────────────
  const replayRef = useRef<ReplayEngine | null>(null);
  const orderEngineRef = useRef<PaperOrderEngine | null>(null);

  // ─── State ─────────────────────────
  const [engineState, setEngineState] = useState<PaperAccountState | null>(null);
  const [replayStatus, setReplayStatus] = useState<'idle' | 'playing' | 'paused' | 'finished'>('idle');
  const [replayProgress, setReplayProgress] = useState(0);
  const [currentBar, setCurrentBar] = useState<OHLCV | null>(null);
  const [currentPrice, setCurrentPrice] = useState(0);

  // ─── Live Paper Mode (labeled fallback) ───
  const [isLiveRunning, setIsLiveRunning] = useState(false);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({
    EURUSD: 1.0850, GBPUSD: 1.2650, USDJPY: 149.50, AUDUSD: 0.6520,
    USDCAD: 1.3580, XAUUSD: 2025.50, BTCUSD: 43250.00,
  });

  // Initialize order engine
  useEffect(() => {
    const initialBalance = dbAccount?.initial_balance ?? 10000;
    orderEngineRef.current = new PaperOrderEngine(initialBalance, { mode: fillMode });
    setEngineState(orderEngineRef.current.getState());
  }, [dbAccount?.initial_balance]);

  // Update fill config when mode changes
  useEffect(() => {
    orderEngineRef.current?.setFillConfig({ mode: fillMode });
  }, [fillMode]);

  // Initialize replay engine
  useEffect(() => {
    replayRef.current = new ReplayEngine();
    return () => replayRef.current?.destroy();
  }, []);

  // Load dataset into replay engine
  useEffect(() => {
    if (!selectedDataset || !replayRef.current) return;
    try {
      const bars: OHLCV[] = (selectedDataset as any).data?.map?.((row: any) => ({
        ts: row.ts ?? row.timestamp ?? new Date(row.date || row.Date).getTime(),
        open: +row.open || +row.Open,
        high: +row.high || +row.High,
        low: +row.low || +row.Low,
        close: +row.close || +row.Close,
        volume: +row.volume || +row.Volume || 0,
      })).filter((b: OHLCV) => b.ts && !isNaN(b.open) && !isNaN(b.close)) ?? [];

      if (bars.length === 0) {
        toast({ title: 'Dataset has no valid OHLCV bars', variant: 'destructive' });
        return;
      }

      setDatasetBars(bars);
      replayRef.current.loadData(bars);
      replayRef.current.setCallbacks({
        onBar: (bar, idx) => {
          setCurrentBar(bar);
          setCurrentPrice(bar.close);
          const state = replayRef.current?.getState();
          setReplayProgress(state?.progressPct ?? 0);
          // Process bar in order engine
          orderEngineRef.current?.processBar(bar, selectedSymbol);
          setEngineState(orderEngineRef.current?.getState() ?? null);
        },
        onFinished: () => {
          setReplayStatus('finished');
          toast({ title: 'Replay Complete', description: `Processed ${bars.length} bars` });
        },
      });
      setReplayStatus('idle');
      setReplayProgress(0);
      toast({ title: 'Dataset Loaded', description: `${bars.length} bars ready for replay` });
    } catch (err) {
      toast({ title: 'Failed to parse dataset', variant: 'destructive' });
    }
  }, [selectedDataset, selectedSymbol]);

  // Live paper mode — simulated price feed (clearly labeled)
  useEffect(() => {
    if (mode !== 'live_paper' || !isLiveRunning) return;
    let tick = 0;
    const interval = setInterval(() => {
      tick++;
      setLivePrices(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach((sym, idx) => {
          const vol = sym === 'BTCUSD' ? 20 : sym === 'XAUUSD' ? 1 : sym.includes('JPY') ? 0.05 : 0.0003;
          // Deterministic price movement: pure sin + cos harmonics, no Math.random
          const harmonic = Math.sin(tick * 0.05 * (idx + 1)) * 0.6 + Math.cos(tick * 0.03 * (idx + 2)) * 0.4;
          const delta = harmonic * vol;
          updated[sym] = +(prev[sym] + delta).toFixed(sym === 'BTCUSD' ? 2 : sym.includes('JPY') ? 3 : 5);
        });
        return updated;
      });
    }, 1000 / speed);
    return () => clearInterval(interval);
  }, [mode, isLiveRunning, speed]);

  // Update currentPrice based on mode
  useEffect(() => {
    if (mode === 'live_paper') {
      setCurrentPrice(livePrices[selectedSymbol] ?? 0);
      // Create a synthetic bar and process
      if (isLiveRunning && orderEngineRef.current) {
        const p = livePrices[selectedSymbol] ?? 0;
        const syntheticBar: OHLCV = { ts: Date.now(), open: p, high: p * 1.0001, low: p * 0.9999, close: p, volume: 0 };
        orderEngineRef.current.processBar(syntheticBar, selectedSymbol);
        setEngineState(orderEngineRef.current.getState());
      }
    }
  }, [livePrices, selectedSymbol, mode, isLiveRunning]);

  // ─── Actions ───────────────────────
  const handlePlayPause = () => {
    if (mode === 'replay') {
      if (!replayRef.current || datasetBars.length === 0) {
        toast({ title: 'Load a dataset first', variant: 'destructive' });
        return;
      }
      if (replayStatus === 'playing') {
        replayRef.current.pause();
        setReplayStatus('paused');
      } else {
        replayRef.current.play(speed);
        setReplayStatus('playing');
      }
    } else {
      setIsLiveRunning(!isLiveRunning);
    }
  };

  const handleStepForward = () => {
    if (mode === 'replay' && replayRef.current) {
      replayRef.current.stepForward();
    }
  };

  const handleSpeedChange = (s: string) => {
    const newSpeed = parseInt(s);
    setSpeed(newSpeed);
    replayRef.current?.setSpeed(newSpeed);
  };

  const handleReset = async () => {
    replayRef.current?.stop();
    setReplayStatus('idle');
    setReplayProgress(0);
    setCurrentBar(null);
    setIsLiveRunning(false);
    const initialBalance = dbAccount?.initial_balance ?? 10000;
    orderEngineRef.current?.reset(initialBalance);
    setEngineState(orderEngineRef.current?.getState() ?? null);
    await dbResetAccount();
    toast({ title: 'Account Reset', description: `Starting fresh with $${initialBalance.toLocaleString()}` });
  };

  const handlePlaceOrder = useCallback(async (side: 'buy' | 'sell') => {
    if (!orderEngineRef.current) return;
    const qty = parseFloat(orderSize);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: 'Invalid lot size', variant: 'destructive' });
      return;
    }

    const price = orderType === 'market' ? currentPrice : parseFloat(limitPrice);
    if (!price || isNaN(price)) {
      toast({ title: 'Invalid price', variant: 'destructive' });
      return;
    }

    const sl = stopLoss ? parseFloat(stopLoss) : undefined;
    const tp = takeProfit ? parseFloat(takeProfit) : undefined;

    const order = orderEngineRef.current.submitOrder({
      symbol: selectedSymbol,
      side,
      type: orderType,
      quantity: qty,
      price: orderType !== 'market' ? price : undefined,
      stop_loss: sl,
      take_profit: tp,
      currentPrice: price,
    });

    setEngineState(orderEngineRef.current.getState());

    if (order.status === 'rejected') {
      toast({ title: 'Order Rejected', description: order.reject_reason, variant: 'destructive' });
    } else {
      // Persist to DB
      await dbPlaceOrder({ symbol: selectedSymbol, side, quantity: qty, price: order.avg_fill_price || price, stop_loss: sl, take_profit: tp });
      toast({
        title: `${side.toUpperCase()} ${selectedSymbol}`,
        description: order.status === 'filled'
          ? `Filled @ ${order.avg_fill_price} | Fee: $${order.fees.toFixed(2)} | Slip: $${order.slippage.toFixed(2)}`
          : `${orderType} order placed @ ${price}`,
      });
    }
  }, [selectedSymbol, orderSize, orderType, limitPrice, stopLoss, takeProfit, currentPrice, dbPlaceOrder, toast]);

  const handleClosePosition = (posId: string) => {
    if (!orderEngineRef.current) return;
    orderEngineRef.current.closePosition(posId, currentPrice);
    setEngineState(orderEngineRef.current.getState());
    toast({ title: 'Position Closed' });
  };

  const handleCancelOrder = (orderId: string) => {
    if (!orderEngineRef.current) return;
    orderEngineRef.current.cancelOrder(orderId);
    setEngineState(orderEngineRef.current.getState());
  };

  // ─── Derived ───────────────────────
  const acct = engineState;
  const positions = acct?.positions ?? [];
  const workingOrders = acct?.orders.filter(o => o.status === 'working') ?? [];
  const closedTrades = acct?.closed_trades ?? [];
  const eventLog = acct?.event_log ?? [];
  const winRate = closedTrades.length > 0
    ? (closedTrades.filter(t => {
        const mult = t.symbol === 'BTCUSD' ? 1 : t.symbol === 'XAUUSD' ? 100 : 100000;
        const pnl = t.side === 'buy'
          ? ((t.closed_at ? currentPrice : t.avg_fill_price) - t.avg_fill_price) * t.quantity * mult
          : (t.avg_fill_price - (t.closed_at ? currentPrice : t.avg_fill_price)) * t.quantity * mult;
        return pnl > 0;
      }).length / closedTrades.length) * 100
    : 0;
  const isActive = mode === 'replay' ? replayStatus === 'playing' : isLiveRunning;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageTitle
          title="Paper Trading"
          subtitle={mode === 'replay' ? 'Historical dataset replay mode' : 'Simulated live feed [Demo]'}
        />
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              className={cn('px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors',
                mode === 'replay' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}
              onClick={() => setMode('replay')}
            >
              <History className="h-3.5 w-3.5" /> Replay
            </button>
            <button
              className={cn('px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors',
                mode === 'live_paper' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}
              onClick={() => setMode('live_paper')}
            >
              <Radio className="h-3.5 w-3.5" /> Live Paper
            </button>
          </div>

          {/* Speed */}
          <Select value={String(speed)} onValueChange={handleSpeedChange}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPEED_OPTIONS.map(s => (
                <SelectItem key={s} value={String(s)}>{s}x</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {mode === 'replay' && (
            <Button variant="outline" size="icon" onClick={handleStepForward} disabled={replayStatus === 'playing'}>
              <SkipForward className="h-4 w-4" />
            </Button>
          )}

          <Button variant={isActive ? 'destructive' : 'default'} onClick={handlePlayPause}>
            {isActive ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {isActive ? 'Pause' : 'Start'}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" /> Reset
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)}>
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="border-border/50">
          <CardContent className="py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Fill Model</Label>
                <Select value={fillMode} onValueChange={(v) => setFillMode(v as FillMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FILL_MODES.map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        <div>
                          <div className="font-medium">{m.label}</div>
                          <div className="text-xs text-muted-foreground">{m.desc}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {mode === 'replay' && (
                <div className="sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Dataset</Label>
                  <SharedDatasetSelector
                    selectedDataset={selectedDataset}
                    onSelect={(ds) => setSelectedDataset(ds)}
                  />
                </div>
              )}
              {mode === 'live_paper' && (
                <div className="sm:col-span-2 flex items-center gap-2">
                  <Badge variant="outline" className="border-warning text-warning">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Simulated Feed — Not Real Market Data
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Replay Progress */}
      {mode === 'replay' && datasetBars.length > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Replay: {Math.round(replayProgress)}% ({Math.round(replayProgress * datasetBars.length / 100)}/{datasetBars.length} bars)</span>
            <span>{replayStatus === 'finished' ? '✓ Complete' : replayStatus}</span>
          </div>
          <Progress value={replayProgress} className="h-1.5" />
        </div>
      )}

      {/* Strategy & Current Price */}
      <div className="flex items-center gap-3 flex-wrap">
        <UniversalAssetSelector
          assetType="strategy"
          value={selectedStrategyAsset}
          onSelect={setSelectedStrategyAsset}
          placeholder="Attach strategy..."
          className="w-48"
        />
        {selectedStrategyAsset && (
          <Badge variant="secondary">
            <Library className="h-3 w-3 mr-1" /> {selectedStrategyAsset.name}
          </Badge>
        )}
        {currentPrice > 0 && (
          <Badge variant="outline" className="font-mono text-base">
            {selectedSymbol}: {currentPrice.toFixed(selectedSymbol.includes('JPY') ? 3 : selectedSymbol === 'BTCUSD' ? 2 : 5)}
          </Badge>
        )}
        <Badge variant="outline">
          <Zap className="h-3 w-3 mr-1" /> {fillMode}
        </Badge>
      </div>

      {/* Account Summary */}
      <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Balance', value: acct?.balance ?? 0, prefix: '$' },
          { label: 'Equity', value: acct?.equity ?? 0, prefix: '$', color: (acct?.equity ?? 0) >= (acct?.balance ?? 0) },
          { label: 'Free Margin', value: acct?.free_margin ?? 0, prefix: '$' },
          { label: 'Unrealized P/L', value: acct?.unrealized_pnl ?? 0, prefix: '$', color: true },
          { label: 'Realized P/L', value: acct?.realized_pnl ?? 0, prefix: '$', color: true },
          { label: 'Total Fees', value: acct?.total_fees ?? 0, prefix: '$' },
        ].map((item, i) => (
          <HoverCard key={i}>
            <Card className="hover-lift">
              <CardContent className="pt-3 pb-2">
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className={cn('text-lg font-bold font-mono',
                  item.color !== undefined
                    ? (typeof item.color === 'boolean' && item.color
                        ? (item.value >= 0 ? 'text-profit' : 'text-loss')
                        : (item.value >= (acct?.balance ?? 0) ? 'text-profit' : 'text-loss'))
                    : ''
                )}>
                  <AnimatedCounter value={item.value} prefix={item.prefix} decimals={2} />
                </div>
              </CardContent>
            </Card>
          </HoverCard>
        ))}
      </StaggerContainer>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Order Panel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" /> New Order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Symbol */}
            <div>
              <Label className="text-xs">Symbol</Label>
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(mode === 'replay' ? [selectedSymbol] : LIVE_SYMBOLS).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Order Type */}
            <div>
              <Label className="text-xs">Order Type</Label>
              <Select value={orderType} onValueChange={(v: any) => setOrderType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="limit">Limit</SelectItem>
                  <SelectItem value="stop">Stop</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Limit/Stop Price */}
            {orderType !== 'market' && (
              <div>
                <Label className="text-xs">{orderType === 'limit' ? 'Limit' : 'Stop'} Price</Label>
                <Input type="number" value={limitPrice} onChange={e => setLimitPrice(e.target.value)} step="0.0001" />
              </div>
            )}

            {/* Current Price Display */}
            <div className="p-2 bg-muted/50 rounded text-center">
              <span className="text-xs text-muted-foreground">Current: </span>
              <span className="font-mono font-bold">{currentPrice > 0 ? currentPrice.toFixed(5) : '—'}</span>
            </div>

            {/* Lot Size */}
            <div>
              <Label className="text-xs">Lot Size</Label>
              <Input type="number" value={orderSize} onChange={e => setOrderSize(e.target.value)} step="0.01" min="0.01" />
            </div>

            {/* SL/TP */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Stop Loss</Label>
                <Input type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)} placeholder="Optional" step="0.0001" />
              </div>
              <div>
                <Label className="text-xs">Take Profit</Label>
                <Input type="number" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} placeholder="Optional" step="0.0001" />
              </div>
            </div>

            {/* Buy/Sell */}
            <div className="grid grid-cols-2 gap-2">
              <Button className="bg-profit hover:bg-profit/90" onClick={() => handlePlaceOrder('buy')} disabled={!isActive && mode === 'live_paper'}>
                <TrendingUp className="h-4 w-4 mr-1" /> BUY
              </Button>
              <Button className="bg-loss hover:bg-loss/90" onClick={() => handlePlaceOrder('sell')} disabled={!isActive && mode === 'live_paper'}>
                <TrendingDown className="h-4 w-4 mr-1" /> SELL
              </Button>
            </div>

            {!isActive && mode === 'live_paper' && (
              <div className="flex items-center gap-2 p-2 bg-warning/10 rounded text-warning text-xs">
                <AlertTriangle className="h-3 w-3" /> Start simulation to trade
              </div>
            )}
          </CardContent>
        </Card>

        {/* Positions, Orders, History, Events */}
        <Card className="lg:col-span-2">
          <Tabs defaultValue="positions">
            <CardHeader className="pb-2">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="positions" className="text-xs">Positions ({positions.length})</TabsTrigger>
                <TabsTrigger value="orders" className="text-xs">Orders ({workingOrders.length})</TabsTrigger>
                <TabsTrigger value="history" className="text-xs">History ({closedTrades.length})</TabsTrigger>
                <TabsTrigger value="events" className="text-xs">Events</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              {/* Positions */}
              <TabsContent value="positions" className="mt-0">
                {positions.length === 0 ? (
                  <EmptyState text="No open positions" />
                ) : (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto">
                    {positions.map(pos => (
                      <div key={pos.id} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant={pos.side === 'buy' ? 'default' : 'destructive'} className="text-xs">
                            {pos.side.toUpperCase()}
                          </Badge>
                          <div>
                            <div className="font-medium">{pos.symbol}</div>
                            <div className="text-xs text-muted-foreground">
                              {pos.quantity} lots @ {pos.avg_entry_price.toFixed(5)}
                              {pos.stop_loss && <span> | SL: {pos.stop_loss}</span>}
                              {pos.take_profit && <span> | TP: {pos.take_profit}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className={cn('font-mono font-bold text-sm', pos.unrealized_pnl >= 0 ? 'text-profit' : 'text-loss')}>
                              {pos.unrealized_pnl >= 0 ? '+' : ''}${pos.unrealized_pnl.toFixed(2)}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleClosePosition(pos.id)}>
                            Close
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Working Orders */}
              <TabsContent value="orders" className="mt-0">
                {workingOrders.length === 0 ? (
                  <EmptyState text="No pending orders" />
                ) : (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto">
                    {workingOrders.map(order => (
                      <div key={order.id} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{order.type}</Badge>
                          <Badge variant={order.side === 'buy' ? 'default' : 'destructive'} className="text-xs">
                            {order.side.toUpperCase()}
                          </Badge>
                          <span>{order.symbol} {order.quantity}L @ {order.price}</span>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleCancelOrder(order.id)}>
                          Cancel
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Trade History */}
              <TabsContent value="history" className="mt-0">
                {closedTrades.length === 0 ? (
                  <EmptyState text="No trade history yet" />
                ) : (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto">
                    {closedTrades.slice().reverse().map(trade => (
                      <div key={trade.id} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'} className="text-xs">
                            {trade.side.toUpperCase()}
                          </Badge>
                          <span>{trade.symbol} {trade.quantity}L @ {trade.avg_fill_price.toFixed(5)}</span>
                          <span className="text-xs text-muted-foreground">Fee: ${trade.fees.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Event Log */}
              <TabsContent value="events" className="mt-0">
                {eventLog.length === 0 ? (
                  <EmptyState text="No events yet" />
                ) : (
                  <div className="space-y-1 max-h-[350px] overflow-y-auto font-mono text-xs">
                    {eventLog.slice().reverse().slice(0, 100).map((evt, i) => (
                      <div key={i} className={cn('p-1.5 rounded',
                        evt.type.includes('rejected') || evt.type.includes('margin') ? 'bg-destructive/10 text-destructive' :
                        evt.type.includes('filled') || evt.type.includes('opened') ? 'bg-profit/10 text-profit' :
                        evt.type.includes('closed') || evt.type.includes('triggered') ? 'bg-muted' : 'bg-muted/50'
                      )}>
                        <span className="text-muted-foreground">[{new Date(evt.ts).toLocaleTimeString()}]</span>{' '}
                        {evt.message}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Market Watch (Live Paper only) */}
      {mode === 'live_paper' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              Market Watch
              <Badge variant="outline" className="text-xs border-warning text-warning">Simulated</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
              {LIVE_SYMBOLS.map(symbol => (
                <div
                  key={symbol}
                  className={cn(
                    'p-2.5 rounded-lg border cursor-pointer transition-colors',
                    selectedSymbol === symbol ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  )}
                  onClick={() => setSelectedSymbol(symbol)}
                >
                  <div className="font-medium text-sm">{symbol}</div>
                  <div className="font-mono text-base">{livePrices[symbol]?.toFixed(symbol.includes('JPY') ? 3 : symbol === 'BTCUSD' ? 2 : 5)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-8 text-muted-foreground text-sm">{text}</div>
  );
}
