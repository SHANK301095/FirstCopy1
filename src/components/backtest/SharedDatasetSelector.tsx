/**
 * Shared Dataset Selector for Backtest Tab
 * Allows users to select from public shared datasets with date range filtering
 * and server-side aggregation for reduced data transfer
 */

import { useState, useEffect, useMemo } from 'react';
import { Database, Globe, Calendar, ChevronRight, Loader2, Search, Filter, CalendarRange, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getSharedDatasets, type SharedDataset, type AggregationTimeframe, AGGREGATION_OPTIONS } from '@/lib/sharedDataService';
import { useAuth } from '@/contexts/AuthContext';

// Re-export SharedDataset for external use
export type { SharedDataset } from '@/lib/sharedDataService';

export interface DateRangeFilter {
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
}

export interface DatasetSettings {
  dateRange?: DateRangeFilter;
  aggregateTo?: AggregationTimeframe;
}

interface SharedDatasetSelectorProps {
  onSelect: (dataset: SharedDataset | null, settings?: DatasetSettings) => void;
  selectedDataset: SharedDataset | null;
  settings?: DatasetSettings;
  disabled?: boolean;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', {
    year: '2-digit',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateISO(ts: number): string {
  return new Date(ts).toISOString().split('T')[0];
}

function formatRows(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
}

export function SharedDatasetSelector({
  onSelect,
  selectedDataset,
  settings,
  disabled = false,
}: SharedDatasetSelectorProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [datasets, setDatasets] = useState<SharedDataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  
  // Local date range state for the filter
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  
  // Aggregation timeframe
  const [aggregateTo, setAggregateTo] = useState<AggregationTimeframe | undefined>(
    settings?.aggregateTo
  );

  // Initialize filter dates when dataset is selected
  useEffect(() => {
    if (selectedDataset) {
      const start = settings?.dateRange?.startDate || formatDateISO(selectedDataset.range_from_ts);
      const end = settings?.dateRange?.endDate || formatDateISO(selectedDataset.range_to_ts);
      setFilterStartDate(start);
      setFilterEndDate(end);
      // Set aggregation to dataset's native timeframe by default
      if (!settings?.aggregateTo) {
        setAggregateTo(selectedDataset.timeframe as AggregationTimeframe);
      } else {
        setAggregateTo(settings.aggregateTo);
      }
    }
  }, [selectedDataset, settings]);

  // Load datasets
  useEffect(() => {
    const loadDatasets = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const data = await getSharedDatasets();
        setDatasets(data);
      } catch (err) {
        console.error('Failed to load shared datasets:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDatasets();
  }, [user]);

  // Filtered datasets by search
  const filteredDatasets = useMemo(() => {
    if (!searchQuery) return datasets;
    const query = searchQuery.toLowerCase();
    return datasets.filter(d =>
      d.symbol.toLowerCase().includes(query) ||
      d.name.toLowerCase().includes(query) ||
      d.timeframe.toLowerCase().includes(query)
    );
  }, [datasets, searchQuery]);

  // Group by symbol
  const groupedDatasets = useMemo(() => {
    const groups = new Map<string, SharedDataset[]>();
    filteredDatasets.forEach(d => {
      const existing = groups.get(d.symbol) || [];
      existing.push(d);
      groups.set(d.symbol, existing);
    });
    return groups;
  }, [filteredDatasets]);

  // Apply date range filter
  const applyDateRange = () => {
    if (selectedDataset && filterStartDate && filterEndDate) {
      onSelect(selectedDataset, {
        dateRange: {
          startDate: filterStartDate,
          endDate: filterEndDate,
        },
        aggregateTo,
      });
    }
    setShowDateFilter(false);
  };

  // Reset to full range
  const resetDateRange = () => {
    if (selectedDataset) {
      setFilterStartDate(formatDateISO(selectedDataset.range_from_ts));
      setFilterEndDate(formatDateISO(selectedDataset.range_to_ts));
      setAggregateTo(selectedDataset.timeframe as AggregationTimeframe);
      onSelect(selectedDataset, undefined);
    }
  };

  // Handle aggregation change
  const handleAggregationChange = (value: string) => {
    const newAggTf = value as AggregationTimeframe;
    setAggregateTo(newAggTf);
    if (selectedDataset) {
      onSelect(selectedDataset, {
        dateRange: settings?.dateRange,
        aggregateTo: newAggTf,
      });
    }
  };

  // Check if date range is custom (different from full range)
  const isCustomDateRange = useMemo(() => {
    if (!selectedDataset || !settings?.dateRange) return false;
    const fullStart = formatDateISO(selectedDataset.range_from_ts);
    const fullEnd = formatDateISO(selectedDataset.range_to_ts);
    return settings.dateRange.startDate !== fullStart || settings.dateRange.endDate !== fullEnd;
  }, [selectedDataset, settings?.dateRange]);
  
  // Get available aggregation options (only show timeframes >= source)
  const availableAggregations = useMemo(() => {
    if (!selectedDataset) return AGGREGATION_OPTIONS;
    const sourceMs = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '30m': 1800000,
      '1H': 3600000,
      '4H': 14400000,
      '1D': 86400000,
    };
    const sourceTfMs = sourceMs[selectedDataset.timeframe as keyof typeof sourceMs] || 60000;
    return AGGREGATION_OPTIONS.filter(opt => {
      const optMs = sourceMs[opt.value as keyof typeof sourceMs] || 60000;
      return optMs >= sourceTfMs;
    });
  }, [selectedDataset]);

  if (!user) {
    return (
      <div className="text-sm text-muted-foreground">
        Login to access shared datasets
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Globe className="h-3.5 w-3.5 text-primary" />
        Shared Dataset
      </Label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || loading}
            className={cn(
              'w-full justify-between',
              selectedDataset && 'border-primary/50'
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </span>
            ) : selectedDataset ? (
              <span className="flex items-center gap-2 truncate">
                <Database className="h-4 w-4 text-primary" />
                <span className="font-medium">{selectedDataset.symbol}</span>
                <Badge variant="secondary" className="text-xs">
                  {selectedDataset.timeframe}
                </Badge>
                <span className="text-muted-foreground text-xs">
                  {formatRows(selectedDataset.row_count)} rows
                </span>
              </span>
            ) : datasets.length > 0 ? (
              <span className="text-muted-foreground">
                Select from {datasets.length} public datasets...
              </span>
            ) : (
              <span className="text-muted-foreground">
                No public datasets available
              </span>
            )}
            <ChevronRight className={cn(
              'h-4 w-4 shrink-0 opacity-50 transition-transform',
              open && 'rotate-90'
            )} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[420px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search by symbol, name, or timeframe..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                {datasets.length === 0 
                  ? "No public datasets available yet"
                  : "No matching datasets found"
                }
              </CommandEmpty>
              
              {/* Clear selection option */}
              {selectedDataset && (
                <CommandGroup>
                  <CommandItem
                    value="__clear__"
                    onSelect={() => {
                      onSelect(null);
                      setOpen(false);
                    }}
                    className="text-muted-foreground"
                  >
                    Clear selection (use uploaded data)
                  </CommandItem>
                </CommandGroup>
              )}

              {/* Dataset groups */}
              {Array.from(groupedDatasets.entries()).map(([symbol, items]) => (
                <CommandGroup key={symbol} heading={symbol}>
                  {items.map((dataset) => (
                    <CommandItem
                      key={dataset.id}
                      value={`${dataset.symbol}-${dataset.timeframe}-${dataset.id}`}
                      onSelect={() => {
                        onSelect(dataset);
                        setFilterStartDate(formatDateISO(dataset.range_from_ts));
                        setFilterEndDate(formatDateISO(dataset.range_to_ts));
                        setOpen(false);
                      }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Database className={cn(
                          'h-4 w-4',
                          selectedDataset?.id === dataset.id 
                            ? 'text-primary' 
                            : 'text-muted-foreground'
                        )} />
                        <span className="font-medium">{dataset.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {dataset.timeframe}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatRows(dataset.row_count)}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(dataset.range_from_ts)} - {formatDate(dataset.range_to_ts)}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Selected dataset info with date range filter */}
      {selectedDataset && (
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Full Range:</span>
              <span>{formatDate(selectedDataset.range_from_ts)} — {formatDate(selectedDataset.range_to_ts)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Candles:</span>
              <span>{selectedDataset.row_count.toLocaleString()}</span>
            </div>
            {selectedDataset.source_info && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Source:</span>
                <span>{selectedDataset.source_info}</span>
              </div>
            )}
          </div>

          {/* Date Range Filter */}
          <Collapsible open={showDateFilter} onOpenChange={setShowDateFilter}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "w-full justify-between text-xs h-8",
                  isCustomDateRange && "text-primary"
                )}
                disabled={disabled}
              >
                <span className="flex items-center gap-2">
                  <CalendarRange className="h-3.5 w-3.5" />
                  {isCustomDateRange ? (
                    <>Backtest Period: {settings?.dateRange?.startDate} to {settings?.dateRange?.endDate}</>
                  ) : (
                    <>Filter by Date Range</>
                  )}
                </span>
                <Filter className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  showDateFilter && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="p-3 rounded-lg border border-border/50 bg-muted/30 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <Input
                      type="date"
                      value={filterStartDate}
                      min={formatDateISO(selectedDataset.range_from_ts)}
                      max={filterEndDate || formatDateISO(selectedDataset.range_to_ts)}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="h-8 text-xs"
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <Input
                      type="date"
                      value={filterEndDate}
                      min={filterStartDate || formatDateISO(selectedDataset.range_from_ts)}
                      max={formatDateISO(selectedDataset.range_to_ts)}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="h-8 text-xs"
                      disabled={disabled}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={applyDateRange}
                    disabled={!filterStartDate || !filterEndDate || disabled}
                    className="flex-1 h-7 text-xs"
                  >
                    Apply Range
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={resetDateRange}
                    disabled={disabled}
                    className="h-7 text-xs"
                  >
                    Reset
                  </Button>
                </div>
                {isCustomDateRange && (
                  <p className="text-xs text-muted-foreground text-center">
                    Backtest will use data from {settings?.dateRange?.startDate} to {settings?.dateRange?.endDate}
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
          
          {/* Aggregation Timeframe Selector */}
          <div className="p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              Chart Timeframe (Server Aggregation)
            </Label>
            <Select
              value={aggregateTo || selectedDataset.timeframe}
              onValueChange={handleAggregationChange}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                {availableAggregations.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                    {opt.value === selectedDataset.timeframe && (
                      <span className="ml-2 text-muted-foreground">(native)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {aggregateTo && aggregateTo !== selectedDataset.timeframe && (
              <p className="text-xs text-primary/80">
                ⚡ Data will be aggregated server-side from {selectedDataset.timeframe} → {aggregateTo} for faster loading
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
