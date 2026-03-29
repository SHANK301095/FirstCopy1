/**
 * Global Flow Stepper Component
 * Shows progress through the core workflow: Data → Scan → Backtest → Results → Report
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { Database, Search, Play, BarChart3, FileText, Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface StepStatus {
  hasData: boolean;
  hasScan: boolean;
  hasBacktest: boolean;
  hasResults: boolean;
  hasReport: boolean;
}

interface FlowStepperProps {
  status?: Partial<StepStatus>;
  className?: string;
}

const steps = [
  { 
    id: 'data', 
    label: 'Data', 
    icon: Database, 
    path: '/data', 
    cta: 'Upload',
    statusKey: 'hasData' as keyof StepStatus,
  },
  { 
    id: 'scan', 
    label: 'Scan', 
    icon: Search, 
    path: '/scanner', 
    cta: 'Scan',
    statusKey: 'hasScan' as keyof StepStatus,
  },
  { 
    id: 'backtest', 
    label: 'Backtest', 
    icon: Play, 
    path: '/workflow', 
    cta: 'Run',
    statusKey: 'hasBacktest' as keyof StepStatus,
  },
  { 
    id: 'results', 
    label: 'Results', 
    icon: BarChart3, 
    path: '/saved-results', 
    cta: 'View',
    statusKey: 'hasResults' as keyof StepStatus,
  },
  { 
    id: 'report', 
    label: 'Report', 
    icon: FileText, 
    path: '/tearsheet', 
    cta: 'Export',
    statusKey: 'hasReport' as keyof StepStatus,
  },
];

export function FlowStepper({ status = {}, className }: FlowStepperProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const currentStepIndex = steps.findIndex(s => s.path === location.pathname);

  return (
    <div className={cn(
      'flex items-center gap-1 p-2 rounded-xl bg-muted/30 border border-border/50',
      isMobile && 'overflow-x-auto scrollbar-none',
      className
    )}>
      {steps.map((step, index) => {
        const isDone = status[step.statusKey] ?? false;
        const isCurrent = step.path === location.pathname;
        const Icon = step.icon;
        
        return (
          <div key={step.id} className="flex items-center shrink-0">
            <button
              onClick={() => navigate(step.path)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                'hover:bg-muted/50',
                isCurrent && 'bg-primary/10 text-primary',
                !isCurrent && !isDone && 'text-muted-foreground',
                isDone && !isCurrent && 'text-profit'
              )}
            >
              <div className={cn(
                'relative flex items-center justify-center h-6 w-6 rounded-full',
                isDone && 'bg-profit/20',
                isCurrent && 'bg-primary/20',
                !isDone && !isCurrent && 'bg-muted'
              )}>
                {isDone ? (
                  <Check className="h-3.5 w-3.5 text-profit" />
                ) : (
                  <Icon className={cn(
                    'h-3.5 w-3.5',
                    isCurrent ? 'text-primary' : 'text-muted-foreground'
                  )} />
                )}
              </div>
              <span className={cn(
                'text-xs font-medium whitespace-nowrap',
                isMobile && 'hidden sm:inline'
              )}>
                {step.label}
              </span>
              {!isDone && isCurrent && (
                <Button 
                  size="sm" 
                  variant="secondary"
                  className="h-5 px-2 text-[10px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Trigger appropriate action based on step
                  }}
                >
                  {step.cta}
                </Button>
              )}
            </button>
            
            {index < steps.length - 1 && (
              <ChevronRight className={cn(
                'h-4 w-4 mx-1 shrink-0',
                index < currentStepIndex || isDone ? 'text-profit/50' : 'text-muted-foreground/30'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
