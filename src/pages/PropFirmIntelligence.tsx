/**
 * Prop Firm Intelligence — Real DB-backed challenge command center
 * Breach simulator, compliance reporting, pass probability
 */
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Shield, Target, AlertTriangle, TrendingUp, Calendar,
  Gauge, CheckCircle, XCircle, ArrowRight, Zap, Download,
  Skull, ChevronDown, ChevronUp, Calculator, FileText, Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { PageTitle } from '@/components/ui/PageTitle';
import { PageErrorBoundary } from '@/components/error/PageErrorBoundary';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTradesDB } from '@/hooks/useTradesDB';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

// ── Types ──
interface PropChallenge {
  id: string;
  firm_name: string;
  challenge_name: string | null;
  phase: string;
  initial_balance: number;
  current_balance: number;
  profit_target_pct: number;
  max_daily_dd_pct: number;
  max_total_dd_pct: number;
  min_trading_days: number | null;
  trading_days_done: number;
  dd_mode: string;
  profit_split_pct: number | null;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
}

// ── Helpers ──
function getStatus(c: PropChallenge) {
  const ddPct = getDDUsedPct(c);
  const dailyDDPct = getDailyDDPct(c);
  if (c.status === 'breached' || c.status === 'failed') return 'danger';
  if (c.status === 'passed' || c.status === 'funded') return 'safe';
  if (ddPct > 80 || dailyDDPct > 70) return 'danger';
  if (ddPct > 50 || dailyDDPct > 50) return 'caution';
  return 'safe';
}

function getDDUsedPct(c: PropChallenge) {
  const maxDD = c.initial_balance * (c.max_total_dd_pct / 100);
  const loss = Math.max(0, c.initial_balance - c.current_balance);
  return maxDD > 0 ? Math.min(100, (loss / maxDD) * 100) : 0;
}

function getDailyDDPct(c: PropChallenge) {
  // Simplified: use total DD as proxy since we don't have intraday data
  return Math.min(getDDUsedPct(c) * 0.3, 100);
}

function getProfitPct(c: PropChallenge) {
  const profit = c.current_balance - c.initial_balance;
  return c.initial_balance > 0 ? (profit / c.initial_balance) * 100 : 0;
}

function getPassProbability(c: PropChallenge) {
  const profitProgress = getProfitPct(c) / c.profit_target_pct;
  const ddSafety = 1 - (getDDUsedPct(c) / 100);
  const daysMet = c.min_trading_days ? Math.min(1, (c.trading_days_done || 0) / c.min_trading_days) : 1;
  const raw = (profitProgress * 40 + ddSafety * 40 + daysMet * 20);
  return Math.min(99, Math.max(1, Math.round(raw)));
}

function getSafeRiskPerTrade(c: PropChallenge) {
  const ddRemaining = c.max_total_dd_pct - (getDDUsedPct(c) * c.max_total_dd_pct / 100);
  const profitRemaining = c.profit_target_pct - getProfitPct(c);
  if (profitRemaining <= 0) return 0.25; // Already at target, minimum risk
  const estimatedTradesLeft = Math.max(5, Math.ceil(profitRemaining / 0.5));
  return Math.max(0.1, Math.min(1.0, ddRemaining / estimatedTradesLeft));
}

