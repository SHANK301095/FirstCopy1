/**
 * Optimization Progress Heatmap - P1 Optimizer
 */

import { useMemo } from 'react';
import { Grid3x3, TrendingUp, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OptimizationResult {
  params: Record<string, number>;
  score: number;
  generation?: number;
}

interface OptimizationHeatmapProps {
  results: OptimizationResult[];
  paramX: string;
  paramY: string;
  metric?: string;
  className?: string;
}

export function OptimizationHeatmap({
  results,
  paramX,
  paramY,
  metric = 'Score',
  className,
}: OptimizationHeatmapProps) {
  const heatmapData = useMemo(() => {
    if (results.length === 0) return null;

    // Get unique values for each param
    const xValues = [...new Set(results.map(r => r.params[paramX]))].sort((a, b) => a - b);
    const yValues = [...new Set(results.map(r => r.params[paramY]))].sort((a, b) => a - b);

    // Create grid
    const grid: (number | null)[][] = yValues.map(() => 
      xValues.map(() => null)
    );

    // Fill grid with scores
    results.forEach(r => {
      const xIdx = xValues.indexOf(r.params[paramX]);
      const yIdx = yValues.indexOf(r.params[paramY]);
      if (xIdx !== -1 && yIdx !== -1) {
        const current = grid[yIdx][xIdx];
        grid[yIdx][xIdx] = current === null ? r.score : Math.max(current, r.score);
      }
    });

    // Calculate min/max for color scale
    const flatScores = grid.flat().filter((s): s is number => s !== null);
    const minScore = Math.min(...flatScores);
    const maxScore = Math.max(...flatScores);

    // Find best cell
    let bestX = 0, bestY = 0, bestScore = -Infinity;
    grid.forEach((row, y) => {
      row.forEach((score, x) => {
        if (score !== null && score > bestScore) {
          bestScore = score;
          bestX = x;
          bestY = y;
        }
      });
    });

    return { 
      grid, 
      xValues, 
      yValues, 
      minScore, 
      maxScore,
      bestCell: { x: bestX, y: bestY, score: bestScore },
    };
  }, [results, paramX, paramY]);

  const getColor = (score: number | null, minScore: number, maxScore: number) => {
    if (score === null) return 'bg-muted/30';
    const normalized = (score - minScore) / (maxScore - minScore || 1);
    if (normalized > 0.8) return 'bg-profit';
    if (normalized > 0.6) return 'bg-profit/70';
    if (normalized > 0.4) return 'bg-warning';
    if (normalized > 0.2) return 'bg-warning/70';
    return 'bg-loss/70';
  };

  if (!heatmapData) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="py-8 text-center">
          <Grid3x3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No optimization data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Grid3x3 className="h-4 w-4 text-primary" />
            Parameter Heatmap
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            <Target className="h-3 w-3 mr-1" />
            Best: {heatmapData.bestCell.score.toFixed(2)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {paramX} vs {paramY}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* X-axis labels */}
            <div className="flex items-end mb-1">
              <div className="w-12" /> {/* Spacer for Y labels */}
              {heatmapData.xValues.map((val, idx) => (
                <div 
                  key={idx}
                  className="flex-1 min-w-[32px] text-center text-[10px] text-muted-foreground"
                >
                  {val}
                </div>
              ))}
            </div>

            {/* Grid */}
            {heatmapData.grid.map((row, yIdx) => (
              <div key={yIdx} className="flex items-center">
                {/* Y-axis label */}
                <div className="w-12 text-right pr-2 text-[10px] text-muted-foreground">
                  {heatmapData.yValues[yIdx]}
                </div>
                
                {/* Cells */}
                {row.map((score, xIdx) => {
                  const isBest = xIdx === heatmapData.bestCell.x && yIdx === heatmapData.bestCell.y;
                  
                  return (
                    <div
                      key={xIdx}
                      className={cn(
                        "flex-1 min-w-[32px] h-8 m-0.5 rounded-sm flex items-center justify-center",
                        "text-[10px] font-mono transition-transform hover:scale-110 cursor-pointer",
                        getColor(score, heatmapData.minScore, heatmapData.maxScore),
                        isBest && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                      )}
                      title={`${paramX}=${heatmapData.xValues[xIdx]}, ${paramY}=${heatmapData.yValues[yIdx]}: ${score?.toFixed(2) ?? 'N/A'}`}
                    >
                      {score !== null ? score.toFixed(1) : '—'}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-loss/70" />
            <span className="text-[10px] text-muted-foreground">Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-warning" />
            <span className="text-[10px] text-muted-foreground">Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-profit" />
            <span className="text-[10px] text-muted-foreground">High</span>
          </div>
        </div>

        {/* Axis labels */}
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>← {paramX} →</span>
          <span>↑ {paramY} ↓</span>
        </div>
      </CardContent>
    </Card>
  );
}
