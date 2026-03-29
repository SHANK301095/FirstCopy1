/**
 * Parameter Importance Ranking - P1 Optimizer
 * Shows which parameters have the most impact on results
 */

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ParameterImportance {
  name: string;
  importance: number; // 0-100
  correlation: number; // -1 to 1 correlation with objective
  optimalRange?: { min: number; max: number };
}

interface ParameterImportanceRankingProps {
  parameters: ParameterImportance[];
  objectiveLabel?: string;
  className?: string;
}

export function ParameterImportanceRanking({
  parameters,
  objectiveLabel = 'Objective',
  className,
}: ParameterImportanceRankingProps) {
  const sortedParams = useMemo(() => {
    return [...parameters].sort((a, b) => b.importance - a.importance);
  }, [parameters]);

  const getImportanceColor = (importance: number) => {
    if (importance >= 70) return 'hsl(var(--profit))';
    if (importance >= 40) return 'hsl(var(--warning))';
    return 'hsl(var(--muted-foreground))';
  };

  const getImportanceLabel = (importance: number) => {
    if (importance >= 70) return 'High';
    if (importance >= 40) return 'Medium';
    return 'Low';
  };

  if (parameters.length === 0) {
    return (
      <Card className={cn("card-neural", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Parameter Importance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Run optimization to analyze parameter importance
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("card-neural", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Parameter Importance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Bar chart */}
        <div className="h-32 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={sortedParams} 
              layout="vertical"
              margin={{ top: 5, right: 5, bottom: 5, left: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
              <XAxis 
                type="number" 
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                type="category" 
                dataKey="name"
                tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                width={55}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Importance']}
              />
              <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                {sortedParams.map((entry, index) => (
                  <Cell key={index} fill={getImportanceColor(entry.importance)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed list */}
        <div className="space-y-2">
          {sortedParams.map((param, idx) => (
            <div 
              key={param.name}
              className="flex items-center justify-between p-2 rounded-md bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground w-4">
                  #{idx + 1}
                </span>
                <span className="text-sm font-medium">{param.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Correlation indicator */}
                <div className="flex items-center gap-1">
                  {param.correlation >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-profit" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-loss" />
                  )}
                  <span className={cn(
                    "text-xs font-mono",
                    param.correlation >= 0 ? "text-profit" : "text-loss"
                  )}>
                    {param.correlation >= 0 ? '+' : ''}{param.correlation.toFixed(2)}
                  </span>
                </div>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    param.importance >= 70 && "border-profit/30 text-profit",
                    param.importance >= 40 && param.importance < 70 && "border-warning/30 text-warning",
                    param.importance < 40 && "border-muted-foreground/30"
                  )}
                >
                  {getImportanceLabel(param.importance)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
