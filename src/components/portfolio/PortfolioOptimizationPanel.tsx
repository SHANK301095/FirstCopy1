/**
 * Portfolio Optimization Panel
 * Phase F: Mean-variance, HRP, Risk Parity optimization
 */

import { useState } from 'react';
import { 
  Target, Play, Loader2, TrendingUp, Shield, BarChart3,
  Scale, Percent, ArrowUpDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  optimizeMeanVariance,
  optimizeHRP,
  optimizeRiskParity,
  type OptimizationResult 
} from '@/lib/portfolioOptimization';

interface Strategy {
  id: string;
  name: string;
  returns: number[];
  expectedReturn?: number;
  volatility?: number;
}

interface PortfolioOptimizationPanelProps {
  strategies: Strategy[];
  onOptimizationComplete?: (result: OptimizationResult) => void;
  className?: string;
}

export function PortfolioOptimizationPanel({
  strategies,
  onOptimizationComplete,
  className
}: PortfolioOptimizationPanelProps) {
  const [method, setMethod] = useState<'mvo' | 'hrp' | 'riskParity'>('mvo');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [targetReturn, setTargetReturn] = useState<number>(10);
  const [maxWeight, setMaxWeight] = useState<number>(40);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  const runOptimization = async () => {
    if (strategies.length < 2) return;

    setIsOptimizing(true);
    setProgress(10);

    // Calculate returns matrix
    const minLen = Math.min(...strategies.map(s => s.returns.length));
    const returnsMatrix = strategies.map(s => s.returns.slice(0, minLen));

    await new Promise(r => setTimeout(r, 100));
    setProgress(30);

    let optimResult: OptimizationResult;

    try {
      switch (method) {
        case 'mvo':
          optimResult = optimizeMeanVariance(returnsMatrix, {
            targetReturn: targetReturn / 100,
            maxWeight: maxWeight / 100,
          });
          break;
        case 'hrp':
          setProgress(50);
          optimResult = optimizeHRP(returnsMatrix);
          break;
        case 'riskParity':
          setProgress(50);
          optimResult = optimizeRiskParity(returnsMatrix);
          break;
        default:
          throw new Error('Unknown method');
      }

      setProgress(90);
      await new Promise(r => setTimeout(r, 100));

      setResult(optimResult);
      onOptimizationComplete?.(optimResult);
    } catch (err) {
      console.error('Optimization failed:', err);
    }

    setProgress(100);
    setIsOptimizing(false);
  };

  const methodInfo = {
    mvo: {
      title: 'Mean-Variance (Markowitz)',
      description: 'Classic portfolio theory - maximize return for given risk',
      icon: TrendingUp,
    },
    hrp: {
      title: 'Hierarchical Risk Parity',
      description: 'Cluster-based allocation using correlation structure',
      icon: BarChart3,
    },
    riskParity: {
      title: 'Risk Parity',
      description: 'Equal risk contribution from each asset',
      icon: Scale,
    },
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Portfolio Optimization
        </CardTitle>
        <CardDescription>
          Find optimal weight allocation for your strategy portfolio
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Method Selection */}
        <Tabs value={method} onValueChange={(v) => setMethod(v as typeof method)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="mvo" className="text-xs">MVO</TabsTrigger>
            <TabsTrigger value="hrp" className="text-xs">HRP</TabsTrigger>
            <TabsTrigger value="riskParity" className="text-xs">Risk Parity</TabsTrigger>
          </TabsList>

          <TabsContent value={method} className="mt-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              {(() => {
                const Icon = methodInfo[method].icon;
                return <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />;
              })()}
              <div>
                <div className="font-medium text-sm">{methodInfo[method].title}</div>
                <div className="text-xs text-muted-foreground">
                  {methodInfo[method].description}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* MVO Parameters */}
        {method === 'mvo' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Target Return (Annual)
                </Label>
                <span className="text-sm font-mono">{targetReturn}%</span>
              </div>
              <Slider
                value={[targetReturn]}
                onValueChange={([v]) => setTargetReturn(v)}
                min={5}
                max={50}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Max Weight per Strategy
                </Label>
                <span className="text-sm font-mono">{maxWeight}%</span>
              </div>
              <Slider
                value={[maxWeight]}
                onValueChange={([v]) => setMaxWeight(v)}
                min={10}
                max={100}
                step={5}
              />
            </div>
          </div>
        )}

        {/* Progress */}
        {isOptimizing && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Optimizing portfolio weights...
            </p>
          </div>
        )}

        {/* Run Button */}
        <Button 
          onClick={runOptimization} 
          disabled={isOptimizing || strategies.length < 2}
          className="w-full"
        >
          {isOptimizing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Optimize Portfolio
            </>
          )}
        </Button>

        {strategies.length < 2 && (
          <p className="text-xs text-center text-muted-foreground">
            Add at least 2 strategies to run optimization
          </p>
        )}

        {/* Results */}
        {result && !isOptimizing && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-sm">Optimal Allocation</h4>
            
            <div className="space-y-2">
              {result.weights.map((weight, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-24 truncate text-sm">
                    {strategies[i]?.name || `Strategy ${i + 1}`}
                  </div>
                  <div className="flex-1">
                    <div 
                      className="h-4 bg-primary/80 rounded"
                      style={{ width: `${weight * 100}%` }}
                    />
                  </div>
                  <Badge variant="outline" className="min-w-[50px] justify-center">
                    {(weight * 100).toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>

            {/* Portfolio Metrics */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="text-center p-2 rounded bg-muted/50">
                <div className="text-lg font-bold text-primary">
                  {(result.expectedReturn * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">Exp. Return</div>
              </div>
              <div className="text-center p-2 rounded bg-muted/50">
                <div className="text-lg font-bold">
                  {(result.volatility * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">Volatility</div>
              </div>
              <div className="text-center p-2 rounded bg-muted/50">
                <div className="text-lg font-bold text-green-500">
                  {result.sharpeRatio.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">Sharpe</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
