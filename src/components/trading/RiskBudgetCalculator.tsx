/**
 * Risk Budget Calculator - daily risk budget based on account size + DD limits
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ShieldAlert, IndianRupee } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { isToday } from 'date-fns';
import type { Trade } from '@/hooks/useTradesDB';
import { safeNetPnl } from '@/lib/tradeMetrics';

export function RiskBudgetCalculator({ trades }: { trades: Trade[] }) {
  const [accountSize, setAccountSize] = useState(100000);
  const [dailyRiskPct, setDailyRiskPct] = useState(2);
  const [maxLossesPerDay, setMaxLossesPerDay] = useState(3);

  const { todayPnl, todayTrades, todayLosses, budgetUsed, budgetRemaining, riskPerTrade } = useMemo(() => {
    const today = trades.filter(t => t.status === 'closed' && isToday(new Date(t.entry_time)));
    const todayPnl = today.reduce((s, t) => s + safeNetPnl(t), 0);
    const todayLosses = today.filter(t => safeNetPnl(t) < 0).length;
    const dailyBudget = accountSize * (dailyRiskPct / 100);
    const budgetUsed = Math.abs(Math.min(0, todayPnl));
    const budgetRemaining = Math.max(0, dailyBudget - budgetUsed);
    const riskPerTrade = budgetRemaining / Math.max(1, maxLossesPerDay - todayLosses);

    return { todayPnl, todayTrades: today.length, todayLosses, budgetUsed, budgetRemaining, riskPerTrade };
  }, [trades, accountSize, dailyRiskPct, maxLossesPerDay]);

  const dailyBudget = accountSize * (dailyRiskPct / 100);
  const usedPct = dailyBudget > 0 ? (budgetUsed / dailyBudget) * 100 : 0;
  const isExceeded = usedPct >= 100;
  const isWarning = usedPct >= 60;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            Risk Budget
          </CardTitle>
          {isExceeded && <Badge variant="destructive" className="text-[10px]">EXCEEDED</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Config */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Account (₹)</Label>
            <Input type="number" value={accountSize} onChange={e => setAccountSize(Number(e.target.value))} className="h-7 text-xs mt-0.5" />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Daily Risk %</Label>
            <Input type="number" value={dailyRiskPct} onChange={e => setDailyRiskPct(Number(e.target.value))} className="h-7 text-xs mt-0.5" step={0.5} />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Max Losses</Label>
            <Input type="number" value={maxLossesPerDay} onChange={e => setMaxLossesPerDay(Number(e.target.value))} className="h-7 text-xs mt-0.5" />
          </div>
        </div>

        {/* Budget Bar */}
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Budget Used: ₹{budgetUsed.toFixed(0)} / ₹{dailyBudget.toFixed(0)}</span>
            <span>{usedPct.toFixed(0)}%</span>
          </div>
          <Progress value={Math.min(100, usedPct)} className={cn("h-2", isExceeded ? '[&>div]:bg-destructive' : isWarning ? '[&>div]:bg-amber-500' : '')} />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2">
          <div className={cn("p-2 rounded text-center", budgetRemaining > 0 ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
            <p className="text-[10px] text-muted-foreground">Remaining Budget</p>
            <p className={cn("text-sm font-mono font-bold", budgetRemaining > 0 ? 'text-emerald-400' : 'text-red-400')}>₹{budgetRemaining.toFixed(0)}</p>
          </div>
          <div className="p-2 rounded bg-muted/30 text-center">
            <p className="text-[10px] text-muted-foreground">Risk Per Trade</p>
            <p className="text-sm font-mono font-bold">₹{riskPerTrade.toFixed(0)}</p>
          </div>
        </div>

        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Today: {todayTrades} trades</span>
          <span>Losses: {todayLosses}/{maxLossesPerDay}</span>
          <span className={cn(todayPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>P&L: ₹{todayPnl.toFixed(0)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
