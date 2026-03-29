/**
 * Strategy Intelligence Library — Professional quant research database
 * Hedge-fund grade strategy research terminal with advanced search, filtering, and comparison
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, TrendingUp, Shield, Target, Zap } from 'lucide-react';
import { StrategyFilterPanel, DEFAULT_FILTERS, type StrategyFilters } from '@/components/strategy-intelligence/StrategyFilterPanel';
import { StrategyCard } from '@/components/strategy-intelligence/StrategyCard';
import { StrategyTable } from '@/components/strategy-intelligence/StrategyTable';
import { useStrategyIntelligence } from '@/hooks/useStrategyIntelligence';
import type { StrategyIntelligence, StrategySortKey } from '@/types/strategyIntelligence';
import { PageErrorBoundary } from '@/components/error/PageErrorBoundary';
import { Skeleton } from '@/components/ui/skeleton';
import { Database } from 'lucide-react';

function sortStrategies(arr: StrategyIntelligence[], key: StrategySortKey, dir: 'asc' | 'desc'): StrategyIntelligence[] {
  const sorted = [...arr].sort((a, b) => {
    let va: number, vb: number;
    switch (key) {
      case 'mmcScore': va = a.research.mmcCompositeScore; vb = b.research.mmcCompositeScore; break;
      case 'winRate': va = a.performance.winRate; vb = b.performance.winRate; break;
      case 'sharpe': va = a.performance.sharpeRatio; vb = b.performance.sharpeRatio; break;
      case 'drawdown': va = a.performance.maxDrawdown; vb = b.performance.maxDrawdown; break;
      case 'profitFactor': va = a.performance.profitFactor; vb = b.performance.profitFactor; break;
      case 'cagr': va = a.performance.cagr; vb = b.performance.cagr; break;
      case 'stability': va = a.research.walkForwardStability; vb = b.research.walkForwardStability; break;
      default: va = 0; vb = 0;
    }
    return dir === 'desc' ? vb - va : va - vb;
  });
  return sorted;
}

function StrategyLibraryIntelligenceContent() {
  const navigate = useNavigate();
  const { strategies: ALL_STRATEGIES, loading, isEmpty } = useStrategyIntelligence();
  const [filters, setFilters] = useState<StrategyFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  const filtered = useMemo(() => {
    let result = ALL_STRATEGIES.filter(s => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!s.identity.name.toLowerCase().includes(q) &&
            !s.identity.description.toLowerCase().includes(q) &&
            !s.identity.type.toLowerCase().includes(q)) return false;
      }
      if (filters.type !== 'all' && s.identity.type !== filters.type) return false;
      if (filters.market !== 'all' && !s.compatibility.markets.includes(filters.market as any)) return false;
      if (filters.regime !== 'all' && !s.compatibility.regimeSuitability.includes(filters.regime as any)) return false;
      if (filters.tag !== 'all' && !s.tags.includes(filters.tag as any)) return false;
      if (filters.minWinRate && s.performance.winRate < Number(filters.minWinRate)) return false;
      if (filters.maxDrawdown && s.performance.maxDrawdown > Number(filters.maxDrawdown)) return false;
      if (filters.minSharpe && s.performance.sharpeRatio < Number(filters.minSharpe)) return false;
      if (filters.minScore && s.research.mmcCompositeScore < Number(filters.minScore)) return false;
      return true;
    });
    return sortStrategies(result, filters.sortBy, filters.sortDir);
  }, [filters]);

  const handleSort = (key: StrategySortKey) => {
    setFilters(prev => ({
      ...prev,
      sortBy: key,
      sortDir: prev.sortBy === key && prev.sortDir === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handleOpen = (id: string) => {
    navigate(`/strategy-intelligence/${id}`);
  };

  // Summary stats
  const avgScore = ALL_STRATEGIES.reduce((s, a) => s + a.research.mmcCompositeScore, 0) / ALL_STRATEGIES.length;
  const eliteCount = ALL_STRATEGIES.filter(s => s.research.mmcCompositeScore >= 80).length;
  const avgWinRate = ALL_STRATEGIES.reduce((s, a) => s + a.performance.winRate, 0) / ALL_STRATEGIES.length;
  const readyCount = ALL_STRATEGIES.filter(s => s.deploymentReadiness === 'ready').length;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" /> Strategy Intelligence
        </h1>
        <Card className="py-16 text-center">
          <Database className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">No strategies catalogued yet. Add strategies via the Research Factory.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Strategy Intelligence
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Institutional-grade strategy research terminal · {ALL_STRATEGIES.length} strategies catalogued
          </p>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard icon={Target} label="Avg MMC Score" value={avgScore.toFixed(0)} color="text-primary" />
        <SummaryCard icon={TrendingUp} label="Elite Strategies" value={`${eliteCount}`} sub="Score ≥ 80" color="text-emerald-400" />
        <SummaryCard icon={Zap} label="Avg Win Rate" value={`${avgWinRate.toFixed(1)}%`} color="text-amber-400" />
        <SummaryCard icon={Shield} label="Deploy Ready" value={`${readyCount}`} sub={`of ${ALL_STRATEGIES.length}`} color="text-sky-400" />
      </div>

      {/* Filters */}
      <StrategyFilterPanel
        filters={filters}
        onChange={setFilters}
        totalCount={ALL_STRATEGIES.length}
        filteredCount={filtered.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Results */}
      {filtered.length === 0 ? (
        <Card variant="outline" className="py-16 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">No strategies match your filters. Try adjusting your search criteria.</p>
        </Card>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <StrategyCard key={s.identity.id} strategy={s} onOpen={handleOpen} />
          ))}
        </div>
      ) : (
        <Card>
          <StrategyTable
            strategies={filtered}
            sortBy={filters.sortBy}
            sortDir={filters.sortDir}
            onSort={handleSort}
            onOpen={handleOpen}
          />
        </Card>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color: string }) {
  return (
    <Card variant="glass">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="shrink-0">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground">{label}</p>
          <p className="text-lg font-bold font-mono tabular-nums">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function StrategyIntelligenceLibrary() {
  return (
    <PageErrorBoundary pageName="Strategy Intelligence">
      <StrategyLibraryIntelligenceContent />
    </PageErrorBoundary>
  );
}
