/**
 * Shared Datasets Browser
 * Browse and select public market data for backtesting
 * Users can see metadata but cannot download files directly
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Database,
  Search,
  Calendar,
  Clock,
  TrendingUp,
  ChevronRight,
  Globe,
  BarChart3,
  CheckCircle,
  Loader2,
  RefreshCw,
  Info,
  HardDrive,
  Play,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getSharedDatasets, type SharedDataset } from '@/lib/sharedDataService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SharedDatasetsBrowserProps {
  onSelectDataset?: (dataset: SharedDataset) => void;
  selectedDatasetId?: string;
  compact?: boolean;
}

const ASSET_CLASSES = [
  { value: 'all', label: 'All Assets' },
  { value: 'index', label: 'Indices' },
  { value: 'equity', label: 'Equities' },
  { value: 'forex', label: 'Forex' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'commodity', label: 'Commodities' },
];

const TIMEFRAMES = [
  { value: 'all', label: 'All TF' },
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1H', label: '1H' },
  { value: '1D', label: '1D' },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatRows(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
}

export function SharedDatasetsBrowser({
  onSelectDataset,
  selectedDatasetId,
  compact = false,
}: SharedDatasetsBrowserProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [datasets, setDatasets] = useState<SharedDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [assetFilter, setAssetFilter] = useState('all');
  const [timeframeFilter, setTimeframeFilter] = useState('all');

  // Load datasets
  const loadDatasets = async () => {
    setLoading(true);
    try {
      const data = await getSharedDatasets();
      setDatasets(data);
    } catch (err) {
      console.error('Failed to load shared datasets:', err);
      toast({
        title: 'Error',
        description: 'Failed to load market data catalog',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDatasets();
    }
  }, [user]);

  // Filtered datasets
  const filteredDatasets = useMemo(() => {
    return datasets.filter((d) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !d.symbol.toLowerCase().includes(query) &&
          !d.name.toLowerCase().includes(query) &&
          !(d.description?.toLowerCase().includes(query))
        ) {
          return false;
        }
      }
      
      // Timeframe filter
      if (timeframeFilter !== 'all' && d.timeframe !== timeframeFilter) {
        return false;
      }
      
      return true;
    });
  }, [datasets, searchQuery, assetFilter, timeframeFilter]);

  // Group by symbol
  const groupedBySymbol = useMemo(() => {
    const groups = new Map<string, SharedDataset[]>();
    filteredDatasets.forEach((d) => {
      const existing = groups.get(d.symbol) || [];
      existing.push(d);
      groups.set(d.symbol, existing);
    });
    return groups;
  }, [filteredDatasets]);

  if (!user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Login to access market data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(compact && 'border-0 shadow-none')}>
      <CardHeader className={cn('pb-4', compact && 'px-0 pt-0')}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Public Market Data
            </CardTitle>
            <CardDescription>
              Free OHLCV datasets for backtesting
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadDatasets}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className={cn(compact && 'px-0 pb-0')}>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search symbols..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={timeframeFilter} onValueChange={setTimeframeFilter}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAMES.map((tf) => (
                <SelectItem key={tf.value} value={tf.value}>
                  {tf.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Summary */}
        <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Database className="h-4 w-4" />
            {datasets.length} datasets
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            {groupedBySymbol.size} symbols
          </span>
          <span className="flex items-center gap-1">
            <HardDrive className="h-4 w-4" />
            {formatRows(datasets.reduce((sum, d) => sum + d.row_count, 0))} total rows
          </span>
        </div>

        {/* Dataset List */}
        <ScrollArea className={cn('pr-4', compact ? 'h-[300px]' : 'h-[400px]')}>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredDatasets.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {datasets.length === 0
                  ? 'No public datasets available yet'
                  : 'No datasets match your filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDatasets.map((dataset) => (
                <div
                  key={dataset.id}
                  onClick={() => onSelectDataset?.(dataset)}
                  className={cn(
                    'p-4 rounded-lg border transition-all cursor-pointer group',
                    selectedDatasetId === dataset.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg">{dataset.symbol}</span>
                        <Badge variant="secondary" className="text-xs">
                          {dataset.timeframe}
                        </Badge>
                        {selectedDatasetId === dataset.id && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {dataset.name}
                      </p>
                      {dataset.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {dataset.description}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-sm font-medium">
                              {formatRows(dataset.row_count)} rows
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {dataset.row_count.toLocaleString()} candles
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <div className="text-xs text-muted-foreground">
                        {formatBytes(dataset.file_size_bytes)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(dataset.range_from_ts)} — {formatDate(dataset.range_to_ts)}
                    </span>
                    {dataset.source_info && (
                      <span className="flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        {dataset.source_info}
                      </span>
                    )}
                  </div>

                  {onSelectDataset && (
                    <div className="flex items-center justify-end mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" className="gap-1">
                        <Play className="h-3 w-3" />
                        Use for Backtest
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Info Banner */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-dashed">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Public datasets are provided free for backtesting. Data is streamed directly to 
              your backtest engine — no downloads required. Select a dataset and run your strategy!
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
