/**
 * Position Sizing Calculator
 * PRD Phase 5D: Kelly, Fixed Fractional, Optimal-f
 */

import { useState, useMemo } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  AlertTriangle, 
  Info,
  Target,
  Percent,
  DollarSign,
  BarChart3,
  Shield,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { cn } from '@/lib/utils';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { HoverCard, StaggerContainer } from '@/components/ui/micro-interactions';

interface SizingResult {
  method: string;
  optimalSize: number;
  recommendedRange: [number, number];
  riskOfRuin: number;
  expectedGrowth: number;
  maxDrawdownRisk: number;
  warning?: string;
}

export default function PositionSizing() {
  const [accountSize, setAccountSize] = useState(1000000);
  const [winRate, setWinRate] = useState(55);
  const [avgWin, setAvgWin] = useState(2500);
  const [avgLoss, setAvgLoss] = useState(1500);
  const [maxRisk, setMaxRisk] = useState(2);
  const [targetDD, setTargetDD] = useState(20);

  // Kelly Criterion calculation
  const kellyFraction = useMemo(() => {
    const p = winRate / 100;
    const q = 1 - p;
    const b = avgWin / avgLoss;
    const kelly = (p * b - q) / b;
    return Math.max(0, kelly);
  }, [winRate, avgWin, avgLoss]);

  // Half Kelly (more conservative)
  const halfKelly = kellyFraction / 2;

  // Fixed Fractional
  const fixedFractional = maxRisk / 100;

  // Optimal-f calculation (simplified)
  const optimalF = useMemo(() => {
    const p = winRate / 100;
    const b = avgWin / avgLoss;
    // Simplified optimal-f based on win rate and payoff ratio
    return Math.min(p - (1 - p) / b, 0.25);
  }, [winRate, avgWin, avgLoss]);

  // Risk of Ruin calculation (Monte Carlo simplified)
  const calculateRiskOfRuin = (fraction: number): number => {
    const p = winRate / 100;
    const q = 1 - p;
    if (fraction <= 0) return 0;
    if (fraction >= 1) return 100;
    // Simplified formula for risk of ruin
    const a = (q / p) ** (1 / fraction);
    return Math.min(100, Math.max(0, a * 100 * (1 - p)));
  };

  // Generate growth curve data
  const growthCurveData = useMemo(() => {
    const data = [];
    for (let f = 0.5; f <= 50; f += 0.5) {
      const fraction = f / 100;
      const p = winRate / 100;
      const b = avgWin / avgLoss;
      // Expected geometric growth rate
      const g = p * Math.log(1 + fraction * b) + (1 - p) * Math.log(1 - fraction);
      data.push({
        fraction: f,
        growth: Math.max(-50, g * 100),
        kelly: kellyFraction * 100,
      });
    }
    return data;
  }, [winRate, avgWin, avgLoss, kellyFraction]);

  const results: SizingResult[] = [
    {
      method: 'Kelly Criterion',
      optimalSize: kellyFraction * 100,
      recommendedRange: [halfKelly * 100, kellyFraction * 100],
      riskOfRuin: calculateRiskOfRuin(kellyFraction),
      expectedGrowth: kellyFraction * (winRate / 100) * (avgWin / avgLoss) * 100,
      maxDrawdownRisk: kellyFraction * 100 * 2.5,
      warning: kellyFraction > 0.25 ? 'Full Kelly is aggressive. Consider Half Kelly.' : undefined,
    },
    {
      method: 'Half Kelly',
      optimalSize: halfKelly * 100,
      recommendedRange: [halfKelly * 0.8 * 100, halfKelly * 1.2 * 100],
      riskOfRuin: calculateRiskOfRuin(halfKelly),
      expectedGrowth: halfKelly * (winRate / 100) * (avgWin / avgLoss) * 100,
      maxDrawdownRisk: halfKelly * 100 * 2.5,
    },
    {
      method: 'Fixed Fractional',
      optimalSize: fixedFractional * 100,
      recommendedRange: [fixedFractional * 0.5 * 100, fixedFractional * 100],
      riskOfRuin: calculateRiskOfRuin(fixedFractional),
      expectedGrowth: fixedFractional * (winRate / 100) * (avgWin / avgLoss) * 100,
      maxDrawdownRisk: fixedFractional * 100 * 2.5,
    },
    {
      method: 'Optimal-f',
      optimalSize: Math.max(0, optimalF * 100),
      recommendedRange: [Math.max(0, optimalF * 0.7 * 100), Math.max(0, optimalF * 100)],
      riskOfRuin: calculateRiskOfRuin(optimalF),
      expectedGrowth: Math.max(0, optimalF) * (winRate / 100) * (avgWin / avgLoss) * 100,
      maxDrawdownRisk: Math.max(0, optimalF) * 100 * 2.5,
      warning: optimalF > 0.2 ? 'Optimal-f can be volatile. Use with caution.' : undefined,
    },
  ];

  const positionSize = (fraction: number) => {
    return (accountSize * fraction / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          Position Sizing Calculator
        </h1>
        <p className="text-muted-foreground mt-1">Calculate optimal position sizes using Kelly, Fixed Fractional, and Optimal-f methods</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Input Parameters */}
        <Card variant="glass" className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Trade Statistics</CardTitle>
            <CardDescription>Enter your strategy performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Account Size</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={accountSize}
                  onChange={(e) => setAccountSize(Number(e.target.value))}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Win Rate</Label>
                <span className="text-sm font-mono text-primary">{winRate}%</span>
              </div>
              <Slider
                value={[winRate]}
                onValueChange={([v]) => setWinRate(v)}
                min={30}
                max={80}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Average Win (₹)</Label>
              <Input
                type="number"
                value={avgWin}
                onChange={(e) => setAvgWin(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Average Loss (₹)</Label>
              <Input
                type="number"
                value={avgLoss}
                onChange={(e) => setAvgLoss(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Max Risk Per Trade</Label>
                <span className="text-sm font-mono text-primary">{maxRisk}%</span>
              </div>
              <Slider
                value={[maxRisk]}
                onValueChange={([v]) => setMaxRisk(v)}
                min={0.5}
                max={5}
                step={0.1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Target Max Drawdown</Label>
                <span className="text-sm font-mono text-primary">{targetDD}%</span>
              </div>
              <Slider
                value={[targetDD]}
                onValueChange={([v]) => setTargetDD(v)}
                min={5}
                max={50}
                step={1}
              />
            </div>

            <div className="pt-4 border-t border-border/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Payoff Ratio (R:R)</span>
                <span className="font-mono font-semibold">{(avgWin / avgLoss).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Expectancy</span>
                <span className="font-mono font-semibold text-success">
                  ₹{((winRate / 100 * avgWin) - ((100 - winRate) / 100 * avgLoss)).toFixed(0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Method Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {results.map((result) => (
              <Card 
                key={result.method} 
                variant="stat"
                className={cn(
                  "relative overflow-hidden",
                  result.warning && "border-warning/30"
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{result.method}</h3>
                      <p className="text-xs text-muted-foreground">Optimal size</p>
                    </div>
                    {result.warning && (
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    )}
                  </div>

                  <div className="text-3xl font-bold font-mono text-primary mb-1">
                    {result.optimalSize.toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    ₹{positionSize(result.optimalSize)} per trade
                  </p>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Recommended Range</span>
                        <span className="font-mono">
                          {result.recommendedRange[0].toFixed(1)}% - {result.recommendedRange[1].toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={(result.optimalSize / 25) * 100} 
                        variant={result.optimalSize > 15 ? 'danger' : result.optimalSize > 8 ? 'warning' : 'success'}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-muted/30 rounded-lg p-2">
                        <span className="text-muted-foreground block">Risk of Ruin</span>
                        <span className={cn(
                          "font-mono font-semibold",
                          result.riskOfRuin > 5 ? "text-destructive" : "text-success"
                        )}>
                          {result.riskOfRuin.toFixed(1)}%
                        </span>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-2">
                        <span className="text-muted-foreground block">Expected Growth</span>
                        <span className="font-mono font-semibold text-success">
                          +{result.expectedGrowth.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {result.warning && (
                    <p className="text-xs text-warning mt-3">{result.warning}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Growth Curve Chart */}
          <Card variant="stat">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Expected Growth vs Position Size
              </CardTitle>
              <CardDescription>
                The curve shows how expected geometric growth rate changes with position size
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthCurveData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="fraction" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      label={{ value: 'Position Size (%)', position: 'bottom', offset: -5 }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      label={{ value: 'Growth Rate (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <ReferenceLine 
                      x={kellyFraction * 100} 
                      stroke="hsl(210 100% 55%)" 
                      strokeDasharray="5 5"
                      label={{ value: 'Kelly', fill: 'hsl(210 100% 55%)', fontSize: 12 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="growth" 
                      stroke="hsl(152 75% 48%)" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          <Alert variant="default" className="border-primary/30 bg-primary/5">
            <Shield className="h-4 w-4" />
            <AlertTitle>Important Considerations</AlertTitle>
            <AlertDescription className="mt-2 space-y-1 text-sm">
              <p>• Kelly Criterion assumes accurate win rate and payoff ratio estimates</p>
              <p>• Half Kelly is often recommended for real-world trading due to estimation errors</p>
              <p>• Never risk more than you can afford to lose</p>
              <p>• Past performance does not guarantee future results</p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}