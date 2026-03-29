/**
 * Strategy Template Gallery - Quick-select common strategy templates
 * Allows users to instantly load pre-built strategies
 */

import { useState } from 'react';
import { TrendingUp, Activity, BarChart3, Target, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBacktestStore, StrategyState } from '@/lib/backtestStore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  language: StrategyState['language'];
  code: string;
}

const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: 'ema-crossover',
    name: 'EMA Crossover',
    description: 'Classic trend-following with 12/26 EMA crossover',
    category: 'Trend',
    icon: TrendingUp,
    language: 'MQL5',
    code: `//+------------------------------------------------------------------+
//| Expert Advisor - EMA Crossover Strategy                         |
//| Classic 12/26 EMA crossover for trend following                 |
//+------------------------------------------------------------------+
#property copyright "MMC Platform"
#property version   "1.00"

input int    FastEMA = 12;      // Fast EMA Period
input int    SlowEMA = 26;      // Slow EMA Period
input double LotSize = 0.1;     // Position Size
input int    StopLoss = 50;     // Stop Loss in Points
input int    TakeProfit = 100;  // Take Profit in Points

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
        double sl = SymbolInfoDouble(_Symbol, SYMBOL_BID) - StopLoss * _Point;
        double tp = SymbolInfoDouble(_Symbol, SYMBOL_BID) + TakeProfit * _Point;
        // Execute Buy Order
    }
    
    // Sell Signal: Fast EMA crosses below Slow EMA
    if(fastEMA[1] < slowEMA[1] && fastEMA[2] >= slowEMA[2]) {
        double sl = SymbolInfoDouble(_Symbol, SYMBOL_ASK) + StopLoss * _Point;
        double tp = SymbolInfoDouble(_Symbol, SYMBOL_ASK) - TakeProfit * _Point;
        // Execute Sell Order
    }
}`,
  },
  {
    id: 'rsi-reversal',
    name: 'RSI Reversal',
    description: 'Mean reversion using RSI overbought/oversold levels',
    category: 'Mean Reversion',
    icon: Activity,
    language: 'MQL5',
    code: `//+------------------------------------------------------------------+
//| Expert Advisor - RSI Reversal Strategy                           |
//| Mean reversion using RSI overbought/oversold signals            |
//+------------------------------------------------------------------+
#property copyright "MMC Platform"
#property version   "1.00"

input int    RSI_Period = 14;       // RSI Period
input int    OverboughtLevel = 70;  // Overbought Level
input int    OversoldLevel = 30;    // Oversold Level
input double LotSize = 0.1;         // Position Size
input int    StopLoss = 40;         // Stop Loss in Points
input int    TakeProfit = 80;       // Take Profit in Points

int rsiHandle;

int OnInit() {
    rsiHandle = iRSI(_Symbol, PERIOD_CURRENT, RSI_Period, PRICE_CLOSE);
    return(INIT_SUCCEEDED);
}

void OnTick() {
    double rsi[];
    ArraySetAsSeries(rsi, true);
    CopyBuffer(rsiHandle, 0, 0, 3, rsi);
    
    // Buy Signal: RSI crosses above oversold level
    if(rsi[1] > OversoldLevel && rsi[2] <= OversoldLevel) {
        double sl = SymbolInfoDouble(_Symbol, SYMBOL_BID) - StopLoss * _Point;
        double tp = SymbolInfoDouble(_Symbol, SYMBOL_BID) + TakeProfit * _Point;
        // Execute Buy Order - Expecting price to rise from oversold
    }
    
    // Sell Signal: RSI crosses below overbought level
    if(rsi[1] < OverboughtLevel && rsi[2] >= OverboughtLevel) {
        double sl = SymbolInfoDouble(_Symbol, SYMBOL_ASK) + StopLoss * _Point;
        double tp = SymbolInfoDouble(_Symbol, SYMBOL_ASK) - TakeProfit * _Point;
        // Execute Sell Order - Expecting price to fall from overbought
    }
}`,
  },
  {
    id: 'macd-momentum',
    name: 'MACD Momentum',
    description: 'Momentum trading with MACD signal line crossovers',
    category: 'Momentum',
    icon: BarChart3,
    language: 'MQL5',
    code: `//+------------------------------------------------------------------+
//| Expert Advisor - MACD Momentum Strategy                          |
//| Momentum trading using MACD histogram and signal crossovers     |
//+------------------------------------------------------------------+
#property copyright "MMC Platform"
#property version   "1.00"

input int    MACD_Fast = 12;     // MACD Fast Period
input int    MACD_Slow = 26;     // MACD Slow Period
input int    MACD_Signal = 9;    // MACD Signal Period
input double LotSize = 0.1;      // Position Size
input int    StopLoss = 60;      // Stop Loss in Points
input int    TakeProfit = 120;   // Take Profit in Points

int macdHandle;

int OnInit() {
    macdHandle = iMACD(_Symbol, PERIOD_CURRENT, MACD_Fast, MACD_Slow, MACD_Signal, PRICE_CLOSE);
    return(INIT_SUCCEEDED);
}

void OnTick() {
    double macdMain[], macdSignal[];
    ArraySetAsSeries(macdMain, true);
    ArraySetAsSeries(macdSignal, true);
    
    CopyBuffer(macdHandle, 0, 0, 3, macdMain);
    CopyBuffer(macdHandle, 1, 0, 3, macdSignal);
    
    // Buy Signal: MACD crosses above Signal line
    if(macdMain[1] > macdSignal[1] && macdMain[2] <= macdSignal[2]) {
        double sl = SymbolInfoDouble(_Symbol, SYMBOL_BID) - StopLoss * _Point;
        double tp = SymbolInfoDouble(_Symbol, SYMBOL_BID) + TakeProfit * _Point;
        // Execute Buy Order - Bullish momentum
    }
    
    // Sell Signal: MACD crosses below Signal line
    if(macdMain[1] < macdSignal[1] && macdMain[2] >= macdSignal[2]) {
        double sl = SymbolInfoDouble(_Symbol, SYMBOL_ASK) + StopLoss * _Point;
        double tp = SymbolInfoDouble(_Symbol, SYMBOL_ASK) - TakeProfit * _Point;
        // Execute Sell Order - Bearish momentum
    }
}`,
  },
  {
    id: 'breakout-range',
    name: 'Range Breakout',
    description: 'Breakout strategy using daily high/low levels',
    category: 'Breakout',
    icon: Target,
    language: 'MQL5',
    code: `//+------------------------------------------------------------------+
//| Expert Advisor - Range Breakout Strategy                         |
//| Trade breakouts from previous day's high/low range              |
//+------------------------------------------------------------------+
#property copyright "MMC Platform"
#property version   "1.00"

input int    LookbackBars = 20;   // Bars to calculate range
input double BreakoutBuffer = 5;  // Buffer above/below range
input double LotSize = 0.1;       // Position Size
input int    StopLoss = 50;       // Stop Loss in Points
input int    TakeProfit = 100;    // Take Profit in Points

double rangeHigh, rangeLow;

int OnInit() {
    return(INIT_SUCCEEDED);
}

void OnTick() {
    // Calculate range from lookback period
    rangeHigh = iHigh(_Symbol, PERIOD_D1, 1);
    rangeLow = iLow(_Symbol, PERIOD_D1, 1);
    
    double currentPrice = SymbolInfoDouble(_Symbol, SYMBOL_BID);
    double breakoutHigh = rangeHigh + BreakoutBuffer * _Point;
    double breakoutLow = rangeLow - BreakoutBuffer * _Point;
    
    // Buy Signal: Price breaks above range high
    if(currentPrice > breakoutHigh) {
        double sl = currentPrice - StopLoss * _Point;
        double tp = currentPrice + TakeProfit * _Point;
        // Execute Buy Order - Breakout to upside
    }
    
    // Sell Signal: Price breaks below range low
    if(currentPrice < breakoutLow) {
        double sl = currentPrice + StopLoss * _Point;
        double tp = currentPrice - TakeProfit * _Point;
        // Execute Sell Order - Breakout to downside
    }
}`,
  },
];

