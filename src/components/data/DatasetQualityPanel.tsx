/**
 * Dataset Quality Panel
 * Displays quality scan results with issues and recommendations
 */

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Download,
  RefreshCw,
  AlertCircle,
  Zap,
  Copy,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  scanDatasetQuality,
  exportQualityReport,
  getQualityScoreColor,
  getQualityScoreLabel,
  type QualityScanResult,
  type QualityScanProgress,
  type QualityIssue,
} from '@/lib/datasetQuality';

interface DatasetQualityPanelProps {
  datasetId: string;
  datasetName: string;
  onClose?: () => void;
}

const ISSUE_ICONS: Record<string, typeof AlertTriangle> = {
  gap: Clock,
  duplicate: Copy,
  timezone_drift: Clock,
  outlier: BarChart3,
  missing_ohlcv: XCircle,
  bad_candle: AlertCircle,
};

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  high: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function DatasetQualityPanel({
  datasetId,
  datasetName,
  onClose,
}: DatasetQualityPanelProps) {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<QualityScanProgress | null>(null);
  const [result, setResult] = useState<QualityScanResult | null>(null);
  const [issueFilter, setIssueFilter] = useState<string>('all');

  const runScan = async () => {
    setScanning(true);
    setResult(null);
    
    try {
      const scanResult = await scanDatasetQuality(datasetId, setProgress);
      setResult(scanResult);
      
      if (scanResult.summary.qualityScore >= 90) {
        toast.success('Dataset quality is excellent!');
      } else if (scanResult.summary.qualityScore < 50) {
        toast.warning('Dataset has significant quality issues');
      }
    } catch (err) {
      toast.error(`Scan failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setScanning(false);
      setProgress(null);
    }
  };

  const handleExport = () => {
    if (!result) return;
    
    const report = exportQualityReport(result);
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quality-report-${datasetName}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Quality report exported');
  };

  const filteredIssues = result?.issues.filter(
    i => issueFilter === 'all' || i.type === issueFilter
  ) || [];

  const issueTypeCounts = result?.issues.reduce((acc, i) => {
    acc[i.type] = (acc[i.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Data Quality Scan
            </CardTitle>
            <CardDescription>{datasetName}</CardDescription>
          </div>
          <div className="flex gap-2">
            {result && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
            <Button 
              onClick={runScan} 
              disabled={scanning}
              size="sm"
            >
              {scanning ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {scanning ? 'Scanning...' : result ? 'Rescan' : 'Start Scan'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress */}
        {scanning && progress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{progress.message}</span>
              <span>{progress.progress}%</span>
            </div>
            <Progress value={progress.progress} className="h-2" />
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Quality Score */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
              <div>
                <div className="text-sm text-muted-foreground">Quality Score</div>
                <div className={cn('text-3xl font-bold', getQualityScoreColor(result.summary.qualityScore))}>
                  {result.summary.qualityScore}/100
                </div>
                <div className={cn('text-sm', getQualityScoreColor(result.summary.qualityScore))}>
                  {getQualityScoreLabel(result.summary.qualityScore)}
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div>{result.totalBars.toLocaleString()} bars analyzed</div>
                <div>Timeframe: {result.detectedTimeframe}</div>
                <div>Scanned: {new Date(result.scannedAt).toLocaleString()}</div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              <div className="p-3 rounded-lg border text-center">
                <div className="text-2xl font-bold">{result.summary.gaps}</div>
                <div className="text-xs text-muted-foreground">Gaps</div>
              </div>
              <div className="p-3 rounded-lg border text-center">
                <div className="text-2xl font-bold">{result.summary.duplicates}</div>
                <div className="text-xs text-muted-foreground">Duplicates</div>
              </div>
              <div className="p-3 rounded-lg border text-center">
                <div className="text-2xl font-bold">{result.summary.outliers}</div>
                <div className="text-xs text-muted-foreground">Outliers</div>
              </div>
              <div className="p-3 rounded-lg border text-center">
                <div className="text-2xl font-bold">{result.summary.badCandles}</div>
                <div className="text-xs text-muted-foreground">Bad Candles</div>
              </div>
              <div className="p-3 rounded-lg border text-center">
                <div className="text-2xl font-bold">{result.summary.missingOHLCV}</div>
                <div className="text-xs text-muted-foreground">Missing</div>
              </div>
              <div className="p-3 rounded-lg border text-center">
                <div className={cn('text-2xl font-bold', result.summary.timezoneDriftDetected ? 'text-yellow-500' : 'text-green-500')}>
                  {result.summary.timezoneDriftDetected ? '!' : '✓'}
                </div>
                <div className="text-xs text-muted-foreground">TZ Drift</div>
              </div>
            </div>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Recommendations</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm">{rec}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            {/* Issue List */}
            <div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-sm font-medium">Filter:</span>
                <Badge
                  variant={issueFilter === 'all' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setIssueFilter('all')}
                >
                  All ({result.issues.length})
                </Badge>
                {Object.entries(issueTypeCounts).map(([type, count]) => (
                  <Badge
                    key={type}
                    variant={issueFilter === type ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setIssueFilter(type)}
                  >
                    {type.replace('_', ' ')} ({count})
                  </Badge>
                ))}
              </div>

              <ScrollArea className="h-[300px]">
                {filteredIssues.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No issues found!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredIssues.slice(0, 100).map((issue, i) => {
                      const Icon = ISSUE_ICONS[issue.type] || AlertTriangle;
                      return (
                        <div
                          key={i}
                          className={cn(
                            'p-3 rounded-lg border',
                            SEVERITY_COLORS[issue.severity]
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {issue.type.replace('_', ' ')}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {issue.severity}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(issue.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm mt-1">{issue.details}</p>
                              <div className="text-xs text-muted-foreground mt-1">
                                Suggestion: {issue.suggestion}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredIssues.length > 100 && (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Showing first 100 of {filteredIssues.length} issues
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </>
        )}

        {/* Initial State */}
        {!scanning && !result && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Ready to analyze</p>
            <p className="text-sm">Click "Start Scan" to check data quality</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
