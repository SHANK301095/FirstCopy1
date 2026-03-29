/**
 * Leaderboard Page
 * Shows real backtest results from Supabase database
 */

import { useState, useEffect } from 'react';
import { Trophy, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EquityChart } from '@/components/charts/EquityChart';
import { PageTitle } from '@/components/ui/PageTitle';

import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { secureLogger } from '@/lib/secureLogger';
import type { RankingPreset } from '@/types';

interface LeaderboardResult {
  id: string;
  strategyName: string;
  symbol: string;
  timeframe: string;
  netProfit: number;
  profitFactor: number;
  relativeDrawdown: number;
  recoveryFactor: number;
  winRate: number;
  totalTrades: number;
  sharpeRatio: number;
  equityCurve: number[];
  createdAt: string;
}

const presets: { value: RankingPreset; label: string }[] = [
  { value: 'low_dd', label: 'Low Drawdown' },
  { value: 'high_pf', label: 'High Profit Factor' },
  { value: 'consistent', label: 'Consistent (Recovery Factor)' },
  { value: 'aggressive', label: 'Aggressive (Net Profit)' },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [results, setResults] = useState<LeaderboardResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<RankingPreset>('high_pf');
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchResults();
    }
  }, [user]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('results')
        .select('id, created_at, summary_json')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        secureLogger.error('db', 'Error fetching leaderboard results', { error: error.message });
        toast({ title: 'Error', description: 'Failed to load leaderboard', variant: 'destructive' });
        return;
      }

      if (data && data.length > 0) {
        const mapped: LeaderboardResult[] = data.map((row) => {
          const summary = row.summary_json as Record<string, unknown>;
          return {
            id: row.id,
            strategyName: (summary.strategyName as string) || 'Unknown Strategy',
            symbol: (summary.symbol as string) || 'N/A',
            timeframe: (summary.timeframe as string) || 'N/A',
            netProfit: (summary.netProfit as number) || 0,
            profitFactor: (summary.profitFactor as number) || 0,
            relativeDrawdown: (summary.maxDrawdownPercent as number) || 0,
            recoveryFactor: (summary.recoveryFactor as number) || 
              ((summary.netProfit as number) || 0) / Math.max(1, Math.abs((summary.maxDrawdownAmount as number) || 1)),
            winRate: (summary.winRate as number) || 0,
            totalTrades: (summary.totalTrades as number) || 0,
            sharpeRatio: (summary.sharpeRatio as number) || 0,
            equityCurve: (summary.equityCurve as number[]) || [],
            createdAt: row.created_at || '',
          };
        });
        setResults(mapped);
      }
    } catch (err) {
      secureLogger.error('db', 'Leaderboard fetch failed', { error: String(err) });
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    switch (preset) {
      case 'low_dd': return a.relativeDrawdown - b.relativeDrawdown;
      case 'high_pf': return b.profitFactor - a.profitFactor;
      case 'consistent': return b.recoveryFactor - a.recoveryFactor;
      case 'aggressive': return b.netProfit - a.netProfit;
      default: return 0;
    }
  });

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => 
      prev.includes(id) 
        ? prev.filter((x) => x !== id) 
        : prev.length < 2 
          ? [...prev, id] 
          : [prev[1], id]
    );
  };

  const compareResults = compareIds.map((id) => results.find((r) => r.id === id)).filter(Boolean) as LeaderboardResult[];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <PageTitle 
          title="Leaderboard" 
          subtitle={`${results.length} backtest results`}
        />
        <Select value={preset} onValueChange={(v) => setPreset(v as RankingPreset)}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {presets.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Comparison Panel */}
      {compareResults.length === 2 && (
        <Card variant="stat">
          <CardHeader>
            <CardTitle className="text-base">Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {compareResults.map((r) => (
                <div key={r.id}>
                  <h4 className="font-semibold mb-2">
                    {r.strategyName} ({r.symbol} {r.timeframe})
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                    <div>
                      Profit:{' '}
                      <span className={r.netProfit >= 0 ? 'text-profit' : 'text-loss'}>
                        ₹{r.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div>
                      PF:{' '}
                      <span className={r.profitFactor >= 1 ? 'text-profit' : 'text-loss'}>
                        {r.profitFactor.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      DD: <span className="text-loss">{r.relativeDrawdown.toFixed(1)}%</span>
                    </div>
                    <div>Win: {r.winRate.toFixed(1)}%</div>
                  </div>
                  {r.equityCurve && r.equityCurve.length > 0 && (
                    <EquityChart data={r.equityCurve} showCard={false} height={120} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      {results.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No backtest results yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Run backtests and save results to see them here
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Strategy</th>
                    <th>Symbol</th>
                    <th>TF</th>
                    <th className="text-right">Net Profit</th>
                    <th className="text-right">PF</th>
                    <th className="text-right">DD %</th>
                    <th className="text-right">Recovery</th>
                    <th className="text-right">Trades</th>
                    <th className="text-right">Win %</th>
                    <th>Compare</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((r, i) => {
                    const isComparing = compareIds.includes(r.id);
                    return (
                      <tr key={r.id} className={isComparing ? 'bg-primary/5' : ''}>
                        <td className="font-mono text-muted-foreground">
                          {i === 0 && <Trophy className="inline h-4 w-4 text-yellow-500 mr-1" />}
                          {i + 1}
                        </td>
                        <td className="font-medium max-w-[200px] truncate">
                          {r.strategyName}
                        </td>
                        <td className="font-mono text-sm">{r.symbol}</td>
                        <td className="font-mono text-sm">{r.timeframe}</td>
                        <td className={cn('text-right font-mono', r.netProfit >= 0 ? 'text-profit' : 'text-loss')}>
                          ₹{r.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className={cn('text-right font-mono', r.profitFactor >= 1 ? 'text-profit' : 'text-loss')}>
                          {r.profitFactor.toFixed(2)}
                        </td>
                        <td className="text-right font-mono text-loss">
                          {r.relativeDrawdown.toFixed(1)}%
                        </td>
                        <td className="text-right font-mono">{r.recoveryFactor.toFixed(2)}</td>
                        <td className="text-right font-mono">{r.totalTrades}</td>
                        <td className={cn('text-right font-mono', r.winRate >= 50 ? 'text-profit' : 'text-loss')}>
                          {r.winRate.toFixed(1)}%
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant={isComparing ? 'default' : 'ghost'}
                            onClick={() => toggleCompare(r.id)}
                          >
                            {isComparing ? '✓' : 'Add'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
