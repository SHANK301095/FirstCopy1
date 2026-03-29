import { cn } from '@/lib/utils';
import type { BacktestResult } from '@/types';

interface MetricBadgeProps {
  label: string;
  value: number | string;
  format?: 'currency' | 'percentage' | 'number' | 'ratio';
  positive?: boolean;
  className?: string;
}

export function MetricBadge({
  label,
  value,
  format = 'number',
  positive,
  className,
}: MetricBadgeProps) {
  const formatValue = () => {
    const num = typeof value === 'number' ? value : parseFloat(value as string);
    
    switch (format) {
      case 'currency':
        return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'percentage':
        return `${num.toFixed(2)}%`;
      case 'ratio':
        return num.toFixed(2);
      default:
        return num.toLocaleString();
    }
  };

  const isPositive = positive ?? (typeof value === 'number' ? value >= 0 : true);

  return (
    <div className={cn('inline-flex flex-col items-center', className)}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          'font-mono text-sm font-semibold',
          format === 'currency' && (isPositive ? 'text-profit' : 'text-loss'),
          format === 'ratio' && (typeof value === 'number' && value >= 1 ? 'text-profit' : 'text-loss')
        )}
      >
        {formatValue()}
      </span>
    </div>
  );
}

interface ResultMetricsRowProps {
  result: BacktestResult;
  compact?: boolean;
}

export function ResultMetricsRow({ result, compact = false }: ResultMetricsRowProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-4">
        <MetricBadge label="Profit" value={result.netProfit} format="currency" />
        <MetricBadge label="PF" value={result.profitFactor} format="ratio" />
        <MetricBadge label="DD" value={result.relativeDrawdown} format="percentage" positive={false} />
        <MetricBadge label="Win" value={result.winRate} format="percentage" positive />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 md:grid-cols-8">
      <MetricBadge label="Net Profit" value={result.netProfit} format="currency" />
      <MetricBadge label="Profit Factor" value={result.profitFactor} format="ratio" />
      <MetricBadge label="Expected Payoff" value={result.expectedPayoff} format="currency" />
      <MetricBadge label="Rel. Drawdown" value={result.relativeDrawdown} format="percentage" positive={false} />
      <MetricBadge label="Recovery" value={result.recoveryFactor} format="ratio" />
      <MetricBadge label="Trades" value={result.totalTrades} />
      <MetricBadge label="Win Rate" value={result.winRate} format="percentage" positive />
      <MetricBadge label="Avg Trade" value={result.avgTrade} format="currency" />
    </div>
  );
}
