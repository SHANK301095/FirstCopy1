/**
 * Portfolio Composer Component
 * Combines multiple strategy results into portfolio-level metrics
 */

import { useState, useMemo } from 'react';
import { 
  Briefcase, Plus, Trash2, PieChart, TrendingUp, 
  AlertTriangle, BarChart3, Percent 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CorrelationMatrix } from './CorrelationMatrix';
import { cn } from '@/lib/utils';

interface StrategyAllocation {
  id: string;
  name: string;
  weight: number;
  returns: number[];
  equity: number[];
  netProfit: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

interface PortfolioMetrics {
  combinedReturn: number;
  combinedSharpe: number;
  combinedDrawdown: number;
  diversificationBenefit: number;
  riskContributions: { name: string; contribution: number }[];
}

interface PortfolioComposerProps {
  availableStrategies?: StrategyAllocation[];
  className?: string;
}

export function PortfolioComposer({ availableStrategies = [], className }: PortfolioComposerProps) {
  const [allocations, setAllocations] = useState<StrategyAllocation[]>([]);
  const [portfolioName, setPortfolioName] = useState('My Portfolio');

  // Deterministic demo data if no strategies available — clearly labeled as sample
  const demoStrategies: StrategyAllocation[] = useMemo(() => [
    {
      id: '1',
      name: 'EMA Crossover (Sample)',
      weight: 40,
      returns: Array.from({ length: 100 }, (_, i) => ((i * 37 + 11) % 100 - 48) * 0.02),
      equity: Array.from({ length: 100 }, (_, i) => 100000 + i * 500 + ((i * 31) % 50) * 40),
      netProfit: 45000,
      sharpeRatio: 1.8,
      maxDrawdown: 12,
    },
    {
      id: '2',
      name: 'RSI Mean Reversion (Sample)',
      weight: 30,
      returns: Array.from({ length: 100 }, (_, i) => ((i * 23 + 7) % 100 - 45) * 0.015),
      equity: Array.from({ length: 100 }, (_, i) => 100000 + i * 300 + ((i * 17) % 50) * 30),
      netProfit: 32000,
      sharpeRatio: 1.5,
      maxDrawdown: 15,
    },
    {
      id: '3',
      name: 'Breakout Momentum (Sample)',
      weight: 30,
      returns: Array.from({ length: 100 }, (_, i) => ((i * 41 + 3) % 100 - 50) * 0.03),
      equity: Array.from({ length: 100 }, (_, i) => 100000 + i * 400 + ((i * 43) % 50) * 60),
      netProfit: 28000,
      sharpeRatio: 1.2,
      maxDrawdown: 20,
    },
  ], []);

  const strategies = availableStrategies.length > 0 ? availableStrategies : demoStrategies;

  const addStrategy = (strategy: StrategyAllocation) => {
    if (allocations.find(a => a.id === strategy.id)) return;
    setAllocations([...allocations, { ...strategy, weight: 100 / (allocations.length + 1) }]);
    // Rebalance weights
    const newWeight = 100 / (allocations.length + 1);
    setAllocations(prev => prev.map(a => ({ ...a, weight: newWeight })));
  };

  const removeStrategy = (id: string) => {
    setAllocations(allocations.filter(a => a.id !== id));
  };

  const updateWeight = (id: string, weight: number) => {
    setAllocations(allocations.map(a => 
      a.id === id ? { ...a, weight } : a
    ));
  };

  const normalizeWeights = () => {
    const total = allocations.reduce((sum, a) => sum + a.weight, 0);
    if (total === 0) return;
    setAllocations(allocations.map(a => ({ ...a, weight: (a.weight / total) * 100 })));
  };

  const portfolioMetrics: PortfolioMetrics | null = useMemo(() => {
    if (allocations.length === 0) return null;

    const totalWeight = allocations.reduce((sum, a) => sum + a.weight, 0);
    
    // Weighted metrics
    const combinedReturn = allocations.reduce((sum, a) => 
      sum + (a.netProfit * a.weight / totalWeight), 0
    );
    
    const combinedSharpe = allocations.reduce((sum, a) => 
      sum + (a.sharpeRatio * a.weight / totalWeight), 0
    );

    // Portfolio max drawdown (simplified - assumes some correlation reduction)
    const avgDrawdown = allocations.reduce((sum, a) => 
      sum + (a.maxDrawdown * a.weight / totalWeight), 0
    );
    const diversificationFactor = 0.7 + (0.3 / allocations.length); // More strategies = more diversification
    const combinedDrawdown = avgDrawdown * diversificationFactor;

    const diversificationBenefit = ((avgDrawdown - combinedDrawdown) / avgDrawdown) * 100;

    const riskContributions = allocations.map(a => ({
      name: a.name,
      contribution: (a.maxDrawdown * a.weight / totalWeight) / avgDrawdown * 100
    }));

    return {
      combinedReturn,
      combinedSharpe,
      combinedDrawdown,
      diversificationBenefit,
      riskContributions
    };
  }, [allocations]);

  const totalWeight = allocations.reduce((sum, a) => sum + a.weight, 0);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <div>
            <Input 
              value={portfolioName}
              onChange={(e) => setPortfolioName(e.target.value)}
              className="text-xl font-bold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
            />
            <p className="text-sm text-muted-foreground">{allocations.length} strategies allocated</p>
          </div>
        </div>
        <Button variant="outline" onClick={normalizeWeights} disabled={allocations.length === 0}>
          <Percent className="h-4 w-4 mr-2" />
          Normalize to 100%
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Available Strategies */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Available Strategies</CardTitle>
            <CardDescription>Click to add to portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {strategies.map(strategy => {
                  const isAdded = allocations.find(a => a.id === strategy.id);
                  return (
                    <div 
                      key={strategy.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50",
                        isAdded ? "bg-primary/10 border-primary/30" : "hover:bg-muted/50"
                      )}
                      onClick={() => !isAdded && addStrategy(strategy)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{strategy.name}</span>
                        {isAdded ? (
                          <Badge variant="outline" className="text-primary">Added</Badge>
                        ) : (
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Sharpe: {strategy.sharpeRatio.toFixed(2)}</span>
                        <span>DD: {strategy.maxDrawdown.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Allocations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Allocations</span>
              <Badge variant={Math.abs(totalWeight - 100) < 0.1 ? "default" : "warning"}>
                {totalWeight.toFixed(1)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allocations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <PieChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Add strategies from the left panel</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {allocations.map(allocation => (
                    <div key={allocation.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{allocation.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono w-12 text-right">
                            {allocation.weight.toFixed(1)}%
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => removeStrategy(allocation.id)}
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <Slider
                        value={[allocation.weight]}
                        onValueChange={([v]) => updateWeight(allocation.id, v)}
                        min={0}
                        max={100}
                        step={1}
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Portfolio Metrics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Portfolio Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            {portfolioMetrics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Combined Return</div>
                    <div className={cn(
                      "text-lg font-mono font-bold",
                      portfolioMetrics.combinedReturn >= 0 ? "text-profit" : "text-loss"
                    )}>
                      ₹{portfolioMetrics.combinedReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Portfolio Sharpe</div>
                    <div className="text-lg font-mono font-bold">
                      {portfolioMetrics.combinedSharpe.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Est. Max DD</div>
                    <div className="text-lg font-mono font-bold text-warning">
                      {portfolioMetrics.combinedDrawdown.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-success/10 border border-success/30">
                    <div className="text-xs text-muted-foreground">Diversification</div>
                    <div className="text-lg font-mono font-bold text-success">
                      +{portfolioMetrics.diversificationBenefit.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <Label className="text-xs text-muted-foreground">Risk Contributions</Label>
                  <div className="mt-2 space-y-2">
                    {portfolioMetrics.riskContributions.map(rc => (
                      <div key={rc.name} className="flex items-center gap-2">
                        <div 
                          className="h-2 rounded bg-primary/60" 
                          style={{ width: `${rc.contribution}%` }}
                        />
                        <span className="text-xs text-muted-foreground flex-1">{rc.name}</span>
                        <span className="text-xs font-mono">{rc.contribution.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Add strategies to see metrics</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Correlation Matrix */}
      {allocations.length >= 2 && (
        <CorrelationMatrix strategies={allocations} />
      )}
    </div>
  );
}

export default PortfolioComposer;
