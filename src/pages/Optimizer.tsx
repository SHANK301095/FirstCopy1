/**
 * Optimizer Page
 * Real parameter optimization using the backtest engine
 */

import { useState, useEffect, useRef } from 'react';
import { 
  FlaskConical, 
  Play, 
  Pause, 
  Square, 
  Plus, 
  Trash2,
  TrendingUp,
  Target,
  Zap,
  Save,
  BarChart3,
  AlertCircle,
  Database,
  Code
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { db, Dataset, Strategy } from '@/db/index';
import { cn } from '@/lib/utils';
import { useBacktestStore } from '@/lib/backtestStore';
import { parseStrategy, ParsedStrategy } from '@/lib/strategyParser';
import { executeBacktest, BacktestConfig } from '@/lib/backtestEngine';
import { OHLCV } from '@/lib/indicators';
import { PageTitle } from '@/components/ui/PageTitle';
import { UniversalAssetSelector, AssetOption } from '@/components/selectors/UniversalAssetSelector';
import { useAuth } from '@/contexts/AuthContext';

interface ParamRange {
  id: string;
  name: string;
  start: number;
  end: number;
  step: number;
}

interface OptimizationResult {
  id: string;
  params: Record<string, number>;
  netProfit: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  winRate: number;
  totalTrades: number;
  objectiveValue: number;
}

const OBJECTIVES = [
  { value: 'sharpe', label: 'Sharpe Ratio', icon: TrendingUp },
  { value: 'netProfit', label: 'Net Profit', icon: Target },
  { value: 'minDD', label: 'Min Drawdown', icon: Zap },
  { value: 'profitFactor', label: 'Profit Factor', icon: BarChart3 },
];

const TOP_N_OPTIONS = [5, 10, 20, 50];

export default function Optimizer() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { uploadedData, strategy: storeStrategy, settings } = useBacktestStore();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [objective, setObjective] = useState('sharpe');
  const [topN, setTopN] = useState(20);
  const [useUploadedData, setUseUploadedData] = useState(false);
  
  // Universal selector assets
  const [selectedDatasetAsset, setSelectedDatasetAsset] = useState<AssetOption | null>(null);
  const [selectedStrategyAsset, setSelectedStrategyAsset] = useState<AssetOption | null>(null);
  
  // Parameter ranges
  const [paramRanges, setParamRanges] = useState<ParamRange[]>([
    { id: uuidv4(), name: 'Period', start: 5, end: 50, step: 5 },
    { id: uuidv4(), name: 'Multiplier', start: 1, end: 3, step: 0.5 },
  ]);
  
  // Optimization state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const pausedRef = useRef(false);
  const runningRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [currentCombo, setCurrentCombo] = useState('');
  const [results, setResults] = useState<OptimizationResult[]>([]);
  const [totalCombinations, setTotalCombinations] = useState(0);
  const [testedCombinations, setTestedCombinations] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Calculate total combinations
    const total = paramRanges.reduce((acc, param) => {
      const count = Math.ceil((param.end - param.start) / param.step) + 1;
      return acc * Math.max(1, count);
    }, 1);
    setTotalCombinations(total);
  }, [paramRanges]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    runningRef.current = isRunning;
  }, [isRunning]);

  const loadData = async () => {
    // Load local datasets and strategies for IndexedDB fallback
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

  const addParamRange = () => {
    setParamRanges(prev => [...prev, {
      id: uuidv4(),
      name: `Param${prev.length + 1}`,
      start: 1,
      end: 10,
      step: 1,
    }]);
  };

  const removeParamRange = (id: string) => {
    setParamRanges(prev => prev.filter(p => p.id !== id));
  };

  const updateParamRange = (id: string, field: keyof ParamRange, value: string | number) => {
    setParamRanges(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  // Convert uploaded data to OHLCV format
  const getOHLCVData = (): OHLCV[] => {
    if (!uploadedData) return [];
    
    const timestampCol = uploadedData.columns.find(c => c.mapping === 'timestamp')?.name;
    const openCol = uploadedData.columns.find(c => c.mapping === 'open')?.name;
    const highCol = uploadedData.columns.find(c => c.mapping === 'high')?.name;
    const lowCol = uploadedData.columns.find(c => c.mapping === 'low')?.name;
    const closeCol = uploadedData.columns.find(c => c.mapping === 'close')?.name;
    const volumeCol = uploadedData.columns.find(c => c.mapping === 'volume')?.name;

    if (!timestampCol || !openCol || !highCol || !lowCol || !closeCol) return [];

    return uploadedData.rows.map(row => ({
      timestamp: new Date(row[timestampCol] as string).getTime(),
      open: Number(row[openCol]),
      high: Number(row[highCol]),
      low: Number(row[lowCol]),
      close: Number(row[closeCol]),
      volume: volumeCol ? Number(row[volumeCol]) : 0
    })).filter(bar => !isNaN(bar.timestamp) && !isNaN(bar.close));
  };

  // Apply parameter overrides to a parsed strategy
  const applyParamsToStrategy = (baseStrategy: ParsedStrategy, params: Record<string, number>): ParsedStrategy => {
    const modified = { ...baseStrategy };
    
    // Update indicator periods based on param names
    modified.indicators = baseStrategy.indicators.map(ind => {
      const periodKey = Object.keys(params).find(k => 
        k.toLowerCase().includes(ind.name.toLowerCase()) || 
        k.toLowerCase() === 'period' ||
        k.toLowerCase().includes('period')
      );
      if (periodKey && params[periodKey]) {
        return { ...ind, period: Math.round(params[periodKey]) };
      }
      return ind;
    });

    // Update parameters
    modified.parameters = { ...baseStrategy.parameters };
    Object.entries(params).forEach(([key, value]) => {
      modified.parameters[key] = { value };
    });

    return modified;
  };

  const runOptimization = async () => {
    // Validate data source
    const bars = useUploadedData ? getOHLCVData() : [];
    
    if (useUploadedData && bars.length === 0) {
      toast({ title: 'Error', description: 'No OHLCV data available. Upload data first.', variant: 'destructive' });
      return;
    }

    if (!useUploadedData && (!selectedDataset || !selectedStrategy)) {
      toast({ title: 'Error', description: 'Select dataset and strategy', variant: 'destructive' });
      return;
    }

    if (paramRanges.length === 0) {
      toast({ title: 'Error', description: 'Add at least one parameter range', variant: 'destructive' });
      return;
    }

    setIsRunning(true);
    runningRef.current = true;
    setIsPaused(false);
    pausedRef.current = false;
    setProgress(0);
    setResults([]);
    setTestedCombinations(0);

    // Parse strategy
    let parsedStrategy: ParsedStrategy;
    if (useUploadedData && storeStrategy.code) {
      parsedStrategy = parseStrategy(storeStrategy.code, storeStrategy.language);
    } else {
      // Get strategy version from IndexedDB
      const dbStrategy = strategies.find(s => s.id === selectedStrategy);
      if (dbStrategy?.currentVersionId) {
        const version = await db.strategyVersions.get(dbStrategy.currentVersionId);
        if (version?.codeOrDSL) {
          parsedStrategy = parseStrategy(version.codeOrDSL);
        } else {
          parsedStrategy = parseStrategy('// EMA Crossover\nfast = EMA(12)\nslow = EMA(26)\nbuy when fast crosses above slow');
        }
      } else {
        // Default strategy
        parsedStrategy = parseStrategy('// EMA Crossover\nfast = EMA(12)\nslow = EMA(26)\nbuy when fast crosses above slow');
      }
    }

    // Create backtest config
    const config: BacktestConfig = {
      initialCapital: 100000,
      commissionPercent: settings.commissionPercent,
      slippageTicks: settings.slippageTicks,
      spreadPoints: settings.spreadPoints,
      riskPerTrade: settings.riskPerTrade,
      maxTradesPerDay: settings.maxTradesPerDay,
      dailyLossCap: settings.dailyLossCap,
      sessionFilter: settings.sessionFilter ? {
        enabled: true,
        startHour: parseInt(settings.sessionStart.split(':')[0]) || 9,
        endHour: parseInt(settings.sessionEnd.split(':')[0]) || 15
      } : undefined
    };

    // Generate all combinations
    const generateCombinations = (ranges: ParamRange[]): Record<string, number>[] => {
      if (ranges.length === 0) return [{}];
      const [first, ...rest] = ranges;
      const restCombos = generateCombinations(rest);
      const combos: Record<string, number>[] = [];
      
      for (let val = first.start; val <= first.end; val += first.step) {
        for (const combo of restCombos) {
          combos.push({ [first.name]: parseFloat(val.toFixed(4)), ...combo });
        }
      }
      return combos;
    };

    const combinations = generateCombinations(paramRanges);
    const allResults: OptimizationResult[] = [];

    // Get data for backtesting
    let ohlcvData: OHLCV[];
    if (useUploadedData) {
      ohlcvData = bars;
    } else {
      // Get from IndexedDB dataset chunks
      const dataset = datasets.find(d => d.id === selectedDataset);
      if (dataset) {
        const chunks = await db.datasetChunks
          .where('datasetId')
          .equals(selectedDataset)
          .sortBy('index');
        
        if (chunks.length > 0) {
          ohlcvData = chunks.flatMap(chunk => 
            chunk.rows.map(row => ({
              timestamp: row[0],
              open: row[1],
              high: row[2],
              low: row[3],
              close: row[4],
              volume: row[5] || 0
            }))
          );
        } else {
          toast({ title: 'Error', description: 'No data in selected dataset', variant: 'destructive' });
          setIsRunning(false);
          return;
        }
      } else {
        toast({ title: 'Error', description: 'Dataset not found', variant: 'destructive' });
        setIsRunning(false);
        return;
      }
    }

    const symbol = uploadedData?.activeSymbol || settings.symbol || 'SYMBOL';

    for (let i = 0; i < combinations.length; i++) {
      if (!runningRef.current) break;
      
      // Wait while paused
      while (pausedRef.current && runningRef.current) {
        await new Promise(r => setTimeout(r, 100));
      }
      if (!runningRef.current) break;

      const params = combinations[i];
      setCurrentCombo(JSON.stringify(params));
      
      // Apply params to strategy and run real backtest
      const modifiedStrategy = applyParamsToStrategy(parsedStrategy, params);
      
      try {
        const backtestResult = executeBacktest(ohlcvData, modifiedStrategy, config, symbol);
        
        const result: OptimizationResult = {
          id: uuidv4(),
          params,
          netProfit: backtestResult.netProfit,
          sharpeRatio: backtestResult.sharpeRatio,
          maxDrawdown: backtestResult.maxDrawdownPercent,
          profitFactor: backtestResult.profitFactor,
          winRate: backtestResult.winRate,
          totalTrades: backtestResult.totalTrades,
          objectiveValue: 0,
        };

        // Calculate objective value
        switch (objective) {
          case 'sharpe':
            result.objectiveValue = result.sharpeRatio;
            break;
          case 'netProfit':
            result.objectiveValue = result.netProfit;
            break;
          case 'minDD':
            result.objectiveValue = -result.maxDrawdown; // Lower is better
            break;
          case 'profitFactor':
            result.objectiveValue = result.profitFactor;
            break;
        }

        allResults.push(result);
      } catch {
        // Backtest failed for this param combination - skip
      }
      
      // Keep top N sorted
      allResults.sort((a, b) => b.objectiveValue - a.objectiveValue);
      setResults([...allResults.slice(0, topN)]);
      
      setTestedCombinations(i + 1);
      setProgress(((i + 1) / combinations.length) * 100);

      // Small delay to prevent UI freeze
      if (i % 5 === 0) {
        await new Promise(r => setTimeout(r, 10));
      }
    }

    setIsRunning(false);
    runningRef.current = false;
    setCurrentCombo('');
    toast({ title: 'Optimization Complete', description: `Tested ${combinations.length} combinations` });
    
    await db.log('info', 'Optimization completed', { 
      combinations: combinations.length, 
      topResults: allResults.slice(0, 5).map(r => r.objectiveValue) 
    });
  };

  const pauseOptimization = () => {
    setIsPaused(true);
    pausedRef.current = true;
  };

  const resumeOptimization = () => {
    setIsPaused(false);
    pausedRef.current = false;
  };

  const stopOptimization = () => {
    setIsRunning(false);
    runningRef.current = false;
    setIsPaused(false);
    pausedRef.current = false;
  };

  const saveAsNewVersion = async (result: OptimizationResult) => {
    if (!selectedStrategy) return;
    
    const strategy = strategies.find(s => s.id === selectedStrategy);
    if (!strategy) return;

    const versions = await db.strategyVersions
      .where('strategyId')
      .equals(selectedStrategy)
      .toArray();
    
    const maxVersion = Math.max(0, ...versions.map(v => v.version));
    
    await db.strategyVersions.add({
      id: uuidv4(),
      strategyId: selectedStrategy,
      version: maxVersion + 1,
      description: `Optimized: ${JSON.stringify(result.params)}`,
      inputsSchema: {},
      codeOrDSL: '',
      codeType: 'mql5',
      params: result.params,
      createdAt: Date.now(),
    });

    toast({ title: 'Saved', description: `New version v${maxVersion + 1} created` });
  };

  const hasUploadedData = uploadedData && uploadedData.rows.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle
        title="Optimizer" 
        subtitle="Find optimal strategy parameters with grid search"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Configuration Panel */}
        <div className="space-y-4">
          {/* Data Source */}
          {hasUploadedData && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Use uploaded OHLCV data?</span>
                <Button 
                  variant={useUploadedData ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setUseUploadedData(!useUploadedData)}
                >
                  {useUploadedData ? 'Using Uploaded' : 'Use IndexedDB'}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Dataset & Strategy Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!useUploadedData && (
                <>
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
                </>
              )}

              {useUploadedData && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">Using Uploaded Data</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {uploadedData?.fileName} • {uploadedData?.rows.length.toLocaleString()} bars
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Objective</Label>
                <Select value={objective} onValueChange={setObjective}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OBJECTIVES.map(obj => (
                      <SelectItem key={obj.value} value={obj.value}>
                        <span className="flex items-center gap-2">
                          <obj.icon className="h-4 w-4" />
                          {obj.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Top N Results</Label>
                <Select value={String(topN)} onValueChange={(v) => setTopN(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TOP_N_OPTIONS.map(n => (
                      <SelectItem key={n} value={String(n)}>Top {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Parameter Ranges */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Parameter Ranges</CardTitle>
                <Button variant="outline" size="sm" onClick={addParamRange}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {paramRanges.map((param) => (
                <div key={param.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <Input
                      value={param.name}
                      onChange={(e) => updateParamRange(param.id, 'name', e.target.value)}
                      className="w-24 h-7 text-sm"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeParamRange(param.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px]">Start</Label>
                      <Input
                        type="number"
                        value={param.start}
                        onChange={(e) => updateParamRange(param.id, 'start', parseFloat(e.target.value))}
                        className="h-7 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">End</Label>
                      <Input
                        type="number"
                        value={param.end}
                        onChange={(e) => updateParamRange(param.id, 'end', parseFloat(e.target.value))}
                        className="h-7 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Step</Label>
                      <Input
                        type="number"
                        value={param.step}
                        onChange={(e) => updateParamRange(param.id, 'step', parseFloat(e.target.value))}
                        className="h-7 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="text-xs text-muted-foreground text-center pt-2">
                {totalCombinations.toLocaleString()} combinations
              </div>
            </CardContent>
          </Card>

          {/* Run Controls */}
          <Card>
            <CardContent className="py-4">
              <div className="flex gap-2">
                {!isRunning ? (
                  <Button className="flex-1" onClick={runOptimization}>
                    <Play className="h-4 w-4 mr-2" />
                    Run Optimization
                  </Button>
                ) : (
                  <>
                    {isPaused ? (
                      <Button className="flex-1" onClick={resumeOptimization}>
                        <Play className="h-4 w-4 mr-2" />
                        Resume
                      </Button>
                    ) : (
                      <Button variant="outline" className="flex-1" onClick={pauseOptimization}>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </Button>
                    )}
                    <Button variant="destructive" onClick={stopOptimization}>
                      <Square className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              
              {isRunning && (
                <div className="mt-4 space-y-2">
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{testedCombinations} / {totalCombinations}</span>
                    <span>{progress.toFixed(1)}%</span>
                  </div>
                  {currentCombo && (
                    <p className="text-xs font-mono truncate">{currentCombo}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-primary" />
                Top {topN} Results
                {results.length > 0 && (
                  <Badge variant="outline">{results.length} found</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {results.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No results yet</p>
                    <p className="text-sm">Run optimization to find best parameters</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {results.map((result, index) => (
                      <div
                        key={result.id}
                        className={cn(
                          'p-3 rounded-lg border transition-colors hover:bg-muted/50',
                          index === 0 && 'border-success/50 bg-success/5'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                              index === 0 ? 'bg-success text-success-foreground' : 'bg-muted'
                            )}>
                              #{index + 1}
                            </div>
                            <div>
                              <div className="text-xs font-mono text-muted-foreground">
                                {Object.entries(result.params).map(([k, v]) => `${k}=${v}`).join(', ')}
                              </div>
                              <div className="flex items-center gap-4 mt-1">
                                <span className={cn(
                                  'font-semibold',
                                  result.netProfit >= 0 ? 'text-success' : 'text-destructive'
                                )}>
                                  ₹{result.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Sharpe: {result.sharpeRatio.toFixed(2)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  WR: {result.winRate.toFixed(1)}%
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  DD: {result.maxDrawdown.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => saveAsNewVersion(result)}
                            className="ml-2"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
