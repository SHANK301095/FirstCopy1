/**
 * Tag Performance - breakdown of P&L, win rate, and profit factor by tag
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tags } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Trade } from '@/hooks/useTradesDB';
import { safeNetPnl } from '@/lib/tradeMetrics';

interface TagStat {
  tag: string;
  count: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  profitFactor: number;
  avgPnl: number;
}

interface TagPerformanceProps {
  trades: Trade[];
}

export function TagPerformance({ trades }: TagPerformanceProps) {
  const tagStats = useMemo(() => {
    const closed = trades.filter(t => t.status === 'closed');
    const tagMap = new Map<string, Trade[]>();

    for (const t of closed) {
      const tags = t.tags && t.tags.length > 0 ? t.tags : ['Untagged'];
      for (const tag of tags) {
        if (!tagMap.has(tag)) tagMap.set(tag, []);
        tagMap.get(tag)!.push(t);
      }
    }

    const stats: TagStat[] = [];
    for (const [tag, tagTrades] of tagMap) {
      const wins = tagTrades.filter(t => safeNetPnl(t) > 0);
      const losses = tagTrades.filter(t => safeNetPnl(t) < 0);
      const decisive = wins.length + losses.length;
      const grossWin = wins.reduce((s, t) => s + safeNetPnl(t), 0);
      const grossLoss = Math.abs(losses.reduce((s, t) => s + safeNetPnl(t), 0));
      const totalPnl = tagTrades.reduce((s, t) => s + safeNetPnl(t), 0);

      stats.push({
        tag,
        count: tagTrades.length,
        wins: wins.length,
        losses: losses.length,
        winRate: decisive > 0 ? (wins.length / decisive) * 100 : 0,
        totalPnl,
        profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
        avgPnl: tagTrades.length > 0 ? totalPnl / tagTrades.length : 0,
      });
    }

    return stats.sort((a, b) => b.totalPnl - a.totalPnl);
  }, [trades]);

  if (tagStats.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Tags className="h-4 w-4 text-muted-foreground" />
            Tag Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            No tagged trades yet. Add tags to analyze performance by pattern.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Tags className="h-4 w-4 text-muted-foreground" />
          Tag Performance
          <Badge variant="secondary" className="text-[10px] ml-auto">{tagStats.length} tags</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0.5">
          {/* Header */}
          <div className="grid grid-cols-6 gap-2 text-[10px] text-muted-foreground uppercase tracking-wider py-1.5 border-b border-border/50">
            <span className="col-span-2">Tag</span>
            <span className="text-right">Trades</span>
            <span className="text-right">Win%</span>
            <span className="text-right">P&L</span>
            <span className="text-right">PF</span>
          </div>
          {tagStats.map(s => (
            <div key={s.tag} className="grid grid-cols-6 gap-2 items-center py-2 border-b border-border/20 hover:bg-muted/30 transition-colors rounded">
              <span className="col-span-2">
                <Badge variant="outline" className="text-[10px] font-normal">
                  {s.tag}
                </Badge>
              </span>
              <span className="text-xs font-mono text-right">{s.count}</span>
              <span className={cn("text-xs font-mono text-right", s.winRate >= 50 ? 'text-emerald-400' : 'text-red-400')}>
                {s.winRate.toFixed(0)}%
              </span>
              <span className={cn("text-xs font-mono text-right", s.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                ₹{s.totalPnl.toFixed(0)}
              </span>
              <span className="text-xs font-mono text-right">
                {s.profitFactor === Infinity ? '∞' : s.profitFactor.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
