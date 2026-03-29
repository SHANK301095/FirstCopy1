import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Code, CheckCircle, AlertTriangle, FileCode, Sparkles, ArrowRight, Wand2, Upload, Globe, Library } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBacktestStore, StrategyState } from '@/lib/backtestStore';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { StrategyGenerator } from '@/components/strategy/StrategyGenerator';
import { UniversalAssetSelector, type AssetOption } from '@/components/selectors';
import { useNavigate } from 'react-router-dom';
import { StrategyTemplateGallery } from './StrategyTemplateGallery';

const LANGUAGES: { value: StrategyState['language']; label: string }[] = [
  { value: 'MQL4', label: 'MQL4' },
  { value: 'MQL5', label: 'MQL5' },
  { value: 'PineScript', label: 'PineScript' },
  { value: 'Pseudocode', label: 'Pseudocode' },
];

const DSL_EXAMPLE = `# StrategySpec v1 - YAML Example
name: "EMA Crossover Strategy"
version: "1.0"
description: "Simple EMA crossover with ATR-based stops"

indicators:
  - name: ema_fast
    type: EMA
    period: 12
    source: close
  - name: ema_slow
    type: EMA
    period: 26
    source: close
  - name: atr
    type: ATR
    period: 14

entry:
  long:
    conditions:
      - ema_fast > ema_slow
      - ema_fast[1] <= ema_slow[1]  # Crossover
    stop_loss: entry_price - (atr * 2)
    take_profit: entry_price + (atr * 3)
  short:
    conditions:
      - ema_fast < ema_slow
      - ema_fast[1] >= ema_slow[1]  # Crossunder
    stop_loss: entry_price + (atr * 2)
    take_profit: entry_price - (atr * 3)

exit:
  - type: stop_loss
  - type: take_profit

risk:
  position_size: 1%  # Risk per trade
  max_positions: 1
`;

const SAMPLE_EA = `//+------------------------------------------------------------------+
//| Expert Advisor - EMA Crossover                                   |
//+------------------------------------------------------------------+
#property copyright "Your Name"
#property version   "1.00"

input int    FastEMA = 12;
input int    SlowEMA = 26;
input double LotSize = 0.1;
input int    StopLoss = 50;
input int    TakeProfit = 100;

int fastHandle, slowHandle;

int OnInit() {
    fastHandle = iMA(_Symbol, PERIOD_CURRENT, FastEMA, 0, MODE_EMA, PRICE_CLOSE);
    slowHandle = iMA(_Symbol, PERIOD_CURRENT, SlowEMA, 0, MODE_EMA, PRICE_CLOSE);
    return(INIT_SUCCEEDED);
}

void OnTick() {
    double fastEMA[], slowEMA[];
    ArraySetAsSeries(fastEMA, true);
    ArraySetAsSeries(slowEMA, true);
    
    CopyBuffer(fastHandle, 0, 0, 3, fastEMA);
    CopyBuffer(slowHandle, 0, 0, 3, slowEMA);
    
    // Buy Signal: Fast EMA crosses above Slow EMA
    if(fastEMA[1] > slowEMA[1] && fastEMA[2] <= slowEMA[2]) {
        // Open Buy Order
        double sl = SymbolInfoDouble(_Symbol, SYMBOL_BID) - StopLoss * _Point;
        double tp = SymbolInfoDouble(_Symbol, SYMBOL_BID) + TakeProfit * _Point;
        // OrderSend logic here
    }
    
    // Sell Signal: Fast EMA crosses below Slow EMA
    if(fastEMA[1] < slowEMA[1] && fastEMA[2] >= slowEMA[2]) {
        // Open Sell Order
        double sl = SymbolInfoDouble(_Symbol, SYMBOL_ASK) + StopLoss * _Point;
        double tp = SymbolInfoDouble(_Symbol, SYMBOL_ASK) - TakeProfit * _Point;
        // OrderSend logic here
    }
}
`;

interface StrategyTabProps {
  onProceedToBacktest?: () => void;
}

