/**
 * Multi-Select with Search - P1 Forms
 */

import { useState, useMemo } from 'react';
import { Check, ChevronDown, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface MultiSelectOption {
  value: string;
  label: string;
  group?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  maxDisplay?: number;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select items...',
  searchPlaceholder = 'Search...',
  maxDisplay = 3,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const lowerSearch = search.toLowerCase();
    return options.filter(opt => 
      opt.label.toLowerCase().includes(lowerSearch) ||
      opt.group?.toLowerCase().includes(lowerSearch)
    );
  }, [options, search]);

  // Group options
  const groupedOptions = useMemo(() => {
    const groups: Record<string, MultiSelectOption[]> = {};
    filteredOptions.forEach(opt => {
      const group = opt.group || 'Other';
      if (!groups[group]) groups[group] = [];
      groups[group].push(opt);
    });
    return groups;
  }, [filteredOptions]);

  const toggleOption = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange(value.filter(v => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  const removeOption = (optValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== optValue));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectedLabels = value
    .map(v => options.find(o => o.value === v)?.label || v)
    .slice(0, maxDisplay);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-auto min-h-10 py-1.5",
            className
          )}
        >
          <div className="flex items-center gap-1 flex-wrap flex-1">
            {value.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <>
                {selectedLabels.map(label => (
                  <Badge
                    key={label}
                    variant="secondary"
                    className="text-xs h-6 gap-1"
                  >
                    {label}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={(e) => removeOption(
                        options.find(o => o.label === label)?.value || label,
                        e
                      )}
                    />
                  </Badge>
                ))}
                {value.length > maxDisplay && (
                  <Badge variant="outline" className="text-xs h-6">
                    +{value.length - maxDisplay} more
                  </Badge>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {value.length > 0 && (
              <X
                className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={clearAll}
              />
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {/* Search */}
        <div className="p-2 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>

        {/* Options */}
        <ScrollArea className="max-h-60">
          {Object.keys(groupedOptions).length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No options found
            </div>
          ) : (
            <div className="p-1">
              {Object.entries(groupedOptions).map(([group, opts]) => (
                <div key={group}>
                  {Object.keys(groupedOptions).length > 1 && (
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      {group}
                    </div>
                  )}
                  {opts.map(opt => {
                    const isSelected = value.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleOption(opt.value)}
                        className={cn(
                          "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm",
                          "hover:bg-muted/50 transition-colors text-left",
                          isSelected && "bg-primary/5"
                        )}
                      >
                        <div className={cn(
                          "h-4 w-4 border rounded-sm flex items-center justify-center",
                          isSelected 
                            ? "bg-primary border-primary" 
                            : "border-input"
                        )}>
                          {isSelected && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {value.length > 0 && (
          <div className="p-2 border-t border-border/50 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {value.length} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onChange([])}
            >
              Clear all
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
