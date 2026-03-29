/**
 * Dataset Selector Component
 * Select from saved datasets - no re-upload needed
 */

import { useState, useMemo } from 'react';
import { Database, Folder, ChevronDown, Calendar, BarChart3, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { CloudDataset } from '@/lib/dataService';

interface DatasetSelectorProps {
  datasets: CloudDataset[];
  selectedDataset: CloudDataset | null;
  onSelect: (dataset: CloudDataset) => void;
  disabled?: boolean;
}

export function DatasetSelector({ 
  datasets, 
  selectedDataset, 
  onSelect, 
  disabled 
}: DatasetSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Group datasets by symbol
  const groupedDatasets = useMemo(() => {
    const groups: Record<string, CloudDataset[]> = {};
    datasets.forEach(d => {
      const symbol = d.symbol || 'Unknown';
      if (!groups[symbol]) groups[symbol] = [];
      groups[symbol].push(d);
    });
    // Sort by symbol, then by date range
    Object.keys(groups).forEach(symbol => {
      groups[symbol].sort((a, b) => (b.range_from_ts || 0) - (a.range_from_ts || 0));
    });
    return groups;
  }, [datasets]);

  const symbols = Object.keys(groupedDatasets).sort();

  // Filter by search
  const filteredSymbols = useMemo(() => {
    if (!search.trim()) return symbols;
    const lower = search.toLowerCase();
    return symbols.filter(sym => 
      sym.toLowerCase().includes(lower) ||
      groupedDatasets[sym].some(d => d.name.toLowerCase().includes(lower))
    );
  }, [symbols, search, groupedDatasets]);

  const formatDateRange = (fromTs: number | null, toTs: number | null) => {
    if (!fromTs || !toTs) return 'Unknown range';
    const from = new Date(fromTs).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
    const to = new Date(toTs).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
    return `${from} – ${to}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-12 text-left font-normal",
            !selectedDataset && "text-muted-foreground"
          )}
        >
          {selectedDataset ? (
            <div className="flex items-center gap-2 min-w-0">
              <Database className="h-4 w-4 shrink-0 text-primary" />
              <div className="truncate">
                <span className="font-medium">{selectedDataset.symbol}</span>
                <span className="text-muted-foreground ml-2">
                  {selectedDataset.name}
                </span>
              </div>
            </div>
          ) : (
            <span className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Select dataset...
            </span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search symbols or datasets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          {filteredSymbols.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No datasets found</p>
              <p className="text-xs mt-1">Import datasets in Data Manager first</p>
            </div>
          ) : (
            <div className="p-2">
              {filteredSymbols.map(symbol => (
                <div key={symbol} className="mb-3">
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Folder className="h-3 w-3" />
                    {symbol}
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      {groupedDatasets[symbol].length}
                    </Badge>
                  </div>
                  <div className="space-y-1 mt-1">
                    {groupedDatasets[symbol].map(dataset => (
                      <button
                        key={dataset.id}
                        onClick={() => {
                          onSelect(dataset);
                          setOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg transition-colors",
                          "hover:bg-accent/50",
                          selectedDataset?.id === dataset.id && "bg-primary/10 border border-primary/30"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">{dataset.name}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
                            {dataset.timeframe || 'Unknown'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateRange(dataset.range_from_ts, dataset.range_to_ts)}
                          </span>
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {(dataset.row_count || 0).toLocaleString()} rows
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