export function StrategyTab({ onProceedToBacktest }: StrategyTabProps) {
  const { strategy, setStrategyCode, setStrategyLanguage, validateStrategy, isStrategyValid } = useBacktestStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showDSL, setShowDSL] = useState(false);
  const [activeTab, setActiveTab] = useState<'library' | 'generate' | 'paste'>('library');
  const [selectedStrategy, setSelectedStrategy] = useState<AssetOption | null>(null);

  const handleValidate = () => {
    if (strategy.code.trim().length < 50) {
      toast({ title: 'Error', description: 'Strategy code is too short', variant: 'destructive' });
      return;
    }
    validateStrategy();
    toast({ title: 'Validated', description: 'Strategy translated successfully' });
  };

  const loadSample = () => {
    setStrategyCode(SAMPLE_EA);
    toast({ title: 'Sample Loaded', description: 'EMA Crossover EA loaded' });
  };

  const handleCodeGenerated = (code: string, language: string) => {
    setStrategyCode(code);
    setStrategyLanguage(language as StrategyState['language']);
    setActiveTab('paste');
    toast({ title: 'Code Loaded', description: 'AI generated code loaded into editor' });
  };

  // Handle strategy selection from library
  const handleStrategySelect = (asset: AssetOption | null) => {
    setSelectedStrategy(asset);
    if (asset?.original) {
      const stratData = asset.original as { code?: string };
      if (stratData.code) {
        setStrategyCode(stratData.code);
        setActiveTab('paste');
        toast({ title: 'Strategy Loaded', description: `"${asset.name}" loaded into editor` });
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tab Switcher */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'library' | 'generate' | 'paste')}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Library className="h-4 w-4" />
            From Library
          </TabsTrigger>
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            AI Generate
          </TabsTrigger>
          <TabsTrigger value="paste" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Paste Code
          </TabsTrigger>
        </TabsList>

        {/* Strategy Library Tab */}
        <TabsContent value="library" className="mt-0 space-y-6">
          {/* Quick Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Quick Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Start with a proven strategy template. Click to load instantly.
              </p>
              <StrategyTemplateGallery onSelect={() => setActiveTab('paste')} />
            </CardContent>
          </Card>

          {/* Advanced: From Library */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-muted-foreground" />
                Or Select from Library
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Choose from Public Library, My Strategies, or Create New</Label>
                <UniversalAssetSelector
                  assetType="strategy"
                  value={selectedStrategy}
                  onSelect={handleStrategySelect}
                  onCreateNew={() => navigate('/strategy-library')}
                  placeholder="Select a strategy from your library or public strategies..."
                />
              </div>
              
              {selectedStrategy && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{selectedStrategy.name}</span>
                    <Badge variant="secondary">{selectedStrategy.visibility}</Badge>
                  </div>
                  {selectedStrategy.subtitle && (
                    <p className="text-sm text-muted-foreground">{selectedStrategy.subtitle}</p>
                  )}
                  <Button 
                    onClick={() => setActiveTab('paste')}
                    className="w-full mt-2"
                    size="sm"
                  >
                    View & Edit Code
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Generator Tab */}
        <TabsContent value="generate" className="mt-0">
          <StrategyGenerator onCodeGenerated={handleCodeGenerated} />
        </TabsContent>

        {/* Paste Code Tab */}
        <TabsContent value="paste" className="mt-0 space-y-6">
      <Card variant="default">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              Paste Your EA Code Here
            </CardTitle>
            <div className="flex items-center gap-3">
              <Select value={strategy.language} onValueChange={(v) => setStrategyLanguage(v as StrategyState['language'])}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={loadSample}>
                Load Sample
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t border-border">
            <Editor
              height="400px"
              language={strategy.language === 'PineScript' ? 'javascript' : 'cpp'}
              theme="vs-dark"
              value={strategy.code}
              onChange={(v) => setStrategyCode(v || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                padding: { top: 16 },
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions & Status */}
      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={handleValidate} variant="default" disabled={strategy.code.trim().length < 10}>
          <Sparkles className="h-4 w-4 mr-2" />
          Validate Strategy
        </Button>
        
        <Dialog open={showDSL} onOpenChange={setShowDSL}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <FileCode className="h-4 w-4 mr-2" />
              Use DSL Fallback
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>StrategySpec v1 (YAML DSL)</DialogTitle>
            </DialogHeader>
            <div className="overflow-auto max-h-[60vh]">
              <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto">
                {DSL_EXAMPLE}
              </pre>
            </div>
            <p className="text-sm text-muted-foreground">
              Copy this template and modify for your strategy if automatic translation fails.
            </p>
          </DialogContent>
        </Dialog>

        {/* Status Badge */}
        {strategy.isValidated && (
          <Badge variant="outline" className={cn('text-sm py-1.5', strategy.confidence >= 0.7 ? 'text-profit border-profit' : 'text-warning border-warning')}>
            <CheckCircle className="h-3 w-3 mr-1" />
            {strategy.translationStatus} | Confidence: {strategy.confidence.toFixed(2)}
          </Badge>
        )}
      </div>

      {/* Validation Status Card */}
      {isStrategyValid() ? (
        <div className="bg-profit/10 border border-profit/30 rounded-lg p-4 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-profit flex-shrink-0" />
            <div>
              <p className="font-semibold text-profit">Strategy Ready for Backtest</p>
              <p className="text-sm text-muted-foreground">
                {strategy.language} code validated • Confidence: {strategy.confidence.toFixed(2)}
              </p>
            </div>
          </div>
          {onProceedToBacktest && (
            <Button onClick={onProceedToBacktest} variant="default" size="sm" className="flex-shrink-0">
              Proceed to Backtest
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-semibold">Awaiting Validation</p>
                <p className="text-sm text-muted-foreground">
                  Paste your EA code above and click "Validate Strategy" to continue.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supported Strategy Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-semibold text-sm">MQL4/MQL5</p>
              <p className="text-xs text-muted-foreground">MetaTrader Expert Advisors with OnTick/OnInit</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-semibold text-sm">PineScript</p>
              <p className="text-xs text-muted-foreground">TradingView strategies with strategy.entry/exit</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-semibold text-sm">Pseudocode</p>
              <p className="text-xs text-muted-foreground">Plain English rules like "Buy when RSI &lt; 30"</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-semibold text-sm">YAML DSL</p>
              <p className="text-xs text-muted-foreground">Structured StrategySpec format</p>
            </div>
          </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
