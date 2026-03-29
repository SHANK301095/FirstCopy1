/**
 * StrategyFilterPanel — Advanced filter panel for strategy library
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal, X, LayoutGrid, List } from 'lucide-react';
import { STRATEGY_TYPE_LABELS, MARKET_LABELS, REGIME_LABELS, TAG_CONFIG, SORT_LABELS, type StrategyType, type MarketType, type RegimeType, type StrategyTag, type StrategySortKey } from '@/types/strategyIntelligence';

export interface StrategyFilters {
  search: string;
  type: string;
  market: string;
  regime: string;
  tag: string;
  sortBy: StrategySortKey;
  sortDir: 'asc' | 'desc';
  minWinRate: string;
  maxDrawdown: string;
  minSharpe: string;
  minScore: string;
}

export const DEFAULT_FILTERS: StrategyFilters = {
  search: '',
  type: 'all',
  market: 'all',
  regime: 'all',
  tag: 'all',
  sortBy: 'mmcScore',
  sortDir: 'desc',
  minWinRate: '',
  maxDrawdown: '',
  minSharpe: '',
  minScore: '',
};

interface StrategyFilterPanelProps {
  filters: StrategyFilters;
  onChange: (filters: StrategyFilters) => void;
  totalCount: number;
  filteredCount: number;
  viewMode: 'card' | 'table';
  onViewModeChange: (mode: 'card' | 'table') => void;
}

export function StrategyFilterPanel({ filters, onChange, totalCount, filteredCount, viewMode, onViewModeChange }: StrategyFilterPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = (partial: Partial<StrategyFilters>) => onChange({ ...filters, ...partial });
  const hasActiveFilters = filters.type !== 'all' || filters.market !== 'all' || filters.regime !== 'all' || filters.tag !== 'all' || filters.minWinRate || filters.maxDrawdown || filters.minSharpe || filters.minScore;

  return (
    <Card variant="glass">
      <CardContent className="p-4 space-y-3">
        {/* Row 1: Search + Sort + View Toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, type, description..."
              value={filters.search}
              onChange={e => update({ search: e.target.value })}
              className="pl-9"
              aria-label="Search strategies"
            />
          </div>

          <Select value={filters.sortBy} onValueChange={v => update({ sortBy: v as StrategySortKey })}>
            <SelectTrigger className="w-full sm:w-48" aria-label="Sort by">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SORT_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('card')}
              aria-label="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('table')}
              aria-label="Table view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Row 2: Quick Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={filters.type} onValueChange={v => update({ type: v })}>
            <SelectTrigger className="w-full sm:w-36 h-8 text-xs" aria-label="Strategy type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(STRATEGY_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.market} onValueChange={v => update({ market: v })}>
            <SelectTrigger className="w-full sm:w-32 h-8 text-xs" aria-label="Market">
              <SelectValue placeholder="Market" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Markets</SelectItem>
              {Object.entries(MARKET_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.regime} onValueChange={v => update({ regime: v })}>
            <SelectTrigger className="w-full sm:w-36 h-8 text-xs" aria-label="Regime">
              <SelectValue placeholder="Regime" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regimes</SelectItem>
              {Object.entries(REGIME_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.tag} onValueChange={v => update({ tag: v })}>
            <SelectTrigger className="w-full sm:w-32 h-8 text-xs" aria-label="Tag">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {Object.entries(TAG_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <SlidersHorizontal className="h-3 w-3" />
            {showAdvanced ? 'Less' : 'More'}
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-destructive" onClick={() => onChange(DEFAULT_FILTERS)}>
              <X className="h-3 w-3" /> Clear
            </Button>
          )}

          <Badge variant="outline" className="text-[10px] ml-auto">
            {filteredCount} / {totalCount}
          </Badge>
        </div>

        {/* Row 3: Advanced Filters */}
        {showAdvanced && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/30">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Min Win Rate %</label>
              <Input type="number" placeholder="e.g. 55" value={filters.minWinRate} onChange={e => update({ minWinRate: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Max Drawdown %</label>
              <Input type="number" placeholder="e.g. 15" value={filters.maxDrawdown} onChange={e => update({ maxDrawdown: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Min Sharpe</label>
              <Input type="number" step="0.1" placeholder="e.g. 1.5" value={filters.minSharpe} onChange={e => update({ minSharpe: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Min MMC Score</label>
              <Input type="number" placeholder="e.g. 65" value={filters.minScore} onChange={e => update({ minScore: e.target.value })} className="h-8 text-xs" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
