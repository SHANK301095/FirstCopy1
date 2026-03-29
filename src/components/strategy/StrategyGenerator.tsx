import { useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles, Wand2, Copy, Check, Download, ArrowRight, Lightbulb, Code2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { hapticFeedback } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import Editor from '@monaco-editor/react';
import { useAuth } from '@/contexts/AuthContext';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useAiUsage } from '@/hooks/useAiUsage';
import { UpgradeModal, PremiumBadge, UsageCounter, LoginRequiredCard } from '@/components/premium';
import { supabase } from '@/integrations/supabase/client';

const OUTPUT_LANGUAGES = [
  { value: 'MQL4', label: 'MQL4 (MT4)', icon: '📊' },
  { value: 'MQL5', label: 'MQL5 (MT5)', icon: '📈' },
  { value: 'Python', label: 'Python (Backtrader)', icon: '🐍' },
];

const EXAMPLE_PROMPTS = [
  "Jab 9 EMA 21 EMA ko upar cross kare to buy karo, SL 20 pips, TP 40 pips",
  "RSI 30 se neeche jaye to buy, 70 se upar jaye to sell. ATR based SL",
  "MACD signal line crossover pe entry, Bollinger band touch pe exit",
  "When price breaks above yesterday's high with volume > 1.5x average, buy",
  "Supertrend indicator based strategy with trailing stop loss",
];

interface StrategyGeneratorProps {
  onCodeGenerated?: (code: string, language: string) => void;
}

