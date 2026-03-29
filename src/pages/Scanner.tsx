/**
 * Scanner / Screener Page
 * Run rules on imported datasets (offline) with chunk-based processing
 * Supports both local and shared/public datasets via UniversalAssetSelector
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Play, Download, Filter,
  TrendingUp, BarChart3, Database, Upload,
  Plus, Trash2, Loader2, AlertCircle, CheckCircle2,
  ArrowUpDown, Globe
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { db, Dataset } from '@/db/index';
import { 
  runScanner, 
  exportSignalsCSV,
  type ScannerSignal,
  type ScannerResult,
  type ScannerProgress,
  type IndicatorType,
  type PriceConditionType,
  type ComparisonOperator,
  INDICATOR_LABELS,
  PRICE_CONDITION_LABELS,
  DEFAULT_INDICATOR_PARAMS,
} from '@/lib/scanner';
import { cn } from '@/lib/utils';
import { PageTitle } from '@/components/ui/PageTitle';
import { UniversalAssetSelector, type AssetOption } from '@/components/selectors/UniversalAssetSelector';
import { SharedDatasetSelector } from '@/components/backtest/SharedDatasetSelector';
import type { SharedDataset } from '@/lib/sharedDataService';

// Extended rule type with UI-specific fields
interface UIRule {
  id: string;
  type: 'indicator' | 'price';
  indicator: IndicatorType;
  operator: ComparisonOperator;
  value: number;
  condition?: PriceConditionType;
  enabled: boolean;
}

// Empty rule template
const createEmptyRule = (): UIRule => ({
  id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  type: 'indicator',
  indicator: 'RSI',
  operator: '>',
  value: 70,
  enabled: true,
});

const COMPARATORS: ComparisonOperator[] = ['>', '<', '>=', '<=', '==', 'crosses_above', 'crosses_below'];

export default function Scanner() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  
  // Data source state
  const [dataSourceTab, setDataSourceTab] = useState<'local' | 'library'>('local');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<AssetOption | null>(null);
  const [selectedSharedDataset, setSelectedSharedDataset] = useState<SharedDataset | null>(null);
  
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rules, setRules] = useState<UIRule[]>([createEmptyRule()]);
  const [combinator, setCombinator] = useState<'AND' | 'OR'>('AND');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ScannerProgress | null>(null);
  const [result, setResult] = useState<ScannerResult | null>(null);
  const [sortField, setSortField] = useState<'timestamp' | 'price'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    db.datasets.orderBy('createdAt').reverse().toArray().then(setDatasets);
  }, []);

  const selectedDataset = useMemo(() => 
    datasets?.find(d => d.id === selectedDatasetId),
    [datasets, selectedDatasetId]
  );

  // Handle asset selection from UniversalAssetSelector
  const handleAssetSelect = (asset: AssetOption | null) => {
    setSelectedAsset(asset);
    if (asset) {
      setSelectedDatasetId(asset.id);
    }
  };

  // Handle shared dataset selection
  const handleSharedDatasetSelect = (dataset: SharedDataset | null) => {
    setSelectedSharedDataset(dataset);
    if (dataset) {
      setSelectedDatasetId(dataset.id);
    }
  };

  // Get effective dataset ID based on source
  const getEffectiveDatasetId = () => {
    if (dataSourceTab === 'library') {
      return selectedSharedDataset?.id || selectedAsset?.id || '';
    }
    return selectedDatasetId;
  };

  const addRule = () => {
    if (rules.length >= 5) {
      toast({ title: 'Limit Reached', description: 'Maximum 5 rules allowed', variant: 'destructive' });
      return;
    }
    setRules([...rules, createEmptyRule()]);
  };

  const removeRule = (id: string) => {
    if (rules.length <= 1) return;
    setRules(rules.filter(r => r.id !== id));
  };

  const updateRule = (id: string, updates: Partial<UIRule>) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const runScan = async () => {
    if (!selectedDatasetId) {
      toast({ title: 'Select Dataset', description: 'Please select a dataset to scan', variant: 'destructive' });
      return;
    }

    const enabledRules = rules.filter(r => r.enabled);
    if (enabledRules.length === 0) {
      toast({ title: 'No Rules', description: 'Enable at least one rule', variant: 'destructive' });
      return;
    }

    setRunning(true);
    setResult(null);

    try {
      const dateRange = dateFrom && dateTo ? {
        start: new Date(dateFrom).getTime(),
        end: new Date(dateTo).getTime(),
      } : undefined;

      // Convert UI rules to scanner rules
      const scannerRules = enabledRules.map(r => {
        if (r.type === 'price') {
          return {
            type: 'price' as const,
            condition: r.condition || 'close_above_prev_high' as PriceConditionType,
            value: r.value,
          };
        }
        return {
          type: 'indicator' as const,
          indicator: r.indicator,
          params: DEFAULT_INDICATOR_PARAMS[r.indicator],
          operator: r.operator,
          value: r.value,
        };
      });

      const scanResult = await runScanner({
        id: `scan-${Date.now()}`,
        name: 'Quick Scan',
        datasetId: selectedDatasetId,
        rules: scannerRules,
        combinator,
        dateRange,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }, setProgress);

      setResult(scanResult);
      toast({ 
        title: 'Scan Complete', 
        description: `Found ${scanResult.signals.length} matching signals` 
      });
    } catch (err) {
      toast({ 
        title: 'Scan Failed', 
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  const handleExport = () => {
    if (!result || result.signals.length === 0) {
      toast({ title: 'No Results', description: 'Run a scan first', variant: 'destructive' });
      return;
    }

    const csv = exportSignalsCSV(result);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scanner-signals-${selectedDataset?.symbol || 'scan'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Signals exported to CSV' });
  };

  const sortedSignals = useMemo(() => {
    if (!result) return [];
    const sorted = [...result.signals];
    sorted.sort((a, b) => {
      const aVal = sortField === 'timestamp' ? a.timestamp : a.price.close;
      const bVal = sortField === 'timestamp' ? b.timestamp : b.price.close;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [result, sortField, sortOrder]);

  return (
    <div className="animate-fade-in">
      {/* Content */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <PageTitle 
            title="Scanner / Screener" 
            subtitle="Run rules on imported datasets to find signals"
          />
          <div className="flex items-center gap-2">
            {result && result.signals.length > 0 && (
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Dataset Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Dataset
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={dataSourceTab} onValueChange={(v) => setDataSourceTab(v as 'local' | 'library')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="local" className="text-xs">
                    <Database className="h-3 w-3 mr-1" />
                    Local
                  </TabsTrigger>
                  <TabsTrigger value="library" className="text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    Library
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="local" className="mt-3 space-y-3">
                  <Select value={selectedDatasetId} onValueChange={setSelectedDatasetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select dataset..." />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets?.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.symbol} - {d.name} ({d.rowCount?.toLocaleString() || 0} rows)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedDataset && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Timeframe: {selectedDataset.timeframe}</div>
                      <div>Range: {new Date(selectedDataset.rangeFromTs).toLocaleDateString()} - {new Date(selectedDataset.rangeToTs).toLocaleDateString()}</div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="library" className="mt-3 space-y-3">
                  <SharedDatasetSelector
                    selectedDataset={selectedSharedDataset}
                    onSelect={(dataset) => handleSharedDatasetSelect(dataset)}
                  />
                  
                  {selectedSharedDataset && (
                    <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="secondary" className="text-[10px]">
                          {selectedSharedDataset.symbol}
                        </Badge>
                        <span className="text-muted-foreground">
                          {selectedSharedDataset.timeframe} • {selectedSharedDataset.row_count?.toLocaleString()} rows
                        </span>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">From Date</Label>
                  <Input 
                    type="date" 
                    value={dateFrom} 
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To Date</Label>
                  <Input 
                    type="date" 
                    value={dateTo} 
                    onChange={(e) => setDateTo(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rules Builder */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Rules ({rules.filter(r => r.enabled).length}/{rules.length})
                </CardTitle>
                <Select value={combinator} onValueChange={(v) => setCombinator(v as 'AND' | 'OR')}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND</SelectItem>
                    <SelectItem value="OR">OR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3 pr-2">
                  {rules.map((rule, idx) => (
                    <div 
                      key={rule.id} 
                      className={cn(
                        "p-3 rounded-lg border space-y-2",
                        !rule.enabled && "opacity-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          Rule {idx + 1}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateRule(rule.id, { enabled: !rule.enabled })}
                          >
                            {rule.enabled ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-muted-foreground" />
                            )}
                          </Button>
                          {rules.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeRule(rule.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <Select 
                        value={rule.type} 
                        onValueChange={(v) => updateRule(rule.id, { type: v as 'indicator' | 'price' })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="indicator">Indicator</SelectItem>
                          <SelectItem value="price">Price</SelectItem>
                        </SelectContent>
                      </Select>

                      {rule.type === 'indicator' ? (
                        <div className="grid grid-cols-3 gap-1">
                          <Select 
                            value={rule.indicator} 
                            onValueChange={(v) => updateRule(rule.id, { indicator: v as IndicatorType })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(INDICATOR_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{key}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select 
                            value={rule.operator} 
                            onValueChange={(v) => updateRule(rule.id, { operator: v as ComparisonOperator })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COMPARATORS.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={rule.value}
                            onChange={(e) => updateRule(rule.id, { value: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs"
                          />
                        </div>
                      ) : (
                        <Select 
                          value={rule.condition || 'close_above_prev_high'} 
                          onValueChange={(v) => updateRule(rule.id, { condition: v as PriceConditionType })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select condition..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PRICE_CONDITION_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={addRule}
                disabled={rules.length >= 5}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </CardContent>
          </Card>

          {/* Run Button */}
          <Button 
            className="w-full" 
            size="lg"
            onClick={runScan}
            disabled={running || !selectedDatasetId}
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Scanner
              </>
            )}
          </Button>

          {/* Progress */}
          {running && progress && (
            <Card>
              <CardContent className="py-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{progress.message}</span>
                  <span>{progress.progress}%</span>
                </div>
                <Progress value={progress.progress} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {progress.signalsFound} signals found
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Results ({result?.signals.length || 0} signals)
                </CardTitle>
                {result && result.signals.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Select value={sortField} onValueChange={(v) => setSortField(v as 'timestamp' | 'price')}>
                      <SelectTrigger className="w-28 h-8">
                        <ArrowUpDown className="h-3 w-3 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="timestamp">Time</SelectItem>
                        <SelectItem value="price">Price</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {datasets.length === 0 ? (
                <EmptyState
                  icon={Database}
                  title="No Datasets Available"
                  description="Upload OHLCV data first to run scans. The scanner analyzes your datasets to find trading signals."
                  primaryAction={{
                    label: 'Upload Data',
                    onClick: () => navigate('/data'),
                    icon: Upload,
                  }}
                  compact
                />
              ) : !result || result.signals.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="No Signals Found"
                  description="Configure rules on the left panel and run the scanner to find matching signals in your data."
                  primaryAction={{
                    label: 'Run Scanner',
                    onClick: runScan,
                    icon: Play,
                  }}
                  compact
                />
              ) : (
                <div className="w-full max-w-full overflow-x-auto">
                  <ScrollArea className="h-[500px]">
                    <Table className="min-w-[600px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-40">Date/Time</TableHead>
                          <TableHead className="w-24">Price</TableHead>
                          <TableHead>Matched Rules</TableHead>
                          <TableHead className="hidden lg:table-cell">Context</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedSignals.slice(0, 200).map((signal, idx) => (
                          <TableRow key={`${signal.timestamp}-${idx}`}>
                            <TableCell className="font-mono text-xs truncate max-w-[160px]">
                              {new Date(signal.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell className="font-mono">
                              {signal.price.close.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {signal.matchedRules.slice(0, 3).map((rule, i) => (
                                  <Badge key={i} variant="outline" className="text-xs truncate max-w-[100px]">
                                    {rule}
                                  </Badge>
                                ))}
                                {signal.matchedRules.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{signal.matchedRules.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                              {signal.context.rsi && `RSI: ${signal.context.rsi}`}
                              {signal.context.ema && ` EMA: ${signal.context.ema}`}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {sortedSignals.length > 200 && (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        Showing 200 of {sortedSignals.length} signals. Export for full list.
                      </p>
                    )}
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}
