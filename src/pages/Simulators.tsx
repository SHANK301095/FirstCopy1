/**
 * Simulators Page
 * Monte Carlo, Equity Curve, What-If Analysis - all local
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  Shuffle, 
  Activity,
  Play,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============= Monte Carlo Simulation =============
function MonteCarloSimulator() {
  const [initialCapital, setInitialCapital] = useState(100000);
  const [numTrades, setNumTrades] = useState(100);
  const [winRate, setWinRate] = useState(55);
  const [avgWin, setAvgWin] = useState(2);
  const [avgLoss, setAvgLoss] = useState(1);
  const [numSimulations, setNumSimulations] = useState(1000);
  const [results, setResults] = useState<number[][] | null>(null);
  const [stats, setStats] = useState<{
    median: number;
    p5: number;
    p95: number;
    maxDrawdown: number;
    ror: number;
  } | null>(null);

  const runSimulation = () => {
    const simulations: number[][] = [];
    const finalValues: number[] = [];
    const maxDrawdowns: number[] = [];
    let ruinCount = 0;

    for (let sim = 0; sim < numSimulations; sim++) {
      let equity = initialCapital;
      let peak = equity;
      let maxDD = 0;
      const curve: number[] = [equity];

      // Seeded RNG per simulation for reproducibility
      let seed = (sim + 1) * 2654435761;
      const seededRng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      for (let t = 0; t < numTrades; t++) {
        const isWin = seededRng() * 100 < winRate;
        const pnl = isWin ? (equity * avgWin / 100) : -(equity * avgLoss / 100);
        equity += pnl;
        
        if (equity <= 0) {
          equity = 0;
          ruinCount++;
          break;
        }
        
        peak = Math.max(peak, equity);
        const dd = (peak - equity) / peak;
        maxDD = Math.max(maxDD, dd);
        
        curve.push(equity);
      }

      simulations.push(curve);
      finalValues.push(equity);
      maxDrawdowns.push(maxDD);
    }

    // Sort final values for percentiles
    finalValues.sort((a, b) => a - b);
    const p5 = finalValues[Math.floor(numSimulations * 0.05)];
    const p95 = finalValues[Math.floor(numSimulations * 0.95)];
    const median = finalValues[Math.floor(numSimulations * 0.5)];
    const avgMaxDD = maxDrawdowns.reduce((a, b) => a + b, 0) / numSimulations;

    // Sample 100 curves for display
    const sampledCurves = simulations
      .filter((_, i) => i % Math.ceil(numSimulations / 100) === 0)
      .slice(0, 50);

    setResults(sampledCurves);
    setStats({
      median,
      p5,
      p95,
      maxDrawdown: avgMaxDD * 100,
      ror: (ruinCount / numSimulations) * 100
    });
  };

  const chartData = useMemo(() => {
    if (!results) return [];
    const maxLen = Math.max(...results.map(r => r.length));
    return Array.from({ length: maxLen }, (_, i) => {
      const point: Record<string, number> = { trade: i };
      results.forEach((curve, idx) => {
        if (curve[i] !== undefined) {
          point[`sim${idx}`] = curve[i];
        }
      });
      return point;
    });
  }, [results]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div>
          <Label>Initial Capital</Label>
          <Input
            type="number"
            value={initialCapital}
            onChange={(e) => setInitialCapital(Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Number of Trades</Label>
          <Input
            type="number"
            value={numTrades}
            onChange={(e) => setNumTrades(Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Win Rate (%)</Label>
          <Input
            type="number"
            value={winRate}
            onChange={(e) => setWinRate(Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Avg Win (%)</Label>
          <Input
            type="number"
            step="0.1"
            value={avgWin}
            onChange={(e) => setAvgWin(Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Avg Loss (%)</Label>
          <Input
            type="number"
            step="0.1"
            value={avgLoss}
            onChange={(e) => setAvgLoss(Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Simulations</Label>
          <Input
            type="number"
            value={numSimulations}
            onChange={(e) => setNumSimulations(Number(e.target.value))}
          />
        </div>
      </div>

      <Button onClick={runSimulation} className="gap-2">
        <Play className="h-4 w-4" />
        Run Simulation
      </Button>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">₹{stats.median.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="text-sm text-muted-foreground">Median Outcome</div>
            </CardContent>
          </Card>
          <Card className="bg-profit/10 border-profit/20">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-profit">₹{stats.p95.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="text-sm text-muted-foreground">95th Percentile</div>
            </CardContent>
          </Card>
          <Card className="bg-loss/10 border-loss/20">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-loss">₹{stats.p5.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="text-sm text-muted-foreground">5th Percentile</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.maxDrawdown.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Avg Max Drawdown</div>
            </CardContent>
          </Card>
          <Card className={stats.ror > 5 ? "bg-loss/10 border-loss/20" : ""}>
            <CardContent className="pt-4">
              <div className={cn("text-2xl font-bold", stats.ror > 5 && "text-loss")}>{stats.ror.toFixed(2)}%</div>
              <div className="text-sm text-muted-foreground">Risk of Ruin</div>
            </CardContent>
          </Card>
        </div>
      )}

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Equity Curves (Sample)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="trade" tick={{ fontSize: 12 }} />
                  <YAxis 
                    tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, '']}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  {results?.slice(0, 50).map((_, i) => (
                    <Line
                      key={i}
                      type="monotone"
                      dataKey={`sim${i}`}
                      stroke={`hsl(${(i * 7) % 360}, 70%, 50%)`}
                      strokeWidth={1}
                      dot={false}
                      opacity={0.4}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============= What-If Analysis =============
function WhatIfAnalysis() {
  const [baseTrades, setBaseTrades] = useState(100);
  const [baseWinRate, setBaseWinRate] = useState(55);
  const [baseAvgWin, setBaseAvgWin] = useState(150);
  const [baseAvgLoss, setBaseAvgLoss] = useState(100);
  const [modifiedWinRate, setModifiedWinRate] = useState(60);
  
  const baseResult = useMemo(() => {
    const wins = baseTrades * (baseWinRate / 100);
    const losses = baseTrades - wins;
    return (wins * baseAvgWin) - (losses * baseAvgLoss);
  }, [baseTrades, baseWinRate, baseAvgWin, baseAvgLoss]);

  const modifiedResult = useMemo(() => {
    const wins = baseTrades * (modifiedWinRate / 100);
    const losses = baseTrades - wins;
    return (wins * baseAvgWin) - (losses * baseAvgLoss);
  }, [baseTrades, modifiedWinRate, baseAvgWin, baseAvgLoss]);

  const difference = modifiedResult - baseResult;
  const pctChange = baseResult !== 0 ? ((difference / Math.abs(baseResult)) * 100) : 0;

  // Generate comparison data
  const comparisonData = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => {
      const wr = 40 + i * 2;
      const wins = baseTrades * (wr / 100);
      const losses = baseTrades - wins;
      const pnl = (wins * baseAvgWin) - (losses * baseAvgLoss);
      return { winRate: wr, pnl };
    });
  }, [baseTrades, baseAvgWin, baseAvgLoss]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <Label>Total Trades</Label>
          <Input
            type="number"
            value={baseTrades}
            onChange={(e) => setBaseTrades(Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Current Win Rate (%)</Label>
          <Input
            type="number"
            value={baseWinRate}
            onChange={(e) => setBaseWinRate(Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Avg Win (₹)</Label>
          <Input
            type="number"
            value={baseAvgWin}
            onChange={(e) => setBaseAvgWin(Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Avg Loss (₹)</Label>
          <Input
            type="number"
            value={baseAvgLoss}
            onChange={(e) => setBaseAvgLoss(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-4">
        <Label>What if win rate was: {modifiedWinRate}%</Label>
        <Slider
          value={[modifiedWinRate]}
          onValueChange={([v]) => setModifiedWinRate(v)}
          min={20}
          max={80}
          step={1}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground mb-1">Current Result</div>
            <div className={cn("text-2xl font-bold", baseResult >= 0 ? "text-profit" : "text-loss")}>
              ₹{baseResult.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">at {baseWinRate}% win rate</div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground mb-1">Modified Result</div>
            <div className={cn("text-2xl font-bold", modifiedResult >= 0 ? "text-profit" : "text-loss")}>
              ₹{modifiedResult.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">at {modifiedWinRate}% win rate</div>
          </CardContent>
        </Card>
        <Card className={difference >= 0 ? "bg-profit/10 border-profit/20" : "bg-loss/10 border-loss/20"}>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground mb-1">Difference</div>
            <div className={cn("text-2xl font-bold", difference >= 0 ? "text-profit" : "text-loss")}>
              {difference >= 0 ? '+' : ''}₹{difference.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">PnL vs Win Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="winRate" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis 
                  tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'PnL']}
                  labelFormatter={(label) => `Win Rate: ${label}%`}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <defs>
                  <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--profit))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--profit))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="pnl"
                  stroke="hsl(var(--profit))"
                  fill="url(#pnlGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============= Equity Curve Simulator =============
function EquityCurveSimulator() {
  const [capital, setCapital] = useState(100000);
  const [monthlyReturn, setMonthlyReturn] = useState(3);
  const [volatility, setVolatility] = useState(5);
  const [months, setMonths] = useState(24);
  const [curve, setCurve] = useState<Array<{ month: number; equity: number; drawdown: number }>>([]);

  const simulate = () => {
    const data: Array<{ month: number; equity: number; drawdown: number }> = [];
    let equity = capital;
    let peak = equity;

    for (let m = 0; m <= months; m++) {
      if (m > 0) {
        // Deterministic return based on month index (sin wave pattern)
        const deterministicNoise = Math.sin(m * 1.618) * 2; // Consistent across runs
        const monthReturn = monthlyReturn + (deterministicNoise * volatility / 5);
        equity = equity * (1 + monthReturn / 100);
      }

      peak = Math.max(peak, equity);
      const dd = ((peak - equity) / peak) * 100;

      data.push({
        month: m,
        equity: Math.round(equity),
        drawdown: dd
      });
    }

    setCurve(data);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <Label>Starting Capital</Label>
          <Input
            type="number"
            value={capital}
            onChange={(e) => setCapital(Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Expected Monthly Return (%)</Label>
          <Input
            type="number"
            step="0.5"
            value={monthlyReturn}
            onChange={(e) => setMonthlyReturn(Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Volatility (%)</Label>
          <Input
            type="number"
            step="0.5"
            value={volatility}
            onChange={(e) => setVolatility(Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Months</Label>
          <Input
            type="number"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          />
        </div>
      </div>

      <Button onClick={simulate} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Generate Curve
      </Button>

      {curve.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">₹{curve[0].equity.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Starting</div>
              </CardContent>
            </Card>
            <Card className="bg-profit/10 border-profit/20">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-profit">₹{curve[curve.length - 1].equity.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Final Value</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">
                  {((curve[curve.length - 1].equity / capital - 1) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Total Return</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-loss">
                  {Math.max(...curve.map(c => c.drawdown)).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Max Drawdown</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Projected Equity Curve</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={curve}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `M${v}`}
                    />
                    <YAxis 
                      tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'equity' ? `₹${value.toLocaleString()}` : `${value.toFixed(1)}%`,
                        name === 'equity' ? 'Equity' : 'Drawdown'
                      ]}
                      labelFormatter={(label) => `Month ${label}`}
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <defs>
                      <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="equity"
                      stroke="hsl(var(--primary))"
                      fill="url(#equityGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ============= Main Component =============
export default function Simulators() {
  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2">
          <Activity className="h-7 w-7" />
          Trading Simulators
        </h1>
        <p className="text-muted-foreground">
          Monte Carlo, equity projections, and what-if analysis - all local
        </p>
      </div>

      <Tabs defaultValue="monte-carlo" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="monte-carlo" className="gap-1">
            <Shuffle className="h-4 w-4" />
            Monte Carlo
          </TabsTrigger>
          <TabsTrigger value="what-if" className="gap-1">
            <TrendingUp className="h-4 w-4" />
            What-If Analysis
          </TabsTrigger>
          <TabsTrigger value="equity" className="gap-1">
            <Activity className="h-4 w-4" />
            Equity Curve
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monte-carlo">
          <Card>
            <CardHeader>
              <CardTitle>Monte Carlo Simulation</CardTitle>
              <CardDescription>
                Simulate thousands of possible outcomes to understand your strategy's risk profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MonteCarloSimulator />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="what-if">
          <Card>
            <CardHeader>
              <CardTitle>What-If Analysis</CardTitle>
              <CardDescription>
                See how changes in win rate affect your overall performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WhatIfAnalysis />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equity">
          <Card>
            <CardHeader>
              <CardTitle>Equity Curve Simulator</CardTitle>
              <CardDescription>
                Project future equity growth with adjustable return and volatility
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EquityCurveSimulator />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
