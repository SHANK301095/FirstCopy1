/**
 * AI Playbook Cards - auto-detected winning/losing trade patterns
 * With Save to Playbook + Alert toggle
 */
import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, TrendingDown, Clock, Target, Bookmark, BookmarkCheck, Bell, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Trade } from '@/hooks/useTradesDB';

interface PatternResult {
  id: string;
  name: string;
  description: string;
  winRate: number;
  avgR: number;
  sampleSize: number;
  expectancy: number;
  type: 'edge' | 'avoid';
  filters: Record<string, string>;
}

interface SavedPattern {
  id: string;
  pattern_key: string;
  notify_on_match: boolean;
}

interface AIPlaybookCardsProps {
  trades: Trade[];
}

function getSessionTag(time: string): string {
  const hour = new Date(time).getUTCHours();
  if (hour >= 0 && hour < 8) return 'Asia';
  if (hour >= 8 && hour < 14) return 'London';
  return 'New York';
}

function getDayOfWeek(time: string): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(time).getDay()];
}

export function AIPlaybookCards({ trades }: AIPlaybookCardsProps) {
  const { user } = useAuth();
  const [savedPatterns, setSavedPatterns] = useState<SavedPattern[]>([]);

  // Fetch saved patterns
  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_playbook_patterns')
      .select('id, pattern_key, notify_on_match')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setSavedPatterns(data as SavedPattern[]);
      });
  }, [user]);

  const patterns = useMemo(() => {
    const closed = trades.filter(t => t.status === 'closed');
    if (closed.length < 10) return [];

    const results: PatternResult[] = [];

    // Pattern: by symbol
    const bySymbol = new Map<string, Trade[]>();
    closed.forEach(t => {
      const arr = bySymbol.get(t.symbol) || [];
      arr.push(t);
      bySymbol.set(t.symbol, arr);
    });

    bySymbol.forEach((symTrades, symbol) => {
      if (symTrades.length < 5) return;
      const wins = symTrades.filter(t => t.net_pnl > 0);
      const wr = (wins.length / symTrades.length) * 100;
      const exp = symTrades.reduce((s, t) => s + t.net_pnl, 0) / symTrades.length;
      const avgR = symTrades.filter(t => t.r_multiple).reduce((s, t) => s + (t.r_multiple || 0), 0) / (symTrades.filter(t => t.r_multiple).length || 1);

      if (wr >= 60 || wr <= 35) {
        results.push({
          id: `sym-${symbol}`,
          name: `${symbol} ${wr >= 60 ? 'Edge' : 'Caution'}`,
          description: wr >= 60
            ? `You have a ${wr.toFixed(0)}% win rate on ${symbol} across ${symTrades.length} trades`
            : `Only ${wr.toFixed(0)}% win rate on ${symbol} — consider reducing exposure`,
          winRate: wr, avgR, sampleSize: symTrades.length, expectancy: exp,
          type: wr >= 60 ? 'edge' : 'avoid',
          filters: { symbol },
        });
      }
    });

    // Pattern: by session
    const bySession = new Map<string, Trade[]>();
    closed.forEach(t => {
      const session = t.session_tag || getSessionTag(t.entry_time);
      const arr = bySession.get(session) || [];
      arr.push(t);
      bySession.set(session, arr);
    });

    bySession.forEach((sessTrades, session) => {
      if (sessTrades.length < 5) return;
      const wins = sessTrades.filter(t => t.net_pnl > 0);
      const wr = (wins.length / sessTrades.length) * 100;
      const exp = sessTrades.reduce((s, t) => s + t.net_pnl, 0) / sessTrades.length;
      if (wr >= 58 || wr <= 38) {
        results.push({
          id: `sess-${session}`,
          name: `${session} Session ${wr >= 58 ? 'Strength' : 'Weakness'}`,
          description: wr >= 58
            ? `${session} session: ${wr.toFixed(0)}% win rate, avg ₹${exp.toFixed(0)}/trade`
            : `Underperforming in ${session}: ${wr.toFixed(0)}% win rate`,
          winRate: wr, avgR: 0, sampleSize: sessTrades.length, expectancy: exp,
          type: wr >= 58 ? 'edge' : 'avoid',
          filters: { session },
        });
      }
    });

    // Pattern: by day of week
    const byDay = new Map<string, Trade[]>();
    closed.forEach(t => {
      const day = getDayOfWeek(t.entry_time);
      const arr = byDay.get(day) || [];
      arr.push(t);
      byDay.set(day, arr);
    });

    byDay.forEach((dayTrades, day) => {
      if (dayTrades.length < 5) return;
      const wins = dayTrades.filter(t => t.net_pnl > 0);
      const wr = (wins.length / dayTrades.length) * 100;
      const exp = dayTrades.reduce((s, t) => s + t.net_pnl, 0) / dayTrades.length;
      if (wr >= 62 || wr <= 35) {
        results.push({
          id: `day-${day}`,
          name: `${day}s: ${wr >= 62 ? 'Best Day' : 'Worst Day'}`,
          description: `${day}s: ${wr.toFixed(0)}% win rate, ₹${exp.toFixed(0)} avg across ${dayTrades.length} trades`,
          winRate: wr, avgR: 0, sampleSize: dayTrades.length, expectancy: exp,
          type: wr >= 62 ? 'edge' : 'avoid',
          filters: { day },
        });
      }
    });

    // Pattern: by setup_type
    const bySetup = new Map<string, Trade[]>();
    closed.forEach(t => {
      if (!t.setup_type) return;
      const arr = bySetup.get(t.setup_type) || [];
      arr.push(t);
      bySetup.set(t.setup_type, arr);
    });

    bySetup.forEach((setupTrades, setup) => {
      if (setupTrades.length < 5) return;
      const wins = setupTrades.filter(t => t.net_pnl > 0);
      const wr = (wins.length / setupTrades.length) * 100;
      const exp = setupTrades.reduce((s, t) => s + t.net_pnl, 0) / setupTrades.length;
      if (wr >= 55) {
        results.push({
          id: `setup-${setup}`,
          name: `${setup} Setup Edge`,
          description: `${setup}: ${wr.toFixed(0)}% win rate, ₹${exp.toFixed(0)} expectancy`,
          winRate: wr, avgR: 0, sampleSize: setupTrades.length, expectancy: exp,
          type: 'edge',
          filters: { setup },
        });
      }
    });

    return results.sort((a, b) => b.expectancy - a.expectancy).slice(0, 8);
  }, [trades]);

  const handleSave = async (pattern: PatternResult) => {
    if (!user) { toast.error('Login required'); return; }
    const existing = savedPatterns.find(s => s.pattern_key === pattern.id);
    
    if (existing) {
      // Unsave
      await supabase.from('user_playbook_patterns').delete().eq('id', existing.id);
      setSavedPatterns(prev => prev.filter(s => s.id !== existing.id));
      toast.success('Removed from playbook');
    } else {
      // Save
      const { data, error } = await supabase.from('user_playbook_patterns').insert({
        user_id: user.id,
        pattern_key: pattern.id,
        pattern_name: pattern.name,
        pattern_type: pattern.type,
        filters: pattern.filters as any,
        win_rate: pattern.winRate,
        expectancy: pattern.expectancy,
        sample_size: pattern.sampleSize,
        notify_on_match: false,
      } as any).select('id, pattern_key, notify_on_match').single();
      if (error) { toast.error('Failed to save'); return; }
      setSavedPatterns(prev => [...prev, data as SavedPattern]);
      toast.success('Saved to playbook!');
    }
  };

  const handleToggleAlert = async (pattern: PatternResult) => {
    if (!user) return;
    const existing = savedPatterns.find(s => s.pattern_key === pattern.id);
    if (!existing) {
      // Auto-save + enable alerts
      const { data, error } = await supabase.from('user_playbook_patterns').insert({
        user_id: user.id,
        pattern_key: pattern.id,
        pattern_name: pattern.name,
        pattern_type: pattern.type,
        filters: pattern.filters as any,
        win_rate: pattern.winRate,
        expectancy: pattern.expectancy,
        sample_size: pattern.sampleSize,
        notify_on_match: true,
      } as any).select('id, pattern_key, notify_on_match').single();
      if (!error && data) {
        setSavedPatterns(prev => [...prev, data as SavedPattern]);
        toast.success('Saved + alerts enabled!');
      }
    } else {
      const newVal = !existing.notify_on_match;
      await supabase.from('user_playbook_patterns')
        .update({ notify_on_match: newVal } as any)
        .eq('id', existing.id);
      setSavedPatterns(prev => prev.map(s => s.id === existing.id ? { ...s, notify_on_match: newVal } : s));
      toast.success(newVal ? 'Alerts enabled' : 'Alerts disabled');
    }
  };

  if (patterns.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Playbook
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Need 10+ closed trades to detect patterns</p>
            <p className="text-xs mt-1">Import or log more trades to unlock AI insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Playbook
          <Badge variant="secondary" className="text-[10px]">{patterns.length} patterns</Badge>
          {savedPatterns.length > 0 && (
            <Badge variant="outline" className="text-[10px] ml-auto">
              <BookmarkCheck className="h-3 w-3 mr-1" />
              {savedPatterns.length} saved
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {patterns.map(p => {
            const isSaved = savedPatterns.some(s => s.pattern_key === p.id);
            const alertOn = savedPatterns.find(s => s.pattern_key === p.id)?.notify_on_match || false;
            return (
              <div
                key={p.id}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  p.type === 'edge' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
                )}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {p.type === 'edge' ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                    )}
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                  <Badge variant={p.type === 'edge' ? 'default' : 'destructive'} className="text-[10px]">
                    {p.winRate.toFixed(0)}% WR
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{p.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      ₹{p.expectancy.toFixed(0)} exp
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {p.sampleSize} trades
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleToggleAlert(p)}
                      title={alertOn ? 'Disable alerts' : 'Enable alerts'}
                    >
                      {alertOn ? (
                        <Bell className="h-3 w-3 text-primary" />
                      ) : (
                        <BellOff className="h-3 w-3 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleSave(p)}
                      title={isSaved ? 'Remove from playbook' : 'Save to playbook'}
                    >
                      {isSaved ? (
                        <BookmarkCheck className="h-3 w-3 text-primary" />
                      ) : (
                        <Bookmark className="h-3 w-3 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
