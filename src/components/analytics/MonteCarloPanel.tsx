/**
 * Monte Carlo Panel
 * Connects to real backtest trade results for confidence intervals
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Shuffle, Play, TrendingDown, Target, AlertTriangle, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MonteCarloFanChart, DrawdownDistribution } from './MonteCarloCharts';
import { Trade } from '@/lib/backtestStore';
import { cn } from '@/lib/utils';
import { secureLogger } from '@/lib/secureLogger';

interface MonteCarloResults {
  percentileCurves: {
    p5: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p95: number[];
  };
  maxDrawdownDistribution: number[];
  ruinProbability: number;
  ruinCount: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  mean: number;
  stdDev: number;
  avgMaxDrawdown: number;
  maxDrawdownP5: number;
  maxDrawdownP50: number;
  maxDrawdownP95: number;
  finalEquityDistribution: number[];
}

interface MonteCarloAnalysisProps {
  trades: Trade[];
  initialCapital: number;
  className?: string;
}

export function MonteCarloPanel({ trades, initialCapital, className }: MonteCarloAnalysisProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<MonteCarloResults | null>(null);
  const [iterations, setIterations] = useState(1000);
  const [ruinThreshold, setRuinThreshold] = useState(50); // 50% loss = ruin
  const workerRef = useRef<Worker | null>(null);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const runSimulation = useCallback(() => {
    if (trades.length === 0) return;

    // Terminate existing worker
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    setIsRunning(true);
    setProgress(0);
    setResults(null);

    // Create worker
    const worker = new Worker(
      new URL('../../workers/montecarlo.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const data = e.data;
      
      if (data.type === 'progress') {
        setProgress(data.pct);
      } else if (data.type === 'complete') {
        setResults(data.results);
        setIsRunning(false);
        setProgress(100);
      } else if (data.type === 'error') {
        secureLogger.error('backtest', 'Monte Carlo simulation error', { error: data.error });
        setIsRunning(false);
      }
    };

    // Convert trades to worker format
    const tradeInputs = trades.map(t => ({
      pnl: t.pnl,
      pnlPct: t.pnlPercent
    }));

    worker.postMessage({
      type: 'run',
      runId: `mc-${Date.now()}`,
      trades: tradeInputs,
      iterations,
      initialCapital,
      ruinThreshold: ruinThreshold / 100
    });
  }, [trades, iterations, initialCapital, ruinThreshold]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1e7) return `₹${(value / 1e7).toFixed(2)}Cr`;
    if (Math.abs(value) >= 1e5) return `₹${(value / 1e5).toFixed(2)}L`;
    if (Math.abs(value) >= 1e3) return `₹${(value / 1e3).toFixed(1)}K`;
    return `₹${value.toFixed(0)}`;
  };

  if (trades.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <Shuffle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No trades available for Monte Carlo simulation</p>
            <p className="text-sm mt-1">Run a backtest first to generate trade data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shuffle className="h-5 w-5 text-primary" />
                Monte Carlo Simulation
              </CardTitle>
              <CardDescription>
                Shuffle {trades.length} trades across {iterations.toLocaleString()} iterations to estimate confidence intervals
              </CardDescription>
            </div>
            <Button 
              onClick={runSimulation} 
              disabled={isRunning}
              variant="default"
            >
              {isRunning ? (
                <>
                  <Shuffle className="h-4 w-4 mr-2 animate-spin" />
                  Simulating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Simulation
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Iterations</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[iterations]}
                  onValueChange={([v]) => setIterations(v)}
                  min={100}
                  max={10000}
                  step={100}
                  disabled={isRunning}
                  className="flex-1"
                />
                <Input 
                  type="number" 
                  value={iterations} 
                  onChange={(e) => setIterations(Number(e.target.value))}
                  className="w-24"
                  disabled={isRunning}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Initial Capital</Label>
              <div className="text-2xl font-mono font-semibold text-primary">
                {formatCurrency(initialCapital)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ruin Threshold</Label>
                <Badge variant="destructive">{ruinThreshold}% loss</Badge>
              </div>
              <Slider
                value={[ruinThreshold]}
                onValueChange={([v]) => setRuinThreshold(v)}
                min={20}
                max={80}
                step={5}
                disabled={isRunning}
              />
            </div>
          </div>

          {/* Progress */}
          {isRunning && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Running simulations...</span>
                <span className="font-mono text-primary">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <>
          {/* Summary Stats */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Median Final Equity</span>
              </div>
              <div className="text-2xl font-bold font-mono">
                {formatCurrency(results.p50)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Range: {formatCurrency(results.p5)} - {formatCurrency(results.p95)}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={cn(
                  "h-4 w-4",
                  results.ruinProbability < 5 ? "text-success" : 
                  results.ruinProbability < 20 ? "text-warning" : "text-destructive"
                )} />
                <span className="text-sm text-muted-foreground">Ruin Probability</span>
              </div>
              <div className={cn(
                "text-2xl font-bold font-mono",
                results.ruinProbability < 5 ? "text-success" : 
                results.ruinProbability < 20 ? "text-warning" : "text-destructive"
              )}>
                {results.ruinProbability.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {results.ruinCount} of {iterations} runs hit ruin
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <span className="text-sm text-muted-foreground">Expected Max DD</span>
              </div>
              <div className="text-2xl font-bold font-mono text-destructive">
                -{results.avgMaxDrawdown.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                95th: -{results.maxDrawdownP95.toFixed(1)}%
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Profit Confidence</span>
              </div>
              <div className={cn(
                "text-2xl font-bold font-mono",
                results.p25 > initialCapital ? "text-success" : "text-warning"
              )}>
                {((1 - (iterations - results.ruinCount) / iterations * (results.p50 > initialCapital ? 1 : 0)) * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Chance of profit at p50
              </div>
            </Card>
          </div>

          {/* Confidence Intervals Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Final Equity Confidence Intervals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
                {[
                  { label: '5th Percentile', value: results.p5, color: 'text-destructive' },
                  { label: '25th Percentile', value: results.p25, color: 'text-warning' },
                  { label: '50th (Median)', value: results.p50, color: 'text-primary' },
                  { label: '75th Percentile', value: results.p75, color: 'text-success' },
                  { label: '95th Percentile', value: results.p95, color: 'text-success' },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                    <div className={cn("text-lg font-mono font-semibold", item.color)}>
                      {formatCurrency(item.value)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.value >= initialCapital ? '+' : ''}{((item.value - initialCapital) / initialCapital * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <MonteCarloFanChart
              simulations={[]}
              percentiles={results.percentileCurves}
              initialCapital={initialCapital}
            />
            <DrawdownDistribution
              drawdowns={Array.from({ length: 50 }, (_, i) => {
                const binWidth = results.maxDrawdownP95 / 50;
                return binWidth * i + binWidth / 2;
              }).filter((_, i) => results.maxDrawdownDistribution[i] > 0)}
            />
          </div>

          {/* Interpretation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interpretation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className={cn(
                  "w-2 h-2 rounded-full mt-1.5",
                  results.ruinProbability < 5 ? "bg-success" : 
                  results.ruinProbability < 20 ? "bg-warning" : "bg-destructive"
                )} />
                <div>
                  <p className="font-medium">Risk of Ruin</p>
                  <p className="text-sm text-muted-foreground">
                    {results.ruinProbability < 5 
                      ? `Low risk - only ${results.ruinProbability.toFixed(1)}% chance of losing ${ruinThreshold}% of capital`
                      : results.ruinProbability < 20
                      ? `Moderate risk - ${results.ruinProbability.toFixed(1)}% chance of significant loss. Consider reducing position sizes.`
                      : `High risk - ${results.ruinProbability.toFixed(1)}% ruin probability is concerning. Strategy needs adjustment.`
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className={cn(
                  "w-2 h-2 rounded-full mt-1.5",
                  results.p25 > initialCapital ? "bg-success" : "bg-warning"
                )} />
                <div>
                  <p className="font-medium">Profit Confidence</p>
                  <p className="text-sm text-muted-foreground">
                    {results.p25 > initialCapital 
                      ? `Strong confidence - 75% of simulations ended with profit. Expected median return: ${((results.p50 - initialCapital) / initialCapital * 100).toFixed(1)}%`
                      : `Moderate confidence - median outcome is ${results.p50 >= initialCapital ? 'profitable' : 'a loss'}. Wide variance suggests inconsistent strategy.`
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className="w-2 h-2 rounded-full mt-1.5 bg-primary" />
                <div>
                  <p className="font-medium">Expected Drawdown</p>
                  <p className="text-sm text-muted-foreground">
                    Average maximum drawdown across simulations is {results.avgMaxDrawdown.toFixed(1)}%. 
                    In worst 5% of cases, expect up to {results.maxDrawdownP95.toFixed(1)}% drawdown.
                    {results.maxDrawdownP95 > 30 && " Consider position sizing adjustments."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
