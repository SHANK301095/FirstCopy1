import { useState, useEffect } from 'react';
import { Download, TrendingUp, TrendingDown, BarChart3, FileSpreadsheet, Trophy, Cloud, Loader2, Check, Shuffle, Library } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/dashboard/StatCard';
import { useBacktestStore } from '@/lib/backtestStore';
import { useAuth } from '@/contexts/AuthContext';
import { createResult, fetchStrategies, fetchStrategyVersions, CloudStrategy, CloudStrategyVersion } from '@/lib/cloudSync';
import { useToast } from '@/hooks/use-toast';
import { MonteCarloPanel } from '@/components/analytics/MonteCarloPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { secureLogger } from '@/lib/secureLogger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { UniversalAssetSelector, AssetOption } from '@/components/selectors/UniversalAssetSelector';

export function ResultsTab() {
  const { results, uploadedData } = useBacktestStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [strategies, setStrategies] = useState<CloudStrategy[]>([]);
  const [versions, setVersions] = useState<CloudStrategyVersion[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('__none__');
  const [selectedVersionId, setSelectedVersionId] = useState<string>('__none__');
  const [loadingStrategies, setLoadingStrategies] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Fetch strategies when dialog opens
  useEffect(() => {
    if (showSaveDialog && user) {
      setLoadingStrategies(true);
      fetchStrategies()
        .then(setStrategies)
        .catch((err) => secureLogger.error('db', 'Failed to fetch strategies', { error: String(err) }))
        .finally(() => setLoadingStrategies(false));
    }
  }, [showSaveDialog, user]);

  // Fetch versions when strategy is selected
  useEffect(() => {
    if (selectedStrategyId && selectedStrategyId !== '__none__') {
      setLoadingVersions(true);
      setSelectedVersionId('__none__');
      fetchStrategyVersions(selectedStrategyId)
        .then(setVersions)
        .catch((err) => secureLogger.error('db', 'Failed to fetch strategy versions', { error: String(err) }))
        .finally(() => setLoadingVersions(false));
    } else {
      setVersions([]);
      setSelectedVersionId('__none__');
    }
  }, [selectedStrategyId]);

  if (!results) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center border-dashed">
          <CardContent className="py-12">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Results Yet</h2>
            <p className="text-muted-foreground mb-4">
              Run a backtest to see performance metrics, charts, and trade history.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const equityData = results.equityCurve.map((v, i) => ({ point: i, equity: v }));
  const drawdownData = results.drawdownCurve.map((v, i) => ({ point: i, drawdown: v }));

  const openSaveDialog = () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to save results to the cloud',
        variant: 'destructive',
      });
      return;
    }
    setShowSaveDialog(true);
  };

  const handleSaveToCloud = async () => {
    setIsSaving(true);
    try {
      const summaryJson = {
        id: results.id,
        symbol: results.symbol,
        dateRange: results.dateRange,
        winRate: results.winRate,
        profitFactor: results.profitFactor,
        expectancyR: results.expectancyR,
        maxDrawdownPercent: results.maxDrawdownPercent,
        maxDrawdownAmount: results.maxDrawdownAmount,
        cagr: results.cagr,
        sharpeRatio: results.sharpeRatio,
        totalTrades: results.totalTrades,
        winningTrades: results.winningTrades,
        losingTrades: results.losingTrades,
        netProfit: results.netProfit,
        grossProfit: results.grossProfit,
        grossLoss: results.grossLoss,
        equityCurve: results.equityCurve,
        drawdownCurve: results.drawdownCurve,
        runAt: results.runAt,
        trades: results.trades.slice(0, 500).map(t => ({
          id: t.id,
          entryTime: t.entryTime,
          exitTime: t.exitTime,
          symbol: t.symbol,
          direction: t.direction,
          entryPrice: t.entryPrice,
          exitPrice: t.exitPrice,
          quantity: t.quantity,
          pnl: t.pnl,
          pnlPercent: t.pnlPercent,
          commission: t.commission,
        })),
      };

      await createResult({
        summary_json: summaryJson,
        strategy_version_id: (selectedVersionId && selectedVersionId !== '__none__') ? selectedVersionId : undefined,
      });
      
      setIsSaved(true);
      setShowSaveDialog(false);
      toast({
        title: 'Saved to Cloud',
        description: (selectedVersionId && selectedVersionId !== '__none__') 
          ? 'Results saved and linked to strategy version'
          : 'Your backtest results have been saved successfully',
      });
      
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save results',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const downloadCSV = (type: 'trades' | 'summary' | 'equity') => {
    const symbol = results.symbol;
    const dateStr = new Date().toISOString().split('T')[0];
    let content = '';
    let filename = '';

    if (type === 'trades') {
      const headers = ['Entry Time', 'Exit Time', 'Symbol', 'Direction', 'Entry Price', 'Exit Price', 'Quantity', 'PnL', 'PnL %', 'Commission'];
      const rows = results.trades.map((t) => [
        t.entryTime, t.exitTime, t.symbol, t.direction, t.entryPrice.toFixed(4), t.exitPrice.toFixed(4),
        t.quantity, t.pnl.toFixed(2), t.pnlPercent.toFixed(2), t.commission.toFixed(2)
      ]);
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      filename = `trades_${symbol}_${dateStr}.csv`;
    } else if (type === 'summary') {
      content = [
        'Metric,Value',
        `Symbol,${symbol}`,
        `Win Rate,${results.winRate.toFixed(2)}%`,
        `Profit Factor,${results.profitFactor.toFixed(2)}`,
        `Expectancy (R),${results.expectancyR.toFixed(2)}`,
        `Max Drawdown %,${results.maxDrawdownPercent.toFixed(2)}%`,
        `Max Drawdown ₹,${results.maxDrawdownAmount.toFixed(2)}`,
        `CAGR,${results.cagr.toFixed(2)}%`,
        `Sharpe Ratio,${results.sharpeRatio.toFixed(2)}`,
        `Total Trades,${results.totalTrades}`,
        `Net Profit,${results.netProfit.toFixed(2)}`,
      ].join('\n');
      filename = `summary_${symbol}_${dateStr}.csv`;
    } else {
      content = ['Point,Equity\n', ...results.equityCurve.map((v, i) => `${i},${v.toFixed(2)}`).join('\n')].join('');
      filename = `equity_${symbol}_${dateStr}.csv`;
    }

    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Download Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => downloadCSV('trades')}>
          <Download className="h-4 w-4 mr-2" />
          trades_{results.symbol}.csv
        </Button>
        <Button variant="outline" onClick={() => downloadCSV('summary')}>
          <Download className="h-4 w-4 mr-2" />
          summary_{results.symbol}.csv
        </Button>
        <Button variant="outline" onClick={() => downloadCSV('equity')}>
          <Download className="h-4 w-4 mr-2" />
          equity_{results.symbol}.csv
        </Button>
        
        <div className="flex-1" />
        
        <Button 
          variant={isSaved ? 'default' : 'secondary'}
          onClick={openSaveDialog}
          disabled={isSaving || isSaved}
          className="gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isSaved ? (
            <>
              <Check className="h-4 w-4" />
              Saved!
            </>
          ) : (
            <>
              <Cloud className="h-4 w-4" />
              Save to Cloud
            </>
          )}
        </Button>
      </div>

      {/* Save to Cloud Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save to Cloud</DialogTitle>
            <DialogDescription>
              Optionally link this result to a strategy version for tracking performance across versions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="strategy">Strategy (Optional)</Label>
              <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId}>
                <SelectTrigger id="strategy">
                  <SelectValue placeholder={loadingStrategies ? "Loading..." : "Select a strategy"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {strategies.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedStrategyId && selectedStrategyId !== '__none__' && (
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
                  <SelectTrigger id="version">
                    <SelectValue placeholder={loadingVersions ? "Loading..." : "Select a version"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {versions.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        v{v.version} - {v.change_summary || 'No summary'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {versions.length === 0 && !loadingVersions && (
                  <p className="text-xs text-muted-foreground">
                    No versions found. Create versions in Strategy Versioning.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveToCloud} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Result'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Summary Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard
          title="Win Rate"
          value={`${results.winRate.toFixed(1)}%`}
          trend={results.winRate >= 50 ? 'up' : 'down'}
        />
        <StatCard
          title="Profit Factor"
          value={results.profitFactor.toFixed(2)}
          trend={results.profitFactor >= 1 ? 'up' : 'down'}
        />
        <StatCard
          title="Expectancy (R)"
          value={results.expectancyR.toFixed(2)}
          trend={results.expectancyR >= 0 ? 'up' : 'down'}
        />
        <StatCard
          title="Max DD %"
          value={`${results.maxDrawdownPercent.toFixed(1)}%`}
          trend={results.maxDrawdownPercent <= 20 ? 'up' : 'down'}
        />
        <StatCard
          title="CAGR"
          value={`${results.cagr.toFixed(1)}%`}
          trend={results.cagr >= 0 ? 'up' : 'down'}
        />
        <StatCard
          title="Sharpe"
          value={results.sharpeRatio.toFixed(2)}
          trend={results.sharpeRatio >= 1 ? 'up' : 'down'}
        />
        <StatCard
          title="Trades"
          value={results.totalTrades.toLocaleString()}
          subtitle={`${results.winningTrades}W / ${results.losingTrades}L`}
        />
      </div>

      {/* Net Profit */}
      <Card variant={results.netProfit >= 0 ? 'stat' : 'default'}>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net Profit</p>
              <p className={cn('text-4xl font-bold font-mono', results.netProfit >= 0 ? 'text-profit' : 'text-loss')}>
                ₹{results.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Gross Profit / Loss</p>
              <p className="font-mono">
                <span className="text-profit">₹{results.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                {' / '}
                <span className="text-loss">₹{results.grossLoss.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Equity Curve */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Equity Curve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                <XAxis dataKey="point" hide />
                <YAxis
                  tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  width={55}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(222, 47%, 8%)', border: '1px solid hsl(222, 30%, 18%)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Equity']}
                />
                <Area type="monotone" dataKey="equity" stroke="hsl(142, 76%, 45%)" strokeWidth={2} fill="url(#equityGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Drawdown Curve */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-loss">
              <TrendingDown className="h-4 w-4" />
              Drawdown Curve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={drawdownData}>
                <defs>
                  <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 72%, 55%)" stopOpacity={0} />
                    <stop offset="100%" stopColor="hsl(0, 72%, 55%)" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                <XAxis dataKey="point" hide />
                <YAxis
                  domain={['auto', 0]}
                  tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  width={40}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(222, 47%, 8%)', border: '1px solid hsl(222, 30%, 18%)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number) => [`${v.toFixed(2)}%`, 'Drawdown']}
                />
                <Area type="monotone" dataKey="drawdown" stroke="hsl(0, 72%, 55%)" strokeWidth={1.5} fill="url(#ddGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Trade List and Monte Carlo */}
      <Tabs defaultValue="trades" className="w-full">
        <TabsList>
          <TabsTrigger value="trades" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Trade List ({results.trades.length})
          </TabsTrigger>
          <TabsTrigger value="montecarlo" className="gap-2">
            <Shuffle className="h-4 w-4" />
            Monte Carlo Simulation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trades" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                Trade List ({results.trades.length} trades)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[400px]">
                <table className="data-table text-xs">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr>
                      <th>Entry Time</th>
                      <th>Exit Time</th>
                      <th>Direction</th>
                      <th className="text-right">Entry</th>
                      <th className="text-right">Exit</th>
                      <th className="text-right">PnL</th>
                      <th className="text-right">PnL %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.trades.slice(0, 100).map((t) => (
                      <tr key={t.id}>
                        <td className="font-mono">{new Date(t.entryTime).toLocaleString()}</td>
                        <td className="font-mono">{new Date(t.exitTime).toLocaleString()}</td>
                        <td>
                          <span className={cn('px-2 py-0.5 rounded text-xs', t.direction === 'long' ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss')}>
                            {t.direction.toUpperCase()}
                          </span>
                        </td>
                        <td className="text-right font-mono">{t.entryPrice.toFixed(4)}</td>
                        <td className="text-right font-mono">{t.exitPrice.toFixed(4)}</td>
                        <td className={cn('text-right font-mono', t.pnl >= 0 ? 'text-profit' : 'text-loss')}>
                          ₹{t.pnl.toFixed(2)}
                        </td>
                        <td className={cn('text-right font-mono', t.pnlPercent >= 0 ? 'text-profit' : 'text-loss')}>
                          {t.pnlPercent >= 0 ? '+' : ''}{t.pnlPercent.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {results.trades.length > 100 && (
                <div className="text-center py-3 text-sm text-muted-foreground border-t border-border">
                  Showing first 100 of {results.trades.length} trades. Download CSV for full list.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="montecarlo" className="mt-4">
          <MonteCarloPanel 
            trades={results.trades}
            initialCapital={results.equityCurve[0] || 100000}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
