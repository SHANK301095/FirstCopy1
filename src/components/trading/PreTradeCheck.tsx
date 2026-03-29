/**
 * Pre-Trade Check - "I'm about to trade" flow
 * Matches current setup against historical patterns, shows probability
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Search, CheckCircle2, AlertTriangle, XCircle, 
  TrendingUp, Target, Clock, Sparkles 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Trade } from '@/hooks/useTradesDB';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PreTradeCheckProps {
  trades: Trade[];
}

interface CheckResult {
  symbol: string;
  strategy: string;
  session: string;
  timeframe: string;
  matchingTrades: number;
  winRate: number;
  avgPnL: number;
  avgR: number;
  profitFactor: number;
  verdict: 'green' | 'yellow' | 'red';
  tips: string[];
}

export function PreTradeCheck({ trades }: PreTradeCheckProps) {
  const { user } = useAuth();
  const [symbol, setSymbol] = useState('');
  const [strategy, setStrategy] = useState('');
  const [session, setSession] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [result, setResult] = useState<CheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const symbols = useMemo(() => [...new Set(trades.map(t => t.symbol))].sort(), [trades]);
  const strategies = useMemo(() => [...new Set(trades.filter(t => t.strategy_tag).map(t => t.strategy_tag!))].sort(), [trades]);
  const sessions = useMemo(() => [...new Set(trades.filter(t => t.session_tag).map(t => t.session_tag!))].sort(), [trades]);
  const timeframes = useMemo(() => [...new Set(trades.filter(t => t.timeframe).map(t => t.timeframe!))].sort(), [trades]);

  const runCheck = async () => {
    if (!symbol) { toast.error('Enter a symbol'); return; }
    setIsChecking(true);

    const closed = trades.filter(t => t.status === 'closed');
    
    // Filter matching trades
    let matching = closed.filter(t => t.symbol.toLowerCase() === symbol.toLowerCase());
    if (strategy && strategy !== '__all__') matching = matching.filter(t => t.strategy_tag === strategy);
    if (session && session !== '__all__') matching = matching.filter(t => t.session_tag === session);
    if (timeframe && timeframe !== '__all__') matching = matching.filter(t => t.timeframe === timeframe);

    if (matching.length < 3) {
      setResult({
        symbol, strategy, session, timeframe,
        matchingTrades: matching.length,
        winRate: 0, avgPnL: 0, avgR: 0, profitFactor: 0,
        verdict: 'yellow',
        tips: [`Only ${matching.length} matching trades found. Need 3+ for reliable analysis.`],
      });
      setIsChecking(false);
      return;
    }

    const wins = matching.filter(t => t.net_pnl > 0);
    const losses = matching.filter(t => t.net_pnl < 0);
    const winRate = (wins.length / matching.length) * 100;
    const avgPnL = matching.reduce((s, t) => s + t.net_pnl, 0) / matching.length;
    const rMultiples = matching.filter(t => t.r_multiple != null);
    const avgR = rMultiples.length > 0 ? rMultiples.reduce((s, t) => s + (t.r_multiple || 0), 0) / rMultiples.length : 0;
    const grossWin = wins.reduce((s, t) => s + t.net_pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.net_pnl, 0));
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

    let verdict: 'green' | 'yellow' | 'red' = 'yellow';
    const tips: string[] = [];

    if (winRate >= 60 && profitFactor >= 1.5) {
      verdict = 'green';
      tips.push(`✅ Strong edge detected: ${winRate.toFixed(0)}% win rate with ${profitFactor.toFixed(1)} PF`);
    } else if (winRate < 40 || profitFactor < 1) {
      verdict = 'red';
      tips.push(`⚠️ Historically unprofitable setup: ${winRate.toFixed(0)}% WR, ${profitFactor.toFixed(1)} PF`);
    } else {
      tips.push(`🟡 Marginal edge: ${winRate.toFixed(0)}% WR — proceed with tight risk management`);
    }

    if (avgR > 1.5) tips.push(`💎 Avg R-multiple of ${avgR.toFixed(1)} — good risk/reward`);
    if (avgR < 0.5 && avgR > 0) tips.push(`📉 Low avg R of ${avgR.toFixed(1)} — consider widening targets`);

    // Check recent performance (last 10 matching)
    const recent = matching.slice(0, 10);
    const recentWR = (recent.filter(t => t.net_pnl > 0).length / recent.length) * 100;
    if (recentWR > winRate + 10) tips.push(`🔥 Recent trend is even better: ${recentWR.toFixed(0)}% WR in last ${recent.length} trades`);
    if (recentWR < winRate - 10) tips.push(`⚠️ Recent decline: only ${recentWR.toFixed(0)}% WR in last ${recent.length} trades`);

    const checkResult: CheckResult = {
      symbol, strategy, session, timeframe,
      matchingTrades: matching.length, winRate, avgPnL, avgR, profitFactor, verdict, tips,
    };
    setResult(checkResult);

    // Create alert
    if (user) {
      await supabase.from('trade_alerts').insert({
        user_id: user.id,
        type: 'pre_trade_check',
        title: `Pre-trade: ${symbol} ${strategy || ''} — ${verdict.toUpperCase()}`,
        message: tips[0],
        severity: verdict === 'red' ? 'warning' : verdict === 'green' ? 'info' : 'info',
        metadata: { symbol, strategy, session, timeframe, winRate, profitFactor } as any,
      } as any);
    }

    setIsChecking(false);
  };

  const verdictConfig = {
    green: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'border-emerald-500/20 bg-emerald-500/5', label: 'Strong Edge' },
    yellow: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'border-yellow-500/20 bg-yellow-500/5', label: 'Marginal' },
    red: { icon: XCircle, color: 'text-red-500', bg: 'border-red-500/20 bg-red-500/5', label: 'Avoid' },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          Pre-Trade Check
        </CardTitle>
        <CardDescription>Match your next trade against historical patterns</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Symbol *</Label>
            <Input
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. NIFTY50"
              list="symbol-list"
            />
            <datalist id="symbol-list">
              {symbols.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Strategy</Label>
            <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Any</SelectItem>
                {strategies.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Session</Label>
            <Select value={session} onValueChange={setSession}>
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Any</SelectItem>
                {sessions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Timeframe</Label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Any</SelectItem>
                {timeframes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={runCheck} disabled={isChecking || !symbol} className="w-full">
          <Sparkles className="h-4 w-4 mr-2" />
          {isChecking ? 'Analyzing...' : "I'm About to Trade — Check My Edge"}
        </Button>

        {result && (
          <div className={cn("p-4 rounded-lg border", verdictConfig[result.verdict].bg)}>
            <div className="flex items-center gap-3 mb-3">
              {(() => {
                const VIcon = verdictConfig[result.verdict].icon;
                return <VIcon className={cn("h-6 w-6", verdictConfig[result.verdict].color)} />;
              })()}
              <div>
                <h4 className="font-semibold">{verdictConfig[result.verdict].label}</h4>
                <p className="text-xs text-muted-foreground">{result.matchingTrades} matching trades found</p>
              </div>
              <Badge variant="secondary" className="ml-auto">{result.symbol}</Badge>
            </div>

            {result.matchingTrades >= 3 && (
              <div className="grid grid-cols-4 gap-3 mb-3">
                <div className="text-center">
                  <p className="text-lg font-bold">{result.winRate.toFixed(0)}%</p>
                  <p className="text-[10px] text-muted-foreground">Win Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">₹{result.avgPnL.toFixed(0)}</p>
                  <p className="text-[10px] text-muted-foreground">Avg P&L</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{result.avgR.toFixed(1)}R</p>
                  <p className="text-[10px] text-muted-foreground">Avg R</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{result.profitFactor === Infinity ? '∞' : result.profitFactor.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">Profit Factor</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              {result.tips.map((tip, i) => (
                <p key={i} className="text-sm">{tip}</p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