interface StrategyTemplateGalleryProps {
  onSelect?: (template: StrategyTemplate) => void;
  compact?: boolean;
}

export function StrategyTemplateGallery({ onSelect, compact = false }: StrategyTemplateGalleryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { setStrategyCode, setStrategyLanguage, validateStrategy } = useBacktestStore();
  const { toast } = useToast();

  const handleSelectTemplate = (template: StrategyTemplate) => {
    setSelectedId(template.id);
    setStrategyCode(template.code);
    setStrategyLanguage(template.language);
    
    // Auto-validate
    setTimeout(() => validateStrategy(), 100);

    toast({
      title: 'Template Loaded',
      description: `${template.name} loaded into editor`,
    });

    onSelect?.(template);
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {STRATEGY_TEMPLATES.map((template) => (
          <Button
            key={template.id}
            variant={selectedId === template.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSelectTemplate(template)}
            className="gap-2"
          >
            <template.icon className="h-3 w-3" />
            {template.name}
            {selectedId === template.id && <CheckCircle className="h-3 w-3" />}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {STRATEGY_TEMPLATES.map((template) => {
        const isSelected = selectedId === template.id;
        return (
          <Card 
            key={template.id}
            className={cn(
              'cursor-pointer transition-all hover:border-primary/50',
              isSelected && 'border-primary bg-primary/5'
            )}
            onClick={() => handleSelectTemplate(template)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    <template.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{template.name}</h4>
                      <Badge variant="secondary" className="text-[10px]">
                        {template.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {template.description}
                    </p>
                  </div>
                </div>
                {isSelected ? (
                  <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export { STRATEGY_TEMPLATES };
export type { StrategyTemplate };
