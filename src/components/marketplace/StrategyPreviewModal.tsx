/**
 * Strategy Preview Modal with Live Backtesting
 * Test strategies on user's own data or public library before downloading
 */

import { useState, useEffect } from 'react';
import { 
  Play, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Percent, 
  DollarSign,
  Activity,
  AlertCircle,
  CheckCircle,
  Loader2,
  Database,
  ArrowRight,
  Library
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { db, Dataset } from '@/db/index';
import { executeBacktest, BacktestConfig, BacktestResult } from '@/lib/backtestEngine';
import { parseStrategy } from '@/lib/strategyParser';
import { secureLogger } from '@/lib/secureLogger';
import { SharedDatasetSelector } from '@/components/backtest/SharedDatasetSelector';
import type { SharedDataset } from '@/lib/sharedDataService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StrategyPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategyId: string;
  strategyTitle: string;
  strategyCode: string | null;
  onDownload: () => void;
}

interface PreviewMetrics {
  netProfit: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  totalTrades: number;
  sharpeRatio: number;
}

export function StrategyPreviewModal({
  open,
  onOpenChange,
  strategyId,
  strategyTitle,
  strategyCode,
  onDownload,
}: StrategyPreviewModalProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<PreviewMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataSourceTab, setDataSourceTab] = useState<'my' | 'library'>('my');
  const [selectedSharedDataset, setSelectedSharedDataset] = useState<SharedDataset | null>(null);

  // Load user's datasets
  useEffect(() => {
    if (open) {
      loadDatasets();
    }
  }, [open]);

  const loadDatasets = async () => {
    try {
      const allDatasets = await db.datasets.toArray();
      setDatasets(allDatasets);
      if (allDatasets.length > 0 && !selectedDataset) {
        setSelectedDataset(allDatasets[0].id);
      }
    } catch (err) {
      secureLogger.error('system', 'Failed to load datasets for preview', { error: String(err) });
    }
  };

  const runPreviewBacktest = async () => {
    if (!selectedDataset || !strategyCode) {
      setError('Please select a dataset and ensure strategy has code');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      // Load dataset chunks
      const chunks = await db.datasetChunks.where('datasetId').equals(selectedDataset).toArray();
      const allBars = chunks
        .sort((a, b) => a.index - b.index)
        .flatMap(c => c.rows.map(row => ({
          timestamp: row[0],
          open: row[1],
          high: row[2],
          low: row[3],
          close: row[4],
          volume: row[5] || 0,
        })));
      
      if (allBars.length < 50) {
        throw new Error('Dataset too small for meaningful backtest (need 50+ bars)');
      }

      setProgress(20);

      // Parse strategy
      const parsed = parseStrategy(strategyCode);
      if (!parsed) {
        throw new Error('Failed to parse strategy code');
      }

      setProgress(40);

      // Run backtest
      const config: BacktestConfig = {
        initialCapital: 100000,
        commissionPercent: 0.02,
        slippageTicks: 1,
        spreadPoints: 0,
        riskPerTrade: 2,
        maxTradesPerDay: 10,
        dailyLossCap: 5,
      };

      const dataset = datasets.find(d => d.id === selectedDataset);
      
      setProgress(60);

      const backtestResult = executeBacktest(
        allBars,
        parsed,
        config,
        dataset?.symbol || 'UNKNOWN'
      );

      setProgress(100);

      // Extract metrics
      setResult({
        netProfit: backtestResult.netProfit,
        winRate: backtestResult.winRate,
        profitFactor: backtestResult.profitFactor,
        maxDrawdown: backtestResult.maxDrawdownPercent,
        totalTrades: backtestResult.totalTrades,
        sharpeRatio: backtestResult.sharpeRatio,
      });

      secureLogger.info('backtest', 'Strategy preview completed', {
        strategyId,
        datasetId: selectedDataset,
        trades: backtestResult.totalTrades,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      secureLogger.error('backtest', 'Strategy preview failed', { strategyId, error: message });
    } finally {
      setIsRunning(false);
    }
  };

  const MetricCard = ({ 
    label, 
    value, 
    icon: Icon, 
    isPositive,
    format = 'number'
  }: { 
    label: string; 
    value: number; 
    icon: typeof TrendingUp; 
    isPositive?: boolean;
    format?: 'number' | 'percent' | 'currency';
  }) => {
    const formattedValue = format === 'percent' 
      ? `${value.toFixed(2)}%` 
      : format === 'currency'
        ? `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
        : value.toFixed(2);

    return (
      <Card variant="glass" className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {isPositive !== undefined && (
            isPositive 
              ? <CheckCircle className="h-4 w-4 text-success" />
              : <AlertCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
        <p className={cn(
          "text-xl font-bold",
          isPositive === true && "text-success",
          isPositive === false && "text-destructive"
        )}>
          {formattedValue}
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Preview: {strategyTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dataset Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Test on your dataset or from Library
            </label>
            <Tabs value={dataSourceTab} onValueChange={(v) => setDataSourceTab(v as 'my' | 'library')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-8 mb-2">
                <TabsTrigger value="my" className="text-xs">My Datasets</TabsTrigger>
                <TabsTrigger value="library" className="text-xs">
                  <Library className="h-3 w-3 mr-1" />
                  Public Library
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="my" className="mt-0">
                {datasets.length === 0 ? (
                  <Card variant="glass" className="p-4 text-center">
                    <Database className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      No datasets uploaded yet
                    </p>
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                      Upload Dataset First
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Card>
                ) : (
                  <div className="flex gap-3">
                    <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select dataset" />
                      </SelectTrigger>
                      <SelectContent>
                        {datasets.map((ds) => (
                          <SelectItem key={ds.id} value={ds.id}>
                            {ds.name} ({ds.symbol || 'Unknown'} - {ds.timeframe})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      onClick={runPreviewBacktest} 
                      disabled={isRunning || !selectedDataset || !strategyCode}
                    >
                      {isRunning ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Run Preview
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="library" className="mt-0 space-y-3">
                <SharedDatasetSelector
                  selectedDataset={selectedSharedDataset}
                  onSelect={(ds) => {
                    setSelectedSharedDataset(ds);
                    if (ds) setSelectedDataset(ds.id);
                  }}
                />
                {selectedSharedDataset && (
                  <Button 
                    onClick={runPreviewBacktest} 
                    disabled={isRunning || !strategyCode}
                    className="w-full"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run Preview on {selectedSharedDataset.symbol}
                      </>
                    )}
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Progress */}
          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Running backtest...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Error */}
          {error && (
            <Card className="p-4 border-destructive/50 bg-destructive/10">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            </Card>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="font-medium">Preview Complete</span>
                <Badge variant="secondary" className="ml-auto">
                  {result.totalTrades} trades
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <MetricCard 
                  label="Net Profit" 
                  value={result.netProfit} 
                  icon={DollarSign}
                  isPositive={result.netProfit > 0}
                  format="currency"
                />
                <MetricCard 
                  label="Win Rate" 
                  value={result.winRate} 
                  icon={Percent}
                  isPositive={result.winRate >= 50}
                  format="percent"
                />
                <MetricCard 
                  label="Profit Factor" 
                  value={result.profitFactor} 
                  icon={TrendingUp}
                  isPositive={result.profitFactor > 1}
                />
                <MetricCard 
                  label="Max Drawdown" 
                  value={result.maxDrawdown} 
                  icon={TrendingDown}
                  isPositive={result.maxDrawdown < 20}
                  format="percent"
                />
                <MetricCard 
                  label="Sharpe Ratio" 
                  value={result.sharpeRatio} 
                  icon={BarChart3}
                  isPositive={result.sharpeRatio > 1}
                />
                <MetricCard 
                  label="Total Trades" 
                  value={result.totalTrades} 
                  icon={Activity}
                />
              </div>

              {/* Quality Assessment */}
              <Card variant="glass" className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {result.netProfit > 0 && result.winRate >= 50 && result.profitFactor > 1
                        ? '✅ Strategy looks promising on your data'
                        : result.netProfit > 0
                          ? '⚠️ Profitable but review the metrics carefully'
                          : '❌ Strategy lost money on this dataset'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Results may vary with different datasets and market conditions
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Close
            </Button>
            <Button onClick={onDownload} className="flex-1">
              Download Strategy
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
