/**
 * Compact Table Mode - P1 Mobile
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T;
  label: string;
  format?: (value: unknown) => string;
  priority: 'high' | 'medium' | 'low'; // high = always show, medium = show in expanded, low = hide on mobile
}

interface CompactTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  className?: string;
}

export function CompactTable<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  className,
}: CompactTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isCompact, setIsCompact] = useState(true);

  const highPriorityColumns = columns.filter(c => c.priority === 'high');
  const otherColumns = columns.filter(c => c.priority !== 'high');

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatValue = (column: Column<T>, value: unknown): string => {
    if (column.format) return column.format(value);
    if (value === null || value === undefined) return '—';
    return String(value);
  };

  if (!isCompact) {
    // Full table mode
    return (
      <div className={cn("", className)}>
        <div className="flex justify-end mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCompact(true)}
            className="text-xs"
          >
            <Minimize2 className="h-3 w-3 mr-1" />
            Compact View
          </Button>
        </div>
        <ScrollArea className="h-[400px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b border-border/50">
              <tr>
                {columns.map(col => (
                  <th key={String(col.key)} className="text-left p-2 text-xs font-medium text-muted-foreground">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {data.map(item => (
                <tr
                  key={item.id}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map(col => (
                    <td key={String(col.key)} className="p-2 text-xs">
                      {formatValue(col, item[col.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </div>
    );
  }

  // Compact card mode
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCompact(false)}
          className="text-xs"
        >
          <Maximize2 className="h-3 w-3 mr-1" />
          Full Table
        </Button>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2 pr-2">
          {data.map(item => {
            const isExpanded = expandedRows.has(item.id);

            return (
              <Collapsible
                key={item.id}
                open={isExpanded}
                onOpenChange={() => toggleRow(item.id)}
              >
                <div
                  className={cn(
                    "border rounded-lg bg-card/50 transition-colors",
                    isExpanded && "border-primary/30"
                  )}
                >
                  {/* Always visible row */}
                  <CollapsibleTrigger asChild>
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30"
                      onClick={(e) => {
                        if (onRowClick && !isExpanded) {
                          e.stopPropagation();
                          onRowClick(item);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {highPriorityColumns.map((col, idx) => (
                          <div key={String(col.key)} className={cn(
                            "text-sm",
                            idx === 0 ? "font-medium" : "text-muted-foreground"
                          )}>
                            {formatValue(col, item[col.key])}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        {otherColumns.length > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{otherColumns.length} fields
                          </Badge>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  {/* Expanded details */}
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-0 border-t border-border/30">
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        {otherColumns.map(col => (
                          <div key={String(col.key)}>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              {col.label}
                            </p>
                            <p className="text-sm font-medium">
                              {formatValue(col, item[col.key])}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
