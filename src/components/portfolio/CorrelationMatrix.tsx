/**
 * Correlation Matrix Component
 * Portfolio Results Composition - shows strategy correlation heatmap
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StrategyResult {
  id: string;
  name: string;
  returns: number[];
  equity: number[];
  netProfit: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

interface CorrelationMatrixProps {
  strategies: StrategyResult[];
  className?: string;
}

export function CorrelationMatrix({ strategies, className }: CorrelationMatrixProps) {
  const correlationData = useMemo(() => {
    if (strategies.length < 2) return [];
    
    const matrix: { row: string; col: string; value: number }[] = [];
    
    for (let i = 0; i < strategies.length; i++) {
      for (let j = 0; j < strategies.length; j++) {
        const corr = calculateCorrelation(strategies[i].returns, strategies[j].returns);
        matrix.push({
          row: strategies[i].name,
          col: strategies[j].name,
          value: corr
        });
      }
    }
    
    return matrix;
  }, [strategies]);

  const getCorrelationColor = (value: number) => {
    if (value >= 0.7) return 'bg-destructive/60 text-destructive-foreground';
    if (value >= 0.3) return 'bg-warning/60 text-warning-foreground';
    if (value >= -0.3) return 'bg-muted text-muted-foreground';
    if (value >= -0.7) return 'bg-primary/40 text-primary-foreground';
    return 'bg-success/60 text-success-foreground';
  };

  if (strategies.length < 2) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center text-muted-foreground">
          Add at least 2 strategies to view correlation matrix
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle className="text-lg">Correlation Matrix</CardTitle>
        <CardDescription>Lower correlation = better diversification</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left bg-muted/50"></th>
                {strategies.map(s => (
                  <th key={s.id} className="p-2 text-center bg-muted/50 font-medium truncate max-w-[100px]">
                    {s.name.slice(0, 10)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {strategies.map((rowStrategy, i) => (
                <tr key={rowStrategy.id}>
                  <td className="p-2 font-medium bg-muted/30 truncate max-w-[100px]">
                    {rowStrategy.name.slice(0, 10)}
                  </td>
                  {strategies.map((colStrategy, j) => {
                    const cellData = correlationData.find(
                      d => d.row === rowStrategy.name && d.col === colStrategy.name
                    );
                    const value = cellData?.value ?? 0;
                    return (
                      <td 
                        key={colStrategy.id}
                        className={cn(
                          "p-2 text-center font-mono text-xs transition-colors",
                          i === j ? "bg-primary/20" : getCorrelationColor(value)
                        )}
                      >
                        {value.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Legend */}
        <div className="p-4 border-t flex items-center justify-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-success/60" />
            <span className="text-xs text-muted-foreground">Negative</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary/40" />
            <span className="text-xs text-muted-foreground">Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted" />
            <span className="text-xs text-muted-foreground">Neutral</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-warning/60" />
            <span className="text-xs text-muted-foreground">Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-destructive/60" />
            <span className="text-xs text-muted-foreground">High</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  
  const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  
  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : numerator / denom;
}

export default CorrelationMatrix;
