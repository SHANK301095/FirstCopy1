import { cn } from '@/lib/utils';

interface MonthlyHeatmapProps {
  data: Record<string, number>;
  className?: string;
}

export function MonthlyHeatmap({ data, className }: MonthlyHeatmapProps) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const sortedKeys = Object.keys(data).sort();
  const years = [...new Set(sortedKeys.map((k) => k.split('-')[0]))];

  const getColor = (value: number) => {
    if (value > 10) return 'bg-profit/80';
    if (value > 5) return 'bg-profit/60';
    if (value > 2) return 'bg-profit/40';
    if (value > 0) return 'bg-profit/20';
    if (value === 0) return 'bg-muted';
    if (value > -2) return 'bg-loss/20';
    if (value > -5) return 'bg-loss/40';
    if (value > -10) return 'bg-loss/60';
    return 'bg-loss/80';
  };

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left text-muted-foreground font-medium">Year</th>
            {months.map((m) => (
              <th key={m} className="px-1 py-1 text-center text-muted-foreground font-medium">
                {m}
              </th>
            ))}
            <th className="px-2 py-1 text-right text-muted-foreground font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {years.map((year) => {
            const yearTotal = months.reduce((sum, _, idx) => {
              const key = `${year}-${String(idx + 1).padStart(2, '0')}`;
              return sum + (data[key] || 0);
            }, 0);

            return (
              <tr key={year}>
                <td className="px-2 py-1 font-mono text-muted-foreground">{year}</td>
                {months.map((_, idx) => {
                  const key = `${year}-${String(idx + 1).padStart(2, '0')}`;
                  const value = data[key];
                  const hasValue = value !== undefined;

                  return (
                    <td key={key} className="px-1 py-1">
                      <div
                        className={cn(
                          'mx-auto h-6 w-8 rounded flex items-center justify-center font-mono transition-colors',
                          hasValue ? getColor(value) : 'bg-muted/30'
                        )}
                        title={hasValue ? `${value.toFixed(2)}%` : 'No data'}
                      >
                        {hasValue && (
                          <span className={cn(
                            'text-[10px]',
                            Math.abs(value) > 5 ? 'text-foreground' : 'text-muted-foreground'
                          )}>
                            {value > 0 ? '+' : ''}{value.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-right">
                  <span
                    className={cn(
                      'font-mono font-semibold',
                      yearTotal >= 0 ? 'text-profit' : 'text-loss'
                    )}
                  >
                    {yearTotal > 0 ? '+' : ''}{yearTotal.toFixed(1)}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
