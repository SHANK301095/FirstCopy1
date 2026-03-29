/**
 * Recent Trades List - compact table of latest trades
 */
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Trade } from '@/hooks/useTradesDB';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { GradeBadge } from './GradeBadge';

interface RecentTradesListProps {
  trades: Trade[];
  limit?: number;
}

export function RecentTradesList({ trades, limit = 8 }: RecentTradesListProps) {
  const recent = trades.slice(0, limit);

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Recent Trades</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/trades" className="text-xs text-muted-foreground">
            View All <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No trades yet. <Link to="/trades" className="text-primary hover:underline">Log your first trade</Link>
          </div>
        ) : (
          <div className="space-y-1">
            {recent.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <Badge variant={t.direction === 'long' ? 'default' : 'destructive'} className="text-[10px] w-12 justify-center">
                    {t.direction.toUpperCase()}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{t.symbol}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(t.entry_time), 'dd MMM HH:mm')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t.trade_grade && (
                    <GradeBadge grade={t.trade_grade} />
                  )}
                  <div className="text-right">
                    <p className={cn("text-sm font-mono font-medium", t.net_pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {t.net_pnl >= 0 ? '+' : ''}₹{t.net_pnl.toFixed(0)}
                    </p>
                    {t.strategy_tag && <p className="text-[10px] text-muted-foreground">{t.strategy_tag}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
