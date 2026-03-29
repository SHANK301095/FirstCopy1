import { useState, useEffect } from 'react';
import { Play, Settings, AlertTriangle, Clock, TrendingUp, Shield, CheckCircle, ChevronDown, Globe, Info, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBacktestStore } from '@/lib/backtestStore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { parseStrategy, validateStrategy } from '@/lib/strategyParser';
import { executeBacktest, BacktestConfig } from '@/lib/backtestEngine';
import { OHLCV } from '@/lib/indicators';
import { BacktestConfigPanel } from '@/components/backtest/BacktestConfigPanel';
import { SharedDatasetSelector, type DatasetSettings } from '@/components/backtest/SharedDatasetSelector';
import { fetchFullDataset, type SharedDataset, type AggregationTimeframe } from '@/lib/sharedDataService';
import { 
  processBacktestData, 
  calculateDateRange, 
  parseSessionTime,
  ProcessingConfig,
  TimeframeCode,
  ProcessingMetadata
} from '@/lib/backtestDataProcessor';

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'];
const DATE_RANGES = [
  { value: 'last1y', label: 'Last 1 Year' },
  { value: 'last3y', label: 'Last 3 Years' },
  { value: 'last5y', label: 'Last 5 Years' },
  { value: 'last10y', label: 'Last 10 Years' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'custom', label: 'Custom Range' },
];

