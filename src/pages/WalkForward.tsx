/**
 * Walk-Forward Analysis Page
 * Rolling window optimization with overfitting diagnostics
 * Uses REAL OHLCV data and backtest engine
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { computeWalkForwardDiagnostics } from '@/services/walkForwardDiagnostics';
import { 
  TrendingUp, 
  Play, 
  Pause, 
  Square, 
  Calendar,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  LineChart,
  Info,
  Database,
  Code
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { db, Dataset, Strategy } from '@/db/index';
import { TrainTestComparison } from '@/components/analytics/WalkForwardCharts';
import { useBacktestStore } from '@/lib/backtestStore';
import { executeBacktest, BacktestConfig } from '@/lib/backtestEngine';
import { parseStrategy } from '@/lib/strategyParser';
import { cn } from '@/lib/utils';
import { secureLogger } from '@/lib/secureLogger';
import { PageTitle } from '@/components/ui/PageTitle';
import { UniversalAssetSelector, AssetOption } from '@/components/selectors/UniversalAssetSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useWalkForwardRuns } from '@/hooks/useWalkForwardRuns';

interface WalkForwardWindow {
  id: string;
  windowIndex: number;
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
  status: 'pending' | 'training' | 'testing' | 'done' | 'error';
  trainMetrics?: {
    netProfit: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  testMetrics?: {
    netProfit: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  bestParams?: Record<string, number>;
}

interface OverfittingDiagnostics {
  trainTestCorrelation: number;
  degradationRatio: number;
  consistencyScore: number;
  recommendation: 'robust' | 'acceptable' | 'overfitting';
}

const SPLIT_MODES = [
  { value: 'ratio', label: 'Fixed Ratio' },
  { value: 'rolling', label: 'Rolling Window' },
];

export default function WalkForward() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { uploadedData, strategy } = useBacktestStore();
  const { runs: pastRuns, saveRun, loading: runsLoading } = useWalkForwardRuns();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  
  // Universal selector assets
  const [selectedDatasetAsset, setSelectedDatasetAsset] = useState<AssetOption | null>(null);
  const [selectedStrategyAsset, setSelectedStrategyAsset] = useState<AssetOption | null>(null);
  
  // Configuration
  const [splitMode, setSplitMode] = useState('rolling');
  const [trainRatio, setTrainRatio] = useState(70);
  const [windowSize, setWindowSize] = useState(252); // ~1 year trading days
  const [stepSize, setStepSize] = useState(63); // ~3 months
  const [numWindows, setNumWindows] = useState(4);
  
  // State
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [windows, setWindows] = useState<WalkForwardWindow[]>([]);
  const [currentWindow, setCurrentWindow] = useState(0);
  const [diagnostics, setDiagnostics] = useState<OverfittingDiagnostics | null>(null);
  
  // Check if we have real data from workflow
  const hasRealData = uploadedData && uploadedData.rows.length > 0 && strategy.code;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const ds = await db.datasets.toArray();
    const st = await db.strategies.toArray();
    setDatasets(ds);
    setStrategies(st);
    if (ds.length > 0) setSelectedDataset(ds[0].id);
    if (st.length > 0) setSelectedStrategy(st[0].id);
  };
  
  // Sync universal selector with legacy state
  const handleDatasetSelect = (asset: AssetOption | null) => {
    setSelectedDatasetAsset(asset);
    if (asset) {
      setSelectedDataset(asset.id);
    } else {
      setSelectedDataset('');
    }
  };
  
  const handleStrategySelect = (asset: AssetOption | null) => {
    setSelectedStrategyAsset(asset);
    if (asset) {
      setSelectedStrategy(asset.id);
    } else {
      setSelectedStrategy('');
    }
  };

  const generateWindows = (): WalkForwardWindow[] => {
    const today = new Date();
    const result: WalkForwardWindow[] = [];
    
    for (let i = 0; i < numWindows; i++) {
      const testEnd = new Date(today);
      testEnd.setDate(testEnd.getDate() - (i * stepSize));
      
      const testStart = new Date(testEnd);
      testStart.setDate(testStart.getDate() - Math.floor(windowSize * (1 - trainRatio / 100)));
      
      const trainEnd = new Date(testStart);
      trainEnd.setDate(trainEnd.getDate() - 1);
      
      const trainStart = new Date(trainEnd);
      trainStart.setDate(trainStart.getDate() - Math.floor(windowSize * trainRatio / 100));
      
      result.push({
        id: uuidv4(),
        windowIndex: i + 1,
        trainStart: trainStart.toISOString().split('T')[0],
        trainEnd: trainEnd.toISOString().split('T')[0],
        testStart: testStart.toISOString().split('T')[0],
        testEnd: testEnd.toISOString().split('T')[0],
        status: 'pending',
      });
    }
    
    return result.reverse();
  };

  const runWalkForward = async () => {
    if (!hasRealData && (!selectedDataset || !selectedStrategy)) {
      toast({ title: 'Error', description: 'Upload data and strategy in Workflow, or select from saved datasets', variant: 'destructive' });
      return;
    }

    const generatedWindows = generateWindows();
    setWindows(generatedWindows);
    setIsRunning(true);
    setIsPaused(false);
    setCurrentWindow(0);
    setDiagnostics(null);

    // Convert uploaded data to OHLCV format if available
    let ohlcvData: Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }> = [];
    
    if (hasRealData && uploadedData) {
      const cols = uploadedData.columns;
      const tsCol = cols.find(c => c.mapping === 'timestamp')?.name;
      const openCol = cols.find(c => c.mapping === 'open')?.name;
      const highCol = cols.find(c => c.mapping === 'high')?.name;
      const lowCol = cols.find(c => c.mapping === 'low')?.name;
      const closeCol = cols.find(c => c.mapping === 'close')?.name;
      const volCol = cols.find(c => c.mapping === 'volume')?.name;
      
      if (tsCol && openCol && highCol && lowCol && closeCol) {
        ohlcvData = uploadedData.rows.map(row => ({
          timestamp: new Date(String(row[tsCol] || '')).getTime(),
          open: Number(row[openCol]) || 0,
          high: Number(row[highCol]) || 0,
          low: Number(row[lowCol]) || 0,
          close: Number(row[closeCol]) || 0,
          volume: volCol ? Number(row[volCol]) || 0 : 0,
        }));
      }
    }
    
    const useRealEngine = ohlcvData.length > 0 && strategy.code;
    let parsedStrategy: ReturnType<typeof parseStrategy> | null = null;
    
    if (useRealEngine) {
      try {
        parsedStrategy = parseStrategy(strategy.code, strategy.language);
      } catch (e) {
        secureLogger.error('backtest', 'Strategy parse error in WalkForward', { error: String(e) });
      }
    }

    for (let i = 0; i < generatedWindows.length; i++) {
      if (!isRunning) break;
      
      while (isPaused) {
        await new Promise(r => setTimeout(r, 100));
      }

      setCurrentWindow(i);
      
      // Training phase
      setWindows(prev => prev.map((w, idx) => 
        idx === i ? { ...w, status: 'training' } : w
      ));
      
      let trainMetrics = {
        netProfit: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
      };
      
      let bestParams = {
        period: 20,
        multiplier: 2,
      };
      
      if (useRealEngine && parsedStrategy && ohlcvData.length > 0) {
        // Calculate window indices based on data
        const totalBars = ohlcvData.length;
        const trainBars = Math.floor(windowSize * trainRatio / 100);
        const testBars = windowSize - trainBars;
        const startIdx = Math.max(0, totalBars - (numWindows - i) * stepSize - windowSize);
        const trainEndIdx = startIdx + trainBars;
        const testEndIdx = Math.min(startIdx + windowSize, totalBars);
        
        const trainData = ohlcvData.slice(startIdx, trainEndIdx);
        
        if (trainData.length > 50) {
          const backtestConfig: BacktestConfig = {
            initialCapital: 100000,
            commissionPercent: 0.01,
            slippageTicks: 1,
            spreadPoints: 0,
            riskPerTrade: 1,
            maxTradesPerDay: 10,
            dailyLossCap: 5,
          };
          
          const trainResult = executeBacktest(trainData, parsedStrategy, backtestConfig, uploadedData?.activeSymbol || 'UNKNOWN');
          trainMetrics = {
            netProfit: trainResult.netProfit,
            sharpeRatio: trainResult.sharpeRatio,
            maxDrawdown: trainResult.maxDrawdownPercent,
          };
        }
      } else {
        // No real data available - show "Coming Soon" message instead of mock data
        toast({ 
          title: 'Real Data Required', 
          description: 'Walk-Forward analysis requires uploaded dataset and strategy. Mock data disabled.',
          variant: 'destructive'
        });
        setIsRunning(false);
        return;
      }

      setWindows(prev => prev.map((w, idx) => 
        idx === i ? { ...w, trainMetrics, bestParams } : w
      ));

      // Testing phase
      setWindows(prev => prev.map((w, idx) => 
        idx === i ? { ...w, status: 'testing' } : w
      ));
      
      let testMetrics = {
        netProfit: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
      };
      
      if (useRealEngine && parsedStrategy && ohlcvData.length > 0) {
        const totalBars = ohlcvData.length;
        const trainBars = Math.floor(windowSize * trainRatio / 100);
        const startIdx = Math.max(0, totalBars - (numWindows - i) * stepSize - windowSize);
        const trainEndIdx = startIdx + trainBars;
        const testEndIdx = Math.min(startIdx + windowSize, totalBars);
        
        const testData = ohlcvData.slice(trainEndIdx, testEndIdx);
        
        if (testData.length > 20) {
          const backtestConfig: BacktestConfig = {
            initialCapital: 100000,
            commissionPercent: 0.01,
            slippageTicks: 1,
            spreadPoints: 0,
            riskPerTrade: 1,
            maxTradesPerDay: 10,
            dailyLossCap: 5,
          };
          
          const testResult = executeBacktest(testData, parsedStrategy, backtestConfig, uploadedData?.activeSymbol || 'UNKNOWN');
          testMetrics = {
            netProfit: testResult.netProfit,
            sharpeRatio: testResult.sharpeRatio,
            maxDrawdown: testResult.maxDrawdownPercent,
          };
        }
      } else {
        // No test data - cannot proceed without real data
        setIsRunning(false);
        return;
      }

      setWindows(prev => prev.map((w, idx) => 
        idx === i ? { ...w, status: 'done', testMetrics } : w
      ));
    }

    // Calculate diagnostics using real diagnostics service
    const finalWindows = [...windows];
    
    if (finalWindows.length >= 2) {
      const realDiagnostics = computeWalkForwardDiagnostics(finalWindows.map(w => ({
        windowIndex: w.windowIndex,
        trainMetrics: w.trainMetrics,
        testMetrics: w.testMetrics,
        bestParams: w.bestParams,
      })));

      const mappedRecommendation = realDiagnostics.recommendation === 'insufficient_data' 
        ? 'overfitting' as const 
        : realDiagnostics.recommendation;

      setDiagnostics({
        trainTestCorrelation: realDiagnostics.trainTestCorrelation,
        degradationRatio: realDiagnostics.degradationRatio,
        consistencyScore: realDiagnostics.consistencyScore,
        recommendation: mappedRecommendation,
      });
    }

    setIsRunning(false);
    toast({ title: 'Walk-Forward Complete', description: `Analyzed ${generatedWindows.length} windows with real data` });
    
    // Persist run to DB
    try {
      await saveRun({
        config: { splitMode, trainRatio, windowSize, stepSize, numWindows },
        windows: finalWindows.map(w => ({
          windowIndex: w.windowIndex,
          trainStart: w.trainStart,
          trainEnd: w.trainEnd,
          testStart: w.testStart,
          testEnd: w.testEnd,
          trainMetrics: w.trainMetrics,
          testMetrics: w.testMetrics,
          bestParams: w.bestParams,
        })),
        diagnostics: diagnostics ? {
          trainTestCorrelation: diagnostics.trainTestCorrelation,
          degradationRatio: diagnostics.degradationRatio,
          consistencyScore: diagnostics.consistencyScore,
          recommendation: diagnostics.recommendation,
        } as Record<string, unknown> : null,
        strategy_id: selectedStrategy || undefined,
        dataset_id: selectedDataset || undefined,
        status: 'completed',
      });
    } catch (e) {
      console.error('[WalkForward] Failed to persist run:', e);
    }
    
    await db.log('info', 'Walk-forward analysis completed', { windows: generatedWindows.length });
  };

  const pauseAnalysis = () => setIsPaused(true);
  const resumeAnalysis = () => setIsPaused(false);
  const stopAnalysis = () => {
    setIsRunning(false);
    setIsPaused(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle 
        title="Walk-Forward Analysis" 
        subtitle="Test strategy robustness with rolling optimization windows"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Configuration */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-muted-foreground" />
                  Dataset
                </Label>
                <UniversalAssetSelector
                  assetType="dataset"
                  value={selectedDatasetAsset}
                  onSelect={handleDatasetSelect}
                  placeholder="Select dataset..."
                  disabled={isRunning}
                  showSharedDatasets={true}
                />
                {selectedDatasetAsset && (
                  <p className="text-xs text-muted-foreground">
                    {selectedDatasetAsset.subtitle}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Code className="h-3.5 w-3.5 text-muted-foreground" />
                  Strategy
                </Label>
                <UniversalAssetSelector
                  assetType="strategy"
                  value={selectedStrategyAsset}
                  onSelect={handleStrategySelect}
                  placeholder="Select strategy..."
                  disabled={isRunning}
                />
                {selectedStrategyAsset && (
                  <p className="text-xs text-muted-foreground">
                    {selectedStrategyAsset.subtitle}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Split Mode</Label>
                <Select value={splitMode} onValueChange={setSplitMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPLIT_MODES.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Train %</Label>
                  <Input
                    type="number"
                    value={trainRatio}
                    onChange={(e) => setTrainRatio(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Windows</Label>
                  <Input
                    type="number"
                    value={numWindows}
                    onChange={(e) => setNumWindows(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Window Size (days)</Label>
                  <Input
                    type="number"
                    value={windowSize}
                    onChange={(e) => setWindowSize(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Step Size (days)</Label>
                  <Input
                    type="number"
                    value={stepSize}
                    onChange={(e) => setStepSize(Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Run Controls */}
          <Card>
            <CardContent className="py-4">
              <div className="flex gap-2">
                {!isRunning ? (
                  <Button className="flex-1" onClick={runWalkForward}>
                    <Play className="h-4 w-4 mr-2" />
                    Run Analysis
                  </Button>
                ) : (
                  <>
                    {isPaused ? (
                      <Button className="flex-1" onClick={resumeAnalysis}>
                        <Play className="h-4 w-4 mr-2" />
                        Resume
                      </Button>
                    ) : (
                      <Button variant="outline" className="flex-1" onClick={pauseAnalysis}>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </Button>
                    )}
                    <Button variant="destructive" onClick={stopAnalysis}>
                      <Square className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              
              {isRunning && (
                <div className="mt-4 space-y-2">
                  <Progress value={(currentWindow / numWindows) * 100} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">
                    Window {currentWindow + 1} of {numWindows}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Diagnostics */}
          {diagnostics && (
            <Card className={cn(
              'border-2',
              diagnostics.recommendation === 'robust' && 'border-profit/50',
              diagnostics.recommendation === 'overfitting' && 'border-loss/50',
              diagnostics.recommendation === 'acceptable' && 'border-warning/50'
            )}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Overfitting Diagnostics
                </CardTitle>
                <CardDescription className="text-xs">
                  All metrics computed from actual train/test results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Train→Test Correlation</span>
                  <span className={cn(
                    'font-mono',
                    diagnostics.trainTestCorrelation > 0.4 ? 'text-profit' : 'text-loss'
                  )}>
                    {(diagnostics.trainTestCorrelation * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Degradation Ratio</span>
                  <span className={cn(
                    'font-mono',
                    diagnostics.degradationRatio > 0.6 ? 'text-profit' : 'text-loss'
                  )}>
                    {(diagnostics.degradationRatio * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">OOS Consistency</span>
                  <span className={cn(
                    'font-mono',
                    diagnostics.consistencyScore > 0.6 ? 'text-profit' : 'text-loss'
                  )}>
                    {(diagnostics.consistencyScore * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2">
                    {diagnostics.recommendation === 'robust' && (
                      <>
                        <CheckCircle className="h-5 w-5 text-profit" />
                        <span className="font-medium text-profit">Robust — Suitable for Deployment</span>
                      </>
                    )}
                    {diagnostics.recommendation === 'acceptable' && (
                      <>
                        <AlertTriangle className="h-5 w-5 text-warning" />
                        <span className="font-medium text-warning">Acceptable — Review Before Deploy</span>
                      </>
                    )}
                    {diagnostics.recommendation === 'overfitting' && (
                      <>
                        <AlertTriangle className="h-5 w-5 text-loss" />
                        <span className="font-medium text-loss">Overfitting — Not Deployment Ready</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Windows Timeline */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Analysis Windows
                {windows.length > 0 && (
                  <Badge variant="outline">{windows.length} windows</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {windows.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No windows yet</p>
                    <p className="text-sm">Configure and run walk-forward analysis</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {windows.map((window) => (
                      <div
                        key={window.id}
                        className={cn(
                          'p-4 rounded-lg border transition-colors',
                          window.status === 'training' && 'border-primary/50 bg-primary/5',
                          window.status === 'testing' && 'border-warning/50 bg-warning/5',
                          window.status === 'done' && 'border-profit/50 bg-profit/5',
                          window.status === 'pending' && 'border-border'
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Window {window.windowIndex}</span>
                            <Badge variant="outline" className={cn(
                              window.status === 'done' && 'text-profit border-profit',
                              window.status === 'training' && 'text-primary border-primary',
                              window.status === 'testing' && 'text-warning border-warning'
                            )}>
                              {window.status}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {/* Train Period */}
                          <div className="p-2 rounded bg-muted/50">
                            <div className="text-xs text-muted-foreground mb-1">Train Period</div>
                            <div className="font-mono text-sm">
                              {window.trainStart} <ArrowRight className="h-3 w-3 inline" /> {window.trainEnd}
                            </div>
                            {window.trainMetrics && (
                              <div className="mt-2 text-xs space-y-1">
                                <div className="text-profit">
                                  ₹{window.trainMetrics.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                                <div>Sharpe: {window.trainMetrics.sharpeRatio.toFixed(2)}</div>
                              </div>
                            )}
                          </div>
                          
                          {/* Test Period */}
                          <div className="p-2 rounded bg-muted/50">
                            <div className="text-xs text-muted-foreground mb-1">Test Period</div>
                            <div className="font-mono text-sm">
                              {window.testStart} <ArrowRight className="h-3 w-3 inline" /> {window.testEnd}
                            </div>
                            {window.testMetrics && (
                              <div className="mt-2 text-xs space-y-1">
                                <div className={window.testMetrics.netProfit >= 0 ? 'text-profit' : 'text-loss'}>
                                  ₹{window.testMetrics.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                                <div>Sharpe: {window.testMetrics.sharpeRatio.toFixed(2)}</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {window.bestParams && (
                          <div className="mt-2 text-xs font-mono text-muted-foreground">
                            Best: {Object.entries(window.bestParams).map(([k, v]) => `${k}=${v}`).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Past Runs */}
      {pastRuns.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Run History
              <Badge variant="outline">{pastRuns.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pastRuns.slice(0, 10).map(run => {
                const diag = run.diagnostics as Record<string, any> | null;
                const cfg = run.config as Record<string, any>;
                const windowCount = Array.isArray(run.windows) ? run.windows.length : 0;
                return (
                  <div key={run.id} className="p-3 rounded-lg border border-border/40 flex items-center justify-between text-sm">
                    <div className="space-y-0.5">
                      <div className="font-medium font-mono text-xs">
                        {new Date(run.created_at).toLocaleDateString()} · {windowCount} windows
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Train {cfg.trainRatio || '?'}% · Step {cfg.stepSize || '?'} · Size {cfg.windowSize || '?'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {diag?.recommendation && (
                        <Badge variant="outline" className={cn(
                          diag.recommendation === 'robust' && 'text-emerald-400 border-emerald-500/30',
                          diag.recommendation === 'overfitting' && 'text-red-400 border-red-500/30',
                          diag.recommendation === 'acceptable' && 'text-amber-400 border-amber-500/30',
                        )}>
                          {diag.recommendation}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">{run.status}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
