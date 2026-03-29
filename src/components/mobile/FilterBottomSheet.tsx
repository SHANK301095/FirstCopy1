/**
 * Bottom Sheet for Filters - P1 Mobile
 */

import { useState } from 'react';
import { Filter, X, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

interface FilterOption {
  id: string;
  label: string;
  type: 'checkbox' | 'range' | 'select';
  options?: { value: string; label: string }[];
  range?: { min: number; max: number; step?: number };
}

interface FilterValues {
  [key: string]: boolean | number | number[] | string | string[] | unknown;
}

interface FilterBottomSheetProps {
  filters: FilterOption[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onReset?: () => void;
  activeCount?: number;
  className?: string;
}

export function FilterBottomSheet({
  filters,
  values,
  onChange,
  onReset,
  activeCount = 0,
  className,
}: FilterBottomSheetProps) {
  const [open, setOpen] = useState(false);
  const [localValues, setLocalValues] = useState<FilterValues>(values);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setLocalValues(values);
    }
    setOpen(isOpen);
  };

  const handleApply = () => {
    onChange(localValues);
    setOpen(false);
  };

  const handleReset = () => {
    const resetValues: FilterValues = {};
    filters.forEach(f => {
      if (f.type === 'checkbox') resetValues[f.id] = false;
      if (f.type === 'range' && f.range) resetValues[f.id] = [f.range.min, f.range.max];
    });
    setLocalValues(resetValues);
    onReset?.();
  };

  return (
    <Drawer open={open} onOpenChange={handleOpen}>
      <DrawerTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn("gap-1.5", className)}
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {activeCount}
            </Badge>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="border-b border-border/50">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              Filters
            </DrawerTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
          <DrawerDescription>
            Apply filters to narrow down results
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
          {filters.map(filter => (
            <div key={filter.id} className="space-y-2">
              <Label className="text-sm font-medium">{filter.label}</Label>
              
              {filter.type === 'checkbox' && filter.options && (
                <div className="space-y-2">
                  {filter.options.map(option => (
                    <div key={option.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`${filter.id}-${option.value}`}
                        checked={
                          Array.isArray(localValues[filter.id])
                            ? (localValues[filter.id] as string[]).includes(option.value)
                            : localValues[filter.id] === option.value
                        }
                        onCheckedChange={(checked) => {
                          const current = localValues[filter.id];
                          if (Array.isArray(current)) {
                            setLocalValues({
                              ...localValues,
                              [filter.id]: checked
                                ? [...current, option.value]
                                : current.filter(v => v !== option.value),
                            });
                          } else {
                            setLocalValues({
                              ...localValues,
                              [filter.id]: checked ? option.value : '',
                            });
                          }
                        }}
                      />
                      <Label 
                        htmlFor={`${filter.id}-${option.value}`}
                        className="text-sm text-muted-foreground cursor-pointer"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {filter.type === 'range' && filter.range && (
                <div className="space-y-3">
                  <Slider
                    value={
                      Array.isArray(localValues[filter.id])
                        ? localValues[filter.id] as number[]
                        : [filter.range.min, filter.range.max]
                    }
                    min={filter.range.min}
                    max={filter.range.max}
                    step={filter.range.step || 1}
                    onValueChange={(value) => {
                      setLocalValues({
                        ...localValues,
                        [filter.id]: value,
                      });
                    }}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Array.isArray(localValues[filter.id]) 
                      ? (localValues[filter.id] as number[])[0] 
                      : filter.range.min}</span>
                    <span>{Array.isArray(localValues[filter.id]) 
                      ? (localValues[filter.id] as number[])[1] 
                      : filter.range.max}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <DrawerFooter className="border-t border-border/50">
          <div className="flex gap-2">
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1">
                Cancel
              </Button>
            </DrawerClose>
            <Button onClick={handleApply} className="flex-1">
              <Check className="h-4 w-4 mr-1" />
              Apply Filters
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
