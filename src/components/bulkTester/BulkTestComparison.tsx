/**
 * Bulk Test Comparison View
 * Compare multiple completed batch test results side-by-side
 */

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Award,
  Scale,
  ArrowUpDown,
  Check,
  X,
  Plus,
  Minus,
  ChevronDown,
  Trophy,
  Medal,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { BulkTestItem } from '@/lib/bulkTesterStore';

interface BulkTestComparisonProps {
  items: BulkTestItem[];
  className?: string;
}

type SortField = 'eaName' | 'netProfit' | 'profitFactor' | 'winRate' | 'maxDrawdown' | 'sharpeRatio';
type SortDirection = 'asc' | 'desc';

const METRIC_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--profit))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--accent))',
];

export function BulkTestComparison({ items, className }: BulkTestComparisonProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('netProfit');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [rankingMetric, setRankingMetric] = useState<SortField>('profitFactor');

  // Filter completed items with results
  const completedItems = useMemo(() => 
    items.filter(i => (i.status === 'completed' || i.status === 'cached') && i.result),
    [items]
  );

  // Sort items
  const sortedItems = useMemo(() => {
    return [...completedItems].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;
      
      switch (sortField) {
        case 'eaName':
          aVal = a.eaName;
          bVal = b.eaName;
          break;
        case 'netProfit':
          aVal = a.result?.netProfit || 0;
          bVal = b.result?.netProfit || 0;
          break;
        case 'profitFactor':
          aVal = a.result?.profitFactor || 0;
          bVal = b.result?.profitFactor || 0;
          break;
        case 'winRate':
          aVal = a.result?.winRate || 0;
          bVal = b.result?.winRate || 0;
          break;
        case 'maxDrawdown':
          aVal = a.result?.maxDrawdownPct || 0;
          bVal = b.result?.maxDrawdownPct || 0;
          break;
        case 'sharpeRatio':
          aVal = a.result?.sharpeRatio || 0;
          bVal = b.result?.sharpeRatio || 0;
          break;
      }
      
      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }
      
      return sortDirection === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
    });
  }, [completedItems, sortField, sortDirection]);

  // Selected items for comparison
  const selectedItems = useMemo(() => 
    sortedItems.filter(i => selectedIds.has(i.id)),
    [sortedItems, selectedIds]
  );

  // Ranking by selected metric
  const rankings = useMemo(() => {
    const ranked = [...completedItems].sort((a, b) => {
      const aVal = a.result?.[rankingMetric] || 0;
      const bVal = b.result?.[rankingMetric] || 0;
      // Higher is better for all except maxDrawdown
      if (rankingMetric === 'maxDrawdown') {
        return (aVal as number) - (bVal as number);
      }
      return (bVal as number) - (aVal as number);
    });
    return ranked.map((item, index) => ({ ...item, rank: index + 1 }));
  }, [completedItems, rankingMetric]);

  // Radar chart data for selected items
  const radarData = useMemo(() => {
    if (selectedItems.length === 0) return [];
    
    // Normalize metrics to 0-100 scale
    const normalize = (value: number, min: number, max: number) => {
      if (max === min) return 50;
      return ((value - min) / (max - min)) * 100;
    };
    
    const allResults = completedItems.map(i => i.result!);
    const metrics = {
      profitFactor: { min: Math.min(...allResults.map(r => r.profitFactor)), max: Math.max(...allResults.map(r => r.profitFactor)) },
      winRate: { min: Math.min(...allResults.map(r => r.winRate)), max: Math.max(...allResults.map(r => r.winRate)) },
      sharpeRatio: { min: Math.min(...allResults.map(r => r.sharpeRatio)), max: Math.max(...allResults.map(r => r.sharpeRatio)) },
      netProfit: { min: Math.min(...allResults.map(r => r.netProfit)), max: Math.max(...allResults.map(r => r.netProfit)) },
      // Invert drawdown (lower is better)
      maxDrawdown: { min: Math.min(...allResults.map(r => r.maxDrawdownPct)), max: Math.max(...allResults.map(r => r.maxDrawdownPct)) },
    };
    
    const dimensions = ['Profit Factor', 'Win Rate', 'Sharpe Ratio', 'Net Profit', 'Risk (inv DD)'];
    
    return dimensions.map((dim, idx) => {
      const point: Record<string, string | number> = { dimension: dim };
      selectedItems.forEach((item, i) => {
        const r = item.result!;
        let value = 0;
        switch (idx) {
          case 0: value = normalize(r.profitFactor, metrics.profitFactor.min, metrics.profitFactor.max); break;
          case 1: value = normalize(r.winRate, metrics.winRate.min, metrics.winRate.max); break;
          case 2: value = normalize(r.sharpeRatio, metrics.sharpeRatio.min, metrics.sharpeRatio.max); break;
          case 3: value = normalize(r.netProfit, metrics.netProfit.min, metrics.netProfit.max); break;
          case 4: value = 100 - normalize(r.maxDrawdownPct, metrics.maxDrawdown.min, metrics.maxDrawdown.max); break;
        }
        point[item.eaName] = Math.max(0, Math.min(100, value));
      });
      return point;
    });
  }, [selectedItems, completedItems]);

  // Bar chart data for comparison
  const barData = useMemo(() => {
    return selectedItems.map(item => ({
      name: item.eaName.slice(0, 12),
      netProfit: item.result?.netProfit || 0,
      profitFactor: (item.result?.profitFactor || 0) * 1000,
      winRate: item.result?.winRate || 0,
      sharpeRatio: (item.result?.sharpeRatio || 0) * 20,
    }));
  }, [selectedItems]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 5) {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(sortedItems.slice(0, 5).map(i => i.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (completedItems.length === 0) {
    return (
      <Card className={cn("p-12 text-center", className)}>
        <Scale className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold mb-2">No Results to Compare</h3>
        <p className="text-muted-foreground">
          Complete some tests first to compare their results
        </p>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Rankings Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Rankings
            </CardTitle>
            <Select value={rankingMetric} onValueChange={(v) => setRankingMetric(v as SortField)}>
              <SelectTrigger className="w-40 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profitFactor">Profit Factor</SelectItem>
                <SelectItem value="netProfit">Net Profit</SelectItem>
                <SelectItem value="winRate">Win Rate</SelectItem>
                <SelectItem value="sharpeRatio">Sharpe Ratio</SelectItem>
                <SelectItem value="maxDrawdown">Lowest DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {rankings.slice(0, 5).map((item, idx) => (
              <Badge
                key={item.id}
                variant={idx === 0 ? 'default' : 'outline'}
                className={cn(
                  "py-1.5 px-3 cursor-pointer transition-all",
                  idx === 0 && "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
                  idx === 1 && "bg-gray-400/20 text-gray-400 border-gray-400/30",
                  idx === 2 && "bg-amber-600/20 text-amber-600 border-amber-600/30",
                  selectedIds.has(item.id) && "ring-2 ring-primary"
                )}
                onClick={() => toggleSelection(item.id)}
              >
                <span className="mr-2 font-bold">#{idx + 1}</span>
                {item.eaName}
                <span className="ml-2 font-mono text-xs">
                  {rankingMetric === 'netProfit' && `₹${item.result?.netProfit.toLocaleString()}`}
                  {rankingMetric === 'profitFactor' && item.result?.profitFactor.toFixed(2)}
                  {rankingMetric === 'winRate' && `${item.result?.winRate.toFixed(1)}%`}
                  {rankingMetric === 'sharpeRatio' && item.result?.sharpeRatio.toFixed(2)}
                  {rankingMetric === 'maxDrawdown' && `${item.result?.maxDrawdownPct.toFixed(1)}%`}
                </span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Selection Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Select to Compare (max 5)</CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select Top 5
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-primary"
                      onClick={() => handleSort('eaName')}
                    >
                      EA Name
                      {sortField === 'eaName' && (
                        <ArrowUpDown className="inline h-3 w-3 ml-1" />
                      )}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-primary text-right"
                      onClick={() => handleSort('netProfit')}
                    >
                      Net Profit
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-primary text-right"
                      onClick={() => handleSort('profitFactor')}
                    >
                      PF
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-primary text-right"
                      onClick={() => handleSort('winRate')}
                    >
                      Win%
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((item) => (
                    <TableRow 
                      key={item.id}
                      className={cn(
                        "cursor-pointer",
                        selectedIds.has(item.id) && "bg-primary/5"
                      )}
                      onClick={() => toggleSelection(item.id)}
                    >
                      <TableCell>
                        <Checkbox 
                          checked={selectedIds.has(item.id)}
                          disabled={!selectedIds.has(item.id) && selectedIds.size >= 5}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.eaName}</TableCell>
                      <TableCell className={cn(
                        "text-right font-mono",
                        (item.result?.netProfit || 0) >= 0 ? "text-profit" : "text-loss"
                      )}>
                        ₹{item.result?.netProfit.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.result?.profitFactor.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.result?.winRate.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Radar Chart */}
        {selectedItems.length >= 2 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Performance Radar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis 
                      dataKey="dimension" 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 100]} 
                      tick={{ fontSize: 10 }}
                    />
                    {selectedItems.map((item, idx) => (
                      <Radar
                        key={item.id}
                        name={item.eaName}
                        dataKey={item.eaName}
                        stroke={METRIC_COLORS[idx % METRIC_COLORS.length]}
                        fill={METRIC_COLORS[idx % METRIC_COLORS.length]}
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend />
                    <RechartsTooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Comparison Table */}
      {selectedItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Detailed Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Metric</TableHead>
                    {selectedItems.map(item => (
                      <TableHead key={item.id} className="text-center min-w-[100px]">
                        {item.eaName}
                      </TableHead>
                    ))}
                    <TableHead className="text-center">Best</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Net Profit */}
                  <TableRow>
                    <TableCell className="font-medium">Net Profit</TableCell>
                    {selectedItems.map(item => {
                      const isBest = item.result?.netProfit === Math.max(...selectedItems.map(i => i.result?.netProfit || 0));
                      return (
                        <TableCell key={item.id} className={cn(
                          "text-center font-mono",
                          (item.result?.netProfit || 0) >= 0 ? "text-profit" : "text-loss",
                          isBest && "font-bold"
                        )}>
                          ₹{item.result?.netProfit.toLocaleString()}
                          {isBest && <Trophy className="inline h-3 w-3 ml-1 text-yellow-500" />}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-profit">Higher</Badge>
                    </TableCell>
                  </TableRow>
                  
                  {/* Profit Factor */}
                  <TableRow>
                    <TableCell className="font-medium">Profit Factor</TableCell>
                    {selectedItems.map(item => {
                      const isBest = item.result?.profitFactor === Math.max(...selectedItems.map(i => i.result?.profitFactor || 0));
                      return (
                        <TableCell key={item.id} className={cn(
                          "text-center font-mono",
                          isBest && "font-bold text-profit"
                        )}>
                          {item.result?.profitFactor.toFixed(2)}
                          {isBest && <Trophy className="inline h-3 w-3 ml-1 text-yellow-500" />}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-profit">Higher</Badge>
                    </TableCell>
                  </TableRow>
                  
                  {/* Win Rate */}
                  <TableRow>
                    <TableCell className="font-medium">Win Rate</TableCell>
                    {selectedItems.map(item => {
                      const isBest = item.result?.winRate === Math.max(...selectedItems.map(i => i.result?.winRate || 0));
                      return (
                        <TableCell key={item.id} className={cn(
                          "text-center font-mono",
                          isBest && "font-bold text-profit"
                        )}>
                          {item.result?.winRate.toFixed(1)}%
                          {isBest && <Trophy className="inline h-3 w-3 ml-1 text-yellow-500" />}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-profit">Higher</Badge>
                    </TableCell>
                  </TableRow>
                  
                  {/* Sharpe Ratio */}
                  <TableRow>
                    <TableCell className="font-medium">Sharpe Ratio</TableCell>
                    {selectedItems.map(item => {
                      const isBest = item.result?.sharpeRatio === Math.max(...selectedItems.map(i => i.result?.sharpeRatio || 0));
                      return (
                        <TableCell key={item.id} className={cn(
                          "text-center font-mono",
                          isBest && "font-bold text-profit"
                        )}>
                          {item.result?.sharpeRatio.toFixed(2)}
                          {isBest && <Trophy className="inline h-3 w-3 ml-1 text-yellow-500" />}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-profit">Higher</Badge>
                    </TableCell>
                  </TableRow>
                  
                  {/* Max Drawdown */}
                  <TableRow>
                    <TableCell className="font-medium">Max Drawdown</TableCell>
                    {selectedItems.map(item => {
                      const isBest = item.result?.maxDrawdownPct === Math.min(...selectedItems.map(i => i.result?.maxDrawdownPct || 100));
                      return (
                        <TableCell key={item.id} className={cn(
                          "text-center font-mono text-warning",
                          isBest && "font-bold text-profit"
                        )}>
                          {item.result?.maxDrawdownPct.toFixed(1)}%
                          {isBest && <Trophy className="inline h-3 w-3 ml-1 text-yellow-500" />}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-profit">Lower</Badge>
                    </TableCell>
                  </TableRow>
                  
                  {/* Total Trades */}
                  <TableRow>
                    <TableCell className="font-medium">Total Trades</TableCell>
                    {selectedItems.map(item => (
                      <TableCell key={item.id} className="text-center font-mono">
                        {item.result?.totalTrades}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      <Badge variant="outline">Context</Badge>
                    </TableCell>
                  </TableRow>
                  
                  {/* Symbol/Timeframe */}
                  <TableRow>
                    <TableCell className="font-medium">Config</TableCell>
                    {selectedItems.map(item => (
                      <TableCell key={item.id} className="text-center text-xs text-muted-foreground">
                        {item.symbol} • {item.timeframe}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">-</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bar Chart Comparison */}
      {selectedItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Visual Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={80}
                    tick={{ fontSize: 11 }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'netProfit') return [`₹${value.toLocaleString()}`, 'Net Profit'];
                      if (name === 'profitFactor') return [(value / 1000).toFixed(2), 'Profit Factor'];
                      if (name === 'winRate') return [`${value.toFixed(1)}%`, 'Win Rate'];
                      if (name === 'sharpeRatio') return [(value / 20).toFixed(2), 'Sharpe Ratio'];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="netProfit" fill="hsl(var(--profit))" name="netProfit" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default BulkTestComparison;