export function BacktestTab() {
  const {
    uploadedData,
    isDataValid,
    isStrategyValid,
    settings,
    updateSettings,
    isRunning,
    progress,
    logs,
    setRunning,
    addLog,
    clearLogs,
    setResults,
  } = useBacktestStore();
  const { toast } = useToast();
  
  // Shared dataset selection
  const [selectedSharedDataset, setSelectedSharedDataset] = useState<SharedDataset | null>(null);
  const [sharedDatasetSettings, setSharedDatasetSettings] = useState<DatasetSettings | undefined>();
  const [loadingSharedData, setLoadingSharedData] = useState(false);
  
  // Processing metadata for transparency
  const [processingMetadata, setProcessingMetadata] = useState<ProcessingMetadata | null>(null);
  const [strategyValidation, setStrategyValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);

  // Can run if we have data (uploaded OR shared) and strategy
  const hasData = isDataValid() || selectedSharedDataset !== null;
  const canRun = hasData && isStrategyValid() && !isRunning && !loadingSharedData;

  const runBacktest = async () => {
    if (!canRun) {
      if (!hasData) {
        toast({ title: 'Missing Data', description: 'Upload CSV or select a shared dataset', variant: 'destructive' });
        return;
      }
      if (!isStrategyValid()) {
        toast({ title: 'Missing Strategy', description: 'Paste EA in Strategy tab', variant: 'destructive' });
        return;
      }
      return;
    }

    clearLogs();
    setProcessingMetadata(null);
    setStrategyValidation(null);
    setRunning(true, 0);
    addLog('═══════════════════════════════════════');
    addLog('Initializing backtest engine...');

    try {
      // ═══════════════════════════════════════
      // STEP 1: PARSE AND VALIDATE STRATEGY (SEMANTIC VALIDATION)
      // ═══════════════════════════════════════
      addLog('Parsing strategy code...');
      setRunning(true, 5);
      const strategyCode = useBacktestStore.getState().strategy.code;
      const parsedStrategy = parseStrategy(strategyCode);
      
      // Semantic validation - NOT just length check
      const validation = validateStrategy(parsedStrategy);
      setStrategyValidation(validation);
      
      if (!validation.valid) {
        // BLOCK backtest on invalid strategy
        validation.errors.forEach(err => addLog(`❌ Strategy Error: ${err}`));
        toast({ 
          title: 'Strategy Validation Failed', 
          description: validation.errors[0], 
          variant: 'destructive' 
        });
        setRunning(false, 0);
        return;
      }
      
      addLog(`✓ Strategy validated: ${parsedStrategy.indicators.length} indicators`);
      addLog(`  Entry: ${parsedStrategy.entryLong.length} long, ${parsedStrategy.entryShort.length} short`);
      if (parsedStrategy.warnings.length > 0) {
        parsedStrategy.warnings.forEach(w => addLog(`⚠ Note: ${w}`));
      }

      // ═══════════════════════════════════════
      // STEP 2: CALCULATE DATE RANGE BOUNDS
      // ═══════════════════════════════════════
      addLog('Calculating date range...');
      setRunning(true, 10);
      
      const timezone = uploadedData?.timezone || 'UTC';
      const dateRangeConfig = {
        type: settings.dateRange as 'full' | 'last1y' | 'last3y' | 'last5y' | 'last10y' | 'ytd' | 'custom',
        customStartDate: settings.customStartDate,
        customEndDate: settings.customEndDate,
        timezone,
      };
      
      const dateRangeBounds = calculateDateRange(dateRangeConfig);
      if (dateRangeBounds) {
        addLog(`📅 Date range: ${new Date(dateRangeBounds.startTs).toISOString().split('T')[0]} → ${new Date(dateRangeBounds.endTs).toISOString().split('T')[0]} (${timezone})`);
      } else {
        addLog(`📅 Date range: Full dataset`);
      }

      let bars: OHLCV[] = [];
      let metadata: ProcessingMetadata | null = null;

      // ═══════════════════════════════════════
      // STEP 3: LOAD AND PROCESS DATA
      // ═══════════════════════════════════════
      if (selectedSharedDataset) {
        // Shared dataset processing
        const dateRangeInfo = sharedDatasetSettings?.dateRange 
          ? ` (${sharedDatasetSettings.dateRange.startDate} to ${sharedDatasetSettings.dateRange.endDate})`
          : '';
        const aggregationInfo = sharedDatasetSettings?.aggregateTo && sharedDatasetSettings.aggregateTo !== selectedSharedDataset.timeframe
          ? ` [aggregating to ${sharedDatasetSettings.aggregateTo}]`
          : '';
        addLog(`Loading shared dataset: ${selectedSharedDataset.symbol} ${selectedSharedDataset.timeframe}${dateRangeInfo}${aggregationInfo}...`);
        setRunning(true, 15);
        setLoadingSharedData(true);
        
        try {
          const rawRows = await fetchFullDataset(
            selectedSharedDataset.id,
            (pct, msg) => {
              setRunning(true, 15 + Math.floor(pct * 0.1));
              if (pct % 25 === 0) addLog(msg);
            },
            {
              aggregateTo: sharedDatasetSettings?.aggregateTo,
            }
          );
          
          // Apply date range filter with timezone awareness
          const startTs = sharedDatasetSettings?.dateRange?.startDate 
            ? new Date(sharedDatasetSettings.dateRange.startDate).getTime() 
            : (dateRangeBounds?.startTs || 0);
          const endTs = sharedDatasetSettings?.dateRange?.endDate 
            ? new Date(sharedDatasetSettings.dateRange.endDate).getTime() + 86400000
            : (dateRangeBounds?.endTs || Infinity);
          
          let validCount = 0;
          let invalidCount = 0;
          let filteredCount = 0;
          
          bars = rawRows.map(row => ({
            timestamp: row[0],
            open: row[1],
            high: row[2],
            low: row[3],
            close: row[4],
            volume: row[5] || 0,
          })).filter(bar => {
            // Strict validation - no silent 0 coercion
            if (isNaN(bar.timestamp) || bar.timestamp <= 0) {
              invalidCount++;
              return false;
            }
            if (isNaN(bar.open) || isNaN(bar.high) || isNaN(bar.low) || isNaN(bar.close)) {
              invalidCount++;
              return false;
            }
            if (bar.close <= 0 || bar.high < bar.low) {
              invalidCount++;
              return false;
            }
            // Date range filter
            if (bar.timestamp < startTs || bar.timestamp > endTs) {
              filteredCount++;
              return false;
            }
            validCount++;
            return true;
          });
          
          metadata = {
            originalRowCount: rawRows.length,
            validRowCount: validCount,
            droppedRowCount: filteredCount,
            invalidRowCount: invalidCount,
            dateRangeApplied: dateRangeBounds ? {
              start: new Date(startTs).toISOString(),
              end: new Date(endTs).toISOString(),
            } : null,
            timeframeAggregated: sharedDatasetSettings?.aggregateTo !== selectedSharedDataset.timeframe,
            aggregatedFrom: selectedSharedDataset.timeframe,
            aggregatedTo: sharedDatasetSettings?.aggregateTo || selectedSharedDataset.timeframe,
            timezoneApplied: timezone,
            processingTimeMs: 0,
          };
          
          if (invalidCount > 0) {
            addLog(`⚠ ${invalidCount.toLocaleString()} rows dropped (invalid OHLC values)`);
          }
          if (filteredCount > 0) {
            addLog(`📅 ${filteredCount.toLocaleString()} rows filtered by date range`);
          }
          addLog(`✓ Loaded ${bars.length.toLocaleString()} valid bars`);
        } catch (err) {
          throw new Error(`Failed to load shared dataset: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
          setLoadingSharedData(false);
        }
      } else if (uploadedData) {
        // ═══════════════════════════════════════
        // UPLOADED DATA: FULL PROCESSING PIPELINE
        // ═══════════════════════════════════════
        addLog('Processing uploaded data with strict validation...');
        setRunning(true, 15);
        
        // Get column mappings
        const tsCol = uploadedData.columns.find(c => c.mapping === 'timestamp');
        const openCol = uploadedData.columns.find(c => c.mapping === 'open');
        const highCol = uploadedData.columns.find(c => c.mapping === 'high');
        const lowCol = uploadedData.columns.find(c => c.mapping === 'low');
        const closeCol = uploadedData.columns.find(c => c.mapping === 'close');
        const volCol = uploadedData.columns.find(c => c.mapping === 'volume');
        
        if (!tsCol || !openCol || !highCol || !lowCol || !closeCol) {
          throw new Error('Missing required column mappings (timestamp, OHLC)');
        }
        
        // Detect source timeframe (estimate from data)
        const sourceTimeframe = detectTimeframe(uploadedData.rows, tsCol.name);
        const targetTimeframe = settings.timeframe as TimeframeCode;
        
        addLog(`📊 Source timeframe: ${sourceTimeframe}, Target: ${targetTimeframe}`);
        
        // Build processing config
        const processingConfig: ProcessingConfig = {
          dateRange: dateRangeConfig,
          timeframe: targetTimeframe,
          sourceTimeframe,
          strictValidation: true,
          maxInvalidRowPercent: 5, // Block if >5% rows are invalid
        };
        
        // Process data with full pipeline
        const result = processBacktestData(
          uploadedData.rows,
          {
            timestamp: tsCol.name,
            open: openCol.name,
            high: highCol.name,
            low: lowCol.name,
            close: closeCol.name,
            volume: volCol?.name,
          },
          processingConfig,
          (pct, msg) => {
            setRunning(true, 15 + Math.floor(pct * 0.25));
            if (pct % 20 === 0) addLog(msg);
          }
        );
        
        // Check for blocking errors
        if (result.errors.length > 0) {
          result.errors.forEach(err => addLog(`❌ ${err}`));
          toast({ 
            title: 'Data Processing Failed', 
            description: result.errors[0], 
            variant: 'destructive' 
          });
          setRunning(false, 0);
          return;
        }
        
        // Log warnings
        result.warnings.forEach(w => addLog(`⚠ ${w}`));
        
        bars = result.bars;
        metadata = result.metadata;
        
        addLog(`✓ ${result.bars.length.toLocaleString()} bars ready for backtest`);
      }

      // ═══════════════════════════════════════
      // STEP 4: VALIDATE DATA AVAILABILITY
      // ═══════════════════════════════════════
      if (bars.length === 0) {
        addLog('❌ No data available for selected date range');
        toast({ 
          title: 'No Data', 
          description: 'No valid data available for the selected date range', 
          variant: 'destructive' 
        });
        setRunning(false, 0);
        return;
      }

      bars.sort((a, b) => a.timestamp - b.timestamp);
      setProcessingMetadata(metadata);

      // Log resolved date range
      const firstBar = bars[0];
      const lastBar = bars[bars.length - 1];
      addLog(`═══════════════════════════════════════`);
      addLog(`📊 Running backtest from ${new Date(firstBar.timestamp).toISOString().split('T')[0]} → ${new Date(lastBar.timestamp).toISOString().split('T')[0]} (UTC)`);

      // ═══════════════════════════════════════
      // STEP 5: CONFIGURE BACKTEST
      // ═══════════════════════════════════════
      const sessionStart = parseSessionTime(settings.sessionStart);
      const sessionEnd = parseSessionTime(settings.sessionEnd);
      
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
          startHour: sessionStart.hour,
          endHour: sessionEnd.hour
        } : undefined
      };
      
      addLog(`💰 Costs: ${settings.commissionPercent}% commission, ${settings.slippageTicks} ticks slippage, ${settings.spreadPoints} pts spread`);
      if (settings.sessionFilter) {
        addLog(`⏰ Session filter: ${settings.sessionStart} → ${settings.sessionEnd}`);
      }

      // Determine symbol for results
      const symbolForRun = settings.symbol || 
                           selectedSharedDataset?.symbol || 
                           uploadedData?.activeSymbol || 
                           'SYMBOL';

      // ═══════════════════════════════════════
      // STEP 6: EXECUTE BACKTEST
      // ═══════════════════════════════════════
      addLog('═══════════════════════════════════════');
      addLog('Executing strategy...');
      const result = executeBacktest(
        bars,
        parsedStrategy,
        config,
        symbolForRun,
        (pct, msg) => {
          setRunning(true, 40 + Math.floor(pct * 0.55));
          if (pct % 20 === 0) addLog(msg);
        }
      );

      addLog('═══════════════════════════════════════');
      addLog(`✓ Backtest complete! ${result.totalTrades} trades`);
      addLog(`📈 Win Rate: ${result.winRate.toFixed(1)}% | PF: ${result.profitFactor.toFixed(2)} | Net: ₹${result.netProfit.toLocaleString()}`);
      addLog(`📉 Max DD: ${result.maxDrawdownPercent.toFixed(2)}% | Sharpe: ${result.sharpeRatio.toFixed(2)}`);

      // Store result with full config snapshot for reproducibility
      const resolvedDateRange = metadata?.dateRangeApplied 
        ? `${metadata.dateRangeApplied.start.split('T')[0]} → ${metadata.dateRangeApplied.end.split('T')[0]}`
        : `${new Date(firstBar.timestamp).toISOString().split('T')[0]} → ${new Date(lastBar.timestamp).toISOString().split('T')[0]}`;

      setResults({
        ...result,
        id: uuidv4(),
        dateRange: resolvedDateRange
      });

      setRunning(false, 100);
      toast({ 
        title: 'Backtest Complete', 
        description: `${result.totalTrades} trades with ${result.winRate.toFixed(1)}% win rate` 
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`❌ Error: ${errMsg}`);
      toast({ title: 'Backtest Failed', description: errMsg, variant: 'destructive' });
      setRunning(false, 0);
      setLoadingSharedData(false);
    }
  };
  
  // Detect timeframe from row timestamps
  const detectTimeframe = (rows: Record<string, string | number>[], tsCol: string): TimeframeCode => {
    if (rows.length < 2) return 'M1';
    
    const timestamps: number[] = [];
    for (let i = 0; i < Math.min(100, rows.length); i++) {
      const ts = new Date(String(rows[i][tsCol])).getTime();
      if (!isNaN(ts)) timestamps.push(ts);
    }
    
    if (timestamps.length < 2) return 'M1';
    
    timestamps.sort((a, b) => a - b);
    const diffs: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      diffs.push(timestamps[i] - timestamps[i - 1]);
    }
    
    const medianDiff = diffs.sort((a, b) => a - b)[Math.floor(diffs.length / 2)];
    const minutes = Math.round(medianDiff / 60000);
    
    if (minutes <= 1) return 'M1';
    if (minutes <= 5) return 'M5';
    if (minutes <= 15) return 'M15';
    if (minutes <= 30) return 'M30';
    if (minutes <= 60) return 'H1';
    if (minutes <= 240) return 'H4';
    if (minutes <= 1440) return 'D1';
    return 'W1';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Validation Status - only show if no data AND no shared dataset AND strategy invalid */}
      {(!hasData || !isStrategyValid()) && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-warning">Prerequisites Required</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {!hasData && (
                    <li>• Upload CSV in <strong>Data</strong> tab OR select a <strong>Shared Dataset</strong> below</li>
                  )}
                  {!isStrategyValid() && <li>• Paste and validate EA code in the <strong>Strategy</strong> tab</li>}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shared Dataset Selector - NEW */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Data Source
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SharedDatasetSelector
            selectedDataset={selectedSharedDataset}
            settings={sharedDatasetSettings}
            onSelect={(dataset, datasetSettings) => {
              setSelectedSharedDataset(dataset);
              setSharedDatasetSettings(datasetSettings);
              if (dataset) {
                // Auto-update symbol and timeframe when selecting shared dataset
                const effectiveTimeframe = datasetSettings?.aggregateTo || dataset.timeframe;
                updateSettings({ 
                  symbol: dataset.symbol,
                  timeframe: effectiveTimeframe.toUpperCase() as 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1' | 'W1'
                });
              }
            }}
            disabled={isRunning}
          />
          {!selectedSharedDataset && isDataValid() && (
            <div className="mt-3 p-2 rounded-lg bg-profit/10 border border-profit/30 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-profit" />
                <span>Using uploaded data: {uploadedData?.fileName}</span>
              </div>
            </div>
          )}
          {!selectedSharedDataset && !isDataValid() && (
            <p className="text-xs text-muted-foreground mt-2">
              Select a public dataset above, or upload your own CSV in the Data tab
            </p>
          )}
        </CardContent>
      </Card>

      {/* Settings Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Symbol & Time */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Symbol & Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Symbol</Label>
              <Select
                value={settings.symbol}
                onValueChange={(v) => updateSettings({ symbol: v })}
                disabled={!!selectedSharedDataset}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select from data..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedSharedDataset ? (
                    <SelectItem value={selectedSharedDataset.symbol}>
                      {selectedSharedDataset.symbol}
                    </SelectItem>
                  ) : uploadedData?.symbols.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  )) || <SelectItem value="SYMBOL">SYMBOL</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Timeframe</Label>
              <Select
                value={settings.timeframe}
                onValueChange={(v) => updateSettings({ timeframe: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map((tf) => (
                    <SelectItem key={tf} value={tf}>{tf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date Range</Label>
              <Select
                value={settings.dateRange}
                onValueChange={(v) => updateSettings({ dateRange: v as typeof settings.dateRange })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGES.map((dr) => (
                    <SelectItem key={dr.value} value={dr.value}>{dr.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {settings.dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Start</Label>
                  <Input
                    type="date"
                    value={settings.customStartDate}
                    onChange={(e) => updateSettings({ customStartDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End</Label>
                  <Input
                    type="date"
                    value={settings.customEndDate}
                    onChange={(e) => updateSettings({ customEndDate: e.target.value })}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Costs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Trading Costs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Commission (%/side)</Label>
              <Input
                type="number"
                step="0.001"
                value={settings.commissionPercent}
                onChange={(e) => updateSettings({ commissionPercent: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Default: 0.01%</p>
            </div>
            <div>
              <Label>Slippage (ticks)</Label>
              <Input
                type="number"
                value={settings.slippageTicks}
                onChange={(e) => updateSettings({ slippageTicks: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Default: 1 tick</p>
            </div>
            <div>
              <Label>Spread (points)</Label>
              <Input
                type="number"
                value={settings.spreadPoints}
                onChange={(e) => updateSettings({ spreadPoints: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Risk */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Risk Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Risk % per Trade</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.riskPerTrade}
                onChange={(e) => updateSettings({ riskPerTrade: parseFloat(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label>Max Trades/Day</Label>
              <Input
                type="number"
                value={settings.maxTradesPerDay}
                onChange={(e) => updateSettings({ maxTradesPerDay: parseInt(e.target.value) || 10 })}
              />
            </div>
            <div>
              <Label>Daily Loss Cap (%)</Label>
              <Input
                type="number"
                step="0.5"
                value={settings.dailyLossCap}
                onChange={(e) => updateSettings({ dailyLossCap: parseFloat(e.target.value) || 5 })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session Filter */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <Switch
                checked={settings.sessionFilter}
                onCheckedChange={(v) => updateSettings({ sessionFilter: v })}
              />
              <Label>Session Filter</Label>
            </div>
            {settings.sessionFilter && (
              <>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Start:</Label>
                  <Input
                    type="time"
                    className="w-28"
                    value={settings.sessionStart}
                    onChange={(e) => updateSettings({ sessionStart: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">End:</Label>
                  <Input
                    type="time"
                    className="w-28"
                    value={settings.sessionEnd}
                    onChange={(e) => updateSettings({ sessionEnd: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Configuration Panel */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Advanced Configuration
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <BacktestConfigPanel />
        </CollapsibleContent>
      </Collapsible>

      {/* Run Button & Progress */}
      <Card variant="stat">
        <CardContent className="py-6">
          <div className="flex flex-col items-center gap-4">
            <Button
              size="xl"
              variant="default"
              onClick={runBacktest}
              disabled={!canRun}
              className="min-w-[200px]"
            >
              <Play className="h-5 w-5 mr-2" />
              {isRunning ? 'Running...' : 'Run Backtest'}
            </Button>
            {isRunning && (
              <div className="w-full max-w-md space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">{progress}% complete</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Execution Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs max-h-48 overflow-y-auto space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="text-muted-foreground">{log}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
