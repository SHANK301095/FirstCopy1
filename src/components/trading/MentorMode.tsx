/**
 * Mentor Mode — Guided learning with progressive difficulty
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, CheckCircle, Circle, ArrowRight, Star } from 'lucide-react';
import type { Trade } from '@/hooks/useTradesDB';

interface MentorChallenge {
  id: string;
  title: string;
  description: string;
  check: (trades: Trade[]) => boolean;
  level: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  xp: number;
}

const CHALLENGES: MentorChallenge[] = [
  { id: 'first10', title: 'Log 10 Trades', description: 'Build your trading journal habit', check: (t) => t.filter(x => x.status === 'closed').length >= 10, level: 'beginner', xp: 50 },
  { id: 'winstreak3', title: '3-Win Streak', description: 'Get 3 consecutive winning trades', check: (t) => {
    const closed = t.filter(x => x.status === 'closed').sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime());
    let streak = 0;
    for (const trade of closed) { if ((trade.net_pnl || 0) > 0) { streak++; if (streak >= 3) return true; } else streak = 0; }
    return false;
  }, level: 'beginner', xp: 75 },
  { id: 'profitfactor2', title: 'Profit Factor > 2', description: 'Achieve a profit factor above 2.0', check: (t) => {
    const closed = t.filter(x => x.status === 'closed');
    const gross = closed.filter(x => (x.net_pnl || 0) > 0).reduce((s, x) => s + (x.net_pnl || 0), 0);
    const loss = Math.abs(closed.filter(x => (x.net_pnl || 0) < 0).reduce((s, x) => s + (x.net_pnl || 0), 0));
    return loss > 0 && gross / loss > 2;
  }, level: 'intermediate', xp: 150 },
  { id: 'r2plus', title: '2R+ Trade', description: 'Close a trade with R-multiple ≥ 2', check: (t) => t.some(x => (x.r_multiple || 0) >= 2), level: 'intermediate', xp: 100 },
  { id: 'wr60', title: '60% Win Rate (50+ trades)', description: 'Maintain 60%+ win rate over 50 trades', check: (t) => {
    const closed = t.filter(x => x.status === 'closed');
    if (closed.length < 50) return false;
    return (closed.filter(x => (x.net_pnl || 0) > 0).length / closed.length) >= 0.6;
  }, level: 'advanced', xp: 250 },
  { id: 'sharpe1', title: 'Sharpe > 1.0', description: 'Achieve a Sharpe ratio above 1.0', check: (t) => {
    const pnls = t.filter(x => x.status === 'closed').map(x => x.net_pnl || 0);
    if (pnls.length < 20) return false;
    const avg = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const std = Math.sqrt(pnls.reduce((a, b) => a + (b - avg) ** 2, 0) / pnls.length);
    return std > 0 && avg / std > 1;
  }, level: 'elite', xp: 500 },
];

const levelColors = { beginner: 'text-emerald-400', intermediate: 'text-blue-400', advanced: 'text-purple-400', elite: 'text-yellow-400' };

export function MentorMode({ trades }: { trades: Trade[] }) {
  const completed = CHALLENGES.filter(c => c.check(trades));
  const totalXP = completed.reduce((s, c) => s + c.xp, 0);
  const progress = (completed.length / CHALLENGES.length) * 100;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            Mentor Mode
          </CardTitle>
          <Badge variant="secondary" className="gap-1">
            <Star className="h-3 w-3 text-yellow-400" /> {totalXP} XP
          </Badge>
        </div>
        <Progress value={progress} className="h-1.5 mt-2" />
        <p className="text-xs text-muted-foreground mt-1">{completed.length}/{CHALLENGES.length} challenges completed</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {CHALLENGES.map(c => {
          const done = c.check(trades);
          return (
            <div key={c.id} className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${done ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-muted/20'}`}>
              {done ? <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : ''}`}>{c.title}</p>
                <p className="text-xs text-muted-foreground">{c.description}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant="outline" className={`text-[10px] ${levelColors[c.level]}`}>{c.level}</Badge>
                <span className="text-xs text-muted-foreground">{c.xp}xp</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
