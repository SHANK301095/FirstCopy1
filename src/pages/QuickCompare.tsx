/**
 * Quick Compare - Compare 2 runs side by side
 * Loads saved backtest results from database
 * Supports Public Library for comparing with benchmark results
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  GitCompare, 
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Database,
  Loader2,
  Globe,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/lib/utils';
import { secureLogger } from '@/lib/secureLogger';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UniversalAssetSelector, type AssetOption } from '@/components/selectors/UniversalAssetSelector';
import { PageTitle } from '@/components/ui/PageTitle';

interface SavedResult {
  id: string;
  name: string;
  date: string;
  netProfit: number;
  winRate: number;
  sharpe: number;
  maxDD: number;
  trades: number;
  profitFactor: number;
  equityCurve: number[];
  visibility?: 'private' | 'public' | 'workspace';
}

export default function QuickCompare() {
  const { toast } = useToast();
  const [results, setResults] = useState<SavedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [run1Id, setRun1Id] = useState<string>('');
  const [run2Id, setRun2Id] = useState<string>('');
  
  // Asset selector state for public/private selection
  const [run1Asset, setRun1Asset] = useState<AssetOption | null>(null);
  const [run2Asset, setRun2Asset] = useState<AssetOption | null>(null);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('results')
        .select(`
          id,
          created_at,
          summary_json,
          strategy_version_id,
          run_id
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        secureLogger.error('db', 'Error loading compare results', { error: error.message });
        toast({ title: 'Error', description: 'Failed to load results', variant: 'destructive' });
        return;
      }

      if (data && data.length > 0) {
        const mapped: SavedResult[] = data.map((row, idx) => {
          const summary = row.summary_json as Record<string, unknown>;
          return {
            id: row.id,
            name: (summary.strategyName as string) || `Backtest #${idx + 1}`,
            date: new Date(row.created_at || '').toLocaleDateString(),
            netProfit: (summary.netProfit as number) || 0,
            winRate: (summary.winRate as number) || 0,
            sharpe: (summary.sharpeRatio as number) || 0,
            maxDD: (summary.maxDrawdownPercent as number) || 0,
            trades: (summary.totalTrades as number) || 0,
            profitFactor: (summary.profitFactor as number) || 0,
            equityCurve: (summary.equityCurve as number[]) || []
          };
        });
        setResults(mapped);
      }
    } catch (err) {
      secureLogger.error('db', 'Quick compare load failed', { error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const run1 = results.find(r => r.id === run1Id);
  const run2 = results.find(r => r.id === run2Id);

  const chartData = useMemo(() => {
    if (!run1 || !run2) return [];
    
    const maxLen = Math.max(run1.equityCurve.length, run2.equityCurve.length);
    const data = [];
    
    for (let i = 0; i < maxLen; i++) {
      data.push({
        day: i,
        date: `Day ${i}`,
        run1: run1.equityCurve[i] ?? run1.equityCurve[run1.equityCurve.length - 1],
        run2: run2.equityCurve[i] ?? run2.equityCurve[run2.equityCurve.length - 1],
      });
    }
    return data;
  }, [run1, run2]);

  const calculateDelta = (v1: number, v2: number, invert = false) => {
    const diff = v1 - v2;
    const pct = v2 !== 0 ? ((v1 - v2) / Math.abs(v2)) * 100 : 0;
    const isPositive = invert ? diff < 0 : diff > 0;
    return { diff, pct, isPositive };
  };

  const metrics = run1 && run2 ? [
    { label: 'Net Profit', v1: run1.netProfit, v2: run2.netProfit, format: 'currency' },
    { label: 'Win Rate', v1: run1.winRate, v2: run2.winRate, format: 'percent' },
    { label: 'Sharpe Ratio', v1: run1.sharpe, v2: run2.sharpe, format: 'decimal' },
    { label: 'Max Drawdown', v1: run1.maxDD, v2: run2.maxDD, format: 'percent', invert: true },
    { label: 'Total Trades', v1: run1.trades, v2: run2.trades, format: 'number' },
    { label: 'Profit Factor', v1: run1.profitFactor, v2: run2.profitFactor, format: 'decimal' },
  ] : [];

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency': return `₹${value.toLocaleString()}`;
      case 'percent': return `${value.toFixed(1)}%`;
      case 'decimal': return value.toFixed(2);
      default: return value.toLocaleString();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Handle asset selection and map to result
  const handleRun1Select = (asset: AssetOption | null) => {
    setRun1Asset(asset);
    if (asset) {
      // Check if this result exists in our loaded results, if not load it
      const existingResult = results.find(r => r.id === asset.id);
      if (existingResult) {
        setRun1Id(asset.id);
      } else if (asset.meta) {
        // Add the result from asset meta
        const newResult: SavedResult = {
          id: asset.id,
          name: asset.name,
          date: new Date().toLocaleDateString(),
          netProfit: (asset.meta.netProfit as number) || 0,
          winRate: (asset.meta.winRate as number) || 0,
          sharpe: (asset.meta.sharpeRatio as number) || 0,
          maxDD: (asset.meta.maxDrawdownPercent as number) || 0,
          trades: (asset.meta.totalTrades as number) || 0,
          profitFactor: (asset.meta.profitFactor as number) || 0,
          equityCurve: (asset.meta.equityCurve as number[]) || [],
          visibility: asset.visibility as 'private' | 'public' | 'workspace',
        };
        setResults(prev => [...prev, newResult]);
        setRun1Id(asset.id);
      }
    } else {
      setRun1Id('');
    }
  };

  const handleRun2Select = (asset: AssetOption | null) => {
    setRun2Asset(asset);
    if (asset) {
      const existingResult = results.find(r => r.id === asset.id);
      if (existingResult) {
        setRun2Id(asset.id);
      } else if (asset.meta) {
        const newResult: SavedResult = {
          id: asset.id,
          name: asset.name,
          date: new Date().toLocaleDateString(),
          netProfit: (asset.meta.netProfit as number) || 0,
          winRate: (asset.meta.winRate as number) || 0,
          sharpe: (asset.meta.sharpeRatio as number) || 0,
          maxDD: (asset.meta.maxDrawdownPercent as number) || 0,
          trades: (asset.meta.totalTrades as number) || 0,
          profitFactor: (asset.meta.profitFactor as number) || 0,
          equityCurve: (asset.meta.equityCurve as number[]) || [],
          visibility: asset.visibility as 'private' | 'public' | 'workspace',
        };
        setResults(prev => [...prev, newResult]);
        setRun2Id(asset.id);
      }
    } else {
      setRun2Id('');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle 
        title="Quick Compare" 
        subtitle="Compare two backtest runs side by side (supports public benchmark results)"
      />

      {/* Run Selection */}
      <Card variant="glass" className="p-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Lock className="h-3 w-3" />
              Run A (Your Results)
            </label>
            <UniversalAssetSelector
              assetType="result"
              value={run1Asset}
              onSelect={handleRun1Select}
              placeholder="Select first run..."
            />
            {run1 && (
              <div className="mt-2 text-xs text-muted-foreground">
                PF: {run1.profitFactor.toFixed(2)} • Win: {run1.winRate.toFixed(1)}%
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          
          <div className="flex-1 w-full">
            <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Globe className="h-3 w-3 text-green-500" />
              Run B (Compare Against)
            </label>
            <UniversalAssetSelector
              assetType="result"
              value={run2Asset}
              onSelect={handleRun2Select}
              placeholder="Select benchmark or result..."
            />
            {run2 && (
              <div className="mt-2 text-xs text-muted-foreground">
                PF: {run2.profitFactor.toFixed(2)} • Win: {run2.winRate.toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      </Card>

      {results.length === 0 ? (
        <Card className="p-12 text-center">
          <Database className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Saved Results</h3>
          <p className="text-muted-foreground">Run some backtests and save them to compare here</p>
        </Card>
      ) : run1 && run2 ? (
        <>
          {/* Equity Curve Overlay */}
          <Card variant="stat">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Equity Curve Comparison
              </CardTitle>
              <CardDescription>Overlayed equity curves for both runs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, '']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="run1" 
                      name={run1.name}
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="run2" 
                      name={run2.name}
                      stroke="hsl(var(--success))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Delta KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
            {metrics.map((metric) => {
              const delta = calculateDelta(metric.v1, metric.v2, metric.invert);
              return (
                <Card key={metric.label} variant="stat" className="p-4">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    {metric.label}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-primary">A:</span>
                      <span className="font-mono font-semibold">{formatValue(metric.v1, metric.format)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-success">B:</span>
                      <span className="font-mono font-semibold">{formatValue(metric.v2, metric.format)}</span>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "mt-3 pt-3 border-t border-border/50 flex items-center justify-center gap-1",
                    delta.isPositive ? "text-success" : "text-destructive"
                  )}>
                    {delta.isPositive ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    <span className="font-mono text-sm font-semibold">
                      {delta.pct > 0 ? '+' : ''}{delta.pct.toFixed(1)}%
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Summary */}
          <Card variant="glass">
            <CardContent className="py-6">
              <div className="flex items-center justify-center gap-4 text-center">
                <div>
                  <Badge variant="default" className="mb-2">{run1.name}</Badge>
                  <p className="text-2xl font-bold font-mono">₹{run1.netProfit.toLocaleString()}</p>
                </div>
                <div className="text-muted-foreground">vs</div>
                <div>
                  <Badge variant="success" className="mb-2">{run2.name}</Badge>
                  <p className="text-2xl font-bold font-mono">₹{run2.netProfit.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="p-12 text-center">
          <GitCompare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Select Two Runs to Compare</h3>
          <p className="text-muted-foreground">Choose two backtest runs above to see a side-by-side comparison</p>
        </Card>
      )}
    </div>
  );
}
