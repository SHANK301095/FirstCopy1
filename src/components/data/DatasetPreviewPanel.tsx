/**
 * Dataset Preview Panel V3.0
 * OHLCV chart preview + quality stats panel
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  BarChart3,
  Clock,
  Database,
  Loader2,
  Calendar,
  ArrowUpDown,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
} from 'recharts';
import { db, Dataset, DatasetChunk } from '@/db/index';
import { cn } from '@/lib/utils';

interface DatasetPreviewPanelProps {
  dataset: Dataset;
  onClose?: () => void;
}

interface QualityStats {
  gapsCount: number;
  gapsPct: number;
  duplicatesCount: number;
  duplicatesPct: number;
  nanCount: number;
  nanPct: number;
  avgVolume: number;
  priceRange: { min: number; max: number };
  volatility: number;
  tradingSessions: { start: string; end: string }[];
  qualityScore: number; // 0-100
}

interface ChartDataPoint {
  ts: number;
  date: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

export function DatasetPreviewPanel({ dataset, onClose }: DatasetPreviewPanelProps) {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [qualityStats, setQualityStats] = useState<QualityStats | null>(null);
  const [viewMode, setViewMode] = useState<'price' | 'volume'>('price');

  useEffect(() => {
    loadPreviewData();
  }, [dataset.id]);

  const loadPreviewData = async () => {
    setLoading(true);
    try {
      // Load chunks for this dataset
      const chunks = await db.datasetChunks
        .where('datasetId')
        .equals(dataset.id)
        .sortBy('index');

      const allRows: number[][] = [];
      for (const chunk of chunks) {
        allRows.push(...chunk.rows);
      }

      // Sort by timestamp
      allRows.sort((a, b) => a[0] - b[0]);

      // Downsample for chart display (max 500 points)
      const sampleRate = Math.max(1, Math.floor(allRows.length / 500));
      const sampledData: ChartDataPoint[] = [];
      
      for (let i = 0; i < allRows.length; i += sampleRate) {
        const [ts, o, h, l, c, v] = allRows[i];
        sampledData.push({
          ts,
          date: new Date(ts).toLocaleDateString(),
          open: o,
          high: h,
          low: l,
          close: c,
          volume: v || 0,
        });
      }

      setChartData(sampledData);

      // Calculate quality stats
      const stats = calculateQualityStats(allRows, dataset);
      setQualityStats(stats);
    } catch {
      // Preview load failed - show empty state
    } finally {
      setLoading(false);
    }
  };

  const calculateQualityStats = (rows: number[][], dataset: Dataset): QualityStats => {
    const totalRows = rows.length;
    
    // Gaps detection
    let gapsCount = 0;
    const tfMs = getTimeframeMsFromString(dataset.timeframe);
    for (let i = 1; i < rows.length; i++) {
      const diff = rows[i][0] - rows[i - 1][0];
      if (diff > tfMs * 1.5) gapsCount++;
    }

    // Duplicates detection
    const timestamps = new Set<number>();
    let duplicatesCount = 0;
    for (const row of rows) {
      if (timestamps.has(row[0])) duplicatesCount++;
      else timestamps.add(row[0]);
    }

    // NaN detection
    let nanCount = 0;
    for (const row of rows) {
      for (let i = 1; i <= 5; i++) {
        if (isNaN(row[i]) || row[i] === null || row[i] === undefined) nanCount++;
      }
    }

    // Price stats
    const closes = rows.map(r => r[4]);
    const priceMin = Math.min(...closes);
    const priceMax = Math.max(...closes);

    // Volume stats
    const volumes = rows.map(r => r[5] || 0);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

    // Volatility (simple daily returns std dev)
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * 100;

    // Trading sessions detection
    const hourCounts: Record<number, number> = {};
    for (const row of rows) {
      const hour = new Date(row[0]).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
    const avgCount = Object.values(hourCounts).reduce((a, b) => a + b, 0) / 24;
    const activeHours = Object.entries(hourCounts)
      .filter(([_, count]) => count > avgCount * 0.5)
      .map(([h]) => parseInt(h))
      .sort((a, b) => a - b);
    
    const sessions: { start: string; end: string }[] = [];
    if (activeHours.length > 0) {
      let start = activeHours[0];
      let end = activeHours[0];
      for (let i = 1; i < activeHours.length; i++) {
        if (activeHours[i] - end <= 1) {
          end = activeHours[i];
        } else {
          sessions.push({ start: `${start}:00`, end: `${end + 1}:00` });
          start = activeHours[i];
          end = activeHours[i];
        }
      }
      sessions.push({ start: `${start}:00`, end: `${end + 1}:00` });
    }

    // Quality score calculation
    const gapPenalty = Math.min(30, (gapsCount / totalRows) * 1000);
    const dupPenalty = Math.min(30, (duplicatesCount / totalRows) * 1000);
    const nanPenalty = Math.min(30, (nanCount / (totalRows * 5)) * 1000);
    const qualityScore = Math.max(0, 100 - gapPenalty - dupPenalty - nanPenalty);

    return {
      gapsCount,
      gapsPct: (gapsCount / totalRows) * 100,
      duplicatesCount,
      duplicatesPct: (duplicatesCount / totalRows) * 100,
      nanCount,
      nanPct: (nanCount / (totalRows * 5)) * 100,
      avgVolume,
      priceRange: { min: priceMin, max: priceMax },
      volatility,
      tradingSessions: sessions,
      qualityScore,
    };
  };

  const getTimeframeMsFromString = (tf: string): number => {
    const map: Record<string, number> = {
      'M1': 60000,
      'M5': 300000,
      'M15': 900000,
      'M30': 1800000,
      'H1': 3600000,
      'H4': 14400000,
      'D1': 86400000,
      'W1': 604800000,
    };
    return map[tf] || 60000;
  };

  const formatNumber = (n: number) => {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return n.toFixed(2);
  };

  const qualityColor = useMemo(() => {
    if (!qualityStats) return 'text-muted-foreground';
    if (qualityStats.qualityScore >= 90) return 'text-profit';
    if (qualityStats.qualityScore >= 70) return 'text-warning';
    return 'text-loss';
  }, [qualityStats]);

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-2">Loading preview...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            {dataset.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'price' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setViewMode('price')}
              >
                Price
              </Button>
              <Button
                variant={viewMode === 'volume' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setViewMode('volume')}
              >
                Volume
              </Button>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">{dataset.symbol}</Badge>
          <Badge variant="outline">{dataset.timeframe}</Badge>
          <Badge variant="outline">{dataset.rowCount.toLocaleString()} bars</Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(dataset.rangeFromTs).toLocaleDateString()} - {new Date(dataset.rangeToTs).toLocaleDateString()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Chart */}
        <div className="h-48 px-4">
          {viewMode === 'price' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => formatNumber(v)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [formatNumber(value), 'Close']}
                />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke="hsl(var(--primary))"
                  fill="url(#priceGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatNumber(v)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [formatNumber(value), 'Volume']}
                />
                <Bar dataKey="volume" fill="hsl(var(--primary))" opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <Separator />

        {/* Quality Stats Panel */}
        {qualityStats && (
          <div className="p-4 space-y-4">
            {/* Quality Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {qualityStats.qualityScore >= 90 ? (
                  <CheckCircle className="h-5 w-5 text-profit" />
                ) : qualityStats.qualityScore >= 70 ? (
                  <AlertTriangle className="h-5 w-5 text-warning" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-loss" />
                )}
                <span className="text-sm font-medium">Data Quality Score</span>
              </div>
              <span className={cn('text-2xl font-bold', qualityColor)}>
                {qualityStats.qualityScore.toFixed(0)}%
              </span>
            </div>
            <Progress value={qualityStats.qualityScore} className="h-2" />

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Gaps"
                value={qualityStats.gapsCount}
                pct={qualityStats.gapsPct}
                isGood={qualityStats.gapsCount === 0}
              />
              <StatCard
                label="Duplicates"
                value={qualityStats.duplicatesCount}
                pct={qualityStats.duplicatesPct}
                isGood={qualityStats.duplicatesCount === 0}
              />
              <StatCard
                label="NaN/Empty"
                value={qualityStats.nanCount}
                pct={qualityStats.nanPct}
                isGood={qualityStats.nanCount === 0}
              />
              <StatCard
                label="Volatility"
                value={`${qualityStats.volatility.toFixed(2)}%`}
                subtext="daily σ"
              />
            </div>

            {/* Price Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Price Range</p>
                <p className="text-sm font-medium">
                  {formatNumber(qualityStats.priceRange.min)} - {formatNumber(qualityStats.priceRange.max)}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Avg Volume</p>
                <p className="text-sm font-medium">{formatNumber(qualityStats.avgVolume)}</p>
              </div>
            </div>

            {/* Trading Sessions */}
            {qualityStats.tradingSessions.length > 0 && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Detected Trading Sessions</p>
                <div className="flex flex-wrap gap-2">
                  {qualityStats.tradingSessions.map((session, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {session.start} - {session.end}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ 
  label, 
  value, 
  pct, 
  subtext,
  isGood 
}: { 
  label: string; 
  value: number | string; 
  pct?: number; 
  subtext?: string;
  isGood?: boolean;
}) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn(
        'text-lg font-semibold',
        isGood !== undefined && (isGood ? 'text-profit' : 'text-warning')
      )}>
        {value}
      </p>
      {pct !== undefined && (
        <p className="text-[10px] text-muted-foreground">{pct.toFixed(2)}%</p>
      )}
      {subtext && (
        <p className="text-[10px] text-muted-foreground">{subtext}</p>
      )}
    </div>
  );
}
