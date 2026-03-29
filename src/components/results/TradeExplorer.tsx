/**
 * Trade Explorer Component
 * Advanced filtering and analysis for backtest trades
 */

import { useState, useMemo } from 'react';
import {
  Filter, Download, ArrowUpDown, Calendar, Clock,
  TrendingUp, TrendingDown, BarChart3, ChevronDown,
  X, Search, SlidersHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface ExplorerTrade {
  id: string;
  entryTime: string;
  exitTime: string;
  symbol?: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  commission?: number;
  mae?: number; // Max Adverse Excursion
  mfe?: number; // Max Favorable Excursion
  holdBars?: number;
  exitReason?: string;
}

interface TradeExplorerProps {
  trades: ExplorerTrade[];
  symbol?: string;
}

type SortField = 'entryTime' | 'exitTime' | 'pnl' | 'pnlPercent' | 'duration' | 'mae' | 'mfe';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function TradeExplorer({ trades, symbol }: TradeExplorerProps) {
  // Filter states
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [direction, setDirection] = useState<'all' | 'long' | 'short'>('all');
  const [profitFilter, setProfitFilter] = useState<'all' | 'profit' | 'loss'>('all');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([0,1,2,3,4,5,6]);
  const [sessionStart, setSessionStart] = useState('');
  const [sessionEnd, setSessionEnd] = useState('');
  const [pnlMin, setPnlMin] = useState<number | ''>('');
  const [pnlMax, setPnlMax] = useState<number | ''>('');
  
  // Sort states
  const [sortField, setSortField] = useState<SortField>('entryTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // UI states
  const [showFilters, setShowFilters] = useState(false);

  // Calculate trade duration in bars or minutes
  const getTradeDuration = (trade: ExplorerTrade): number => {
    if (trade.holdBars) return trade.holdBars;
    const entry = new Date(trade.entryTime).getTime();
    const exit = new Date(trade.exitTime).getTime();
    return Math.round((exit - entry) / 60000); // minutes
  };

  // Filter trades
  const filteredTrades = useMemo(() => {
    let filtered = [...trades];

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      filtered = filtered.filter(t => new Date(t.entryTime).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      filtered = filtered.filter(t => new Date(t.entryTime).getTime() <= to);
    }

    // Direction filter
    if (direction !== 'all') {
      filtered = filtered.filter(t => t.direction === direction);
    }

    // Profit/Loss filter
    if (profitFilter === 'profit') {
      filtered = filtered.filter(t => t.pnl >= 0);
    } else if (profitFilter === 'loss') {
      filtered = filtered.filter(t => t.pnl < 0);
    }

    // Weekday filter
    if (selectedWeekdays.length < 7) {
      filtered = filtered.filter(t => {
        const day = new Date(t.entryTime).getDay();
        return selectedWeekdays.includes(day);
      });
    }

    // Session filter
    if (sessionStart && sessionEnd) {
      filtered = filtered.filter(t => {
        const time = new Date(t.entryTime).toTimeString().slice(0, 5);
        return time >= sessionStart && time <= sessionEnd;
      });
    }

    // PnL range filter
    if (pnlMin !== '') {
      filtered = filtered.filter(t => t.pnl >= pnlMin);
    }
    if (pnlMax !== '') {
      filtered = filtered.filter(t => t.pnl <= pnlMax);
    }

    return filtered;
  }, [trades, dateFrom, dateTo, direction, profitFilter, selectedWeekdays, sessionStart, sessionEnd, pnlMin, pnlMax]);

  // Sort trades
  const sortedTrades = useMemo(() => {
    const sorted = [...filteredTrades];
    sorted.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortField) {
        case 'entryTime':
          aVal = new Date(a.entryTime).getTime();
          bVal = new Date(b.entryTime).getTime();
          break;
        case 'exitTime':
          aVal = new Date(a.exitTime).getTime();
          bVal = new Date(b.exitTime).getTime();
          break;
        case 'pnl':
          aVal = a.pnl;
          bVal = b.pnl;
          break;
        case 'pnlPercent':
          aVal = a.pnlPercent;
          bVal = b.pnlPercent;
          break;
        case 'duration':
          aVal = getTradeDuration(a);
          bVal = getTradeDuration(b);
          break;
        case 'mae':
          aVal = a.mae || 0;
          bVal = b.mae || 0;
          break;
        case 'mfe':
          aVal = a.mfe || 0;
          bVal = b.mfe || 0;
          break;
        default:
          aVal = 0;
          bVal = 0;
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [filteredTrades, sortField, sortOrder]);

  // Stats for filtered trades
  const stats = useMemo(() => {
    if (filteredTrades.length === 0) return null;
    
    const wins = filteredTrades.filter(t => t.pnl > 0);
    const losses = filteredTrades.filter(t => t.pnl < 0);
    const totalPnl = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);
    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length) : 0;
    
    return {
      total: filteredTrades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: (wins.length / filteredTrades.length) * 100,
      totalPnl,
      avgWin,
      avgLoss,
      profitFactor: avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0,
    };
  }, [filteredTrades]);

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setDirection('all');
    setProfitFilter('all');
    setSelectedWeekdays([0,1,2,3,4,5,6]);
    setSessionStart('');
    setSessionEnd('');
    setPnlMin('');
    setPnlMax('');
  };

  const exportTrades = () => {
    const headers = ['Entry Time', 'Exit Time', 'Symbol', 'Direction', 'Entry Price', 'Exit Price', 'P&L', 'P&L %', 'MAE', 'MFE', 'Duration'];
    const rows = sortedTrades.map(t => [
      t.entryTime,
      t.exitTime,
      t.symbol || symbol || '',
      t.direction,
      t.entryPrice.toFixed(2),
      t.exitPrice.toFixed(2),
      t.pnl.toFixed(2),
      t.pnlPercent.toFixed(2),
      t.mae?.toFixed(2) || '',
      t.mfe?.toFixed(2) || '',
      getTradeDuration(t).toString(),
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Trades exported!');
  };

  const hasActiveFilters = dateFrom || dateTo || direction !== 'all' || profitFilter !== 'all' 
    || selectedWeekdays.length < 7 || sessionStart || sessionEnd || pnlMin !== '' || pnlMax !== '';

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Search className="h-5 w-5" />
            Trade Explorer
          </h3>
          <Badge variant="secondary">
            {filteredTrades.length} / {trades.length} trades
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center text-xs">!</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
                
                <Separator />
                
                {/* Date Range */}
                <div className="space-y-2">
                  <Label className="text-xs">Date Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input 
                      type="date" 
                      value={dateFrom} 
                      onChange={(e) => setDateFrom(e.target.value)}
                      placeholder="From"
                    />
                    <Input 
                      type="date" 
                      value={dateTo} 
                      onChange={(e) => setDateTo(e.target.value)}
                      placeholder="To"
                    />
                  </div>
                </div>
                
                {/* Direction */}
                <div className="space-y-2">
                  <Label className="text-xs">Direction</Label>
                  <Select value={direction} onValueChange={(v) => setDirection(v as 'all' | 'long' | 'short')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="long">Long Only</SelectItem>
                      <SelectItem value="short">Short Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Profit/Loss */}
                <div className="space-y-2">
                  <Label className="text-xs">Result</Label>
                  <Select value={profitFilter} onValueChange={(v) => setProfitFilter(v as 'all' | 'profit' | 'loss')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="profit">Winners Only</SelectItem>
                      <SelectItem value="loss">Losers Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Weekdays */}
                <div className="space-y-2">
                  <Label className="text-xs">Weekdays</Label>
                  <div className="flex gap-1">
                    {WEEKDAYS.map((day, i) => (
                      <Button
                        key={day}
                        variant={selectedWeekdays.includes(i) ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 w-8 p-0 text-xs"
                        onClick={() => toggleWeekday(i)}
                      >
                        {day[0]}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Session Time */}
                <div className="space-y-2">
                  <Label className="text-xs">Session Window</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input 
                      type="time" 
                      value={sessionStart} 
                      onChange={(e) => setSessionStart(e.target.value)}
                      placeholder="Start"
                    />
                    <Input 
                      type="time" 
                      value={sessionEnd} 
                      onChange={(e) => setSessionEnd(e.target.value)}
                      placeholder="End"
                    />
                  </div>
                </div>
                
                {/* PnL Range */}
                <div className="space-y-2">
                  <Label className="text-xs">P&L Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input 
                      type="number" 
                      value={pnlMin} 
                      onChange={(e) => setPnlMin(e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder="Min"
                    />
                    <Input 
                      type="number" 
                      value={pnlMax} 
                      onChange={(e) => setPnlMax(e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder="Max"
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
            <SelectTrigger className="w-32">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entryTime">Entry Time</SelectItem>
              <SelectItem value="exitTime">Exit Time</SelectItem>
              <SelectItem value="pnl">P&L</SelectItem>
              <SelectItem value="pnlPercent">P&L %</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
              <SelectItem value="mae">MAE</SelectItem>
              <SelectItem value="mfe">MFE</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Button>
          
          <Button variant="outline" size="sm" onClick={exportTrades}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          <div className="p-2 rounded-lg border text-center">
            <div className="text-lg font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Trades</div>
          </div>
          <div className="p-2 rounded-lg border text-center">
            <div className="text-lg font-bold text-profit">{stats.wins}</div>
            <div className="text-xs text-muted-foreground">Wins</div>
          </div>
          <div className="p-2 rounded-lg border text-center">
            <div className="text-lg font-bold text-loss">{stats.losses}</div>
            <div className="text-xs text-muted-foreground">Losses</div>
          </div>
          <div className="p-2 rounded-lg border text-center">
            <div className="text-lg font-bold">{stats.winRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Win Rate</div>
          </div>
          <div className="p-2 rounded-lg border text-center">
            <div className={cn('text-lg font-bold', stats.totalPnl >= 0 ? 'text-profit' : 'text-loss')}>
              ₹{stats.totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-muted-foreground">Total P&L</div>
          </div>
          <div className="p-2 rounded-lg border text-center">
            <div className="text-lg font-bold text-profit">₹{stats.avgWin.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">Avg Win</div>
          </div>
          <div className="p-2 rounded-lg border text-center">
            <div className="text-lg font-bold text-loss">₹{stats.avgLoss.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">Avg Loss</div>
          </div>
          <div className="p-2 rounded-lg border text-center">
            <div className="text-lg font-bold">{stats.profitFactor.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">PF</div>
          </div>
        </div>
      )}

      {/* Trades Table - with responsive wrapper */}
      <Card>
        <CardContent className="p-0">
          <div className="w-full max-w-full overflow-x-auto">
            <ScrollArea className="h-[400px]">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-36">Entry</TableHead>
                    <TableHead className="w-36">Exit</TableHead>
                    <TableHead className="w-16">Dir</TableHead>
                    <TableHead className="text-right w-20">Entry $</TableHead>
                    <TableHead className="text-right w-20">Exit $</TableHead>
                    <TableHead className="text-right w-20">P&L</TableHead>
                    <TableHead className="text-right w-16">P&L %</TableHead>
                    <TableHead className="text-right w-16 hidden lg:table-cell">MAE</TableHead>
                    <TableHead className="text-right w-16 hidden lg:table-cell">MFE</TableHead>
                    <TableHead className="text-right w-20 hidden xl:table-cell">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTrades.slice(0, 200).map((trade, i) => (
                    <TableRow key={trade.id || i}>
                      <TableCell className="font-mono text-xs truncate max-w-[140px]">
                        {new Date(trade.entryTime).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs truncate max-w-[140px]">
                        {new Date(trade.exitTime).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={trade.direction === 'long' ? 'default' : 'secondary'} className="text-xs">
                          {trade.direction === 'long' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {trade.entryPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {trade.exitPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className={cn('text-right font-mono font-medium', trade.pnl >= 0 ? 'text-profit' : 'text-loss')}>
                        ₹{trade.pnl.toFixed(0)}
                      </TableCell>
                      <TableCell className={cn('text-right font-mono text-xs', trade.pnlPercent >= 0 ? 'text-profit' : 'text-loss')}>
                        {trade.pnlPercent.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-loss hidden lg:table-cell">
                        {trade.mae ? `${trade.mae.toFixed(2)}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-profit hidden lg:table-cell">
                        {trade.mfe ? `${trade.mfe.toFixed(2)}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs hidden xl:table-cell">
                        {getTradeDuration(trade)} {trade.holdBars ? 'bars' : 'min'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {sortedTrades.length > 200 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Showing first 200 of {sortedTrades.length} trades
                </div>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
