import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Copy, 
  Check, 
  RotateCcw, 
  ClipboardList,
  Shield,
  Database,
  HelpCircle,
  Bug,
  Sparkles,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  SCORECARD_CATEGORIES, 
  PASS_THRESHOLD, 
  MAX_SCORE,
  MMC_COPILOT_APP_KNOWLEDGE_AND_SCORECARD 
} from '@/lib/copilotKnowledge';
import { cn } from '@/lib/utils';

type ScoreValue = 0 | 1 | 2;

interface CriterionScore {
  categoryId: string;
  criterionIndex: number;
  score: ScoreValue;
}

const categoryIcons: Record<string, React.ReactNode> = {
  correctness: <CheckCircle2 className="h-4 w-4" />,
  real_data: <Database className="h-4 w-4" />,
  minimal_questions: <HelpCircle className="h-4 w-4" />,
  debugging: <Bug className="h-4 w-4" />,
  security: <Shield className="h-4 w-4" />,
  ux: <Sparkles className="h-4 w-4" />,
};

export default function CopilotQA() {
  const [scores, setScores] = useState<CriterionScore[]>([]);
  const [testResponse, setTestResponse] = useState('');
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);

  const getScore = useCallback((categoryId: string, criterionIndex: number): ScoreValue | null => {
    const found = scores.find(
      s => s.categoryId === categoryId && s.criterionIndex === criterionIndex
    );
    return found?.score ?? null;
  }, [scores]);

  const setScore = useCallback((categoryId: string, criterionIndex: number, score: ScoreValue) => {
    setScores(prev => {
      const filtered = prev.filter(
        s => !(s.categoryId === categoryId && s.criterionIndex === criterionIndex)
      );
      return [...filtered, { categoryId, criterionIndex, score }];
    });
  }, []);

  const getTotalScore = useCallback((): number => {
    return scores.reduce((sum, s) => sum + s.score, 0);
  }, [scores]);

  const getCategoryScore = useCallback((categoryId: string): number => {
    return scores
      .filter(s => s.categoryId === categoryId)
      .reduce((sum, s) => sum + s.score, 0);
  }, [scores]);

  const getMaxCategoryScore = useCallback((categoryId: string): number => {
    const category = SCORECARD_CATEGORIES.find(c => c.id === categoryId);
    return category ? category.criteria.length * 2 : 0;
  }, []);

  const hasSecurityFail = useCallback((): boolean => {
    const securityScores = scores.filter(s => s.categoryId === 'security');
    return securityScores.some(s => s.score === 0);
  }, [scores]);

  const totalScore = getTotalScore();
  const isPassing = totalScore >= PASS_THRESHOLD && !hasSecurityFail();
  const isComplete = scores.length === SCORECARD_CATEGORIES.reduce((sum, c) => sum + c.criteria.length, 0);

  const resetScores = () => {
    setScores([]);
    setTestResponse('');
    setNotes('');
    toast.success('Scorecard reset');
  };

  const copyKnowledge = async () => {
    try {
      await navigator.clipboard.writeText(MMC_COPILOT_APP_KNOWLEDGE_AND_SCORECARD);
      setCopied(true);
      toast.success('Knowledge copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const exportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      totalScore,
      maxScore: MAX_SCORE,
      passThreshold: PASS_THRESHOLD,
      isPassing,
      hasSecurityFail: hasSecurityFail(),
      testResponse,
      notes,
      categoryScores: SCORECARD_CATEGORIES.map(cat => ({
        id: cat.id,
        label: cat.label,
        score: getCategoryScore(cat.id),
        maxScore: getMaxCategoryScore(cat.id),
        criteria: cat.criteria.map((criterion, idx) => ({
          criterion,
          score: getScore(cat.id, idx) ?? 'not-scored'
        }))
      }))
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copilot-qa-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Copilot QA Scorecard</h1>
            <Badge variant="outline" className="ml-2 text-xs">Dev Only</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Evaluate MMC Copilot responses against quality criteria
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyKnowledge}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            Copy Knowledge
          </Button>
          <Button variant="outline" size="sm" onClick={resetScores}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button size="sm" onClick={exportReport} disabled={!isComplete}>
            <FileText className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Score Summary */}
      <Card className={cn(
        "transition-colors",
        isComplete && isPassing && "border-emerald-500/50 bg-emerald-500/5",
        isComplete && !isPassing && "border-red-500/50 bg-red-500/5"
      )}>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className={cn(
                  "text-4xl font-bold",
                  isComplete && isPassing && "text-emerald-500",
                  isComplete && !isPassing && "text-red-500"
                )}>
                  {totalScore}
                </div>
                <div className="text-xs text-muted-foreground">/ {MAX_SCORE}</div>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Pass Threshold:</span>
                  <Badge variant="secondary">{PASS_THRESHOLD}+</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {!isComplete ? (
                    <Badge variant="outline">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Incomplete
                    </Badge>
                  ) : isPassing ? (
                    <Badge className="bg-emerald-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Production Ready
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Needs Work
                    </Badge>
                  )}
                </div>
                {hasSecurityFail() && (
                  <div className="flex items-center gap-2 text-red-500 text-sm">
                    <Shield className="h-4 w-4" />
                    Security fail = immediate reject
                  </div>
                )}
              </div>
            </div>
            
            {/* Category mini scores */}
            <div className="flex flex-wrap gap-2">
              {SCORECARD_CATEGORIES.map(cat => {
                const catScore = getCategoryScore(cat.id);
                const maxCatScore = getMaxCategoryScore(cat.id);
                const isCritical = cat.id === 'security';
                const hasFail = isCritical && scores.filter(s => s.categoryId === cat.id).some(s => s.score === 0);
                
                return (
                  <div 
                    key={cat.id}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs",
                      hasFail && "border-red-500/50 bg-red-500/10 text-red-500"
                    )}
                  >
                    {categoryIcons[cat.id]}
                    <span className="font-medium">{catScore}/{maxCatScore}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Test Response Input */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Response to Evaluate</CardTitle>
            <CardDescription>
              Paste the Copilot response you want to score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea 
              value={testResponse}
              onChange={(e) => setTestResponse(e.target.value)}
              placeholder="Paste the MMC Copilot response here..."
              className="min-h-[200px] font-mono text-xs"
            />
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Evaluator Notes</CardTitle>
            <CardDescription>
              Add context, issues found, or improvement suggestions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes on the response quality, specific issues, etc..."
              className="min-h-[200px]"
            />
          </CardContent>
        </Card>
      </div>

      {/* Scoring Categories */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Score Each Criterion (0-2)</h2>
        
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {SCORECARD_CATEGORIES.map(category => (
              <Card key={category.id} className={cn(
                category.id === 'security' && "border-amber-500/30"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {categoryIcons[category.id]}
                      <CardTitle className="text-base">{category.label}</CardTitle>
                      {category.id === 'security' && (
                        <Badge variant="outline" className="text-amber-500 border-amber-500/50">
                          Critical
                        </Badge>
                      )}
                    </div>
                    <Badge variant="secondary">
                      {getCategoryScore(category.id)}/{getMaxCategoryScore(category.id)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {category.criteria.map((criterion, idx) => {
                    const currentScore = getScore(category.id, idx);
                    
                    return (
                      <div 
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg bg-muted/30 border border-border/50"
                      >
                        <div className="flex-1 text-sm">{criterion}</div>
                        <div className="flex items-center gap-1">
                          {([0, 1, 2] as const).map(score => (
                            <Button
                              key={score}
                              size="sm"
                              variant={currentScore === score ? "default" : "outline"}
                              className={cn(
                                "w-10 h-8 text-xs font-medium",
                                currentScore === score && score === 0 && "bg-red-500 hover:bg-red-600",
                                currentScore === score && score === 1 && "bg-amber-500 hover:bg-amber-600",
                                currentScore === score && score === 2 && "bg-emerald-500 hover:bg-emerald-600"
                              )}
                              onClick={() => setScore(category.id, idx, score)}
                            >
                              {score}
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Knowledge Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Knowledge Reference
          </CardTitle>
          <CardDescription>
            The full knowledge base injected into MMC Copilot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground p-4 bg-muted/30 rounded-lg">
              {MMC_COPILOT_APP_KNOWLEDGE_AND_SCORECARD}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
