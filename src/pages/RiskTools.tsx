/**
 * Risk Lab - Position sizing, Kelly Criterion, risk calculators
 * Part of MMCai.app Projournx feature set
 */
import { useState } from 'react';
import {
  Calculator, Target, Shield, Percent, AlertTriangle,
  TrendingUp, DollarSign, BarChart2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { PageTitle } from '@/components/ui/PageTitle';

export default function RiskTools() {
  // Position Sizing
  const [ps, setPS] = useState({ capital: 100000, riskPct: 2, entryPrice: 100, stopLoss: 95 });
  const psRiskAmount = ps.capital * (ps.riskPct / 100);
  const psRiskPerUnit = Math.abs(ps.entryPrice - ps.stopLoss);
  const psPositionSize = psRiskPerUnit > 0 ? Math.floor(psRiskAmount / psRiskPerUnit) : 0;
  const psPositionValue = psPositionSize * ps.entryPrice;

  // Kelly Criterion
  const [kelly, setKelly] = useState({ winRate: 55, avgWin: 200, avgLoss: 100 });
  const kellyB = kelly.avgWin / kelly.avgLoss;
  const kellyP = kelly.winRate / 100;
  const kellyFull = kellyB > 0 ? (kellyP * (kellyB + 1) - 1) / kellyB : 0;
  const kellyHalf = kellyFull / 2;
  const kellyQuarter = kellyFull / 4;

  // Max Consecutive Loss
  const [mcl, setMCL] = useState({ capital: 100000, riskPct: 2, maxLosses: 10 });
  const mclRiskPerTrade = mcl.capital * (mcl.riskPct / 100);
  const mclTotalRisk = mclRiskPerTrade * mcl.maxLosses;
  const mclRemainingCapital = mcl.capital - mclTotalRisk;
  const mclDrawdownPct = (mclTotalRisk / mcl.capital) * 100;

  // R:R Calculator
  const [rr, setRR] = useState({ entry: 100, stopLoss: 95, takeProfit: 115 });
  const rrRisk = Math.abs(rr.entry - rr.stopLoss);
  const rrReward = Math.abs(rr.takeProfit - rr.entry);
  const rrRatio = rrRisk > 0 ? rrReward / rrRisk : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle title="Risk Lab" subtitle="Position sizing, Kelly Criterion, and risk management calculators" />

      <Tabs defaultValue="position" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="position" className="text-xs"><Target className="h-3.5 w-3.5 mr-1" />Position Size</TabsTrigger>
          <TabsTrigger value="kelly" className="text-xs"><Calculator className="h-3.5 w-3.5 mr-1" />Kelly</TabsTrigger>
          <TabsTrigger value="maxloss" className="text-xs"><Shield className="h-3.5 w-3.5 mr-1" />Max Loss</TabsTrigger>
          <TabsTrigger value="rr" className="text-xs"><BarChart2 className="h-3.5 w-3.5 mr-1" />R:R</TabsTrigger>
        </TabsList>

        <TabsContent value="position">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Position Size Calculator</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1"><Label className="text-xs">Capital (₹)</Label>
                    <Input type="number" value={ps.capital} onChange={e => setPS(p => ({ ...p, capital: +e.target.value || 0 }))} />
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Risk %</Label>
                    <Input type="number" step="0.5" value={ps.riskPct} onChange={e => setPS(p => ({ ...p, riskPct: +e.target.value || 0 }))} />
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Entry Price</Label>
                    <Input type="number" value={ps.entryPrice} onChange={e => setPS(p => ({ ...p, entryPrice: +e.target.value || 0 }))} />
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Stop Loss</Label>
                    <Input type="number" value={ps.stopLoss} onChange={e => setPS(p => ({ ...p, stopLoss: +e.target.value || 0 }))} />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-bold font-mono text-primary">{psPositionSize}</p>
                  <p className="text-xs text-muted-foreground">Shares / Lots</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div><p className="text-sm font-mono font-medium">₹{psRiskAmount.toFixed(0)}</p><p className="text-[10px] text-muted-foreground">Risk Amount</p></div>
                  <div><p className="text-sm font-mono font-medium">₹{psPositionValue.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Position Value</p></div>
                  <div><p className="text-sm font-mono font-medium">₹{psRiskPerUnit.toFixed(2)}</p><p className="text-[10px] text-muted-foreground">Risk/Unit</p></div>
                  <div><p className="text-sm font-mono font-medium">{ps.riskPct}%</p><p className="text-[10px] text-muted-foreground">Account Risk</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="kelly">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Kelly Criterion Calculator</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1"><Label className="text-xs">Win Rate (%)</Label>
                  <Input type="number" value={kelly.winRate} onChange={e => setKelly(p => ({ ...p, winRate: +e.target.value || 0 }))} />
                </div>
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1"><Label className="text-xs">Avg Win (₹)</Label>
                    <Input type="number" value={kelly.avgWin} onChange={e => setKelly(p => ({ ...p, avgWin: +e.target.value || 0 }))} />
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Avg Loss (₹)</Label>
                    <Input type="number" value={kelly.avgLoss} onChange={e => setKelly(p => ({ ...p, avgLoss: +e.target.value || 0 }))} />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3">
                  {[
                    { label: 'Full Kelly', value: kellyFull, desc: 'Maximum growth (high variance)', color: kellyFull > 0 ? 'text-profit' : 'text-loss' },
                    { label: 'Half Kelly ★', value: kellyHalf, desc: 'Recommended (balanced risk)', color: 'text-primary' },
                    { label: 'Quarter Kelly', value: kellyQuarter, desc: 'Conservative (low variance)', color: 'text-muted-foreground' },
                  ].map(k => (
                    <div key={k.label} className="flex items-center justify-between p-2.5 rounded-lg bg-background/50">
                      <div><p className="text-sm font-medium">{k.label}</p><p className="text-[10px] text-muted-foreground">{k.desc}</p></div>
                      <p className={cn("text-lg font-bold font-mono", k.color)}>{(k.value * 100).toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
                {kellyFull <= 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">
                    <AlertTriangle className="h-4 w-4" /> Negative edge — do not trade this strategy
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="maxloss">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Max Consecutive Loss Calculator</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1"><Label className="text-xs">Capital (₹)</Label>
                  <Input type="number" value={mcl.capital} onChange={e => setMCL(p => ({ ...p, capital: +e.target.value || 0 }))} />
                </div>
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1"><Label className="text-xs">Risk per Trade (%)</Label>
                    <Input type="number" step="0.5" value={mcl.riskPct} onChange={e => setMCL(p => ({ ...p, riskPct: +e.target.value || 0 }))} />
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Max Consecutive Losses</Label>
                    <Input type="number" value={mcl.maxLosses} onChange={e => setMCL(p => ({ ...p, maxLosses: +e.target.value || 0 }))} />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={cn("border-2", mclDrawdownPct > 30 ? 'border-destructive/30 bg-destructive/5' : 'bg-primary/5 border-primary/20')}>
              <CardContent className="pt-6 space-y-3">
                <div className="text-center">
                  <p className={cn("text-3xl font-bold font-mono", mclDrawdownPct > 30 ? 'text-destructive' : 'text-primary')}>{mclDrawdownPct.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Max Drawdown</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div><p className="text-sm font-mono font-medium">₹{mclRiskPerTrade.toFixed(0)}</p><p className="text-[10px] text-muted-foreground">Risk/Trade</p></div>
                  <div><p className="text-sm font-mono font-medium text-loss">₹{mclTotalRisk.toFixed(0)}</p><p className="text-[10px] text-muted-foreground">Total Risk</p></div>
                  <div><p className="text-sm font-mono font-medium">₹{mclRemainingCapital.toFixed(0)}</p><p className="text-[10px] text-muted-foreground">Remaining</p></div>
                  <div><p className="text-sm font-mono font-medium">{mcl.maxLosses}</p><p className="text-[10px] text-muted-foreground">Losses</p></div>
                </div>
                {mclDrawdownPct > 20 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 text-warning text-xs">
                    <AlertTriangle className="h-4 w-4" /> Consider reducing risk per trade
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rr">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Risk:Reward Calculator</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1"><Label className="text-xs">Entry Price</Label>
                  <Input type="number" value={rr.entry} onChange={e => setRR(p => ({ ...p, entry: +e.target.value || 0 }))} />
                </div>
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1"><Label className="text-xs">Stop Loss</Label>
                    <Input type="number" value={rr.stopLoss} onChange={e => setRR(p => ({ ...p, stopLoss: +e.target.value || 0 }))} />
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Take Profit</Label>
                    <Input type="number" value={rr.takeProfit} onChange={e => setRR(p => ({ ...p, takeProfit: +e.target.value || 0 }))} />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6 space-y-4 text-center">
                <p className="text-4xl font-bold font-mono text-primary">1:{rrRatio.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Risk to Reward Ratio</p>
                <div className="grid grid-cols-2 gap-3 text-center pt-2">
                  <div><p className="text-sm font-mono text-loss">₹{rrRisk.toFixed(2)}</p><p className="text-[10px] text-muted-foreground">Risk</p></div>
                  <div><p className="text-sm font-mono text-profit">₹{rrReward.toFixed(2)}</p><p className="text-[10px] text-muted-foreground">Reward</p></div>
                </div>
                <Badge variant={rrRatio >= 2 ? 'default' : rrRatio >= 1 ? 'secondary' : 'destructive'} className="text-xs">
                  {rrRatio >= 3 ? 'Excellent' : rrRatio >= 2 ? 'Good' : rrRatio >= 1 ? 'Acceptable' : 'Poor'}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
