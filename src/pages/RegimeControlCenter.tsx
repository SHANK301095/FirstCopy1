/**
 * Market Regime Control Center — real regime detection from OHLCV data
 * Shows regime per asset with strategy compatibility from DB
 * Supports computing regimes from uploaded datasets
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Globe, TrendingUp, TrendingDown, Minus, Activity, BarChart3,
  ArrowUpRight, ArrowDownRight, AlertTriangle, Database, RefreshCw, Upload
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PageTitle } from '@/components/ui/PageTitle';
import { useStrategyIntelligence } from '@/hooks/useStrategyIntelligence';
import { useRegimeSnapshots } from '@/hooks/useRegimeSnapshots';
import { useToast } from '@/hooks/use-toast';
import { db, Dataset } from '@/db/index';
import { PageErrorBoundary } from '@/components/error/PageErrorBoundary';
import type { RegimeFeatures } from '@/types/quant';
import type { OHLCV } from '@/lib/indicators';

const regimeColor: Record<string, string> = {
  trending: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  ranging: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  choppy: 'bg-red-500/10 text-red-400 border-red-500/30',
  volatile: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  low_volatility: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  breakout: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
};

const regimeLabels: Record<string, string> = {
  trending: 'Trending',
  ranging: 'Ranging',
  choppy: 'Choppy',
  volatile: 'Volatile',
  low_volatility: 'Low Vol',
  breakout: 'Breakout',
};

function FeatureBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{typeof value === 'number' ? value.toFixed(1) : '—'}</span>
      </div>
      <Progress value={Math.min(100, (value / max) * 100)} className="h-1 mt-0.5" />
    </div>
  );
}

function AssetCard({ regime, strategies }: { regime: ReturnType<typeof useRegimeSnapshots>['latestBySymbol'][0]; strategies: ReturnType<typeof useStrategyIntelligence>['strategies'] }) {
  const compatible = strategies.filter(s =>
    s.compatibility.regimeSuitability.includes(regime.regime as any)
  ).slice(0, 4);
  const incompatible = strategies.filter(s =>
    !s.compatibility.regimeSuitability.includes(regime.regime as any)
  ).slice(0, 3);

  const features = (regime.features || {}) as Record<string, number>;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">{regime.symbol}</CardTitle>
          </div>
          <Badge variant="outline" className={cn('text-[10px]', regimeColor[regime.regime] || regimeColor.ranging)}>
            {regimeLabels[regime.regime] || regime.regime}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        <div className="space-y-1.5">
          <FeatureBar label="Confidence" value={regime.confidence} />
          <FeatureBar label="ADX" value={features['adx'] || 0} />
          <FeatureBar label="ATR %ile" value={features['atr_percentile'] || 0} />
          <FeatureBar label="Volatility" value={(features['realized_volatility'] || 0) * 1000} max={50} />
          <FeatureBar label="Choppiness" value={features['choppiness'] || 0} />
        </div>

        <div className="text-[10px] text-muted-foreground">
          Computed: {new Date(regime.computed_at).toLocaleString()}
        </div>

        {strategies.length > 0 && (
          <div className="space-y-1.5">
            {compatible.length > 0 && (
              <>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Compatible</div>
                {compatible.map(s => (
                  <div key={s.identity.id} className="flex items-center justify-between text-xs py-0.5">
                    <span className="text-emerald-400 truncate">{s.identity.name}</span>
                    <span className="text-muted-foreground font-mono">MMC {s.research.mmcCompositeScore}</span>
                  </div>
                ))}
              </>
            )}
            {incompatible.length > 0 && (
              <>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">Incompatible</div>
                {incompatible.map(s => (
                  <div key={s.identity.id} className="flex items-center justify-between text-xs py-0.5">
                    <span className="text-red-400 truncate">{s.identity.name}</span>
                    <span className="text-muted-foreground font-mono">MMC {s.research.mmcCompositeScore}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function RegimeControlCenter() {
  const { strategies, loading: strategiesLoading } = useStrategyIntelligence();
  const { latestBySymbol, loading, computeAndSave, refetch } = useRegimeSnapshots();
  const { toast } = useToast();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    db.datasets.toArray().then(ds => {
      setDatasets(ds);
      if (ds.length > 0) setSelectedDataset(ds[0].id);
    });
  }, []);

  const analyzeDataset = async () => {
    if (!selectedDataset) return;
    setComputing(true);
    try {
      const dataset = datasets.find(d => d.id === selectedDataset);
      if (!dataset) throw new Error('Dataset not found');

      // Load OHLCV data from IndexedDB
      const chunks = await db.datasetChunks
        .where('datasetId')
        .equals(selectedDataset)
        .sortBy('index');

      const allRows: number[][] = [];
      for (const chunk of chunks) {
        allRows.push(...chunk.rows);
      }

      if (allRows.length < 70) {
        toast({ title: 'Insufficient Data', description: 'Need at least 70 bars for regime detection', variant: 'destructive' });
        return;
      }

      // Dataset uses columnsMap: { csvCol -> mappedCol }
      // Rows are number[][] arrays: [ts, o, h, l, c, v]
      const bars: OHLCV[] = allRows.map((row: any) => {
        const arr = row as number[];
        return {
          timestamp: arr[0] || 0,
          open: arr[1] || 0,
          high: arr[2] || 0,
          low: arr[3] || 0,
          close: arr[4] || 0,
          volume: arr[5] || 0,
        };
      }).filter(b => b.close > 0);

      const symbol = dataset.symbol || dataset.name || 'UNKNOWN';
      const timeframe = dataset.timeframe || 'H1';

      const result = await computeAndSave(symbol, timeframe, bars);
      if (result) {
        toast({
          title: `Regime: ${regimeLabels[result.regime] || result.regime}`,
          description: `${symbol} classified with ${Math.round(result.confidence)}% confidence`,
        });
      }
    } catch (e) {
      console.error('[RegimeControl] Analysis error:', e);
      toast({ title: 'Analysis Failed', description: String(e), variant: 'destructive' });
    } finally {
      setComputing(false);
    }
  };

  const isLoading = loading || strategiesLoading;

  return (
    <PageErrorBoundary pageName="Regime Control Center">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <PageTitle title="Market Regime Control Center" subtitle="Data-driven regime detection with strategy compatibility" />
          <Button variant="outline" size="sm" onClick={refetch} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {/* Compute Regime from Dataset */}
        <Card className="border-border/50">
          <CardContent className="py-4">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Upload className="h-3 w-3" /> Analyze Dataset
                </div>
                <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select dataset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} {d.symbol ? `(${d.symbol})` : ''} · {d.rowCount?.toLocaleString() || '?'} bars
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={analyzeDataset} disabled={computing || !selectedDataset} className="gap-2">
                <Activity className="h-3.5 w-3.5" />
                {computing ? 'Analyzing...' : 'Compute Regime'}
              </Button>
            </div>
            {datasets.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">Upload OHLCV datasets first to enable regime analysis.</p>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
          </div>
        ) : latestBySymbol.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-lg font-medium mb-1">No Regime Data Available</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Select a dataset above and click "Compute Regime" to classify market conditions using ATR, ADX, volatility, and trend features.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {latestBySymbol.map(r => <AssetCard key={r.symbol} regime={r} strategies={strategies} />)}
          </div>
        )}
      </div>
    </PageErrorBoundary>
  );
}
