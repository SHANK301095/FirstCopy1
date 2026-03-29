/**
 * Live Portfolio Tracker Page
 * Real-time P&L tracking dashboard with live positions
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Plus,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  AlertTriangle,
  DollarSign,
  Percent,
  BarChart2,
  Eye,
  EyeOff,
  Pause,
  Play,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Position {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  entryTime: number;
  notes?: string;
}

interface DayStats {
  realizedPnL: number;
  unrealizedPnL: number;
  totalTrades: number;
  winners: number;
  losers: number;
  peakEquity: number;
  currentDrawdown: number;
}

export default function LiveTracker() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [dayStats, setDayStats] = useState<DayStats>({
    realizedPnL: 0,
    unrealizedPnL: 0,
    totalTrades: 0,
    winners: 0,
    losers: 0,
    peakEquity: 100000,
    currentDrawdown: 0,
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showPnL, setShowPnL] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Form state
  const [formData, setFormData] = useState({
    symbol: '',
    direction: 'long' as 'long' | 'short',
    entryPrice: 0,
    currentPrice: 0,
    quantity: 1,
    stopLoss: 0,
    takeProfit: 0,
    notes: '',
  });

  // Load positions
  useEffect(() => {
    const saved = localStorage.getItem('live-positions');
    if (saved) {
      setPositions(JSON.parse(saved));
    }
    const savedStats = localStorage.getItem('day-stats');
    if (savedStats) {
      setDayStats(JSON.parse(savedStats));
    }
  }, []);

  // Save positions
  const savePositions = (newPositions: Position[]) => {
    localStorage.setItem('live-positions', JSON.stringify(newPositions));
    setPositions(newPositions);
  };

  const saveDayStats = (newStats: DayStats) => {
    localStorage.setItem('day-stats', JSON.stringify(newStats));
    setDayStats(newStats);
  };

  // Simulate price updates - DEMO MODE
  // Note: In production, this would connect to a real-time data feed
  useEffect(() => {
    if (isPaused || positions.length === 0) return;

    let tick = 0;
    const seed = Date.now();
    
    const interval = setInterval(() => {
      tick++;
      setPositions(prev => prev.map((p, idx) => {
        // Deterministic simulation for demo
        const simValue = Math.sin((seed + tick * (idx + 1)) * 0.01) * 0.001;
        return {
          ...p,
          currentPrice: p.currentPrice * (1 + simValue)
        };
      }));
      setLastUpdate(Date.now());
    }, 2000);

    return () => clearInterval(interval);
  }, [isPaused, positions.length]);

  // Calculate unrealized P&L
  useEffect(() => {
    const unrealized = positions.reduce((sum, p) => {
      const pnl = p.direction === 'long'
        ? (p.currentPrice - p.entryPrice) * p.quantity
        : (p.entryPrice - p.currentPrice) * p.quantity;
      return sum + pnl;
    }, 0);

    setDayStats(prev => ({ ...prev, unrealizedPnL: unrealized }));
  }, [positions]);

  const calculatePnL = (position: Position): number => {
    return position.direction === 'long'
      ? (position.currentPrice - position.entryPrice) * position.quantity
      : (position.entryPrice - position.currentPrice) * position.quantity;
  };

  const calculatePnLPercent = (position: Position): number => {
    const diff = position.direction === 'long'
      ? position.currentPrice - position.entryPrice
      : position.entryPrice - position.currentPrice;
    return (diff / position.entryPrice) * 100;
  };

  const addPosition = () => {
    const newPosition: Position = {
      id: `pos-${Date.now()}`,
      symbol: formData.symbol.toUpperCase(),
      direction: formData.direction,
      entryPrice: formData.entryPrice,
      currentPrice: formData.currentPrice || formData.entryPrice,
      quantity: formData.quantity,
      stopLoss: formData.stopLoss || undefined,
      takeProfit: formData.takeProfit || undefined,
      entryTime: Date.now(),
      notes: formData.notes || undefined,
    };

    savePositions([...positions, newPosition]);
    setIsCreateOpen(false);
    resetForm();
    toast.success('Position added', { description: `${formData.symbol} ${formData.direction}` });
  };

  const closePosition = (id: string) => {
    const position = positions.find(p => p.id === id);
    if (!position) return;

    const pnl = calculatePnL(position);
    
    // Update day stats
    saveDayStats({
      ...dayStats,
      realizedPnL: dayStats.realizedPnL + pnl,
      totalTrades: dayStats.totalTrades + 1,
      winners: pnl > 0 ? dayStats.winners + 1 : dayStats.winners,
      losers: pnl < 0 ? dayStats.losers + 1 : dayStats.losers,
    });

    savePositions(positions.filter(p => p.id !== id));
    toast.success('Position closed', {
      description: `${position.symbol}: ${pnl >= 0 ? '+' : ''}₹${pnl.toFixed(2)}`
    });
  };

  const updatePrice = (id: string, price: number) => {
    setPositions(prev => prev.map(p =>
      p.id === id ? { ...p, currentPrice: price } : p
    ));
  };

  const resetForm = () => {
    setFormData({
      symbol: '',
      direction: 'long',
      entryPrice: 0,
      currentPrice: 0,
      quantity: 1,
      stopLoss: 0,
      takeProfit: 0,
      notes: '',
    });
  };

  const resetDay = () => {
    saveDayStats({
      realizedPnL: 0,
      unrealizedPnL: 0,
      totalTrades: 0,
      winners: 0,
      losers: 0,
      peakEquity: 100000,
      currentDrawdown: 0,
    });
    toast.success('Day stats reset');
  };

  const totalPnL = dayStats.realizedPnL + dayStats.unrealizedPnL;
  const winRate = dayStats.totalTrades > 0 
    ? (dayStats.winners / dayStats.totalTrades) * 100 
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Live Tracker
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            Real-time position monitoring
            <Badge variant="outline" className="gap-1 text-xs">
              <Clock className="h-3 w-3" />
              Updated {Math.round((Date.now() - lastUpdate) / 1000)}s ago
            </Badge>
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowPnL(!showPnL)}
          >
            {showPnL ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Position
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Position</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label>Symbol</Label>
                    <Input
                      value={formData.symbol}
                      onChange={e => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
                      placeholder="NIFTY, RELIANCE..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Direction</Label>
                    <Select
                      value={formData.direction}
                      onValueChange={v => setFormData(prev => ({ ...prev, direction: v as 'long' | 'short' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="long">Long</SelectItem>
                        <SelectItem value="short">Short</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Entry Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.entryPrice || ''}
                      onChange={e => setFormData(prev => ({ ...prev, entryPrice: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.currentPrice || ''}
                      onChange={e => setFormData(prev => ({ ...prev, currentPrice: parseFloat(e.target.value) || 0 }))}
                      placeholder="Same as entry"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={formData.quantity}
                      onChange={e => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label>Stop Loss (optional)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.stopLoss || ''}
                      onChange={e => setFormData(prev => ({ ...prev, stopLoss: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Take Profit (optional)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.takeProfit || ''}
                      onChange={e => setFormData(prev => ({ ...prev, takeProfit: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={addPosition} disabled={!formData.symbol || !formData.entryPrice}>
                  Add Position
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Day Summary */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <Card className={cn(
          'col-span-1 lg:col-span-2',
          totalPnL >= 0 ? 'border-profit/30' : 'border-loss/30'
        )}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <p className={cn(
                  'text-3xl font-bold font-mono',
                  !showPnL && 'blur-sm select-none',
                  totalPnL >= 0 ? 'text-profit' : 'text-loss'
                )}>
                  {totalPnL >= 0 ? '+' : ''}₹{totalPnL.toFixed(2)}
                </p>
              </div>
              <div className={cn(
                'p-3 rounded-full',
                totalPnL >= 0 ? 'bg-profit/10' : 'bg-loss/10'
              )}>
                {totalPnL >= 0 
                  ? <TrendingUp className="h-6 w-6 text-profit" />
                  : <TrendingDown className="h-6 w-6 text-loss" />
                }
              </div>
            </div>
            <div className="flex gap-4 mt-3 text-sm">
              <span className="text-profit">
                Realized: {showPnL ? `₹${dayStats.realizedPnL.toFixed(2)}` : '***'}
              </span>
              <span className={dayStats.unrealizedPnL >= 0 ? 'text-profit' : 'text-loss'}>
                Unrealized: {showPnL ? `₹${dayStats.unrealizedPnL.toFixed(2)}` : '***'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{dayStats.totalTrades}</p>
                <p className="text-xs text-muted-foreground">Trades Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-profit/10">
                <Target className="h-5 w-5 text-profit" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{winRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-4/10">
                <Activity className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{positions.length}</p>
                <p className="text-xs text-muted-foreground">Open Positions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Open Positions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Open Positions</h2>
          {positions.length > 0 && (
            <Button variant="ghost" size="sm" onClick={resetDay}>
              Reset Day Stats
            </Button>
          )}
        </div>

        {positions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No open positions</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
                Add a position
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {positions.map(position => {
              const pnl = calculatePnL(position);
              const pnlPercent = calculatePnLPercent(position);
              const isProfit = pnl >= 0;

              // Calculate distance to SL/TP
              let slDistance = null;
              let tpDistance = null;
              if (position.stopLoss) {
                slDistance = position.direction === 'long'
                  ? ((position.currentPrice - position.stopLoss) / position.currentPrice) * 100
                  : ((position.stopLoss - position.currentPrice) / position.currentPrice) * 100;
              }
              if (position.takeProfit) {
                tpDistance = position.direction === 'long'
                  ? ((position.takeProfit - position.currentPrice) / position.currentPrice) * 100
                  : ((position.currentPrice - position.takeProfit) / position.currentPrice) * 100;
              }

              return (
                <Card
                  key={position.id}
                  className={cn(
                    'transition-all',
                    isProfit ? 'border-profit/30' : 'border-loss/30'
                  )}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      {/* Symbol & Direction */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{position.symbol}</span>
                          <Badge variant={position.direction === 'long' ? 'default' : 'secondary'}>
                            {position.direction.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {position.quantity} qty
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm">
                          <span className="text-muted-foreground">
                            Entry: <span className="font-mono">₹{position.entryPrice.toFixed(2)}</span>
                          </span>
                          <span className="font-medium">
                            Current: <span className="font-mono">₹{position.currentPrice.toFixed(2)}</span>
                          </span>
                        </div>
                      </div>

                      {/* SL/TP Indicators */}
                      {(position.stopLoss || position.takeProfit) && (
                        <div className="flex items-center gap-3 text-xs">
                          {position.stopLoss && slDistance !== null && (
                            <div className={cn(
                              'px-2 py-1 rounded',
                              slDistance < 1 ? 'bg-destructive/20 text-destructive' : 'bg-muted'
                            )}>
                              SL: {slDistance.toFixed(1)}% away
                            </div>
                          )}
                          {position.takeProfit && tpDistance !== null && (
                            <div className={cn(
                              'px-2 py-1 rounded',
                              tpDistance < 1 ? 'bg-profit/20 text-profit' : 'bg-muted'
                            )}>
                              TP: {tpDistance.toFixed(1)}% away
                            </div>
                          )}
                        </div>
                      )}

                      {/* P&L */}
                      <div className="text-right">
                        <p className={cn(
                          'text-xl font-bold font-mono',
                          !showPnL && 'blur-sm select-none',
                          isProfit ? 'text-profit' : 'text-loss'
                        )}>
                          {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
                        </p>
                        <p className={cn(
                          'text-sm font-mono',
                          !showPnL && 'blur-sm select-none',
                          isProfit ? 'text-profit' : 'text-loss'
                        )}>
                          {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => closePosition(position.id)}
                        >
                          Close
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            savePositions(positions.filter(p => p.id !== position.id));
                            toast.success('Position removed');
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
