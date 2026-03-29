/**
 * Calculator Slider - Side Sheet with Quick Access to All Financial Calculators
 * Accessible from anywhere in the app via global trigger
 */

import { useState, useCallback } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription,
  SheetTrigger 
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calculator, 
  Target, 
  TrendingUp, 
  AlertTriangle,
  DollarSign,
  Percent,
  BarChart3,
  ChevronRight,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============= Position Size Calculator (Compact) =============
function PositionSizeCalc() {
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Account Size</Label>
          <Input
            type="number"
            value={accountSize}
            onChange={(e) => setAccountSize(Number(e.target.value))}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Risk %</Label>
          <Input
            type="number"
            step="0.1"
            value={riskPercent}
            onChange={(e) => setRiskPercent(Number(e.target.value))}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Entry Price</Label>
          <Input
            type="number"
            step="0.01"
            value={entryPrice}
            onChange={(e) => setEntryPrice(Number(e.target.value))}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Stop Loss</Label>
          <Input
            type="number"
            step="0.01"
            value={stopLoss}
            onChange={(e) => setStopLoss(Number(e.target.value))}
            className="h-9"
          />
        </div>
      </div>
      
      <div>
        <Label className="text-xs">Method</Label>
        <Select value={method} onValueChange={(v) => setMethod(v as 'fixed' | 'kelly')}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixed Fractional</SelectItem>
            <SelectItem value="kelly">Kelly Criterion</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {method === 'kelly' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Win Rate %</Label>
            <Input
              type="number"
              value={winRate}
              onChange={(e) => setWinRate(Number(e.target.value))}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Win/Loss Ratio</Label>
            <Input
              type="number"
              step="0.1"
              value={avgWinLoss}
              onChange={(e) => setAvgWinLoss(Number(e.target.value))}
              className="h-9"
            />
          </div>
        </div>
      )}
      
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Risk Amount:</span>
            <span className="font-semibold">₹{riskAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">SL Distance:</span>
            <span className="font-semibold">{stopLossPips.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center border-t pt-2">
            <span className="text-sm font-medium">Position Size:</span>
            <span className="text-xl font-bold text-primary">
              {(method === 'kelly' ? kellyPositionSize : positionSize).toFixed(2)}
            </span>
          </div>
          {method === 'kelly' && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Kelly %:</span>
              <span className="font-semibold">{(kellyFraction * 100).toFixed(1)}%</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============= Risk of Ruin Calculator (Compact) =============
function RiskOfRuinCalc() {
  const [winRate, setWinRate] = useState(55);
  const [riskPerTrade, setRiskPerTrade] = useState(2);
  const [avgWinLoss, setAvgWinLoss] = useState(1.5);
  const [maxDrawdown, setMaxDrawdown] = useState(25);

  const p = winRate / 100;
  const q = 1 - p;
  const b = avgWinLoss;
  const edge = (p * b) - q;
  const unitsToRuin = maxDrawdown / riskPerTrade;
  
  let ror = 0;
  if (edge <= 0) {
    ror = 100;
  } else {
    const ratio = q / p;
    ror = Math.min(100, Math.pow(ratio, unitsToRuin) * 100);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Win Rate %</Label>
          <Input
            type="number"
            value={winRate}
            onChange={(e) => setWinRate(Number(e.target.value))}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Risk/Trade %</Label>
          <Input
            type="number"
            step="0.1"
            value={riskPerTrade}
            onChange={(e) => setRiskPerTrade(Number(e.target.value))}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Win/Loss Ratio</Label>
          <Input
            type="number"
            step="0.1"
            value={avgWinLoss}
            onChange={(e) => setAvgWinLoss(Number(e.target.value))}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Max DD %</Label>
          <Input
            type="number"
            value={maxDrawdown}
            onChange={(e) => setMaxDrawdown(Number(e.target.value))}
            className="h-9"
          />
        </div>
      </div>
      
      <Card className={cn(
        "border-2",
        ror < 5 ? "bg-profit/5 border-profit/30" : 
        ror < 20 ? "bg-warning/5 border-warning/30" : 
        "bg-loss/5 border-loss/30"
      )}>
        <CardContent className="pt-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Edge/Trade:</span>
            <span className={cn("font-semibold", edge > 0 ? "text-profit" : "text-loss")}>
              {(edge * 100).toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Trades to Ruin:</span>
            <span className="font-semibold">{unitsToRuin.toFixed(0)}</span>
          </div>
          <div className="flex justify-between items-center border-t pt-2">
            <span className="text-sm font-medium">Risk of Ruin:</span>
            <span className={cn(
              "text-xl font-bold",
              ror < 5 ? "text-profit" : ror < 20 ? "text-warning" : "text-loss"
            )}>
              {ror.toFixed(2)}%
            </span>
          </div>
          <Badge 
            variant={ror < 5 ? "default" : ror < 20 ? "secondary" : "destructive"}
            className="w-full justify-center"
          >
            {ror < 5 ? "Low Risk" : ror < 20 ? "Moderate" : "High Risk"}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}

// ============= Compound Interest Calculator (Compact) =============
function CompoundCalc() {
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const [monthlyContrib, setMonthlyContrib] = useState(5000);

  const r = rate / 100;
  const standardAmount = principal * Math.pow(1 + r / 12, 12 * years);
  const futureValueContrib = monthlyContrib * ((Math.pow(1 + r / 12, 12 * years) - 1) / (r / 12));
  const totalWithContrib = standardAmount + futureValueContrib;
  const totalContributions = principal + (monthlyContrib * 12 * years);
  const totalInterest = totalWithContrib - totalContributions;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Initial Investment</Label>
          <Input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(Number(e.target.value))}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Annual Rate %</Label>
          <Input
            type="number"
            step="0.1"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Years</Label>
          <Input
            type="number"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Monthly SIP</Label>
          <Input
            type="number"
            value={monthlyContrib}
            onChange={(e) => setMonthlyContrib(Number(e.target.value))}
            className="h-9"
          />
        </div>
      </div>
      
      <Card className="bg-profit/5 border-profit/20">
        <CardContent className="pt-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Total Invested:</span>
            <span className="font-semibold">₹{totalContributions.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Interest Earned:</span>
            <span className="font-semibold text-profit">
              ₹{totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between items-center border-t pt-2">
            <span className="text-sm font-medium">Future Value:</span>
            <span className="text-xl font-bold text-profit">
              ₹{totalWithContrib.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Growth:</span>
            <span className="font-semibold">
              {((totalWithContrib / totalContributions - 1) * 100).toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============= Break-Even Calculator (Compact) =============
function BreakEvenCalc() {
  const [entryPrice, setEntryPrice] = useState(100);
  const [quantity, setQuantity] = useState(100);
  const [commission, setCommission] = useState(40);
  const [spreadCost, setSpreadCost] = useState(0.05);

  const totalCosts = commission + (spreadCost * quantity);
  const breakEvenPrice = entryPrice + (totalCosts / quantity);
  const breakEvenPct = ((breakEvenPrice - entryPrice) / entryPrice) * 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Entry Price</Label>
          <Input
            type="number"
            step="0.01"
            value={entryPrice}
            onChange={(e) => setEntryPrice(Number(e.target.value))}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Quantity</Label>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Total Commission ₹</Label>
          <Input
            type="number"
            step="0.01"
            value={commission}
            onChange={(e) => setCommission(Number(e.target.value))}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Spread/Unit</Label>
          <Input
            type="number"
            step="0.01"
            value={spreadCost}
            onChange={(e) => setSpreadCost(Number(e.target.value))}
            className="h-9"
          />
        </div>
      </div>
      
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Total Costs:</span>
            <span className="font-semibold">₹{totalCosts.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center border-t pt-2">
            <span className="text-sm font-medium">Break-Even Price:</span>
            <span className="text-xl font-bold text-primary">
              ₹{breakEvenPrice.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Move Required:</span>
            <span className="font-semibold text-warning">+{breakEvenPct.toFixed(2)}%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============= Main Calculator Slider Component =============
interface CalculatorSliderProps {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}

export function CalculatorSlider({ trigger, defaultOpen = false }: CalculatorSliderProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState('position');

  const calculatorTabs = [
    { id: 'position', label: 'Position Size', icon: Target, description: 'Risk-based lot sizing' },
    { id: 'ror', label: 'Risk of Ruin', icon: AlertTriangle, description: 'Probability of total loss' },
    { id: 'compound', label: 'Compound', icon: TrendingUp, description: 'Interest projections' },
    { id: 'breakeven', label: 'Break-Even', icon: DollarSign, description: 'Cost recovery point' },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle>Quick Calculator</SheetTitle>
              <SheetDescription className="text-xs">
                Financial tools at your fingertips
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full h-auto gap-1 bg-muted/50 p-1">
                {calculatorTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex flex-col items-center gap-1 py-2 px-1 text-xs data-[state=active]:bg-background"
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="hidden sm:block">{tab.label.split(' ')[0]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <div className="mt-4">
                <div className="mb-4">
                  <h3 className="font-semibold">
                    {calculatorTabs.find(t => t.id === activeTab)?.label}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {calculatorTabs.find(t => t.id === activeTab)?.description}
                  </p>
                </div>
                
                <TabsContent value="position" className="mt-0">
                  <PositionSizeCalc />
                </TabsContent>
                
                <TabsContent value="ror" className="mt-0">
                  <RiskOfRuinCalc />
                </TabsContent>
                
                <TabsContent value="compound" className="mt-0">
                  <CompoundCalc />
                </TabsContent>
                
                <TabsContent value="breakeven" className="mt-0">
                  <BreakEvenCalc />
                </TabsContent>
              </div>
            </Tabs>
            
            {/* Quick Tips */}
            <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/50">
              <h4 className="text-sm font-medium mb-2">💡 Quick Tips</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                {activeTab === 'position' && (
                  <>
                    <li>• Risk 1-2% per trade for account longevity</li>
                    <li>• Kelly suggests optimal growth but is aggressive</li>
                    <li>• Use Half-Kelly (Kelly/2) for safety</li>
                  </>
                )}
                {activeTab === 'ror' && (
                  <>
                    <li>• RoR &lt; 5% = Low risk, sustainable</li>
                    <li>• RoR &gt; 20% = High risk, review strategy</li>
                    <li>• Positive edge is required for survival</li>
                  </>
                )}
                {activeTab === 'compound' && (
                  <>
                    <li>• Consistency beats high returns</li>
                    <li>• Monthly SIP accelerates compounding</li>
                    <li>• Time in market &gt; timing the market</li>
                  </>
                )}
                {activeTab === 'breakeven' && (
                  <>
                    <li>• Include ALL costs for accuracy</li>
                    <li>• Higher quantity = lower break-even %</li>
                    <li>• Factor in holding period for swaps</li>
                  </>
                )}
              </ul>
            </div>
            
            {/* Link to full calculator page */}
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => {
                setOpen(false);
                window.location.href = '/calculators';
              }}
            >
              Open Full Calculators Page
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// Floating trigger button for global access - positioned in Tools section (below Copilot, above Help)
export function CalculatorFloatingButton() {
  return (
    <CalculatorSlider
      trigger={
        <Button
          size="icon"
          variant="outline"
          className="fixed bottom-20 sm:bottom-5 right-[4.5rem] h-10 w-10 rounded-full shadow-lg z-40 bg-background border-border hover:bg-primary/10"
          title="Quick Calculator Tools"
        >
          <Calculator className="h-5 w-5" />
        </Button>
      }
    />
  );
}

export default CalculatorSlider;
