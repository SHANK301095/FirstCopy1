/**
 * Data Quality Scanner Component
 * Phase B: Auto-detect columns, quality scoring, gap detection
 */

import { useState } from 'react';
import { 
  Search, CheckCircle2, AlertTriangle, XCircle, 
  FileSearch, Calendar, Hash, Activity, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import {
  detectColumnTypes,
  calculateQualityScore,
  detectGaps,
  type ColumnMapping,
  type QualityResult,
  type DataGap,
} from '@/lib/dataQuality';

interface DataQualityScannerProps {
  data?: Record<string, unknown>[];
  columns?: string[];
  onMappingComplete?: (mapping: Record<string, ColumnMapping>) => void;
  className?: string;
}

export function DataQualityScanner({ 
  data = [], 
  columns = [], 
  onMappingComplete,
  className 
}: DataQualityScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [columnMappings, setColumnMappings] = useState<Record<string, ColumnMapping>>({});
  const [qualityResult, setQualityResult] = useState<QualityResult | null>(null);
  const [gaps, setGaps] = useState<DataGap[]>([]);
  const [expandedSections, setExpandedSections] = useState<string[]>(['mappings']);

  // Standalone mode info
  const isStandalone = data.length === 0;

  const runScan = async () => {
    if (data.length === 0) return;

    setIsScanning(true);
    setScanProgress(0);

    // Step 1: Detect column types
    await new Promise(r => setTimeout(r, 100));
    setScanProgress(20);
    const mappings = detectColumnTypes(data, columns);
    setColumnMappings(mappings);

    // Step 2: Calculate quality score
    await new Promise(r => setTimeout(r, 100));
    setScanProgress(50);
    const quality = calculateQualityScore(data, mappings);
    setQualityResult(quality);

    // Step 3: Detect gaps
    await new Promise(r => setTimeout(r, 100));
    setScanProgress(80);
    const timestampCol = Object.entries(mappings).find(([, m]) => m.type === 'timestamp')?.[0];
    if (timestampCol) {
      const timestamps = data.map(row => new Date(row[timestampCol] as string).getTime()).filter(t => !isNaN(t));
      const detectedGaps = detectGaps(timestamps);
      setGaps(detectedGaps);
    }

    setScanProgress(100);
    setIsScanning(false);
    onMappingComplete?.(mappings);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500/10 border-green-500/30';
    if (score >= 60) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const getMappingIcon = (type: string) => {
    switch (type) {
      case 'timestamp': return <Calendar className="h-4 w-4" />;
      case 'open': case 'high': case 'low': case 'close': return <Activity className="h-4 w-4" />;
      case 'volume': return <Hash className="h-4 w-4" />;
      default: return <FileSearch className="h-4 w-4" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Data Quality Scanner
          </CardTitle>
          <Button 
            size="sm" 
            onClick={runScan} 
            disabled={isScanning || data.length === 0}
          >
            {isScanning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Scan Data
              </>
            )}
          </Button>
        </div>
        {isScanning && (
          <Progress value={scanProgress} className="h-1 mt-2" />
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {qualityResult && (
          <>
            {/* Overall Score */}
            <div className={`p-4 rounded-lg border ${getScoreBg(qualityResult.overallScore)}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">Quality Score</span>
                <span className={`text-2xl font-bold ${getScoreColor(qualityResult.overallScore)}`}>
                  {qualityResult.overallScore.toFixed(0)}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                <div className="text-center p-2 rounded bg-background/50">
                  <div className="font-medium">{qualityResult.completeness.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">Complete</div>
                </div>
                <div className="text-center p-2 rounded bg-background/50">
                  <div className="font-medium">{qualityResult.consistency.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">Consistent</div>
                </div>
                <div className="text-center p-2 rounded bg-background/50">
                  <div className="font-medium">{qualityResult.validity.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">Valid</div>
                </div>
              </div>
            </div>

            {/* Column Mappings */}
            <Collapsible 
              open={expandedSections.includes('mappings')} 
              onOpenChange={() => toggleSection('mappings')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded">
                <span className="font-medium text-sm">Column Mappings</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.includes('mappings') ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ScrollArea className="h-[150px]">
                  <div className="space-y-1 p-2">
                    {Object.entries(columnMappings).map(([col, mapping]) => (
                      <div key={col} className="flex items-center justify-between py-1 px-2 rounded bg-muted/30">
                        <div className="flex items-center gap-2">
                          {getMappingIcon(mapping.type)}
                          <span className="text-sm font-mono">{col}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={mapping.confidence > 0.7 ? 'default' : 'secondary'}>
                            {mapping.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {(mapping.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>

            {/* Issues */}
            {qualityResult.issues.length > 0 && (
              <Collapsible 
                open={expandedSections.includes('issues')} 
                onOpenChange={() => toggleSection('issues')}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded">
                  <span className="font-medium text-sm flex items-center gap-2">
                    Issues
                    <Badge variant="destructive" className="h-5">
                      {qualityResult.issues.length}
                    </Badge>
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.includes('issues') ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ScrollArea className="h-[120px]">
                    <div className="space-y-1 p-2">
                      {qualityResult.issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2 py-1 px-2 rounded bg-muted/30">
                          {issue.severity === 'error' ? (
                            <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="text-sm">{issue.message}</div>
                            {issue.column && (
                              <div className="text-xs text-muted-foreground">Column: {issue.column}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Gaps */}
            {gaps.length > 0 && (
              <Collapsible 
                open={expandedSections.includes('gaps')} 
                onOpenChange={() => toggleSection('gaps')}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded">
                  <span className="font-medium text-sm flex items-center gap-2">
                    Data Gaps
                    <Badge variant="outline" className="h-5">{gaps.length}</Badge>
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.includes('gaps') ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ScrollArea className="h-[100px]">
                    <div className="space-y-1 p-2">
                      {gaps.slice(0, 10).map((gap, i) => (
                        <div key={i} className="flex items-center justify-between py-1 px-2 rounded bg-muted/30 text-sm">
                          <span className="font-mono text-xs">
                            {new Date(gap.startTime).toLocaleDateString()}
                          </span>
                          <span className="text-muted-foreground">
                            {gap.expectedBars} bars missing
                          </span>
                        </div>
                      ))}
                      {gaps.length > 10 && (
                        <div className="text-xs text-center text-muted-foreground">
                          +{gaps.length - 10} more gaps
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* No Issues */}
            {qualityResult.issues.length === 0 && gaps.length === 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  Data quality is excellent - no issues detected
                </span>
              </div>
            )}
          </>
        )}

        {!qualityResult && !isScanning && (
          <div className="text-center py-6 text-muted-foreground">
            <FileSearch className="h-8 w-8 mx-auto mb-2 opacity-50" />
            {isStandalone ? (
              <>
                <p className="text-sm font-medium">Standalone Scanner</p>
                <p className="text-xs mt-1">Select a dataset from the Datasets tab to scan its quality</p>
              </>
            ) : (
              <p className="text-sm">Click "Scan Data" to analyze your dataset</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
