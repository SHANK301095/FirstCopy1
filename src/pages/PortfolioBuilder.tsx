/**
 * Portfolio Builder Page
 * Phase 5: Portfolio aggregation, combined equity curves, correlation-aware allocation
 * Phase 8: Multi-currency accounting with FX conversion
 * Now supports Public Library results via UniversalAssetSelector
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, Plus, Trash2, PieChart, TrendingUp, 
  RefreshCw, Download, Loader2,
  DollarSign, Globe, ArrowRightLeft, Layers, Upload, FileUp, Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { EquityChart } from '@/components/charts/EquityChart';
import { calculateRiskMetrics } from '@/lib/riskMetrics';
import { PortfolioComposer } from '@/components/portfolio/PortfolioComposer';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { secureLogger } from '@/lib/secureLogger';
import { StatCardClean, StatCardGrid } from '@/components/ui/StatCardClean';
import { PageTitle } from '@/components/ui/PageTitle';
import { UniversalAssetSelector, type AssetOption } from '@/components/selectors/UniversalAssetSelector';
import {
  CurrencyCode,
  SUPPORTED_CURRENCIES,
  CURRENCY_SYMBOLS,
  formatCurrency,
  getExchangeRate,
  convertCurrency,
} from '@/lib/currencyUtils';

interface PortfolioStrategy {
  id: string;
  name: string;
  allocation: number;
  equity: number[];
  returns: number[];
  sharpe: number;
  maxDD: number;
  netProfit: number;
  baseCurrency: CurrencyCode;
}

interface PortfolioMetrics {
  combinedEquity: number[];
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  diversificationRatio: number;
  correlationMatrix: number[][];
}

export default function PortfolioBuilder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [strategies, setStrategies] = useState<PortfolioStrategy[]>([]);
  const [availableResults, setAvailableResults] = useState<Array<{ id: string; name: string; data: Record<string, unknown> }>>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [portfolioMetrics, setPortfolioMetrics] = useState<PortfolioMetrics | null>(null);
  const [correlationRunning, setCorrelationRunning] = useState(false);
  const correlationWorkerRef = useRef<Worker | null>(null);
  
  const [viewMode, setViewMode] = useState<'multi-currency' | 'composer'>('multi-currency');
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>('USD');
  const [showFxPanel, setShowFxPanel] = useState(false);

  // Load real results from Supabase
  const loadResultsFromSupabase = useCallback(async () => {
    setLoadingResults(true);
    try {
      const { data, error } = await supabase
        .from('results')
        .select('id, summary_json, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const results = (data || []).map((r) => {
        const summary = r.summary_json as Record<string, unknown>;
        return {
          id: r.id,
          name: (summary.eaName as string) || (summary.symbol as string) || `Result ${r.id.slice(0, 8)}`,
          data: summary,
        };
      });

      setAvailableResults(results);
    } catch (error) {
      secureLogger.error('db', 'Failed to load results for portfolio', { error });
      toast({ title: 'Error', description: 'Failed to load backtest results', variant: 'destructive' });
    } finally {
      setLoadingResults(false);
    }
  }, [toast]);

  useEffect(() => {
    loadResultsFromSupabase();
  }, [loadResultsFromSupabase]);

  // Add strategy from results
  const addStrategyFromResult = (result: { id: string; name: string; data: Record<string, unknown> }) => {
    const summary = result.data;
    
    // Check if already added
    if (strategies.some(s => s.id === result.id)) {
      toast({ title: 'Already Added', description: 'This result is already in your portfolio', variant: 'destructive' });
      return;
    }
    
    // Generate synthetic equity curve if not present
    const netProfit = (summary.netProfit as number) || 0;
    const totalTrades = (summary.totalTrades as number) || 100;
    const equityCurve = (summary.equityCurve as number[]) || generateEquityCurve(netProfit, totalTrades);
    
    // Calculate returns from equity curve
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
    }

    const newStrategy: PortfolioStrategy = {
      id: result.id,
      name: result.name,
      allocation: Math.floor(100 / (strategies.length + 1)),
      equity: equityCurve,
      returns,
      sharpe: (summary.sharpeRatio as number) || 0,
      maxDD: (summary.relativeDrawdown as number) || 0,
      netProfit,
      baseCurrency: 'USD',
    };

    // Rebalance existing allocations
    setStrategies(prev => {
      const newAlloc = Math.floor(100 / (prev.length + 1));
      return [...prev.map(s => ({ ...s, allocation: newAlloc })), { ...newStrategy, allocation: newAlloc }];
    });

    toast({ title: 'Strategy Added', description: `${result.name} added to portfolio` });
  };

  // Handle asset selection from UniversalAssetSelector
  const handleAssetSelect = (asset: AssetOption | null) => {
    if (asset && asset.meta) {
      addStrategyFromResult({
        id: asset.id,
        name: asset.name,
        data: asset.meta,
      });
    }
  };

  const generateEquityCurve = (netProfit: number, trades: number): number[] => {
    const curve: number[] = [10000];
    const points = Math.min(trades, 100);
    const increment = netProfit / points;
    for (let i = 1; i <= points; i++) {
      // Deterministic variation using index-based hash
      const factor = 0.7 + ((i * 31 + 7) % 60) / 100;
      curve.push(Math.max(0, curve[i - 1] + increment * factor));
    }
    return curve;
  };

  function getConvertedPnl(strategy: PortfolioStrategy): number {
    return convertCurrency(strategy.netProfit, strategy.baseCurrency, displayCurrency);
  }

  function getTotalPortfolioValue(): { value: number; pnl: number; fxExposure: Record<CurrencyCode, number> } {
    const fxExposure: Record<string, number> = {};
    let totalValue = 0;
    let totalPnl = 0;
    
    for (const s of strategies) {
      const finalValue = s.equity[s.equity.length - 1] || 0;
      const convertedValue = convertCurrency(finalValue, s.baseCurrency, displayCurrency);
      const convertedPnl = getConvertedPnl(s);
      
      totalValue += convertedValue * (s.allocation / 100);
      totalPnl += convertedPnl * (s.allocation / 100);
      
      if (!fxExposure[s.baseCurrency]) fxExposure[s.baseCurrency] = 0;
      fxExposure[s.baseCurrency] += (s.allocation / 100) * 100;
    }
    
    return { value: totalValue, pnl: totalPnl, fxExposure: fxExposure as Record<CurrencyCode, number> };
  }

  function calculatePortfolio() {
    if (strategies.length === 0) return;

    const totalAllocation = strategies.reduce((sum, s) => sum + s.allocation, 0);
    const normalizedWeights = strategies.map(s => s.allocation / (totalAllocation || 1));

    const minLength = Math.min(...strategies.map(s => s.equity.length));
    const combinedEquity: number[] = [];
    
    for (let i = 0; i < minLength; i++) {
      let value = 0;
      strategies.forEach((s, idx) => {
        value += s.equity[i] * normalizedWeights[idx];
      });
      combinedEquity.push(value);
    }

    const portfolioReturns: number[] = [];
    for (let i = 1; i < combinedEquity.length; i++) {
      portfolioReturns.push((combinedEquity[i] - combinedEquity[i - 1]) / combinedEquity[i - 1]);
    }

    const metrics = calculateRiskMetrics({
      returns: portfolioReturns,
      equity: combinedEquity,
      initialCapital: 100000
    });

    const n = strategies.length;
    const correlationMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      correlationMatrix[i][i] = 1;
      for (let j = i + 1; j < n; j++) {
        const r1 = strategies[i].returns;
        const r2 = strategies[j].returns;
        const minLen = Math.min(r1.length, r2.length);
        
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
        for (let k = 0; k < minLen; k++) {
          sumX += r1[k];
          sumY += r2[k];
          sumXY += r1[k] * r2[k];
          sumX2 += r1[k] * r1[k];
          sumY2 += r2[k] * r2[k];
        }
        
        const num = minLen * sumXY - sumX * sumY;
        const den = Math.sqrt((minLen * sumX2 - sumX * sumX) * (minLen * sumY2 - sumY * sumY));
        const corr = den !== 0 ? num / den : 0;
        
        correlationMatrix[i][j] = corr;
        correlationMatrix[j][i] = corr;
      }
    }

    const avgVol = Math.sqrt(portfolioReturns.reduce((s, r) => s + r * r, 0) / portfolioReturns.length);
    const weightedVols = strategies.reduce((sum, s, i) => {
      const vol = Math.sqrt(s.returns.reduce((sv, r) => sv + r * r, 0) / s.returns.length);
      return sum + vol * normalizedWeights[i];
    }, 0);
    const diversificationRatio = avgVol > 0 ? weightedVols / avgVol : 1;

    setPortfolioMetrics({
      combinedEquity,
      totalReturn: ((combinedEquity[combinedEquity.length - 1] - 100000) / 100000) * 100,
      sharpeRatio: metrics.sharpeRatio,
      maxDrawdown: metrics.maxDrawdownPercent,
      diversificationRatio,
      correlationMatrix
    });
  }

  function updateAllocation(id: string, value: number) {
    setStrategies(prev => prev.map(s => 
      s.id === id ? { ...s, allocation: value } : s
    ));
  }

  function removeStrategy(id: string) {
    setStrategies(prev => prev.filter(s => s.id !== id));
  }

  function runCorrelationAnalysis() {
    if (strategies.length < 2) {
      toast({ title: 'Need more strategies', description: 'Add at least 2 strategies for correlation analysis', variant: 'destructive' });
      return;
    }

    setCorrelationRunning(true);

    const worker = new Worker(
      new URL('../workers/correlation.worker.ts', import.meta.url),
      { type: 'module' }
    );
    correlationWorkerRef.current = worker;

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'complete') {
        toast({ 
          title: 'Correlation Analysis Complete', 
          description: `Diversification Score: ${(msg.results.diversificationScore * 100).toFixed(1)}%` 
        });
        setCorrelationRunning(false);
        worker.terminate();
      } else if (msg.type === 'error') {
        toast({ title: 'Error', description: msg.error, variant: 'destructive' });
        setCorrelationRunning(false);
        worker.terminate();
      }
    };

    worker.postMessage({
      type: 'analyze',
      runId: 'corr-' + Date.now(),
      series: strategies.map(s => ({
        id: s.id,
        name: s.name,
        type: 'strategy',
        returns: s.returns
      })),
      windowSize: 30
    });
  }

  const portfolioTotals = getTotalPortfolioValue();

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-6">
        <Briefcase className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Build Your Portfolio</h3>
      <p className="text-muted-foreground max-w-md mb-6">
        Add backtest results to analyze correlations, optimize allocations, and build a diversified portfolio.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        {loadingResults ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : availableResults.length > 0 ? (
          <Select onValueChange={(v) => {
            const result = availableResults.find(r => r.id === v);
            if (result) addStrategyFromResult(result);
          }}>
            <SelectTrigger className="w-[240px]">
              <Plus className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Add from Results" />
            </SelectTrigger>
            <SelectContent>
              {availableResults.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Button variant="outline" onClick={loadResultsFromSupabase} disabled={loadingResults}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Load Results
          </Button>
        )}
        <Button variant="ghost" onClick={() => navigate('/workflow?tab=data')}>
          Browse Public Library
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageTitle 
          title="Portfolio Builder" 
          subtitle="Multi-currency portfolio with FX conversion"
        />
        
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'multi-currency' | 'composer')} className="w-auto">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="multi-currency" className="gap-2">
              <Globe className="h-4 w-4" />
              Multi-Currency
            </TabsTrigger>
            <TabsTrigger value="composer" className="gap-2">
              <Layers className="h-4 w-4" />
              Composer
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {viewMode === 'composer' ? (
        <PortfolioComposer />
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            <Select value={displayCurrency} onValueChange={(v) => setDisplayCurrency(v as CurrencyCode)}>
              <SelectTrigger className="w-[140px]">
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map(c => (
                  <SelectItem key={c} value={c}>
                    {CURRENCY_SYMBOLS[c]} {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setShowFxPanel(!showFxPanel)} className="gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              FX Rates
            </Button>
            <div className="w-[280px]">
              <UniversalAssetSelector
                assetType="result"
                value={null}
                onSelect={handleAssetSelect}
                placeholder="Add from Library..."
              />
            </div>
            <Button onClick={runCorrelationAnalysis} disabled={correlationRunning || strategies.length < 2} className="gap-2">
              {correlationRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Analyze
            </Button>
          </div>

          {showFxPanel && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Exchange Rates (vs {displayCurrency})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-10 gap-2">
                  {SUPPORTED_CURRENCIES.filter(c => c !== displayCurrency).map(c => (
                    <div key={c} className="p-2 rounded-lg bg-muted/30 text-center">
                      <div className="text-xs text-muted-foreground">{c}</div>
                      <div className="font-mono text-sm">{getExchangeRate(c, displayCurrency).toFixed(4)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {strategies.length > 0 && Object.keys(portfolioTotals.fxExposure).length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Currency Exposure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 flex-wrap">
                  {Object.entries(portfolioTotals.fxExposure).map(([currency, weight]) => (
                    <div key={currency} className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {CURRENCY_SYMBOLS[currency as CurrencyCode]} {currency}
                      </Badge>
                      <div className="w-24">
                        <Progress value={weight} className="h-2" />
                      </div>
                      <span className="text-sm font-mono text-muted-foreground">{weight.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Value: </span>
                    <span className="font-mono font-bold">
                      {formatCurrency(portfolioTotals.value, displayCurrency, { compact: true })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total P&L: </span>
                    <span className={cn('font-mono font-bold', portfolioTotals.pnl >= 0 ? 'text-profit' : 'text-loss')}>
                      {formatCurrency(portfolioTotals.pnl, displayCurrency, { compact: true })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {strategies.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Allocation
                  </CardTitle>
                  <CardDescription>Adjust strategy weights</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {strategies.map(strategy => (
                        <div key={strategy.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{strategy.name}</span>
                              <Badge variant="secondary" className="text-xs font-mono">
                                {CURRENCY_SYMBOLS[strategy.baseCurrency]}{strategy.baseCurrency}
                              </Badge>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeStrategy(strategy.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Slider
                              value={[strategy.allocation]}
                              onValueChange={([v]) => updateAllocation(strategy.id, v)}
                              max={100}
                              step={1}
                              className="flex-1"
                            />
                            <span className="w-12 text-right font-mono text-sm">{strategy.allocation}%</span>
                          </div>
                          
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Sharpe: {strategy.sharpe.toFixed(2)}</span>
                            <span>MaxDD: {strategy.maxDD.toFixed(1)}%</span>
                            <span className={getConvertedPnl(strategy) >= 0 ? 'text-profit' : 'text-loss'}>
                              {formatCurrency(getConvertedPnl(strategy), displayCurrency, { compact: true })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Portfolio Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {portfolioMetrics ? (
                    <div className="space-y-4">
                      <StatCardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCardClean
                          label="Return"
                          value={`${portfolioMetrics.totalReturn >= 0 ? '+' : ''}${portfolioMetrics.totalReturn.toFixed(1)}%`}
                          variant={portfolioMetrics.totalReturn >= 0 ? 'success' : 'danger'}
                        />
                        <StatCardClean
                          label="Sharpe"
                          value={portfolioMetrics.sharpeRatio.toFixed(2)}
                          variant={portfolioMetrics.sharpeRatio > 1 ? 'success' : 'default'}
                        />
                        <StatCardClean
                          label="Max DD"
                          value={`-${portfolioMetrics.maxDrawdown.toFixed(1)}%`}
                          variant="danger"
                        />
                        <StatCardClean
                          label="Diversification"
                          value={`${portfolioMetrics.diversificationRatio.toFixed(2)}x`}
                          variant={portfolioMetrics.diversificationRatio > 1 ? 'success' : 'default'}
                        />
                      </StatCardGrid>
                      
                      <EquityChart 
                        data={portfolioMetrics.combinedEquity}
                        height={250}
                      />
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <span>Add strategies to see portfolio performance</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
