/**
 * My Saved Results Page
 * View, compare, and manage cloud-saved backtest results
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Cloud, Trash2, Eye, GitCompare, BarChart3, Calendar,
  TrendingUp, TrendingDown, Loader2, AlertCircle, RefreshCw,
  ChevronDown, ChevronUp, X, RotateCcw, Search, Filter,
  ArrowUpDown, SlidersHorizontal, GitBranch, Play
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryPageCTA } from '@/components/ui/PrimaryPageCTA';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { PageTitle } from '@/components/ui/PageTitle';
import { fetchResults, deleteResult, type CloudResult, fetchStrategies, fetchStrategyVersions, type CloudStrategy, type CloudStrategyVersion } from '@/lib/cloudSync';
import { useBacktestStore, type BacktestResult, type Trade } from '@/lib/backtestStore';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { PullToRefreshContainer } from '@/components/mobile/PullToRefreshContainer';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

type SortField = 'date' | 'profit' | 'winRate' | 'profitFactor' | 'trades';
type SortOrder = 'asc' | 'desc';

interface ParsedResult {
  id: string;
  created_at: string;
  symbol: string;
  netProfit: number;
  winRate: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  maxDrawdownAmount: number;
  totalTrades: number;
  sharpeRatio: number;
  cagr: number;
  equityCurve: number[];
  drawdownCurve: number[];
  trades: Trade[];
  dateRange: string;
  runAt: string;
  winningTrades: number;
  losingTrades: number;
  grossProfit: number;
  grossLoss: number;
  expectancyR: number;
  // Linked strategy version info
  strategy_version_id: string | null;
  strategyName?: string;
  versionNumber?: string;
  changeSummary?: string;
}

function parseResult(result: CloudResult, versionInfo?: { strategyName: string; version: string; changeSummary: string | null }): ParsedResult {
  const summary = result.summary_json as Record<string, unknown>;
  return {
    id: result.id,
    created_at: result.created_at || new Date().toISOString(),
    symbol: (summary.symbol as string) || 'Unknown',
    netProfit: (summary.netProfit as number) || 0,
    winRate: (summary.winRate as number) || 0,
    profitFactor: (summary.profitFactor as number) || 0,
    maxDrawdownPercent: (summary.maxDrawdownPercent as number) || 0,
    maxDrawdownAmount: (summary.maxDrawdownAmount as number) || 0,
    totalTrades: (summary.totalTrades as number) || 0,
    sharpeRatio: (summary.sharpeRatio as number) || 0,
    cagr: (summary.cagr as number) || 0,
    equityCurve: (summary.equityCurve as number[]) || [],
    drawdownCurve: (summary.drawdownCurve as number[]) || [],
    trades: (summary.trades as Trade[]) || [],
    dateRange: (summary.dateRange as string) || '',
    runAt: (summary.runAt as string) || result.created_at || '',
    winningTrades: (summary.winningTrades as number) || 0,
    losingTrades: (summary.losingTrades as number) || 0,
    grossProfit: (summary.grossProfit as number) || 0,
    grossLoss: (summary.grossLoss as number) || 0,
    expectancyR: (summary.expectancyR as number) || 0,
    strategy_version_id: result.strategy_version_id,
    strategyName: versionInfo?.strategyName,
    versionNumber: versionInfo?.version,
    changeSummary: versionInfo?.changeSummary || undefined,
  };
}

export default function SavedResults() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const setResults = useBacktestStore((s) => s.setResults);
  const [results, setLocalResults] = useState<ParsedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewResult, setViewResult] = useState<ParsedResult | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);

  // Filter & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [profitFilter, setProfitFilter] = useState<'all' | 'profit' | 'loss'>('all');

  // Get unique symbols for filter dropdown
  const uniqueSymbols = useMemo(() => {
    return [...new Set(results.map(r => r.symbol))].sort();
  }, [results]);

  // Filtered and sorted results
  const filteredResults = useMemo(() => {
    let filtered = [...results];

    // Search by symbol
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => r.symbol.toLowerCase().includes(query));
    }

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(r => new Date(r.runAt || r.created_at) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => new Date(r.runAt || r.created_at) <= toDate);
    }

    // Profit/Loss filter
    if (profitFilter === 'profit') {
      filtered = filtered.filter(r => r.netProfit >= 0);
    } else if (profitFilter === 'loss') {
      filtered = filtered.filter(r => r.netProfit < 0);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.runAt || a.created_at).getTime() - new Date(b.runAt || b.created_at).getTime();
          break;
        case 'profit':
          comparison = a.netProfit - b.netProfit;
          break;
        case 'winRate':
          comparison = a.winRate - b.winRate;
          break;
        case 'profitFactor':
          comparison = a.profitFactor - b.profitFactor;
          break;
        case 'trades':
          comparison = a.totalTrades - b.totalTrades;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [results, searchQuery, sortField, sortOrder, dateFrom, dateTo, profitFilter]);

  useEffect(() => {
    loadResults();
  }, [user]);

  async function loadResults() {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [resultsData, strategiesData] = await Promise.all([
        fetchResults(),
        fetchStrategies()
      ]);

      // Build a map of strategy versions with their parent strategy names
      const versionInfoMap = new Map<string, { strategyName: string; version: string; changeSummary: string | null }>();
      
      // Get unique strategy IDs that have linked results
      const linkedStrategyIds = new Set(
        resultsData
          .filter(r => r.strategy_version_id)
          .map(r => r.strategy_version_id as string)
      );

      // Fetch versions for strategies that have linked results
      if (linkedStrategyIds.size > 0) {
        const strategiesWithVersions = await Promise.all(
          strategiesData.map(async (strategy) => {
            const versions = await fetchStrategyVersions(strategy.id);
            return { strategy, versions };
          })
        );

        for (const { strategy, versions } of strategiesWithVersions) {
          for (const version of versions) {
            if (linkedStrategyIds.has(version.id)) {
              versionInfoMap.set(version.id, {
                strategyName: strategy.name,
                version: version.version,
                changeSummary: version.change_summary
              });
            }
          }
        }
      }

      const parsedResults = resultsData.map(result => {
        const versionInfo = result.strategy_version_id 
          ? versionInfoMap.get(result.strategy_version_id) 
          : undefined;
        return parseResult(result, versionInfo);
      });

      setLocalResults(parsedResults);
    } catch (error) {
      toast({
        title: 'Failed to load results',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteResult(id);
      setLocalResults(r => r.filter(res => res.id !== id));
      setSelectedIds(s => {
        const newSet = new Set(s);
        newSet.delete(id);
        return newSet;
      });
      toast({ title: 'Result deleted', description: 'The backtest result has been removed' });
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  }

  function handleRestore(result: ParsedResult) {
    const backtestResult: BacktestResult = {
      id: result.id,
      symbol: result.symbol,
      dateRange: result.dateRange,
      winRate: result.winRate,
      profitFactor: result.profitFactor,
      expectancyR: result.expectancyR,
      maxDrawdownPercent: result.maxDrawdownPercent,
      maxDrawdownAmount: result.maxDrawdownAmount,
      cagr: result.cagr,
      sharpeRatio: result.sharpeRatio,
      totalTrades: result.totalTrades,
      winningTrades: result.winningTrades,
      losingTrades: result.losingTrades,
      netProfit: result.netProfit,
      grossProfit: result.grossProfit,
      grossLoss: result.grossLoss,
      equityCurve: result.equityCurve,
      drawdownCurve: result.drawdownCurve,
      trades: result.trades,
      runAt: result.runAt,
    };

    setResults(backtestResult);
    toast({ 
      title: 'Result restored', 
      description: 'Navigating to Workflow for further analysis...' 
    });
    navigate('/');
  }

  function toggleSelect(id: string) {
    setSelectedIds(s => {
      const newSet = new Set(s);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  function selectAll() {
    if (selectedIds.size === filteredResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResults.map(r => r.id)));
    }
  }

  function clearFilters() {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setProfitFilter('all');
    setSortField('date');
    setSortOrder('desc');
  }

  const hasActiveFilters = searchQuery || dateFrom || dateTo || profitFilter !== 'all' || sortField !== 'date' || sortOrder !== 'desc';

  const selectedResults = filteredResults.filter(r => selectedIds.has(r.id));

  // Prepare comparison data
  const comparisonChartData = compareMode && selectedResults.length >= 2
    ? selectedResults[0].equityCurve.map((_, i) => {
        const point: Record<string, number> = { point: i };
        selectedResults.forEach((r, idx) => {
          point[`equity${idx}`] = r.equityCurve[i] || 0;
        });
        return point;
      })
    : [];

  const chartColors = ['hsl(210, 100%, 55%)', 'hsl(142, 76%, 45%)', 'hsl(45, 93%, 47%)', 'hsl(280, 87%, 65%)'];

  // IMPORTANT: All hooks must be called before any early returns to avoid "Rendered more hooks" error
  const handleRefresh = useCallback(async () => {
    await loadResults();
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <Cloud className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-4">
              Please log in to view your saved backtest results.
            </p>
            <Button asChild>
              <Link to="/login">Log In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading saved results...</p>
        </div>
      </div>
    );
  }

  const content = (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageTitle 
          title="My Saved Results" 
          subtitle={`${results.length} saved backtest${results.length !== 1 ? 's' : ''} in the cloud`}
        />
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadResults} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          {selectedIds.size >= 2 && (
            <Button 
              onClick={() => setCompareMode(true)} 
              className="gap-2"
            >
              <GitCompare className="h-4 w-4" />
              Compare ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {results.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-4">
            <EmptyState
              icon={BarChart3}
              title="No Saved Results"
              description="Run a backtest and save results to cloud to view them here. Or explore public benchmark results from the library."
              primaryAction={{
                label: 'Run Backtest',
                onClick: () => navigate('/workflow'),
                icon: Play,
              }}
              secondaryAction={{
                label: 'Browse Library',
                onClick: () => navigate('/workflow?tab=data'),
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filter & Sort Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Sort */}
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-[140px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="profit">Profit</SelectItem>
                <SelectItem value="winRate">Win Rate</SelectItem>
                <SelectItem value="profitFactor">Profit Factor</SelectItem>
                <SelectItem value="trades">Trades</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {/* Advanced Filters Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">!</Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-4">
                  <div className="font-medium text-sm">Filter Results</div>
                  
                  {/* Date Range */}
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Date Range</label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        placeholder="From"
                        className="text-xs"
                      />
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        placeholder="To"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* Profit/Loss Filter */}
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Profit/Loss</label>
                    <Select value={profitFilter} onValueChange={(v) => setProfitFilter(v as 'all' | 'profit' | 'loss')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Results</SelectItem>
                        <SelectItem value="profit">Profitable Only</SelectItem>
                        <SelectItem value="loss">Losses Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full gap-2">
                      <X className="h-3 w-3" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Selection Controls & Result Count */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox 
                  checked={selectedIds.size === filteredResults.length && filteredResults.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm text-muted-foreground">Select all</span>
              </div>
              {selectedIds.size > 0 && (
                <Badge variant="secondary">{selectedIds.size} selected</Badge>
              )}
            </div>
            {filteredResults.length !== results.length && (
              <span className="text-sm text-muted-foreground">
                Showing {filteredResults.length} of {results.length}
              </span>
            )}
          </div>

          {filteredResults.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Matching Results</h2>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or search query.
                </p>
                <Button variant="outline" onClick={clearFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Results Grid */
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredResults.map((result) => (
                <Card 
                  key={result.id} 
                  className={cn(
                    'transition-all duration-200 hover:shadow-lg',
                    selectedIds.has(result.id) && 'ring-2 ring-primary'
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedIds.has(result.id)}
                          onCheckedChange={() => toggleSelect(result.id)}
                        />
                        <div>
                          <CardTitle className="text-lg">{result.symbol}</CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(result.runAt || result.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge 
                        variant={result.netProfit >= 0 ? 'default' : 'destructive'}
                        className={result.netProfit >= 0 ? 'bg-profit text-profit-foreground' : ''}
                      >
                        {result.netProfit >= 0 ? '+' : ''}₹{result.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </Badge>
                    </div>
                    
                    {/* Strategy Version Badge */}
                    {result.strategyName && (
                      <div className="flex items-center gap-2 text-xs">
                        <GitBranch className="h-3 w-3 text-primary" />
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground">{result.strategyName}</span>
                          {' '}v{result.versionNumber}
                          {result.changeSummary && (
                            <span className="text-muted-foreground"> – {result.changeSummary}</span>
                          )}
                        </span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Mini Stats */}
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center p-2 bg-muted/30 rounded-lg">
                        <div className="font-mono font-semibold">{result.winRate.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Win Rate</div>
                      </div>
                      <div className="text-center p-2 bg-muted/30 rounded-lg">
                        <div className="font-mono font-semibold">{result.profitFactor.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">Profit Factor</div>
                      </div>
                      <div className="text-center p-2 bg-muted/30 rounded-lg">
                        <div className="font-mono font-semibold">{result.totalTrades}</div>
                        <div className="text-xs text-muted-foreground">Trades</div>
                      </div>
                    </div>

                    {/* Mini Equity Chart */}
                    {result.equityCurve.length > 0 && (
                      <div className="h-16">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={result.equityCurve.map((v, i) => ({ i, v }))}>
                            <Line 
                              type="monotone" 
                              dataKey="v" 
                              stroke={result.netProfit >= 0 ? 'hsl(142, 76%, 45%)' : 'hsl(0, 72%, 55%)'}
                              strokeWidth={1.5}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-1"
                        onClick={() => setViewResult(result)}
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => handleRestore(result)}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => setDeleteId(result.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* View Result Dialog */}
      <Dialog open={!!viewResult} onOpenChange={() => setViewResult(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewResult && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  {viewResult.symbol} Backtest Results
                </DialogTitle>
                <DialogDescription className="space-y-1">
                  <span>Run on {new Date(viewResult.runAt || viewResult.created_at).toLocaleString()}</span>
                  {viewResult.strategyName && (
                    <span className="flex items-center gap-1 mt-1">
                      <GitBranch className="h-3 w-3" />
                      Linked to <span className="font-medium">{viewResult.strategyName}</span> v{viewResult.versionNumber}
                      {viewResult.changeSummary && <span> – {viewResult.changeSummary}</span>}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <div className={cn(
                    'text-2xl font-bold font-mono',
                    viewResult.netProfit >= 0 ? 'text-profit' : 'text-loss'
                  )}>
                    ₹{viewResult.netProfit.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Net Profit</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <div className="text-2xl font-bold font-mono">{viewResult.winRate.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">Win Rate</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <div className="text-2xl font-bold font-mono">{viewResult.profitFactor.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Profit Factor</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <div className="text-2xl font-bold font-mono">{viewResult.maxDrawdownPercent.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">Max Drawdown</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <div className="text-2xl font-bold font-mono">{viewResult.sharpeRatio.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <div className="text-2xl font-bold font-mono">{viewResult.cagr.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">CAGR</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <div className="text-2xl font-bold font-mono">{viewResult.totalTrades}</div>
                  <div className="text-xs text-muted-foreground">Total Trades</div>
                </div>
              </div>

              {/* Equity Curve */}
              {viewResult.equityCurve.length > 0 && (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={viewResult.equityCurve.map((v, i) => ({ point: i, equity: v }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                      <XAxis dataKey="point" hide />
                      <YAxis 
                        tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }}
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                        width={55}
                      />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: 'hsl(222, 47%, 8%)', 
                          border: '1px solid hsl(222, 30%, 18%)', 
                          borderRadius: '8px' 
                        }}
                        formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Equity']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="equity" 
                        stroke="hsl(142, 76%, 45%)" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Restore Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button 
                  onClick={() => {
                    handleRestore(viewResult);
                    setViewResult(null);
                  }}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restore to Workflow
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={compareMode} onOpenChange={setCompareMode}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-primary" />
              Compare Results ({selectedResults.length})
            </DialogTitle>
            <DialogDescription>
              Side-by-side comparison of selected backtest results
            </DialogDescription>
          </DialogHeader>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Metric</th>
                  {selectedResults.map((r, i) => (
                    <th key={r.id} className="text-right p-2">
                      <span style={{ color: chartColors[i % chartColors.length] }}>
                        {r.symbol}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 text-muted-foreground">Net Profit</td>
                  {selectedResults.map(r => (
                    <td key={r.id} className={cn('text-right p-2 font-mono', r.netProfit >= 0 ? 'text-profit' : 'text-loss')}>
                      ₹{r.netProfit.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-2 text-muted-foreground">Win Rate</td>
                  {selectedResults.map(r => (
                    <td key={r.id} className="text-right p-2 font-mono">{r.winRate.toFixed(1)}%</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-2 text-muted-foreground">Profit Factor</td>
                  {selectedResults.map(r => (
                    <td key={r.id} className="text-right p-2 font-mono">{r.profitFactor.toFixed(2)}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-2 text-muted-foreground">Max Drawdown</td>
                  {selectedResults.map(r => (
                    <td key={r.id} className="text-right p-2 font-mono text-loss">{r.maxDrawdownPercent.toFixed(1)}%</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-2 text-muted-foreground">Sharpe Ratio</td>
                  {selectedResults.map(r => (
                    <td key={r.id} className="text-right p-2 font-mono">{r.sharpeRatio.toFixed(2)}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-2 text-muted-foreground">CAGR</td>
                  {selectedResults.map(r => (
                    <td key={r.id} className="text-right p-2 font-mono">{r.cagr.toFixed(1)}%</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 text-muted-foreground">Total Trades</td>
                  {selectedResults.map(r => (
                    <td key={r.id} className="text-right p-2 font-mono">{r.totalTrades}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Comparison Chart */}
          {comparisonChartData.length > 0 && (
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                  <XAxis dataKey="point" hide />
                  <YAxis 
                    tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    width={55}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'hsl(222, 47%, 8%)', 
                      border: '1px solid hsl(222, 30%, 18%)', 
                      borderRadius: '8px' 
                    }}
                  />
                  <Legend />
                  {selectedResults.map((r, i) => (
                    <Line 
                      key={r.id}
                      type="monotone" 
                      dataKey={`equity${i}`}
                      name={r.symbol}
                      stroke={chartColors[i % chartColors.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Result?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this backtest result from the cloud. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  // Wrap with pull-to-refresh on mobile
  if (isMobile) {
    return (
      <PullToRefreshContainer onRefresh={handleRefresh} className="h-full">
        {content}
      </PullToRefreshContainer>
    );
  }

  return content;
}
