/**
 * Quick Start Wizard - Global modal for instant workflow initiation
 * Provides 3 paths: Demo Mode, Public Library, Fresh Start
 */

import { useState } from 'react';
import { Zap, Library, Upload, ArrowRight, Sparkles, Play, CheckCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBacktestStore, CSVColumn } from '@/lib/backtestStore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Demo data for instant loading
const DEMO_DATA = {
  rows: [
    { time: '1704067200', open: '42000.50', high: '42150.00', low: '41950.25', close: '42100.75', volume: '1250.5' },
    { time: '1704067500', open: '42100.75', high: '42200.00', low: '42050.00', close: '42175.50', volume: '980.3' },
    { time: '1704067800', open: '42175.50', high: '42250.25', low: '42100.00', close: '42125.00', volume: '1100.8' },
    { time: '1704068100', open: '42125.00', high: '42180.00', low: '42000.00', close: '42050.25', volume: '1450.2' },
    { time: '1704068400', open: '42050.25', high: '42100.00', low: '41900.50', close: '41950.75', volume: '1320.6' },
    { time: '1704069000', open: '41950.75', high: '42050.00', low: '41850.00', close: '42000.00', volume: '890.4' },
    { time: '1704069300', open: '42000.00', high: '42150.50', low: '41980.25', close: '42100.25', volume: '1050.9' },
    { time: '1704069600', open: '42100.25', high: '42200.75', low: '42050.00', close: '42175.00', volume: '1180.3' },
    { time: '1704069900', open: '42175.00', high: '42300.00', low: '42100.50', close: '42250.50', volume: '1400.7' },
    { time: '1704070200', open: '42250.50', high: '42350.25', low: '42200.00', close: '42300.00', volume: '1600.5' },
  ],
  columns: [
    { name: 'time', mapping: 'timestamp' },
    { name: 'open', mapping: 'open' },
    { name: 'high', mapping: 'high' },
    { name: 'low', mapping: 'low' },
    { name: 'close', mapping: 'close' },
    { name: 'volume', mapping: 'volume' },
  ] as CSVColumn[],
  strategy: `//+------------------------------------------------------------------+
//| EMA Crossover Strategy - Demo                                   |
//+------------------------------------------------------------------+
input int FastEMA = 12;
input int SlowEMA = 26;

int OnInit() { return(INIT_SUCCEEDED); }

void OnTick() {
    // Buy when Fast EMA crosses above Slow EMA
    // Sell when Fast EMA crosses below Slow EMA
}`,
};

interface QuickStartOption {
  id: 'demo' | 'library' | 'fresh';
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: string;
  action: string;
}

const OPTIONS: QuickStartOption[] = [
  {
    id: 'demo',
    icon: Zap,
    title: 'Try Demo Mode',
    description: 'Load sample data & strategy instantly. Perfect for testing the platform.',
    badge: 'Fastest',
    action: 'Load Demo',
  },
  {
    id: 'library',
    icon: Library,
    title: 'Browse Public Library',
    description: 'Access curated market data and community strategies.',
    action: 'Open Library',
  },
  {
    id: 'fresh',
    icon: Upload,
    title: 'Start Fresh',
    description: 'Upload your own CSV data and paste your EA code.',
    action: 'Go to Workflow',
  },
];

interface QuickStartWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickStartWizard({ open, onOpenChange }: QuickStartWizardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setUploadedData, setStrategyCode, setStrategyLanguage, validateStrategy } = useBacktestStore();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelect = async (option: QuickStartOption) => {
    setLoading(option.id);

    if (option.id === 'demo') {
      // Load demo data instantly
      await new Promise(resolve => setTimeout(resolve, 600));
      
      setUploadedData({
        fileName: '🚀 Demo Data (BTCUSDT 5m)',
        columns: DEMO_DATA.columns,
        rows: DEMO_DATA.rows,
        symbols: ['BTCUSDT'],
        activeSymbol: 'BTCUSDT',
        timezone: 'UTC',
        validationErrors: [],
        gapCount: 0,
        nanCount: 0,
      });

      setStrategyCode(DEMO_DATA.strategy);
      setStrategyLanguage('MQL5');
      setTimeout(() => validateStrategy(), 100);

      toast({
        title: 'Demo Mode Active!',
        description: 'Data & strategy loaded. Jump to Backtest tab to run.',
      });

      onOpenChange(false);
      navigate('/workflow?tab=backtest');
    } else if (option.id === 'library') {
      onOpenChange(false);
      navigate('/workflow?tab=data');
      // Small delay then switch to library tab
      setTimeout(() => {
        toast({
          title: 'Browse Public Library',
          description: 'Select a dataset from the Public Library tab.',
        });
      }, 300);
    } else {
      onOpenChange(false);
      navigate('/workflow?tab=data');
    }

    setLoading(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Quick Start
          </DialogTitle>
          <DialogDescription>
            Choose how you want to begin your backtesting journey
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {OPTIONS.map((option) => {
            const isLoading = loading === option.id;
            return (
              <Card
                key={option.id}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary/50',
                  isLoading && 'border-primary bg-primary/5'
                )}
                onClick={() => !loading && handleSelect(option)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-2.5 rounded-lg',
                        option.id === 'demo' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}>
                        <option.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{option.title}</h4>
                          {option.badge && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                              {option.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant={option.id === 'demo' ? 'default' : 'outline'} 
                      size="sm"
                      disabled={!!loading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          {option.action}
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground">
            <Play className="h-3 w-3 inline mr-1" />
            All options lead to the Backtest Workflow. You can always switch data or strategy later.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
