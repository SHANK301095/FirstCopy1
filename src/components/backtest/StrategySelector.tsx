/**
 * Strategy Selector Component
 * Select from saved strategies - no re-upload needed
 */

import { useState, useMemo } from 'react';
import { Code, ChevronDown, Search, Clock, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { CloudStrategy } from '@/lib/dataService';

interface StrategySelectorProps {
  strategies: CloudStrategy[];
  selectedStrategy: CloudStrategy | null;
  onSelect: (strategy: CloudStrategy) => void;
  disabled?: boolean;
}

export function StrategySelector({ 
  strategies, 
  selectedStrategy, 
  onSelect, 
  disabled 
}: StrategySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Filter strategies by search
  const filteredStrategies = useMemo(() => {
    if (!search.trim()) return strategies;
    const lower = search.toLowerCase();
    return strategies.filter(s => 
      s.name.toLowerCase().includes(lower) ||
      (s.notes && s.notes.toLowerCase().includes(lower)) ||
      (s.version && s.version.toLowerCase().includes(lower))
    );
  }, [strategies, search]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
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
            !selectedStrategy && "text-muted-foreground"
          )}
        >
          {selectedStrategy ? (
            <div className="flex items-center gap-2 min-w-0">
              <Code className="h-4 w-4 shrink-0 text-primary" />
              <div className="truncate">
                <span className="font-medium">{selectedStrategy.name}</span>
                {selectedStrategy.version && (
                  <span className="text-muted-foreground ml-2">v{selectedStrategy.version}</span>
                )}
              </div>
            </div>
          ) : (
            <span className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Select strategy...
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
              placeholder="Search strategies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          {filteredStrategies.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No strategies found</p>
              <p className="text-xs mt-1">Create strategies in Strategy Library first</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredStrategies.map(strategy => (
                <button
                  key={strategy.id}
                  onClick={() => {
                    onSelect(strategy);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-3 rounded-lg transition-colors",
                    "hover:bg-accent/50",
                    selectedStrategy?.id === strategy.id && "bg-primary/10 border border-primary/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-primary" />
                      <span className="font-medium">{strategy.name}</span>
                    </div>
                    {strategy.version && (
                      <Badge variant="outline" className="text-[10px]">
                        v{strategy.version}
                      </Badge>
                    )}
                  </div>
                  {strategy.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1 pl-6">
                      {strategy.notes}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground pl-6">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(strategy.updated_at || strategy.created_at)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
