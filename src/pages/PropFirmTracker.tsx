/**
 * Prop Firm Tracker - Track challenges across 9+ firms
 * Part of MMCai.app Projournx feature set
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trophy, AlertTriangle, TrendingUp, TrendingDown,
  Calendar, Target, Shield, Percent, DollarSign, Clock,
  CheckCircle2, XCircle, Edit3, Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { PageTitle } from '@/components/ui/PageTitle';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  rules_config: Record<string, unknown> | null;
  progress_json: Record<string, unknown> | null;
  created_at: string;
}

const PROP_FIRMS = [
  { name: 'FTMO', phase1Target: 10, phase2Target: 5, dailyDD: 5, totalDD: 10, split: 80 },
  { name: 'The5ers', phase1Target: 8, phase2Target: 5, dailyDD: 5, totalDD: 10, split: 80 },
  { name: 'FundedNext', phase1Target: 10, phase2Target: 5, dailyDD: 5, totalDD: 10, split: 80 },
  { name: 'The Funded Trader', phase1Target: 10, phase2Target: 5, dailyDD: 5, totalDD: 10, split: 80 },
  { name: 'MyForexFunds', phase1Target: 8, phase2Target: 5, dailyDD: 5, totalDD: 12, split: 75 },
  { name: 'True Forex Funds', phase1Target: 8, phase2Target: 5, dailyDD: 5, totalDD: 10, split: 80 },
  { name: 'E8 Funding', phase1Target: 8, phase2Target: 5, dailyDD: 5, totalDD: 8, split: 80 },
  { name: 'Alpha Capital Group', phase1Target: 8, phase2Target: 5, dailyDD: 5, totalDD: 10, split: 80 },
  { name: 'Custom', phase1Target: 8, phase2Target: 5, dailyDD: 5, totalDD: 10, split: 80 },
];

export default function PropFirmTracker() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<PropChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState(PROP_FIRMS[0]);
  const [form, setForm] = useState({
    firm_name: 'FTMO',
    challenge_name: '',
    initial_balance: 100000,
    profit_target_pct: 10,
    max_daily_dd_pct: 5,
    max_total_dd_pct: 10,
    min_trading_days: 0,
    profit_split_pct: 80,
    dd_mode: 'balance',
    start_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const fetchChallenges = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('prop_firm_challenges')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setChallenges((data || []) as unknown as PropChallenge[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchChallenges(); }, [fetchChallenges]);

  const handleFirmSelect = (name: string) => {
    const firm = PROP_FIRMS.find(f => f.name === name) || PROP_FIRMS[0];
    setSelectedFirm(firm);
    setForm(p => ({
      ...p,
      firm_name: name,
      profit_target_pct: firm.phase1Target,
      max_daily_dd_pct: firm.dailyDD,
      max_total_dd_pct: firm.totalDD,
      profit_split_pct: firm.split,
    }));
  };

  const handleCreate = async () => {
    if (!user) return;
    const { error } = await supabase.from('prop_firm_challenges').insert({
      user_id: user.id,
      firm_name: form.firm_name,
      challenge_name: form.challenge_name || `${form.firm_name} Challenge`,
      phase: 'phase1',
      initial_balance: form.initial_balance,
      current_balance: form.initial_balance,
      profit_target_pct: form.profit_target_pct,
      max_daily_dd_pct: form.max_daily_dd_pct,
      max_total_dd_pct: form.max_total_dd_pct,
      min_trading_days: form.min_trading_days,
      profit_split_pct: form.profit_split_pct,
      dd_mode: form.dd_mode,
      status: 'active',
      start_date: form.start_date,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Challenge created!');
    setShowAdd(false);
    fetchChallenges();
  };

  const deleteChallenge = async (id: string) => {
    await supabase.from('prop_firm_challenges').delete().eq('id', id);
    toast.success('Challenge removed');
    fetchChallenges();
  };

  const getProgressPct = (c: PropChallenge) => {
    const profitMade = c.current_balance - c.initial_balance;
    const target = c.initial_balance * (c.profit_target_pct / 100);
    return Math.min(100, Math.max(0, (profitMade / target) * 100));
  };

  const getDDUsed = (c: PropChallenge) => {
    const maxDD = c.initial_balance * (c.max_total_dd_pct / 100);
    const loss = Math.max(0, c.initial_balance - c.current_balance);
    return Math.min(100, (loss / maxDD) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-primary/10 text-primary';
      case 'at_risk': return 'bg-amber-500/10 text-amber-400';
      case 'breached': return 'bg-destructive/10 text-destructive';
      case 'passed': return 'bg-profit/10 text-profit';
      case 'funded': return 'bg-emerald-500/10 text-emerald-400';
      case 'failed': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (c: PropChallenge) => {
    const ddPct = getDDUsed(c);
    if (c.status === 'active' && ddPct > 80) return 'at_risk';
    return c.status;
  };

  const activeChallenges = challenges.filter(c => c.status === 'active');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle title="Prop Firm Tracker" subtitle={`Track ${activeChallenges.length}/4 active challenges across 9+ firms`} />
        <Button size="sm" onClick={() => setShowAdd(true)} disabled={activeChallenges.length >= 4}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Challenge
        </Button>
      </div>

      {/* Active Challenges Grid */}
      {challenges.length === 0 && !loading ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-2xl bg-primary/10 mb-4"><Trophy className="h-8 w-8 text-primary" /></div>
            <h3 className="text-lg font-semibold mb-2">No Prop Firm Challenges</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              Track your FTMO, The5ers, FundedNext and other prop firm challenges with real-time P&L and drawdown monitoring.
            </p>
            <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1.5" /> Start Your First Challenge</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {challenges.map(c => {
            const profitPct = getProgressPct(c);
            const ddPct = getDDUsed(c);
            const profitMade = c.current_balance - c.initial_balance;
            const targetAmount = c.initial_balance * (c.profit_target_pct / 100);
            const daysActive = differenceInDays(new Date(), new Date(c.start_date));

            return (
              <Card key={c.id} className="relative overflow-hidden">
                {/* DD warning overlay */}
                {ddPct > 70 && (
                  <div className={cn(
                    "absolute top-0 left-0 right-0 h-1",
                    ddPct > 90 ? 'bg-destructive' : 'bg-warning'
                  )} />
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-sm">{c.firm_name}</CardTitle>
                        <p className="text-[10px] text-muted-foreground">{c.challenge_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-[10px]", getStatusColor(getStatusLabel(c)))}>{getStatusLabel(c).replace('_', ' ').toUpperCase()}</Badge>
                      <Badge variant="outline" className="text-[9px]">{c.phase.toUpperCase()}</Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteChallenge(c.id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Balance */}
                  <div className="flex justify-between items-baseline">
                    <div>
                      <p className="text-2xl font-bold font-mono">${c.current_balance.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">of ${c.initial_balance.toLocaleString()}</p>
                    </div>
                    <div className={cn("text-right font-mono", profitMade >= 0 ? 'text-profit' : 'text-loss')}>
                      <p className="text-sm font-bold">{profitMade >= 0 ? '+' : ''}${profitMade.toLocaleString()}</p>
                      <p className="text-[10px]">{((profitMade / c.initial_balance) * 100).toFixed(2)}%</p>
                    </div>
                  </div>

                  {/* Profit Target Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3" /> Profit Target</span>
                      <span className="font-mono">{profitPct.toFixed(1)}% of {c.profit_target_pct}%</span>
                    </div>
                    <Progress value={profitPct} className="h-2" />
                    <p className="text-[10px] text-muted-foreground text-right">${profitMade.toFixed(0)} / ${targetAmount.toFixed(0)}</p>
                  </div>

                  {/* Drawdown Used */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> DD Used</span>
                      <span className={cn("font-mono", ddPct > 70 ? 'text-destructive font-bold' : '')}>{ddPct.toFixed(1)}%</span>
                    </div>
                    <Progress value={ddPct} className={cn("h-2", ddPct > 90 ? '[&>div]:bg-destructive' : ddPct > 70 ? '[&>div]:bg-warning' : '')} />
                  </div>

                  {/* Min Trading Days */}
                  {(c.min_trading_days != null && c.min_trading_days > 0) && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Min Trading Days</span>
                        <span className="font-mono">{c.trading_days_done ?? 0} / {c.min_trading_days}</span>
                      </div>
                      <Progress value={Math.min(100, (c.trading_days_done ?? 0) / c.min_trading_days * 100)} className="h-2" />
                    </div>
                  )}

                  {/* Stats Row */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/50">
                    <div className="text-center">
                      <p className="text-xs font-mono font-medium">{daysActive}</p>
                      <p className="text-[10px] text-muted-foreground">Days</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-mono font-medium">{c.max_daily_dd_pct}%</p>
                      <p className="text-[10px] text-muted-foreground">Daily DD</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-mono font-medium">{c.profit_split_pct ?? 80}%</p>
                      <p className="text-[10px] text-muted-foreground">Split</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-mono font-medium capitalize">{c.dd_mode ?? 'balance'}</p>
                      <p className="text-[10px] text-muted-foreground">DD Mode</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Profit Split Calculator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Profit Split Calculator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Profit Amount ($)</Label>
              <Input type="number" defaultValue="5000" id="split-profit" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Your Split (%)</Label>
              <Input type="number" defaultValue="80" id="split-pct" />
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm" className="w-full" onClick={() => {
                const profit = parseFloat((document.getElementById('split-profit') as HTMLInputElement)?.value || '0');
                const split = parseFloat((document.getElementById('split-pct') as HTMLInputElement)?.value || '80');
                toast.success(`Your share: $${(profit * split / 100).toFixed(0)} | Firm: $${(profit * (100 - split) / 100).toFixed(0)}`);
              }}>
                Calculate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Challenge Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Prop Firm Challenge</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Prop Firm</Label>
              <Select value={form.firm_name} onValueChange={handleFirmSelect}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROP_FIRMS.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1"><Label className="text-xs">Challenge Name</Label>
                <Input value={form.challenge_name} onChange={e => setForm(p => ({ ...p, challenge_name: e.target.value }))} placeholder="e.g. FTMO 100K" />
              </div>
              <div className="space-y-1"><Label className="text-xs">Account Size ($)</Label>
                <Input type="number" value={form.initial_balance} onChange={e => setForm(p => ({ ...p, initial_balance: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid gap-3 grid-cols-3">
              <div className="space-y-1"><Label className="text-xs">Profit Target %</Label>
                <Input type="number" value={form.profit_target_pct} onChange={e => setForm(p => ({ ...p, profit_target_pct: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1"><Label className="text-xs">Daily DD %</Label>
                <Input type="number" value={form.max_daily_dd_pct} onChange={e => setForm(p => ({ ...p, max_daily_dd_pct: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1"><Label className="text-xs">Total DD %</Label>
                <Input type="number" value={form.max_total_dd_pct} onChange={e => setForm(p => ({ ...p, max_total_dd_pct: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1"><Label className="text-xs">Start Date</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1"><Label className="text-xs">Profit Split %</Label>
                <Input type="number" value={form.profit_split_pct} onChange={e => setForm(p => ({ ...p, profit_split_pct: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1"><Label className="text-xs">Min Trading Days</Label>
                <Input type="number" value={form.min_trading_days} onChange={e => setForm(p => ({ ...p, min_trading_days: parseInt(e.target.value) || 0 }))} placeholder="0 = no minimum" />
              </div>
              <div className="space-y-1"><Label className="text-xs">DD Calculation Mode</Label>
                <Select value={form.dd_mode} onValueChange={v => setForm(p => ({ ...p, dd_mode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balance">Balance-based</SelectItem>
                    <SelectItem value="equity">Equity-based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleCreate}><Trophy className="h-4 w-4 mr-1.5" />Start Challenge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