export function StrategyGenerator({ onCodeGenerated }: StrategyGeneratorProps) {
  const { user, session } = useAuth();
  const { isPremium, isLoading: isPremiumLoading } = usePremiumStatus();
  const { usedToday, remaining, limit, refetch: refetchUsage } = useAiUsage('strategy_generator');
  
  const [description, setDescription] = useState('');
  const [strategyName, setStrategyName] = useState('');
  const [outputLanguage, setOutputLanguage] = useState<string>('MQL5');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  // Refetch usage when generation completes
  useEffect(() => {
    if (!isGenerating && generatedCode) {
      refetchUsage();
    }
  }, [isGenerating, generatedCode, refetchUsage]);

  const generateCode = useCallback(async () => {
    if (!description.trim()) {
      toast({ title: 'Error', description: 'Please describe your strategy', variant: 'destructive' });
      return;
    }

    // Check if user can generate (non-premium and no remaining)
    if (!isPremium && remaining <= 0) {
      setShowUpgradeModal(true);
      return;
    }

    hapticFeedback('medium');
    setIsGenerating(true);
    setGeneratedCode('');

    abortRef.current = new AbortController();

    try {
      // Get fresh access token
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession?.access_token) {
        toast({ 
          title: 'Session Expired', 
          description: 'Please sign in again', 
          variant: 'destructive' 
        });
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strategy-generator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({
          description,
          outputLanguage,
          strategyName: strategyName || 'Custom Strategy',
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific error codes
        if (errorData.code === 'AUTH_REQUIRED') {
          toast({ 
            title: 'Login Required', 
            description: 'Please sign in to use the Strategy Generator', 
            variant: 'destructive' 
          });
          return;
        }
        
        if (errorData.code === 'LIMIT_EXCEEDED') {
          setShowUpgradeModal(true);
          return;
        }
        
        throw new Error(errorData.error || 'Failed to generate code');
      }

      if (!response.body) throw new Error('No response stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullCode = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (!line || line.startsWith(':')) continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullCode += content;
              setGeneratedCode(fullCode);
            }
          } catch {
            // partial JSON, continue
          }
        }
      }

      // Clean up markdown code blocks if present
      let cleanedCode = fullCode;
      const codeBlockMatch = fullCode.match(/```(?:mql4|mql5|python|cpp)?\n?([\s\S]*?)```/);
      if (codeBlockMatch) {
        cleanedCode = codeBlockMatch[1].trim();
        setGeneratedCode(cleanedCode);
      }

      hapticFeedback('success');
      toast({ title: 'Success', description: 'Strategy code generated!' });

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      hapticFeedback('error');
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to generate code', 
        variant: 'destructive' 
      });
    } finally {
      setIsGenerating(false);
    }
  }, [description, outputLanguage, strategyName, toast, isPremium, remaining]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    hapticFeedback('light');
    toast({ title: 'Copied!', description: 'Code copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  }, [generatedCode, toast]);

  const handleDownload = useCallback(() => {
    const ext = outputLanguage === 'Python' ? 'py' : 'mq5';
    const filename = `${strategyName || 'strategy'}.${ext}`;
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    hapticFeedback('light');
    toast({ title: 'Downloaded', description: filename });
  }, [generatedCode, outputLanguage, strategyName, toast]);

  const handleUseCode = useCallback(() => {
    onCodeGenerated?.(generatedCode, outputLanguage === 'Python' ? 'Pseudocode' : outputLanguage);
    hapticFeedback('success');
    toast({ title: 'Code Loaded', description: 'Strategy loaded into editor' });
  }, [generatedCode, outputLanguage, onCodeGenerated, toast]);

  const loadExample = (example: string) => {
    setDescription(example);
    hapticFeedback('selection');
  };

  // Show login required card if not authenticated
  if (!user) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Wand2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">AI Strategy Generator</h2>
            <p className="text-sm text-muted-foreground">
              Describe your strategy in Hindi/English → Get production-ready code
            </p>
          </div>
        </div>

        <LoginRequiredCard feature="AI Strategy Generator" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Premium Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Wand2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">AI Strategy Generator</h2>
              {isPremium && <PremiumBadge size="sm" />}
            </div>
            <p className="text-sm text-muted-foreground">
              Describe your strategy in Hindi/English → Get production-ready code
            </p>
          </div>
        </div>
      </div>

      {/* Usage Counter for Free Users */}
      {!isPremium && !isPremiumLoading && (
        <UsageCounter
          used={usedToday}
          limit={limit}
          onUpgradeClick={() => setShowUpgradeModal(true)}
        />
      )}

      {/* Input Section */}
      <Card variant="default">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-warning" />
            Describe Your Strategy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Strategy Name */}
          <div className="space-y-2">
            <Label htmlFor="strategy-name">Strategy Name (Optional)</Label>
            <Input
              id="strategy-name"
              placeholder="e.g., EMA Crossover Pro"
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Strategy Description <span className="text-muted-foreground">(Hindi/English)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Jab 9 EMA 21 EMA ko upar cross kare to buy karo, neeche cross kare to sell. Stop loss 20 pips, take profit 40 pips rakhna hai..."
              className="min-h-[120px] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Example Chips */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Examples</Label>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => loadExample(example)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs border transition-all",
                    "hover:bg-primary/10 hover:border-primary/50 active:scale-95",
                    description === example && "bg-primary/10 border-primary"
                  )}
                >
                  {example.slice(0, 40)}...
                </button>
              ))}
            </div>
          </div>

          {/* Output Language */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label>Output Language</Label>
              <Select value={outputLanguage} onValueChange={setOutputLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTPUT_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      <span className="flex items-center gap-2">
                        <span>{lang.icon}</span>
                        {lang.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={generateCode}
                disabled={isGenerating || !description.trim() || (!isPremium && remaining <= 0)}
                variant="default"
                className="w-full sm:w-auto"
              >
                {isGenerating ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Code
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Code */}
      {(generatedCode || isGenerating) && (
        <Card variant="default" className="animate-fade-in">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" />
                Generated Code
                <Badge variant="outline" className="ml-2">
                  {outputLanguage}
                </Badge>
              </CardTitle>
              {generatedCode && !isGenerating && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t border-border">
              <Editor
                height="400px"
                language={outputLanguage === 'Python' ? 'python' : 'cpp'}
                theme="vs-dark"
                value={generatedCode}
                onChange={(v) => setGeneratedCode(v || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  padding: { top: 16 },
                  readOnly: isGenerating,
                }}
              />
            </div>
          </CardContent>

          {/* Use Code Button */}
          {generatedCode && !isGenerating && onCodeGenerated && (
            <div className="p-4 border-t border-border bg-muted/30">
              <Button onClick={handleUseCode} className="w-full sm:w-auto">
                Use This Code
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Tips Card */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4">
          <h4 className="font-medium text-sm mb-2">💡 Tips for Better Results</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Mention specific indicator values (e.g., "9 EMA", "RSI 30")</li>
            <li>• Specify entry AND exit conditions</li>
            <li>• Include stop loss and take profit values</li>
            <li>• Describe in Hindi, English, or mix (Hinglish)</li>
            <li>• Be specific about timeframe if needed</li>
          </ul>
        </CardContent>
      </Card>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        usedToday={usedToday}
        limit={limit}
      />
    </div>
  );
}
