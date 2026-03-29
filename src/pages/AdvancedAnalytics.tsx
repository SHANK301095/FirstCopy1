/**
 * Advanced Analytics Page
 * Phase 3: Monte Carlo, Regime Detection, Correlation, Risk Metrics, AI Suggestions
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Activity, TrendingUp, BarChart3, Brain, Shuffle, 
  AlertTriangle, Target, Layers, Play, Loader2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBacktestStore } from '@/lib/backtestStore';
import { calculateRiskMetrics, formatRiskMetric, type RiskMetrics } from '@/lib/riskMetrics';
import { generateSuggestions, getCategoryIcon, getSeverityClass, type AISuggestion } from '@/lib/aiSuggestions';
import { EquityChart } from '@/components/charts/EquityChart';
import { cn } from '@/lib/utils';
import { PageTitle } from '@/components/ui/PageTitle';


export default function AdvancedAnalytics() {
  const { results } = useBacktestStore();
  const [activeTab, setActiveTab] = useState('risk');
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  
  // Monte Carlo state
  const [mcIterations, setMcIterations] = useState(1000);
  const [mcRunning, setMcRunning] = useState(false);
  const [mcProgress, setMcProgress] = useState(0);
  const [mcResults, setMcResults] = useState<any>(null);
  const mcWorkerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (results?.trades && results.equityCurve) {
      // Calculate risk metrics
      const returns = results.trades.map(t => t.pnlPercent);
      const metrics = calculateRiskMetrics({
        returns,
        equity: results.equityCurve,
        initialCapital: 100000
      });
      setRiskMetrics(metrics);

      // Generate AI suggestions
      const sugg = generateSuggestions({
        metrics,
        tradeCount: results.totalTrades,
        netProfit: results.netProfit,
        initialCapital: 100000
      });
      setSuggestions(sugg);
    }
  }, [results]);

  const runMonteCarlo = () => {
    if (!results?.trades) return;
    
    setMcRunning(true);
    setMcProgress(0);
    
    const worker = new Worker(
      new URL('../workers/montecarlo.worker.ts', import.meta.url),
      { type: 'module' }
    );
    mcWorkerRef.current = worker;

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'progress') {
        setMcProgress(msg.pct);
      } else if (msg.type === 'complete') {
        setMcResults(msg.results);
        setMcRunning(false);
        worker.terminate();
      } else if (msg.type === 'error') {
        // Monte Carlo worker error - terminate
        setMcRunning(false);
        worker.terminate();
      }
    };

    worker.postMessage({
      type: 'run',
      runId: 'mc-' + Date.now(),
      trades: results.trades.map(t => ({ pnl: t.pnl, pnlPct: t.pnlPercent })),
      iterations: mcIterations,
      initialCapital: 100000,
      ruinThreshold: 0.5
    });
  };

  if (!results) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageTitle 
          title="Advanced Analytics" 
          subtitle="Monte Carlo, Risk Metrics, Regime Analysis & AI Insights"
        />
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Run a backtest first to see advanced analytics</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <PageTitle 
            title="Advanced Analytics" 
            subtitle="Phase 3: Risk Lab, Monte Carlo & AI Insights"
          />
          <Badge variant="outline" className="text-primary border-primary">
            {results.totalTrades} trades analyzed
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="risk" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risk Metrics
          </TabsTrigger>
          <TabsTrigger value="montecarlo" className="gap-2">
            <Shuffle className="h-4 w-4" />
            Monte Carlo
          </TabsTrigger>
          <TabsTrigger value="regime" className="gap-2">
            <Layers className="h-4 w-4" />
            Regimes
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Brain className="h-4 w-4" />
            AI Insights
          </TabsTrigger>
        </TabsList>

        {/* Risk Metrics Tab */}
        <TabsContent value="risk" className="space-y-4 mt-4">
          {riskMetrics && (
            <>
               <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="VaR (95%)" value={formatRiskMetric(riskMetrics.var95, 'percent')} icon={<Target />} />
                <MetricCard label="CVaR (95%)" value={formatRiskMetric(riskMetrics.cvar95, 'percent')} icon={<AlertTriangle />} />
                <MetricCard label="Sharpe Ratio" value={formatRiskMetric(riskMetrics.sharpeRatio, 'ratio')} icon={<TrendingUp />} good={riskMetrics.sharpeRatio > 1} />
                <MetricCard label="Sortino Ratio" value={formatRiskMetric(riskMetrics.sortinoRatio, 'ratio')} icon={<Activity />} good={riskMetrics.sortinoRatio > 1.5} />
              </div>
               <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Calmar Ratio" value={formatRiskMetric(riskMetrics.calmarRatio, 'ratio')} />
                <MetricCard label="Omega Ratio" value={formatRiskMetric(riskMetrics.omegaRatio, 'ratio')} good={riskMetrics.omegaRatio > 1.5} />
                <MetricCard label="Ulcer Index" value={formatRiskMetric(riskMetrics.ulcerIndex, 'number')} bad={riskMetrics.ulcerIndex > 10} />
                <MetricCard label="Kelly Fraction" value={formatRiskMetric(riskMetrics.kellyFraction * 100, 'percent')} />
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Skewness" value={formatRiskMetric(riskMetrics.skewness, 'ratio')} />
                <MetricCard label="Kurtosis" value={formatRiskMetric(riskMetrics.kurtosis, 'ratio')} />
                <MetricCard label="Tail Ratio" value={formatRiskMetric(riskMetrics.tailRatio, 'ratio')} />
                <MetricCard label="Recovery Factor" value={formatRiskMetric(riskMetrics.recoveryFactor, 'ratio')} good={riskMetrics.recoveryFactor > 3} />
              </div>
            </>
          )}
        </TabsContent>

        {/* Monte Carlo Tab */}
        <TabsContent value="montecarlo" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shuffle className="h-5 w-5" />
                Monte Carlo Simulation
              </CardTitle>
              <CardDescription>
                Shuffle trade order {mcIterations.toLocaleString()} times to estimate confidence intervals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label className="w-24">Iterations:</Label>
                <Slider
                  value={[mcIterations]}
                  onValueChange={([v]) => setMcIterations(v)}
                  min={100}
                  max={10000}
                  step={100}
                  className="flex-1"
                  disabled={mcRunning}
                />
                <span className="w-20 text-right font-mono">{mcIterations.toLocaleString()}</span>
              </div>
              
              <Button onClick={runMonteCarlo} disabled={mcRunning} className="gap-2">
                {mcRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {mcRunning ? `Running... ${mcProgress}%` : 'Run Simulation'}
              </Button>
              
              {mcRunning && <Progress value={mcProgress} />}
              
              {mcResults && (
                <div className="grid gap-4 md:grid-cols-3 mt-4">
                  <Card className="border-primary/30">
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Median Final Equity</div>
                      <div className="text-2xl font-mono font-bold text-primary">
                        ₹{mcResults.p50.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className={mcResults.ruinProbability > 5 ? 'border-destructive/50' : ''}>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Ruin Probability</div>
                      <div className={cn('text-2xl font-mono font-bold', mcResults.ruinProbability > 5 ? 'text-destructive' : 'text-profit')}>
                        {mcResults.ruinProbability.toFixed(2)}%
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">95% Confidence Range</div>
                      <div className="text-lg font-mono">
                        ₹{mcResults.p5.toLocaleString(undefined, { maximumFractionDigits: 0 })} - ₹{mcResults.p95.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regime Tab */}
        <TabsContent value="regime" className="space-y-4 mt-4">
          <Card>
            <CardContent className="py-8 text-center">
              <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Regime detection requires OHLC bar data</p>
              <p className="text-sm text-muted-foreground mt-2">Import data via the Data Manager to enable this feature</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="ai" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI-Powered Suggestions
              </CardTitle>
              <CardDescription>
                Rule-based analysis of your strategy performance (100% offline)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suggestions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No issues detected - your strategy looks solid!</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {suggestions.map((sugg) => (
                      <Card key={sugg.id} className={cn('border', getSeverityClass(sugg.severity))}>
                        <CardContent className="py-3">
                          <div className="flex items-start gap-3">
                            <span className="text-xl">{getCategoryIcon(sugg.category)}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">{sugg.title}</span>
                                <Badge variant="outline" className="text-xs">{sugg.impact} impact</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{sugg.description}</p>
                              <p className="text-sm"><strong>Recommendation:</strong> {sugg.recommendation}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ label, value, icon, good, bad }: { label: string; value: string; icon?: React.ReactNode; good?: boolean; bad?: boolean }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <div className={cn('text-2xl font-mono font-bold mt-1', good && 'text-profit', bad && 'text-loss')}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
