/**
 * Financial Calculators Page
 * All trading calculators in one place - local only, no API calls
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  TrendingUp, 
  Target, 
  DollarSign, 
  Percent,
  AlertTriangle,
  BarChart3,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============= Position Size Calculator =============
function PositionSizeCalculator() {
  const [accountSize, setAccountSize] = useState(100000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [entryPrice, setEntryPrice] = useState(100);
  const [stopLoss, setStopLoss] = useState(95);
  const [method, setMethod] = useState<'fixed' | 'kelly'>('fixed');
  const [winRate, setWinRate] = useState(55);
  const [avgWinLoss, setAvgWinLoss] = useState(1.5);

  const riskAmount = accountSize * (riskPercent / 100);
  const stopLossPips = Math.abs(entryPrice - stopLoss);
  const positionSize = stopLossPips > 0 ? riskAmount / stopLossPips : 0;
  
  // Kelly Criterion
  const kellyFraction = winRate > 0 && avgWinLoss > 0 
    ? ((winRate / 100) * avgWinLoss - (1 - winRate / 100)) / avgWinLoss
    : 0;
  const kellyPositionSize = method === 'kelly' && kellyFraction > 0
    ? (accountSize * kellyFraction) / stopLossPips
    : positionSize;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label>Account Size</Label>
            <Input
              type="number"
              value={accountSize}
              onChange={(e) => setAccountSize(Number(e.target.value))}
            />
          </div>
          
          <div>
            <Label>Risk Per Trade (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={riskPercent}
              onChange={(e) => setRiskPercent(Number(e.target.value))}
            />
          </div>
          
          <div>
            <Label>Entry Price</Label>
            <Input
              type="number"
              step="0.01"
              value={entryPrice}
              onChange={(e) => setEntryPrice(Number(e.target.value))}
            />
          </div>
          
          <div>
            <Label>Stop Loss Price</Label>
            <Input
              type="number"
              step="0.01"
              value={stopLoss}
              onChange={(e) => setStopLoss(Number(e.target.value))}
            />
          </div>
          
          <div>
            <Label>Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as 'fixed' | 'kelly')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed Fractional</SelectItem>
                <SelectItem value="kelly">Kelly Criterion</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {method === 'kelly' && (
            <>
              <div>
                <Label>Win Rate (%)</Label>
                <Input
                  type="number"
                  value={winRate}
                  onChange={(e) => setWinRate(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Avg Win / Avg Loss Ratio</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={avgWinLoss}
                  onChange={(e) => setAvgWinLoss(Number(e.target.value))}
                />
              </div>
            </>
          )}
        </div>
        
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Risk Amount:</span>
              <span className="text-xl font-bold">₹{riskAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Stop Loss Distance:</span>
              <span className="text-xl font-bold">{stopLossPips.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Position Size (Units):</span>
              <span className="text-2xl font-bold text-primary">
                {(method === 'kelly' ? kellyPositionSize : positionSize).toFixed(2)}
              </span>
            </div>
            {method === 'kelly' && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Kelly Fraction:</span>
                <span className="text-lg font-semibold">{(kellyFraction * 100).toFixed(1)}%</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============= Compound Interest Calculator =============
function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const [compoundFreq, setCompoundFreq] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [monthlyContrib, setMonthlyContrib] = useState(5000);

  const n = compoundFreq === 'monthly' ? 12 : compoundFreq === 'quarterly' ? 4 : 1;
  const r = rate / 100;
  
  // Standard compound interest: A = P(1 + r/n)^(nt)
  const standardAmount = principal * Math.pow(1 + r / n, n * years);
  
  // With monthly contributions
  const futureValueContrib = monthlyContrib * ((Math.pow(1 + r / 12, 12 * years) - 1) / (r / 12));
  const totalWithContrib = standardAmount + futureValueContrib;
  
  const totalContributions = principal + (monthlyContrib * 12 * years);
  const totalInterest = totalWithContrib - totalContributions;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label>Initial Investment</Label>
            <Input
              type="number"
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
            />
          </div>
          
          <div>
            <Label>Annual Return Rate (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
            />
          </div>
          
          <div>
            <Label>Investment Period (Years)</Label>
            <Input
              type="number"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
            />
          </div>
          
          <div>
            <Label>Compounding Frequency</Label>
            <Select value={compoundFreq} onValueChange={(v) => setCompoundFreq(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Monthly Contribution</Label>
            <Input
              type="number"
              value={monthlyContrib}
              onChange={(e) => setMonthlyContrib(Number(e.target.value))}
            />
          </div>
        </div>
        
        <Card className="bg-profit/5 border-profit/20">
          <CardHeader>
            <CardTitle className="text-lg">Projections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Investment:</span>
              <span className="text-lg font-semibold">₹{totalContributions.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Interest Earned:</span>
              <span className="text-lg font-semibold text-profit">₹{totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-4">
              <span className="text-muted-foreground">Future Value:</span>
              <span className="text-2xl font-bold text-profit">₹{totalWithContrib.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Growth:</span>
              <span className="text-lg font-semibold">{((totalWithContrib / totalContributions - 1) * 100).toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============= Risk of Ruin Calculator =============
function RiskOfRuinCalculator() {
  const [winRate, setWinRate] = useState(55);
  const [riskPerTrade, setRiskPerTrade] = useState(2);
  const [avgWinLoss, setAvgWinLoss] = useState(1.5);
  const [maxDrawdown, setMaxDrawdown] = useState(25);

  // Simplified Risk of Ruin formula
  const p = winRate / 100;
  const q = 1 - p;
  const b = avgWinLoss;
  
  // Edge per trade
  const edge = (p * b) - q;
  
  // Number of units we can lose
  const unitsToRuin = maxDrawdown / riskPerTrade;
  
  // Approximate Risk of Ruin (simplified)
  let ror = 0;
  if (edge <= 0) {
    ror = 100;
  } else {
    // Using approximation: RoR ≈ ((1-edge)/(1+edge))^units
    const ratio = q / p;
    ror = Math.min(100, Math.pow(ratio, unitsToRuin) * 100);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label>Win Rate (%)</Label>
            <Input
              type="number"
              value={winRate}
              onChange={(e) => setWinRate(Number(e.target.value))}
            />
          </div>
          
          <div>
            <Label>Risk Per Trade (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={riskPerTrade}
              onChange={(e) => setRiskPerTrade(Number(e.target.value))}
            />
          </div>
          
          <div>
            <Label>Avg Win / Avg Loss Ratio</Label>
            <Input
              type="number"
              step="0.1"
              value={avgWinLoss}
              onChange={(e) => setAvgWinLoss(Number(e.target.value))}
            />
          </div>
          
          <div>
            <Label>Max Acceptable Drawdown (%)</Label>
            <Input
              type="number"
              value={maxDrawdown}
              onChange={(e) => setMaxDrawdown(Number(e.target.value))}
            />
          </div>
        </div>
        
        <Card className={cn(
          "border-2",
          ror < 5 ? "bg-profit/5 border-profit/30" : 
          ror < 20 ? "bg-warning/5 border-warning/30" : 
          "bg-loss/5 border-loss/30"
        )}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Edge Per Trade:</span>
              <span className={cn("text-lg font-semibold", edge > 0 ? "text-profit" : "text-loss")}>
                {(edge * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Trades to Ruin:</span>
              <span className="text-lg font-semibold">{unitsToRuin.toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-4">
              <span className="text-muted-foreground">Risk of Ruin:</span>
              <span className={cn(
                "text-2xl font-bold",
                ror < 5 ? "text-profit" : ror < 20 ? "text-warning" : "text-loss"
              )}>
                {ror.toFixed(2)}%
              </span>
            </div>
            <Badge 
              variant={ror < 5 ? "default" : ror < 20 ? "secondary" : "destructive"}
              className="w-full justify-center py-2"
            >
              {ror < 5 ? "Low Risk" : ror < 20 ? "Moderate Risk" : "High Risk - Review Strategy"}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============= Break-Even Calculator =============
function BreakEvenCalculator() {
  const [entryPrice, setEntryPrice] = useState(100);
  const [quantity, setQuantity] = useState(100);
  const [commissionEntry, setCommissionEntry] = useState(20);
  const [commissionExit, setCommissionExit] = useState(20);
  const [spreadCost, setSpreadCost] = useState(0.05);
  const [swapDays, setSwapDays] = useState(0);
  const [dailySwap, setDailySwap] = useState(2);

  const totalCosts = commissionEntry + commissionExit + (spreadCost * quantity) + (swapDays * dailySwap);
  const breakEvenPrice = entryPrice + (totalCosts / quantity);
  const breakEvenPct = ((breakEvenPrice - entryPrice) / entryPrice) * 100;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label>Entry Price</Label>
            <Input
              type="number"
              step="0.01"
              value={entryPrice}
              onChange={(e) => setEntryPrice(Number(e.target.value))}
            />
          </div>
          
          <div>
            <Label>Quantity</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          
          <div>
            <Label>Entry Commission (₹)</Label>
            <Input
              type="number"
              step="0.01"
              value={commissionEntry}
              onChange={(e) => setCommissionEntry(Number(e.target.value))}
            />
          </div>
          
          <div>
            <Label>Exit Commission (₹)</Label>
            <Input
              type="number"
              step="0.01"
              value={commissionExit}
              onChange={(e) => setCommissionExit(Number(e.target.value))}
            />
          </div>
          
          <div>
            <Label>Spread Cost Per Unit</Label>
            <Input
              type="number"
              step="0.01"
              value={spreadCost}
              onChange={(e) => setSpreadCost(Number(e.target.value))}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Holding Days</Label>
              <Input
                type="number"
                value={swapDays}
                onChange={(e) => setSwapDays(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Daily Swap (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={dailySwap}
                onChange={(e) => setDailySwap(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
        
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Break-Even Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Commission (Total):</span>
              <span className="text-lg font-semibold">₹{(commissionEntry + commissionExit).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Spread Cost:</span>
              <span className="text-lg font-semibold">₹{(spreadCost * quantity).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Swap Cost:</span>
              <span className="text-lg font-semibold">₹{(swapDays * dailySwap).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-4">
              <span className="text-muted-foreground">Total Costs:</span>
              <span className="text-xl font-bold text-loss">₹{totalCosts.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Break-Even Price:</span>
              <span className="text-2xl font-bold text-primary">₹{breakEvenPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Move Required:</span>
              <span className="text-lg font-semibold">+{breakEvenPct.toFixed(3)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============= Fibonacci Calculator =============
function FibonacciCalculator() {
  const [highPrice, setHighPrice] = useState(150);
  const [lowPrice, setLowPrice] = useState(100);
  const [direction, setDirection] = useState<'up' | 'down'>('up');

  const range = highPrice - lowPrice;
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.618];
  
  const fibLevels = levels.map(level => ({
    level: level * 100,
    price: direction === 'up' 
      ? highPrice - (range * level)
      : lowPrice + (range * level)
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label>High Price</Label>
            <Input
              type="number"
              step="0.01"
              value={highPrice}
              onChange={(e) => setHighPrice(Number(e.target.value))}
            />
          </div>
          
          <div>
            <Label>Low Price</Label>
            <Input
              type="number"
              step="0.01"
              value={lowPrice}
              onChange={(e) => setLowPrice(Number(e.target.value))}
            />
          </div>
          
          <div>
            <Label>Trend Direction</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as 'up' | 'down')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="up">Uptrend (Retracement)</SelectItem>
                <SelectItem value="down">Downtrend (Extension)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Fibonacci Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fibLevels.map(({ level, price }) => (
                <div 
                  key={level} 
                  className={cn(
                    "flex justify-between items-center p-2 rounded",
                    level === 50 && "bg-primary/10",
                    level === 61.8 && "bg-profit/10",
                    level === 38.2 && "bg-warning/10"
                  )}
                >
                  <span className="font-mono text-sm">{level.toFixed(1)}%</span>
                  <span className="font-semibold">₹{price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============= Main Component =============
export default function Calculators() {
  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2">
          <Calculator className="h-7 w-7" />
          Financial Calculators
        </h1>
        <p className="text-muted-foreground">
          Essential trading calculators - all calculations run locally
        </p>
      </div>

      <Tabs defaultValue="position" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="position" className="gap-1">
            <Target className="h-4 w-4" />
            Position Size
          </TabsTrigger>
          <TabsTrigger value="compound" className="gap-1">
            <TrendingUp className="h-4 w-4" />
            Compound Interest
          </TabsTrigger>
          <TabsTrigger value="ruin" className="gap-1">
            <AlertTriangle className="h-4 w-4" />
            Risk of Ruin
          </TabsTrigger>
          <TabsTrigger value="breakeven" className="gap-1">
            <DollarSign className="h-4 w-4" />
            Break-Even
          </TabsTrigger>
          <TabsTrigger value="fibonacci" className="gap-1">
            <Layers className="h-4 w-4" />
            Fibonacci
          </TabsTrigger>
        </TabsList>

        <TabsContent value="position">
          <Card>
            <CardHeader>
              <CardTitle>Position Size Calculator</CardTitle>
              <CardDescription>
                Calculate optimal position size using Fixed Fractional or Kelly Criterion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PositionSizeCalculator />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compound">
          <Card>
            <CardHeader>
              <CardTitle>Compound Interest Projector</CardTitle>
              <CardDescription>
                Project future value with compounding and regular contributions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CompoundInterestCalculator />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ruin">
          <Card>
            <CardHeader>
              <CardTitle>Risk of Ruin Simulator</CardTitle>
              <CardDescription>
                Calculate the probability of account ruin based on your trading parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RiskOfRuinCalculator />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakeven">
          <Card>
            <CardHeader>
              <CardTitle>Break-Even Calculator</CardTitle>
              <CardDescription>
                Calculate the price needed to break even including all trading costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BreakEvenCalculator />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fibonacci">
          <Card>
            <CardHeader>
              <CardTitle>Fibonacci Retracement Calculator</CardTitle>
              <CardDescription>
                Calculate Fibonacci retracement and extension levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FibonacciCalculator />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
