/**
 * Dataset Quality Scorecard Component
 * Visual health report with scores and recommendations
 */

import { useMemo } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Copy, 
  TrendingDown, 
  TrendingUp,
  XCircle,
  Gauge,
  FileWarning,
  Timer,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { QualityScanResult } from '@/lib/datasetQuality';

interface QualityMetric {
  name: string;
  value: number;
  max: number;
  status: 'good' | 'warning' | 'error';
  icon: React.ReactNode;
  description: string;
}

interface DatasetQualityScorecardProps {
  result: QualityScanResult;
  className?: string;
}

export function DatasetQualityScorecard({ result, className }: DatasetQualityScorecardProps) {
  const metrics: QualityMetric[] = useMemo(() => [
    {
      name: 'Data Gaps',
      value: result.summary.gaps,
      max: 10,
      status: result.summary.gaps === 0 ? 'good' : result.summary.gaps < 5 ? 'warning' : 'error',
      icon: <Clock className="h-4 w-4" />,
      description: `${result.summary.gaps} gap${result.summary.gaps !== 1 ? 's' : ''} detected in timeline`,
    },
    {
      name: 'Duplicates',
      value: result.summary.duplicates,
      max: 10,
      status: result.summary.duplicates === 0 ? 'good' : result.summary.duplicates < 5 ? 'warning' : 'error',
      icon: <Copy className="h-4 w-4" />,
      description: `${result.summary.duplicates} duplicate timestamp${result.summary.duplicates !== 1 ? 's' : ''}`,
    },
    {
      name: 'Outliers',
      value: result.summary.outliers,
      max: 20,
      status: result.summary.outliers === 0 ? 'good' : result.summary.outliers < 10 ? 'warning' : 'error',
      icon: <TrendingUp className="h-4 w-4" />,
      description: `${result.summary.outliers} price outlier${result.summary.outliers !== 1 ? 's' : ''} found`,
    },
    {
      name: 'Bad Candles',
      value: result.summary.badCandles,
      max: 5,
      status: result.summary.badCandles === 0 ? 'good' : 'error',
      icon: <FileWarning className="h-4 w-4" />,
      description: `${result.summary.badCandles} invalid OHLC relationship${result.summary.badCandles !== 1 ? 's' : ''}`,
    },
    {
      name: 'Missing Values',
      value: result.summary.missingOHLCV,
      max: 5,
      status: result.summary.missingOHLCV === 0 ? 'good' : 'error',
      icon: <XCircle className="h-4 w-4" />,
      description: `${result.summary.missingOHLCV} row${result.summary.missingOHLCV !== 1 ? 's' : ''} with missing data`,
    },
  ], [result.summary]);

  const scoreColor = useMemo(() => {
    if (result.summary.qualityScore >= 90) return 'text-profit';
    if (result.summary.qualityScore >= 70) return 'text-yellow-500';
    if (result.summary.qualityScore >= 50) return 'text-orange-500';
    return 'text-loss';
  }, [result.summary.qualityScore]);

  const scoreLabel = useMemo(() => {
    if (result.summary.qualityScore >= 90) return 'Excellent';
    if (result.summary.qualityScore >= 70) return 'Good';
    if (result.summary.qualityScore >= 50) return 'Fair';
    if (result.summary.qualityScore >= 30) return 'Poor';
    return 'Unusable';
  }, [result.summary.qualityScore]);

  const statusIcon = (status: 'good' | 'warning' | 'error') => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-profit" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-loss" />;
    }
  };

  return (
    <Card className={cn('border-primary/20', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" />
              Quality Scorecard
            </CardTitle>
            <CardDescription>
              {result.totalBars.toLocaleString()} bars analyzed
            </CardDescription>
          </div>
          
          {/* Main score */}
          <div className="text-center">
            <div className={cn('text-4xl font-bold font-heading', scoreColor)}>
              {result.summary.qualityScore}
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                'mt-1',
                result.summary.qualityScore >= 90 && 'border-profit text-profit',
                result.summary.qualityScore >= 70 && result.summary.qualityScore < 90 && 'border-yellow-500 text-yellow-500',
                result.summary.qualityScore < 70 && 'border-loss text-loss'
              )}
            >
              {scoreLabel}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Score breakdown bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Quality</span>
            <span className={scoreColor}>{result.summary.qualityScore}%</span>
          </div>
          <div className="relative h-3 rounded-full bg-muted overflow-hidden">
            <div 
              className={cn(
                'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                result.summary.qualityScore >= 90 && 'bg-profit',
                result.summary.qualityScore >= 70 && result.summary.qualityScore < 90 && 'bg-yellow-500',
                result.summary.qualityScore < 70 && 'bg-loss'
              )}
              style={{ width: `${result.summary.qualityScore}%` }}
            />
            {/* Thresholds */}
            <div className="absolute inset-y-0 left-[70%] w-px bg-border" />
            <div className="absolute inset-y-0 left-[90%] w-px bg-border" />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>70 (Good)</span>
            <span>90 (Excellent)</span>
            <span>100</span>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {metrics.map(metric => (
            <div
              key={metric.name}
              className={cn(
                'p-3 rounded-lg border transition-colors',
                metric.status === 'good' && 'border-profit/30 bg-profit/5',
                metric.status === 'warning' && 'border-yellow-500/30 bg-yellow-500/5',
                metric.status === 'error' && 'border-loss/30 bg-loss/5'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                {metric.icon}
                {statusIcon(metric.status)}
              </div>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="text-xs text-muted-foreground">{metric.name}</div>
            </div>
          ))}
        </div>

        {/* Timeframe info */}
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
          <Timer className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm">Detected Timeframe:</span>
              <Badge variant="secondary">{result.detectedTimeframe}</Badge>
              {result.detectedTimeframe !== result.expectedTimeframe && (
                <>
                  <span className="text-sm text-muted-foreground">vs Expected:</span>
                  <Badge variant="outline">{result.expectedTimeframe}</Badge>
                </>
              )}
            </div>
          </div>
          {result.summary.timezoneDriftDetected && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Timezone Drift
            </Badge>
          )}
        </div>

        {/* Recommendations */}
        {result.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recommendations
            </h4>
            <ul className="space-y-1">
              {result.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
