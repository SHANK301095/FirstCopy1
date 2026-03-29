import { X, FileSpreadsheet, Code, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBacktestStore } from '@/lib/backtestStore';
import { cn } from '@/lib/utils';

interface OnboardingBannerProps {
  onNavigate: (tab: string) => void;
}

export function OnboardingBanner({ onNavigate }: OnboardingBannerProps) {
  const { showOnboarding, dismissOnboarding, isDataValid, isStrategyValid, results } = useBacktestStore();

  if (!showOnboarding) return null;

  const steps = [
    {
      num: 1,
      label: 'Upload CSV',
      icon: FileSpreadsheet,
      tab: 'data',
      done: isDataValid(),
    },
    {
      num: 2,
      label: 'Paste EA',
      icon: Code,
      tab: 'strategy',
      done: isStrategyValid(),
    },
    {
      num: 3,
      label: 'Backtest & Export',
      icon: Download,
      tab: 'results',
      done: !!results,
    },
  ];

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg p-4 mb-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-3">Getting Started</h3>
          <div className="flex flex-wrap gap-3">
            {steps.map((step, idx) => (
              <div key={step.num} className="flex items-center gap-2">
                <div className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                  step.done ? 'bg-profit/20 text-profit' : 'bg-muted'
                )}>
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                    step.done ? 'bg-profit text-profit-foreground' : 'bg-primary/20 text-primary'
                  )}>
                    {step.done ? '✓' : step.num}
                  </span>
                  <step.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{step.label}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => onNavigate(step.tab)}
                >
                  Go →
                </Button>
                {idx < steps.length - 1 && <span className="text-muted-foreground">→</span>}
              </div>
            ))}
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={dismissOnboarding} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
