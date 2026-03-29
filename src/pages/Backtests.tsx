/**
 * Backtests Page - Gold Standard Layout
 * Spec: Left inputs, Center charts, Right KPIs, Bottom Trades table
 * Cloud-first: Uses Supabase for cross-device data sync
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Target,
  Activity,
  BarChart3,
  Percent,
  DollarSign,
  Zap,
  RefreshCw,
  Library
} from 'lucide-react';
import { notifyBacktestComplete } from '@/lib/backtestNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { db, type Dataset, type Strategy, type StrategyVersion, type BacktestRun, type BacktestResult, type Trade, type BacktestMetrics } from '@/db';
import { EquityChart } from '@/components/charts/EquityChart';
import { v4 as uuidv4 } from 'uuid';
import { useDataSync } from '@/hooks/useDataSync';
import { format } from 'date-fns';
import { useBacktestRecovery } from '@/hooks/useBacktestRecovery';
import { PageTitle } from '@/components/ui/PageTitle';
import { RecoveryBanner } from '@/components/backtest/RecoveryBanner';
import { UniversalAssetSelector, AssetOption } from '@/components/selectors/UniversalAssetSelector';
import { SharedDatasetSelector } from '@/components/backtest/SharedDatasetSelector';
import type { SharedDataset } from '@/lib/sharedDataService';

// KPI Card Component
function KPICard({ 
  label, 
  value, 
  icon: Icon, 
  trend,
  format = 'number'
}: { 
  label: string; 
  value: number | string; 
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  format?: 'number' | 'percent' | 'currency';
}) {
  const formatValue = () => {
    if (typeof value === 'string') return value;
    switch (format) {
      case 'percent':
        return `${value.toFixed(2)}%`;
      case 'currency':
        return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
      default:
        return value.toFixed(2);
    }
  };

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-lg font-bold tabular-nums ${
          trend === 'up' ? 'text-chart-2' : 
          trend === 'down' ? 'text-destructive' : ''
        }`}>
          {formatValue()}
        </span>
        {trend && trend !== 'neutral' && (
          trend === 'up' 
            ? <TrendingUp className="h-3.5 w-3.5 text-chart-2" />
            : <TrendingDown className="h-3.5 w-3.5 text-destructive" />
        )}
      </div>
    </div>
  );
}

export default function Backtests() {
  const { toast } = useToast();
  const workerRef = useRef<Worker | null>(null);
  
  // Cloud-first data sync
  const { 
    datasets: cloudDatasets, 
    strategies: cloudStrategies, 
    isLoading, 
    syncStatus, 
    refresh 
  } = useDataSync();
  
  // Crash recovery
  const {
    hasRecoverableRuns,
    recoverableRuns,
    isRecovering,
    resumeRun,
    cancelRun,
    cancelAll,
    dismissRecovery,
  } = useBacktestRecovery();
  
  // Local Dexie data for strategy versions
  const [strategyVersions, setStrategyVersions] = useState<StrategyVersion[]>([]);
  const [runs, setRuns] = useState<BacktestRun[]>([]);
  
  // Selected values
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [dataSourceTab, setDataSourceTab] = useState<'my' | 'library'>('my');
  const [selectedDatasetAsset, setSelectedDatasetAsset] = useState<AssetOption | null>(null);
  const [selectedStrategyAsset, setSelectedStrategyAsset] = useState<AssetOption | null>(null);
  const [selectedSharedDataset, setSelectedSharedDataset] = useState<SharedDataset | null>(null);
  
  // Config
  const [config, setConfig] = useState({
    slippage: 0.1,
    commission: 0.02,
    spread: 0,
    positionSize: 1,
    positionMode: 'fixed' as 'fixed' | 'risk-percent',
    dailyLossCap: 3,
    maxDrawdownStop: 20,
    maxTradesPerDay: 10
  });
  
  // Run state
  const [currentRun, setCurrentRun] = useState<BacktestRun | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [equity, setEquity] = useState<number[]>([]);
  const [drawdown, setDrawdown] = useState<number[]>([]);
  
  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBuyHold, setShowBuyHold] = useState(false);
  const [tradesExpanded, setTradesExpanded] = useState(true);
  const [sortField, setSortField] = useState<keyof Trade>('entryTs');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterDirection, setFilterDirection] = useState<'all' | 'long' | 'short'>('all');

  // Auto-select first dataset and strategy when cloud data loads
  useEffect(() => {
    if (cloudDatasets.length > 0 && !selectedDataset) {
      setSelectedDataset(cloudDatasets[0].id);
    }
    if (cloudStrategies.length > 0 && !selectedStrategy) {
      setSelectedStrategy(cloudStrategies[0].id);
    }
  }, [cloudDatasets, cloudStrategies, selectedDataset, selectedStrategy]);

  // Load local strategy versions and runs
  useEffect(() => {
    const loadLocalData = async () => {
      const runsData = await db.backtestRuns.orderBy('createdAt').reverse().limit(20).toArray();
      setRuns(runsData);
    };
    loadLocalData();
  }, []);

  // Load versions when strategy changes
  useEffect(() => {
    if (selectedStrategy) {
      db.strategyVersions.where('strategyId').equals(selectedStrategy).toArray().then(versions => {
        setStrategyVersions(versions);
        if (versions.length > 0) {
          setSelectedVersion(versions[versions.length - 1].id);
        } else {
          // Create default version if none exists
          setSelectedVersion('');
        }
      });
    }
  }, [selectedStrategy]);

  // Load versions when strategy changes
  useEffect(() => {
    if (selectedStrategy) {
      db.strategyVersions.where('strategyId').equals(selectedStrategy).toArray().then(versions => {
        setStrategyVersions(versions);
        if (versions.length > 0) {
          setSelectedVersion(versions[versions.length - 1].id);
        }
      });
    }
  }, [selectedStrategy]);

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/backtest.worker.ts', import.meta.url), { type: 'module' });
    
    workerRef.current.onmessage = async (e) => {
      const msg = e.data;
      
      switch (msg.type) {
        case 'progress':
          setCurrentRun(prev => prev ? {
            ...prev,
            progress: { pct: msg.pct, step: msg.step, lastTs: msg.lastTs, barsProcessed: msg.barsProcessed, totalBars: msg.totalBars }
          } : null);
          break;
          
        case 'checkpoint':
          // Save checkpoint to DB
          if (currentRun) {
            await db.backtestRuns.update(currentRun.id, {
              checkpoints: [...(currentRun.checkpoints || []), { ts: msg.ts, idx: msg.idx, state: msg.state }]
            });
          }
          break;
          
        case 'complete':
          setEquity(msg.equity);
          setDrawdown(msg.drawdown);
          setTrades(msg.trades);
          
          // Save result to DB
          const resultId = uuidv4();
          const resultData: BacktestResult = {
            id: resultId,
            runId: msg.runId,
            metrics: msg.metrics,
            equity: msg.equity,
            drawdown: msg.drawdown,
            tradeCount: msg.trades.length,
            summaryTable: {},
            createdAt: Date.now()
          };
          
          await db.results.put(resultData);
          setResult(resultData);
          
          // Update run status
          await db.backtestRuns.update(msg.runId, { status: 'done', endedAt: Date.now() });
          setCurrentRun(prev => prev ? { ...prev, status: 'done', endedAt: Date.now() } : null);
          
          // Notify user (toast + browser notification if enabled)
          notifyBacktestComplete({
            runId: msg.runId,
            outcome: 'success',
            metrics: {
              netProfit: msg.metrics.netProfit,
              winRate: msg.metrics.winRate,
              totalTrades: msg.trades.length,
            },
          });
          break;
          
        case 'error':
          await db.backtestRuns.update(msg.runId, { status: 'error', error: msg.error });
          setCurrentRun(prev => prev ? { ...prev, status: 'error', error: msg.error } : null);
          
          // Notify user of error
          notifyBacktestComplete({
            runId: msg.runId,
            outcome: 'error',
            errorMessage: msg.error,
          });
          break;
      }
    };
    
    return () => workerRef.current?.terminate();
  }, []);

  const startBacktest = async () => {
    if (!selectedDataset || !selectedVersion) {
      toast({ title: 'Missing Selection', description: 'Please select a dataset and strategy version', variant: 'destructive' });
      return;
    }
    
    const runId = uuidv4();
    const run: BacktestRun = {
      id: runId,
      strategyVersionId: selectedVersion,
      datasetId: selectedDataset,
      config: {
        slippage: config.slippage,
        commission: config.commission,
        spread: config.spread,
        fillModel: 'instant',
        positionSizing: { mode: config.positionMode, value: config.positionSize },
        riskControls: {
          dailyLossCap: config.dailyLossCap,
          maxDrawdownStop: config.maxDrawdownStop,
          maxTradesPerDay: config.maxTradesPerDay
        }
      },
      status: 'running',
      progress: { pct: 0, step: 'Starting...' },
      checkpoints: [],
      startedAt: Date.now(),
      createdAt: Date.now()
    };
    
    await db.backtestRuns.put(run);
    setCurrentRun(run);
    setResult(null);
    setTrades([]);
    setEquity([]);
    setDrawdown([]);
    
    workerRef.current?.postMessage({
      type: 'start',
      runId,
      datasetId: selectedDataset,
      strategyVersionId: selectedVersion,
      config: run.config
    });
  };

  const pauseBacktest = () => {
    if (currentRun) {
      workerRef.current?.postMessage({ type: 'pause', runId: currentRun.id });
      setCurrentRun(prev => prev ? { ...prev, status: 'paused' } : null);
      db.backtestRuns.update(currentRun.id, { status: 'paused' });
    }
  };

  const resumeBacktest = () => {
    if (currentRun) {
      workerRef.current?.postMessage({ type: 'resume', runId: currentRun.id });
      setCurrentRun(prev => prev ? { ...prev, status: 'running' } : null);
      db.backtestRuns.update(currentRun.id, { status: 'running' });
    }
  };

  const cancelBacktest = () => {
    if (currentRun) {
      workerRef.current?.postMessage({ type: 'cancel', runId: currentRun.id });
      setCurrentRun(prev => prev ? { ...prev, status: 'canceled' } : null);
      db.backtestRuns.update(currentRun.id, { status: 'canceled' });
    }
  };

  // Filter and sort trades
  const filteredTrades = trades
    .filter(t => filterDirection === 'all' || t.direction === filterDirection)
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

  const metrics = result?.metrics;

  // Handle resume from recovery
  const handleRecoveryResume = async (runId: string) => {
    const resumeInfo = await resumeRun(runId);
    if (resumeInfo && workerRef.current) {
      const run = recoverableRuns.find(r => r.id === runId);
      if (run) {
        setCurrentRun({ ...run, status: 'running' });
        workerRef.current.postMessage({
          type: 'start',
          runId,
          datasetId: run.datasetId,
          strategyVersionId: run.strategyVersionId,
          config: run.config,
          resumeFrom: resumeInfo.resumeFromIndex,
        });
        toast({ title: 'Resuming Backtest', description: `From checkpoint at ${resumeInfo.resumeFromIndex} bars` });
      }
    }
  };

  return (
    <div className="h-[calc(100dvh-8rem)] md:h-[calc(100vh-8rem)] flex flex-col gap-4 animate-fade-in">
      {/* Recovery Banner */}
      {hasRecoverableRuns && (
        <RecoveryBanner
          runs={recoverableRuns}
          onResume={handleRecoveryResume}
          onCancel={cancelRun}
          onCancelAll={cancelAll}
          onDismiss={dismissRecovery}
          isRecovering={isRecovering}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <PageTitle 
            title="Backtests" 
            subtitle="Run strategy backtests with detailed analysis"
          />
          {syncStatus.lastSync && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <RefreshCw className="h-3 w-3" />
              Last sync: {format(syncStatus.lastSync, 'HH:mm')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {currentRun?.status === 'running' && (
            <>
              <Button variant="outline" size="sm" onClick={pauseBacktest}>
                <Pause className="h-4 w-4 mr-1" /> Pause
              </Button>
              <Button variant="destructive" size="sm" onClick={cancelBacktest}>
                <Square className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </>
          )}
          {currentRun?.status === 'paused' && (
            <>
              <Button variant="outline" size="sm" onClick={resumeBacktest}>
                <Play className="h-4 w-4 mr-1" /> Resume
              </Button>
              <Button variant="destructive" size="sm" onClick={cancelBacktest}>
                <Square className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </>
          )}
          {(!currentRun || currentRun.status === 'done' || currentRun.status === 'canceled' || currentRun.status === 'error') && (
            <Button onClick={startBacktest} disabled={!selectedDataset || !selectedVersion}>
              <Play className="h-4 w-4 mr-1" /> Run Backtest
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {currentRun && currentRun.status !== 'done' && currentRun.status !== 'error' && (
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between mb-1 text-sm">
            <span>{currentRun.progress.step}</span>
            <span className="tabular-nums">{currentRun.progress.pct}%</span>
          </div>
          <Progress value={currentRun.progress.pct} className="h-2" />
        </div>
      )}

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left Panel - Inputs */}
        <div className="col-span-3 flex flex-col gap-4 overflow-y-auto">
          <Card className="flex-shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dataset Selection with Tabs */}
              <div className="space-y-2">
                <Label className="text-xs">Dataset</Label>
                <Tabs value={dataSourceTab} onValueChange={(v) => setDataSourceTab(v as 'my' | 'library')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-7">
                    <TabsTrigger value="my" className="text-xs h-6">My Data</TabsTrigger>
                    <TabsTrigger value="library" className="text-xs h-6">
                      <Library className="h-3 w-3 mr-1" />
                      Library
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="my" className="mt-2">
                    <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select dataset" />
                      </SelectTrigger>
                      <SelectContent>
                        {cloudDatasets.map(ds => (
                          <SelectItem key={ds.id} value={ds.id} className="text-xs">
                            {ds.name} ({ds.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TabsContent>
                  <TabsContent value="library" className="mt-2">
                    <SharedDatasetSelector
                      selectedDataset={selectedSharedDataset}
                      onSelect={(ds) => {
                        setSelectedSharedDataset(ds);
                        if (ds) setSelectedDataset(ds.id);
                      }}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Strategy Selection with Universal Selector */}
              <div className="space-y-2">
                <Label className="text-xs">Strategy</Label>
                <UniversalAssetSelector
                  assetType="strategy"
                  value={selectedStrategyAsset}
                  onSelect={(asset) => {
                    setSelectedStrategyAsset(asset);
                    if (asset) setSelectedStrategy(asset.id);
                  }}
                  placeholder="Select strategy..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Version</Label>
                <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    {strategyVersions.map(v => (
                      <SelectItem key={v.id} value={v.id} className="text-xs">
                        v{v.version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Slippage %</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    className="h-7 text-xs"
                    value={config.slippage}
                    onChange={e => setConfig(c => ({ ...c, slippage: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Commission %</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    className="h-7 text-xs"
                    value={config.commission}
                    onChange={e => setConfig(c => ({ ...c, commission: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
                    Advanced Settings
                    {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Position Size</Label>
                    <Input 
                      type="number"
                      className="h-7 text-xs"
                      value={config.positionSize}
                      onChange={e => setConfig(c => ({ ...c, positionSize: parseFloat(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Daily Loss Cap %</Label>
                    <Input 
                      type="number"
                      className="h-7 text-xs"
                      value={config.dailyLossCap}
                      onChange={e => setConfig(c => ({ ...c, dailyLossCap: parseFloat(e.target.value) || 3 }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max DD Stop %</Label>
                    <Input 
                      type="number"
                      className="h-7 text-xs"
                      value={config.maxDrawdownStop}
                      onChange={e => setConfig(c => ({ ...c, maxDrawdownStop: parseFloat(e.target.value) || 20 }))}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Run History */}
          <Card className="flex-1 min-h-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recent Runs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-48">
                <div className="space-y-1 p-3">
                  {runs.slice(0, 10).map(run => (
                    <div 
                      key={run.id}
                      className="flex items-center justify-between p-2 rounded text-xs hover:bg-muted cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          run.status === 'done' ? 'default' :
                          run.status === 'running' ? 'secondary' :
                          run.status === 'error' ? 'destructive' : 'outline'
                        } className="text-[10px] px-1">
                          {run.status}
                        </Badge>
                        <span className="text-muted-foreground">
                          {new Date(run.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Center Panel - Charts */}
        <div className="col-span-6 flex flex-col gap-4 min-h-0">
          <Card className="flex-1 min-h-0">
            <CardHeader className="pb-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Equity Curve</CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Buy & Hold</Label>
                  <Switch checked={showBuyHold} onCheckedChange={setShowBuyHold} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-2">
              {equity.length > 0 ? (
                <EquityChart 
                  data={equity} 
                  showCard={false}
                  height={300}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Run a backtest to see equity curve
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - KPIs */}
        <div className="col-span-3 flex flex-col gap-4 overflow-y-auto">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Key Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {metrics ? (
                <>
                  <KPICard 
                    label="Net Profit" 
                    value={metrics.netProfit} 
                    icon={DollarSign}
                    format="currency"
                    trend={metrics.netProfit > 0 ? 'up' : 'down'}
                  />
                  <KPICard 
                    label="Max Drawdown" 
                    value={metrics.maxDrawdownPct} 
                    icon={TrendingDown}
                    format="percent"
                    trend="down"
                  />
                  <KPICard 
                    label="Sharpe Ratio" 
                    value={metrics.sharpeRatio} 
                    icon={Activity}
                    trend={metrics.sharpeRatio > 1 ? 'up' : metrics.sharpeRatio > 0 ? 'neutral' : 'down'}
                  />
                  <KPICard 
                    label="Sortino Ratio" 
                    value={metrics.sortinoRatio} 
                    icon={Zap}
                    trend={metrics.sortinoRatio > 1 ? 'up' : 'neutral'}
                  />
                  <KPICard 
                    label="Win Rate" 
                    value={metrics.winRate} 
                    icon={Target}
                    format="percent"
                    trend={metrics.winRate > 50 ? 'up' : 'down'}
                  />
                  <KPICard 
                    label="Profit Factor" 
                    value={metrics.profitFactor} 
                    icon={BarChart3}
                    trend={metrics.profitFactor > 1.5 ? 'up' : metrics.profitFactor > 1 ? 'neutral' : 'down'}
                  />
                  <KPICard 
                    label="Total Trades" 
                    value={metrics.totalTrades} 
                    icon={Activity}
                  />
                  <KPICard 
                    label="Avg Hold Bars" 
                    value={metrics.avgHoldBars} 
                    icon={Clock}
                  />
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No results yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warnings */}
          {metrics && metrics.maxDrawdownPct > 30 && (
            <Card className="border-destructive/50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium text-destructive">High Drawdown</p>
                    <p className="text-muted-foreground">
                      Max drawdown exceeds 30%. Consider adjusting position sizing.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom Panel - Trades Table */}
      <Collapsible open={tradesExpanded} onOpenChange={setTradesExpanded}>
        <Card className="flex-shrink-0">
          <CollapsibleTrigger asChild>
            <CardHeader className="py-2 cursor-pointer hover:bg-muted/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  Trades ({filteredTrades.length})
                  {tradesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <Select value={filterDirection} onValueChange={(v) => setFilterDirection(v as typeof filterDirection)}>
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <Filter className="h-3 w-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="long">Long</SelectItem>
                      <SelectItem value="short">Short</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    <Download className="h-3 w-3 mr-1" /> Export
                  </Button>
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-0">
              <ScrollArea className="h-48">
                <div className="overflow-x-auto w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-32">Entry Time</TableHead>
                      <TableHead className="text-xs w-32">Exit Time</TableHead>
                      <TableHead className="text-xs w-16">Dir</TableHead>
                      <TableHead className="text-xs text-right w-24">Entry</TableHead>
                      <TableHead className="text-xs text-right w-24">Exit</TableHead>
                      <TableHead className="text-xs text-right w-24">P&L</TableHead>
                      <TableHead className="text-xs text-right w-16">P&L %</TableHead>
                      <TableHead className="text-xs w-24">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrades.map((trade, i) => (
                      <TableRow key={trade.id} className="text-xs">
                        <TableCell className="tabular-nums">
                          {new Date(trade.entryTs).toLocaleString()}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {new Date(trade.exitTs).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={trade.direction === 'long' ? 'default' : 'secondary'} className="text-[10px]">
                            {trade.direction}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {trade.entryPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {trade.exitPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${
                          trade.pnl > 0 ? 'text-chart-2' : 'text-destructive'
                        }`}>
                          ₹{trade.pnl.toFixed(0)}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums ${
                          trade.pnlPct > 0 ? 'text-chart-2' : 'text-destructive'
                        }`}>
                          {trade.pnlPct.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {trade.exitReason}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
