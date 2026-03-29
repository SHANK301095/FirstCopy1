/**
 * AI Trade Replay — Step through trades chronologically with AI commentary
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Play, SkipForward } from 'lucide-react';
import type { Trade } from '@/hooks/useTradesDB';

function getTradeInsight(trade: Trade, prevTrade: Trade | null): string {
  const insights: string[] = [];
  const pnl = trade.net_pnl || 0;
  
  if (pnl > 0) insights.push(`✅ Win: ₹${pnl.toFixed(0)}`);
  else insights.push(`❌ Loss: ₹${Math.abs(pnl).toFixed(0)}`);
  
  if (trade.r_multiple) {
    if (trade.r_multiple > 2) insights.push(`🎯 Excellent R: ${trade.r_multiple.toFixed(1)}R`);
    else if (trade.r_multiple < -1) insights.push(`⚠️ Poor R: ${trade.r_multiple.toFixed(1)}R`);
  }

  if (prevTrade) {
    const prevPnl = prevTrade.net_pnl || 0;
    if (prevPnl < 0 && pnl < 0) insights.push('🔴 Consecutive loss — watch for tilt');
    if (prevPnl < 0 && pnl > 0) insights.push('💪 Bounced back from loss');
    
    const timeDiff = new Date(trade.entry_time).getTime() - new Date(prevTrade.exit_time || prevTrade.entry_time).getTime();
    if (timeDiff < 5 * 60 * 1000) insights.push('⚡ Entered within 5 min of last exit — impulsive?');
  }

  if (trade.setup_type) insights.push(`Setup: ${trade.setup_type}`);
  
  return insights.join(' | ');
}

export function AITradeReplay({ trades }: { trades: Trade[] }) {
  const sorted = [...trades].filter(t => t.status === 'closed').sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
  const [idx, setIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  const current = sorted[idx];
  const prev = idx > 0 ? sorted[idx - 1] : null;

  if (sorted.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Play className="h-4 w-4" /> AI Trade Replay</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground text-center py-4">No closed trades to replay</p></CardContent>
      </Card>
    );
  }

  const runningPnl = sorted.slice(0, idx + 1).reduce((sum, t) => sum + (t.net_pnl || 0), 0);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" />
            AI Trade Replay
          </CardTitle>
          <Badge variant="secondary">{idx + 1} / {sorted.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Trade card */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant={current.direction === 'long' ? 'default' : 'destructive'}>
                {current.direction.toUpperCase()}
              </Badge>
              <span className="font-medium">{current.symbol}</span>
            </div>
            <span className={`font-mono font-bold ${(current.net_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ₹{(current.net_pnl || 0).toFixed(0)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div>Entry: ₹{current.entry_price}</div>
            <div>Exit: ₹{current.exit_price || '—'}</div>
            <div>Time: {new Date(current.entry_time).toLocaleDateString()}</div>
          </div>
        </div>

        {/* AI Insight */}
        <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10 text-sm">
          {getTradeInsight(current, prev)}
        </div>

        {/* Running P&L */}
        <div className="text-center">
          <span className="text-xs text-muted-foreground">Running P&L: </span>
          <span className={`font-mono font-bold ${runningPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ₹{runningPnl.toFixed(0)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIdx(Math.min(sorted.length - 1, idx + 5))}>
            <SkipForward className="h-4 w-4 mr-1" /> +5
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIdx(Math.min(sorted.length - 1, idx + 1))} disabled={idx === sorted.length - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted/30 rounded-full h-1.5">
          <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${((idx + 1) / sorted.length) * 100}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}