const statusConfig = {
  safe: { label: 'Challenge Safe', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  caution: { label: 'Approaching Risk', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: AlertTriangle },
  danger: { label: 'High Risk of Breach', color: 'bg-red-500/10 text-red-400 border-red-500/30', icon: Skull },
};

// ── Breach Simulator ──
function BreachSimulator({ challenge }: { challenge: PropChallenge }) {
  const [nextLossPct, setNextLossPct] = useState([0.5]);
  
  const lossAmount = challenge.current_balance * (nextLossPct[0] / 100);
  const newBalance = challenge.current_balance - lossAmount;
  const newDDPct = Math.max(0, challenge.initial_balance - newBalance) / challenge.initial_balance * 100;
  const wouldBreach = newDDPct >= challenge.max_total_dd_pct;
  const ddAfter = (newDDPct / challenge.max_total_dd_pct) * 100;
  
  const safeLossMax = challenge.current_balance - (challenge.initial_balance * (1 - challenge.max_total_dd_pct / 100));
  const aggressiveLossMax = safeLossMax * 0.8; // 80% of safe path
  
  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-xs font-semibold flex items-center gap-2">
          <Calculator className="h-3.5 w-3.5 text-primary" /> Breach Simulator
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>If Next Trade Loses</span>
            <span className="font-mono font-bold text-foreground">{nextLossPct[0].toFixed(1)}% (${lossAmount.toFixed(0)})</span>
          </div>
          <Slider value={nextLossPct} onValueChange={setNextLossPct} min={0.1} max={5} step={0.1} className="w-full" />
        </div>
        
        <div className={cn(
          "p-3 rounded-md border text-center",
          wouldBreach ? "bg-red-500/10 border-red-500/30" : "bg-emerald-500/10 border-emerald-500/30"
        )}>
          <div className="text-[10px] text-muted-foreground mb-1">DD After Loss</div>
          <div className={cn("text-2xl font-bold font-mono", wouldBreach ? "text-red-400" : "text-emerald-400")}>
            {ddAfter.toFixed(1)}%
          </div>
          <div className={cn("text-xs mt-1 font-medium", wouldBreach ? "text-red-400" : "text-emerald-400")}>
            {wouldBreach ? '⚠️ WOULD BREACH — Do NOT take this trade' : '✅ Safe — Within limits'}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-md bg-muted/30 text-center">
            <div className="text-[10px] text-muted-foreground">Safe Path Max Loss</div>
            <div className="text-sm font-bold font-mono text-emerald-400">${Math.max(0, safeLossMax).toFixed(0)}</div>
          </div>
          <div className="p-2 rounded-md bg-muted/30 text-center">
            <div className="text-[10px] text-muted-foreground">Aggressive Path Max</div>
            <div className="text-sm font-bold font-mono text-amber-400">${Math.max(0, aggressiveLossMax).toFixed(0)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Challenge Card ──
function ChallengeCard({ challenge: c, trades }: { challenge: PropChallenge; trades: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const status = getStatus(c);
  const profitPct = getProfitPct(c);
  const ddPct = getDDUsedPct(c);
  const passProbability = getPassProbability(c);
  const safeRisk = getSafeRiskPerTrade(c);
  const daysActive = differenceInDays(new Date(), new Date(c.start_date));
  const StatusIcon = statusConfig[status].icon;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <div>
              <CardTitle className="text-sm font-semibold">{c.firm_name} — {c.phase === 'phase1' ? 'Phase 1' : c.phase === 'phase2' ? 'Phase 2' : c.phase}</CardTitle>
              <p className="text-[10px] text-muted-foreground">{c.challenge_name} · Day {daysActive}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={cn('text-[10px]', statusConfig[status].color)}>
              <StatusIcon className="h-3 w-3 mr-1" />{statusConfig[status].label}
            </Badge>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* Progress bars */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Profit Target</span>
              <span className="font-mono">{profitPct.toFixed(1)}% / {c.profit_target_pct}%</span>
            </div>
            <Progress value={Math.max(0, (profitPct / c.profit_target_pct) * 100)} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Min Trading Days</span>
              <span className="font-mono">{c.trading_days_done || 0} / {c.min_trading_days || '∞'}</span>
            </div>
            <Progress value={c.min_trading_days ? Math.min(100, ((c.trading_days_done || 0) / c.min_trading_days) * 100) : 100} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Daily DD Used</span>
              <span className={cn("font-mono", getDailyDDPct(c) > 50 ? 'text-amber-400' : '')}>{getDailyDDPct(c).toFixed(1)}% / {c.max_daily_dd_pct}%</span>
            </div>
            <Progress value={getDailyDDPct(c)} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Total DD Used</span>
              <span className={cn("font-mono", ddPct > 70 ? 'text-red-400 font-bold' : '')}>{ddPct.toFixed(1)}%</span>
            </div>
            <Progress value={ddPct} className={cn("h-2", ddPct > 80 ? '[&>div]:bg-destructive' : ddPct > 50 ? '[&>div]:bg-amber-500' : '')} />
          </div>
        </div>

        {/* Intelligence cards */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded-md bg-muted/30 text-center">
            <div className="text-[10px] text-muted-foreground">Pass Prob.</div>
            <div className={cn('text-lg font-bold font-mono', passProbability >= 70 ? 'text-emerald-400' : passProbability >= 40 ? 'text-amber-400' : 'text-red-400')}>{passProbability}%</div>
          </div>
          <div className="p-2 rounded-md bg-muted/30 text-center">
            <div className="text-[10px] text-muted-foreground">Safe Risk</div>
            <div className="text-lg font-bold font-mono text-foreground">{safeRisk.toFixed(1)}%</div>
          </div>
          <div className="p-2 rounded-md bg-muted/30 text-center">
            <div className="text-[10px] text-muted-foreground">Balance</div>
            <div className="text-lg font-bold font-mono text-foreground">${c.current_balance.toLocaleString()}</div>
          </div>
          <div className="p-2 rounded-md bg-muted/30 text-center">
            <div className="text-[10px] text-muted-foreground">Payout Ready</div>
            <div className="text-lg font-bold font-mono">
              {profitPct >= c.profit_target_pct && (c.trading_days_done || 0) >= (c.min_trading_days || 0) 
                ? <CheckCircle className="h-5 w-5 text-emerald-400 mx-auto" />
                : <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />}
            </div>
          </div>
        </div>

        {/* Expanded: Breach Simulator */}
        {expanded && <BreachSimulator challenge={c} />}
      </CardContent>
    </Card>
  );
}

// ── Compliance Report Generator ──
function ComplianceReport({ challenges }: { challenges: PropChallenge[] }) {
  const generateReport = () => {
    const lines = [
      `MMC Prop Firm Compliance Report`,
      `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      '',
    ];
    
    challenges.forEach(c => {
      const status = getStatus(c);
      lines.push(`${c.firm_name} — ${c.challenge_name || c.phase}`);
      lines.push(`Status: ${statusConfig[status].label}`);
      lines.push(`Balance: $${c.current_balance.toLocaleString()} (Started: $${c.initial_balance.toLocaleString()})`);
      lines.push(`Profit: ${getProfitPct(c).toFixed(2)}% / ${c.profit_target_pct}%`);
      lines.push(`DD Used: ${getDDUsedPct(c).toFixed(2)}% / ${c.max_total_dd_pct}%`);
      lines.push(`Trading Days: ${c.trading_days_done || 0} / ${c.min_trading_days || '∞'}`);
      lines.push(`Pass Probability: ${getPassProbability(c)}%`);
      lines.push(`Safe Risk/Trade: ${getSafeRiskPerTrade(c).toFixed(2)}%`);
      lines.push('');
    });
    
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prop-compliance-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Compliance report downloaded');
  };

  return (
    <Button variant="outline" size="sm" onClick={generateReport}>
      <FileText className="h-3.5 w-3.5 mr-1.5" /> Export Report
    </Button>
  );
}

// ── Main Page ──
export default function PropFirmIntelligence() {
  const { user } = useAuth();
  const { trades } = useTradesDB();

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ['prop-challenges-intel', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('prop_firm_challenges')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PropChallenge[];
    },
    enabled: !!user,
  });

  const activeChallenges = challenges.filter(c => c.status === 'active');
  const completedChallenges = challenges.filter(c => ['passed', 'funded', 'breached', 'failed'].includes(c.status));

  // Overview stats
  const overview = useMemo(() => {
    if (!activeChallenges.length) return null;
    const totalCapital = activeChallenges.reduce((s, c) => s + c.initial_balance, 0);
    const totalCurrent = activeChallenges.reduce((s, c) => s + c.current_balance, 0);
    const avgPassProb = activeChallenges.reduce((s, c) => s + getPassProbability(c), 0) / activeChallenges.length;
    const worstDD = Math.max(...activeChallenges.map(c => getDDUsedPct(c)));
    return { totalCapital, totalCurrent, avgPassProb, worstDD };
  }, [activeChallenges]);

  return (
    <PageErrorBoundary pageName="Prop Firm Intelligence">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <PageTitle title="Prop Firm Intelligence" subtitle={`${activeChallenges.length} active challenge${activeChallenges.length !== 1 ? 's' : ''} monitored`} />
          <div className="flex items-center gap-2">
            {challenges.length > 0 && <ComplianceReport challenges={activeChallenges} />}
            <Button variant="outline" size="sm" asChild>
              <Link to="/prop-firm">Manage Challenges <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
        </div>

        {/* Empty state */}
        {!isLoading && challenges.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 rounded-2xl bg-primary/10 mb-4"><Trophy className="h-8 w-8 text-primary" /></div>
              <h3 className="text-lg font-semibold mb-2">No Prop Challenges Yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                Add your FTMO, The5ers, or FundedNext challenge to get real-time intelligence — pass probability, breach simulation, and safe risk recommendations.
              </p>
              <Button asChild><Link to="/prop-firm"><Plus className="h-4 w-4 mr-1.5" /> Add Your First Challenge</Link></Button>
            </CardContent>
          </Card>
        )}

        {/* Overview Strip */}
        {overview && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-card border-border/50">
              <CardContent className="p-3 text-center">
                <div className="text-[10px] text-muted-foreground">Total Capital</div>
                <div className="text-xl font-bold font-mono">${overview.totalCapital.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border/50">
              <CardContent className="p-3 text-center">
                <div className="text-[10px] text-muted-foreground">Current Value</div>
                <div className={cn("text-xl font-bold font-mono", overview.totalCurrent >= overview.totalCapital ? 'text-emerald-400' : 'text-red-400')}>
                  ${overview.totalCurrent.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border/50">
              <CardContent className="p-3 text-center">
                <div className="text-[10px] text-muted-foreground">Avg Pass Prob.</div>
                <div className={cn("text-xl font-bold font-mono", overview.avgPassProb >= 60 ? 'text-emerald-400' : 'text-amber-400')}>
                  {overview.avgPassProb.toFixed(0)}%
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border/50">
              <CardContent className="p-3 text-center">
                <div className="text-[10px] text-muted-foreground">Worst DD Used</div>
                <div className={cn("text-xl font-bold font-mono", overview.worstDD > 60 ? 'text-red-400' : 'text-foreground')}>
                  {overview.worstDD.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        {challenges.length > 0 && (
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList>
              <TabsTrigger value="active">Active ({activeChallenges.length})</TabsTrigger>
              <TabsTrigger value="completed">History ({completedChallenges.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {activeChallenges.map(c => <ChallengeCard key={c.id} challenge={c} trades={trades} />)}
              </div>
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedChallenges.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No completed challenges yet. Keep trading! 💪
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                  {completedChallenges.map(c => <ChallengeCard key={c.id} challenge={c} trades={trades} />)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageErrorBoundary>
  );
}

function Plus(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14"/><path d="M12 5v14"/>
    </svg>
  );
}
