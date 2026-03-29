/**
 * Virtualized Trades Table
 * Spec: Performance - virtualized table for 10k+ trades
 * Now with responsive wrapper to prevent page-level overflow
 */

import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ResponsiveTable, TruncatedCell } from '@/components/ui/ResponsiveTable';
import type { Trade } from '@/db';

interface VirtualizedTradesTableProps {
  trades: Trade[];
  height?: number;
}

export function VirtualizedTradesTable({ trades, height = 300 }: VirtualizedTradesTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: trades.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36, // Row height
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  if (trades.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        No trades to display
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-auto">
      {/* Header */}
      <div className="flex bg-muted/50 text-xs font-medium border-b sticky top-0 min-w-[700px]">
        <div className="w-28 px-2 py-2 shrink-0">Entry Time</div>
        <div className="w-28 px-2 py-2 shrink-0">Exit Time</div>
        <div className="w-14 px-2 py-2 shrink-0">Dir</div>
        <div className="w-20 px-2 py-2 text-right shrink-0">Entry</div>
        <div className="w-20 px-2 py-2 text-right shrink-0">Exit</div>
        <div className="w-20 px-2 py-2 text-right shrink-0">P&L</div>
        <div className="w-14 px-2 py-2 text-right shrink-0">P&L %</div>
        <div className="flex-1 px-2 py-2 min-w-0">Reason</div>
      </div>

      {/* Virtualized Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
            minWidth: '700px',
          }}
        >
          {virtualItems.map((virtualRow) => {
            const trade = trades[virtualRow.index];
            return (
              <div
                key={trade.id}
                className="flex text-xs border-b hover:bg-muted/30 absolute top-0 left-0 w-full"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="w-28 px-2 py-2 tabular-nums truncate shrink-0">
                  {format(new Date(trade.entryTs), 'MMM dd HH:mm')}
                </div>
                <div className="w-28 px-2 py-2 tabular-nums truncate shrink-0">
                  {format(new Date(trade.exitTs), 'MMM dd HH:mm')}
                </div>
                <div className="w-14 px-2 py-2 shrink-0">
                  <Badge 
                    variant={trade.direction === 'long' ? 'default' : 'secondary'} 
                    className="text-[10px] px-1"
                  >
                    {trade.direction}
                  </Badge>
                </div>
                <div className="w-20 px-2 py-2 text-right tabular-nums shrink-0">
                  {trade.entryPrice.toFixed(2)}
                </div>
                <div className="w-20 px-2 py-2 text-right tabular-nums shrink-0">
                  {trade.exitPrice.toFixed(2)}
                </div>
                <div className={`w-20 px-2 py-2 text-right tabular-nums font-medium shrink-0 ${
                  trade.pnl > 0 ? 'text-chart-2' : 'text-destructive'
                }`}>
                  ₹{trade.pnl.toFixed(0)}
                </div>
                <div className={`w-14 px-2 py-2 text-right tabular-nums shrink-0 ${
                  trade.pnlPct > 0 ? 'text-chart-2' : 'text-destructive'
                }`}>
                  {trade.pnlPct.toFixed(2)}%
                </div>
                <div className="flex-1 px-2 py-2 text-muted-foreground truncate min-w-0">
                  {trade.exitReason}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
