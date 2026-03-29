/**
 * StrategyTable — Dense quant-style sortable table view
 */
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowRight } from 'lucide-react';
import { StrategyTagBadge } from './StrategyTagBadge';
import { StrategyScoreBadge } from './StrategyScoreBadge';
import { STRATEGY_TYPE_LABELS, MARKET_LABELS, type StrategyIntelligence, type StrategySortKey } from '@/types/strategyIntelligence';
import { cn } from '@/lib/utils';

interface StrategyTableProps {
  strategies: StrategyIntelligence[];
  sortBy: StrategySortKey;
  sortDir: 'asc' | 'desc';
  onSort: (key: StrategySortKey) => void;
  onOpen: (id: string) => void;
}

const statusColors: Record<string, string> = {
  active: 'text-emerald-400',
  paused: 'text-amber-400',
  deprecated: 'text-red-400',
  experimental: 'text-violet-400',
};

export function StrategyTable({ strategies, sortBy, sortDir, onSort, onOpen }: StrategyTableProps) {
  const SortHead = ({ label, sortKey, className }: { label: string; sortKey: StrategySortKey; className?: string }) => (
    <TableHead className={cn('cursor-pointer select-none hover:text-foreground transition-colors', className)} onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1">
        {label}
        {sortBy === sortKey && <ArrowUpDown className="h-3 w-3 text-primary" />}
      </div>
    </TableHead>
  );

  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[200px]">Strategy</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Tags</TableHead>
            <SortHead label="MMC" sortKey="mmcScore" className="text-right" />
            <SortHead label="Win %" sortKey="winRate" className="text-right" />
            <SortHead label="Sharpe" sortKey="sharpe" className="text-right" />
            <SortHead label="DD %" sortKey="drawdown" className="text-right" />
            <SortHead label="PF" sortKey="profitFactor" className="text-right" />
            <SortHead label="CAGR" sortKey="cagr" className="text-right" />
            <TableHead>Markets</TableHead>
            <TableHead className="text-right">Status</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {strategies.map(s => (
            <TableRow key={s.identity.id} className="cursor-pointer group" onClick={() => onOpen(s.identity.id)}>
              <TableCell>
                <span className="font-medium text-sm truncate block max-w-[200px]">{s.identity.name}</span>
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{STRATEGY_TYPE_LABELS[s.identity.type]}</span>
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap max-w-[150px]">
                  {s.tags.slice(0, 2).map(t => <StrategyTagBadge key={t} tag={t} size="sm" />)}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <StrategyScoreBadge score={s.research.mmcCompositeScore} size="sm" showLabel={false} />
              </TableCell>
              <TableCell className={cn('text-right font-mono text-xs tabular-nums', s.performance.winRate > 55 ? 'text-emerald-400' : 'text-muted-foreground')}>
                {s.performance.winRate}%
              </TableCell>
              <TableCell className={cn('text-right font-mono text-xs tabular-nums', s.performance.sharpeRatio > 1.5 ? 'text-emerald-400' : 'text-muted-foreground')}>
                {s.performance.sharpeRatio.toFixed(2)}
              </TableCell>
              <TableCell className={cn('text-right font-mono text-xs tabular-nums', s.performance.maxDrawdown < 10 ? 'text-emerald-400' : 'text-red-400')}>
                {s.performance.maxDrawdown}%
              </TableCell>
              <TableCell className={cn('text-right font-mono text-xs tabular-nums', s.performance.profitFactor > 1.5 ? 'text-emerald-400' : 'text-muted-foreground')}>
                {s.performance.profitFactor.toFixed(2)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                {s.performance.cagr}%
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {s.compatibility.markets.slice(0, 2).map(m => (
                    <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{MARKET_LABELS[m]}</span>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <span className={cn('text-xs font-medium capitalize', statusColors[s.identity.status])}>{s.identity.status}</span>
              </TableCell>
              <TableCell>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
