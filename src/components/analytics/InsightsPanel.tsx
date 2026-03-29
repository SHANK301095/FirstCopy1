/**
 * Insights Panel V3.0
 * Display AI-like insights from offline analysis
 */

import { useState, useEffect } from 'react';
import {
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronRight,
  Sparkles,
  Clock,
  Target,
  TrendingDown,
  ArrowUpRight,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { 
  InsightResult, 
  AnalysisInput, 
  generateInsights, 
  getInsightsSummary 
} from '@/lib/insightsEngine';

interface InsightsPanelProps {
  trades: AnalysisInput['trades'];
  metrics?: AnalysisInput['metrics'];
  equity?: number[];
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  session: Clock,
  drawdown: TrendingDown,
  sizing: Target,
  exits: ArrowUpRight,
  entries: Target,
  pattern: Sparkles,
  risk: AlertTriangle,
};

const TYPE_STYLES = {
  warning: {
    icon: AlertTriangle,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
  },
  suggestion: {
    icon: Lightbulb,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30',
  },
  info: {
    icon: Info,
    color: 'text-muted-foreground',
    bg: 'bg-muted/50',
    border: 'border-border',
  },
  success: {
    icon: CheckCircle,
    color: 'text-profit',
    bg: 'bg-profit/10',
    border: 'border-profit/30',
  },
};

export function InsightsPanel({ trades, metrics, equity }: InsightsPanelProps) {
  const [insights, setInsights] = useState<InsightResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  useEffect(() => {
    if (trades.length > 0) {
      analyzeData();
    }
  }, [trades, metrics]);

  const analyzeData = () => {
    setLoading(true);
    // Simulate async for better UX
    setTimeout(() => {
      const results = generateInsights({ trades, metrics, equity });
      setInsights(results);
      setLoading(false);
    }, 500);
  };

  const summary = getInsightsSummary(insights);

  if (trades.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No trade data to analyze</p>
          <p className="text-sm text-muted-foreground">Run a backtest to see insights</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Strategy Insights
              <Badge variant="secondary" className="ml-2">Offline AI</Badge>
            </CardTitle>
            <CardDescription>
              Rule-based analysis • No API calls • 100% private
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={analyzeData} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Re-analyze
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-3" />
            <span className="text-muted-foreground">Analyzing trades...</span>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{summary.total}</p>
                <p className="text-xs text-muted-foreground">Total Insights</p>
              </div>
              <div className="p-3 rounded-lg bg-warning/10 text-center">
                <p className="text-2xl font-bold text-warning">{summary.warnings}</p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 text-center">
                <p className="text-2xl font-bold text-primary">{summary.suggestions}</p>
                <p className="text-xs text-muted-foreground">Suggestions</p>
              </div>
              <div className="p-3 rounded-lg bg-profit/10 text-center">
                <p className="text-2xl font-bold text-profit">{summary.successes}</p>
                <p className="text-xs text-muted-foreground">Strengths</p>
              </div>
            </div>

            {/* Insights List */}
            <ScrollArea className="h-[400px]">
              {insights.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-10 w-10 mx-auto mb-3 text-profit" />
                  <p className="font-medium">No significant issues found</p>
                  <p className="text-sm">Your strategy looks good based on initial analysis</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight) => {
                    const typeStyle = TYPE_STYLES[insight.type];
                    const TypeIcon = typeStyle.icon;
                    const CategoryIcon = CATEGORY_ICONS[insight.category] || Lightbulb;
                    
                    return (
                      <Collapsible
                        key={insight.id}
                        open={expandedInsight === insight.id}
                        onOpenChange={(open) => setExpandedInsight(open ? insight.id : null)}
                      >
                        <CollapsibleTrigger asChild>
                          <div
                            className={cn(
                              'p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md',
                              typeStyle.bg,
                              typeStyle.border
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <TypeIcon className={cn('h-5 w-5 mt-0.5 shrink-0', typeStyle.color)} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-sm">{insight.title}</h4>
                                  <Badge variant="outline" className="text-[10px] capitalize">
                                    <CategoryIcon className="h-2.5 w-2.5 mr-1" />
                                    {insight.category}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {insight.description}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Confidence</p>
                                  <p className="text-sm font-mono">{insight.confidence}%</p>
                                </div>
                                <ChevronRight className={cn(
                                  'h-4 w-4 text-muted-foreground transition-transform',
                                  expandedInsight === insight.id && 'rotate-90'
                                )} />
                              </div>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className={cn(
                            'mt-1 p-4 rounded-lg border-l-2',
                            typeStyle.border.replace('border-', 'border-l-'),
                            'bg-muted/30'
                          )}>
                            <p className="text-sm mb-3">{insight.description}</p>
                            {insight.actionable && insight.suggestedAction && (
                              <div className="p-3 rounded-lg bg-background border flex items-start gap-3">
                                <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs font-medium text-primary mb-1">Suggested Action</p>
                                  <p className="text-sm">{insight.suggestedAction}</p>
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-3">
                              <Progress value={insight.confidence} className="h-1.5 flex-1" />
                              <span className="text-xs text-muted-foreground">
                                {insight.confidence}% confidence
                              </span>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}
