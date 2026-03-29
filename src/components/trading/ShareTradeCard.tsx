/**
 * Share Trade Card - generate beautiful trade recap images
 */
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, Download, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Trade } from '@/hooks/useTradesDB';
import { safeNetPnl } from '@/lib/tradeMetrics';

interface ShareTradeCardProps {
  trade: Trade;
}

export function ShareTradeCard({ trade }: ShareTradeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const pnl = safeNetPnl(trade);
  const isWin = pnl >= 0;

  const handleCopy = async () => {
    const text = `${isWin ? '🟢' : '🔴'} ${trade.symbol} ${trade.direction.toUpperCase()}\n` +
      `Entry: ₹${trade.entry_price} → Exit: ₹${trade.exit_price}\n` +
      `P&L: ${isWin ? '+' : ''}₹${pnl.toFixed(0)}\n` +
      `${trade.strategy_tag ? `Strategy: ${trade.strategy_tag}\n` : ''}` +
      `— MMCai.app`;
    
    await navigator.clipboard.writeText(text);
  };

  return (
    <div ref={cardRef} className={cn(
      "p-4 rounded-xl border-2 bg-gradient-to-br",
      isWin ? "border-emerald-500/30 from-emerald-500/5 to-background" : "border-red-500/30 from-red-500/5 to-background"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant={trade.direction === 'long' ? 'default' : 'destructive'} className="text-[10px]">
            {trade.direction.toUpperCase()}
          </Badge>
          <span className="text-lg font-bold">{trade.symbol}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {format(new Date(trade.entry_time), 'dd MMM yyyy')}
        </span>
      </div>

      {/* P&L */}
      <div className="text-center py-3">
        <p className={cn("text-3xl font-mono font-black", isWin ? 'text-emerald-400' : 'text-red-400')}>
          {isWin ? '+' : ''}₹{pnl.toFixed(0)}
        </p>
        {trade.r_multiple && (
          <p className="text-sm text-muted-foreground mt-1">{trade.r_multiple.toFixed(1)}R</p>
        )}
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className="flex justify-between p-1.5 rounded bg-muted/30">
          <span className="text-muted-foreground">Entry</span>
          <span className="font-mono">₹{trade.entry_price}</span>
        </div>
        <div className="flex justify-between p-1.5 rounded bg-muted/30">
          <span className="text-muted-foreground">Exit</span>
          <span className="font-mono">₹{trade.exit_price || '—'}</span>
        </div>
        {trade.strategy_tag && (
          <div className="flex justify-between p-1.5 rounded bg-muted/30 col-span-2">
            <span className="text-muted-foreground">Strategy</span>
            <span>{trade.strategy_tag}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={handleCopy}>
          <Copy className="h-3 w-3 mr-1" /> Copy
        </Button>
        <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => {
          if (navigator.share) {
            navigator.share({
              title: `${trade.symbol} Trade`,
              text: `${isWin ? '🟢' : '🔴'} ${trade.symbol} ${trade.direction}: ${isWin ? '+' : ''}₹${pnl.toFixed(0)} — MMCai.app`,
            });
          }
        }}>
          <Share2 className="h-3 w-3 mr-1" /> Share
        </Button>
      </div>

      <p className="text-center text-[10px] text-muted-foreground mt-2">MMCai.app — India's #1 AI Trading Journal</p>
    </div>
  );
}
