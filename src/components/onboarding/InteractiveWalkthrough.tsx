/**
 * Interactive Walkthrough Tooltips
 * Highlights UI elements and guides first-time users through the app
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Database, 
  Code, 
  Play, 
  BarChart3, 
  Settings,
  Lightbulb,
  Target,
  Layers,
  TrendingUp,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface WalkthroughStep {
  id: string;
  target: string; // CSS selector
  title: string;
  description: string;
  icon: React.ElementType;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    label: string;
    onClick?: () => void;
  };
}

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'welcome',
    target: '[data-tour="sidebar"]',
    title: 'Navigation Sidebar',
    description: 'Access all features from here. The sidebar organizes tools into logical sections: Workflow, Strategy, Analysis, and more.',
    icon: Layers,
    position: 'right',
  },
  {
    id: 'data-manager',
    target: '[data-tour="data-manager"]',
    title: 'Data Manager',
    description: 'Upload and manage your historical price data. Supports CSV files with OHLCV format and automatic timeframe detection.',
    icon: Database,
    position: 'right',
  },
  {
    id: 'strategies',
    target: '[data-tour="strategies"]',
    title: 'Strategy Library',
    description: 'Create, edit, and organize your trading strategies. Use templates or build from scratch with our YAML DSL.',
    icon: Code,
    position: 'right',
  },
  {
    id: 'workflow',
    target: '[data-tour="workflow"]',
    title: 'Workflow Engine',
    description: 'The heart of backtesting. Connect data, strategy, and run parameters to execute comprehensive tests.',
    icon: Play,
    position: 'right',
  },
  {
    id: 'analytics',
    target: '[data-tour="analytics"]',
    title: 'Advanced Analytics',
    description: 'Deep-dive into results with Monte Carlo simulations, Walk-Forward analysis, and 100+ performance metrics.',
    icon: BarChart3,
    position: 'right',
  },
  {
    id: 'optimizer',
    target: '[data-tour="optimizer"]',
    title: 'Strategy Optimizer',
    description: 'Find optimal parameters using genetic algorithms, grid search, or multi-objective optimization.',
    icon: Target,
    position: 'right',
  },
  {
    id: 'risk',
    target: '[data-tour="risk"]',
    title: 'Risk Dashboard',
    description: 'Monitor risk metrics, stress test your strategies, and ensure proper position sizing.',
    icon: TrendingUp,
    position: 'right',
  },
  {
    id: 'quick-tip',
    target: '[data-tour="app-guide"]',
    title: 'Need Help?',
    description: 'Check out the App Guide for detailed documentation, tutorials, and keyboard shortcuts. You can also download a PDF guide!',
    icon: Lightbulb,
    position: 'right',
  },
];

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

function calculatePosition(
  targetRect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number,
  position: 'top' | 'bottom' | 'left' | 'right'
): TooltipPosition {
  const gap = 16;
  const arrowSize = 8;
  
  switch (position) {
    case 'right':
      return {
        top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
        left: targetRect.right + gap,
        arrowPosition: 'left',
      };
    case 'left':
      return {
        top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
        left: targetRect.left - tooltipWidth - gap,
        arrowPosition: 'right',
      };
    case 'top':
      return {
        top: targetRect.top - tooltipHeight - gap,
        left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        arrowPosition: 'bottom',
      };
    case 'bottom':
    default:
      return {
        top: targetRect.bottom + gap,
        left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        arrowPosition: 'top',
      };
  }
}

interface WalkthroughTooltipProps {
  step: WalkthroughStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

function WalkthroughTooltip({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onComplete,
}: WalkthroughTooltipProps) {
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [targetElement, setTargetElement] = useState<Element | null>(null);
  const tooltipWidth = 320;
  const tooltipHeight = 220;

  useEffect(() => {
    const target = document.querySelector(step.target);
    setTargetElement(target);

    if (target) {
      const rect = target.getBoundingClientRect();
      const pos = calculatePosition(rect, tooltipWidth, tooltipHeight, step.position);
      
      // Clamp to viewport
      pos.top = Math.max(16, Math.min(pos.top, window.innerHeight - tooltipHeight - 16));
      pos.left = Math.max(16, Math.min(pos.left, window.innerWidth - tooltipWidth - 16));
      
      setPosition(pos);
    }
  }, [step]);

  if (!position || !targetElement) {
    // If target not found, show centered fallback
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="bg-card border border-border rounded-xl p-6 shadow-2xl max-w-sm mx-4 animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="secondary" className="text-xs">
              Step {stepIndex + 1} of {totalSteps}
            </Badge>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onSkip}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <step.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{step.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={onPrev} disabled={stepIndex === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            {stepIndex === totalSteps - 1 ? (
              <Button size="sm" onClick={onComplete}>
                Finish Tour
                <Zap className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={onNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const targetRect = targetElement.getBoundingClientRect();

  return createPortal(
    <>
      {/* Overlay with spotlight cutout */}
      <div className="fixed inset-0 z-[99] pointer-events-none">
        <svg className="w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="hsl(var(--background) / 0.85)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      </div>

      {/* Highlight ring around target */}
      <div
        className="fixed z-[100] pointer-events-none rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
        }}
      />

      {/* Tooltip */}
      <div
        className="fixed z-[101] animate-fade-in"
        style={{
          top: position.top,
          left: position.left,
          width: tooltipWidth,
        }}
      >
        <div className="relative bg-card border border-border rounded-xl p-4 shadow-2xl">
          {/* Arrow */}
          <div
            className={cn(
              "absolute w-3 h-3 bg-card border rotate-45",
              position.arrowPosition === 'left' && "-left-1.5 top-1/2 -translate-y-1/2 border-l border-b",
              position.arrowPosition === 'right' && "-right-1.5 top-1/2 -translate-y-1/2 border-r border-t",
              position.arrowPosition === 'top' && "-top-1.5 left-1/2 -translate-x-1/2 border-l border-t",
              position.arrowPosition === 'bottom' && "-bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b"
            )}
          />

          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <Badge variant="glow" className="text-xs">
              Step {stepIndex + 1} of {totalSteps}
            </Badge>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onSkip}>
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
              <step.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1 mb-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === stepIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
                )}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrev}
              disabled={stepIndex === 0}
              className="h-8 text-xs"
            >
              <ChevronLeft className="h-3 w-3 mr-1" />
              Back
            </Button>
            
            <Button
              variant="link"
              size="sm"
              onClick={onSkip}
              className="h-8 text-xs text-muted-foreground"
            >
              Skip tour
            </Button>
            
            {stepIndex === totalSteps - 1 ? (
              <Button size="sm" onClick={onComplete} className="h-8 text-xs">
                Finish
                <Zap className="h-3 w-3 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={onNext} className="h-8 text-xs">
                Next
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

interface InteractiveWalkthroughProps {
  onComplete: () => void;
  steps?: WalkthroughStep[];
}

export function InteractiveWalkthrough({ 
  onComplete, 
  steps = WALKTHROUGH_STEPS 
}: InteractiveWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, steps.length]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    setIsActive(false);
    onComplete();
  }, [onComplete]);

  const handleComplete = useCallback(() => {
    setIsActive(false);
    onComplete();
  }, [onComplete]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStep === steps.length - 1) {
          handleComplete();
        } else {
          handleNext();
        }
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStep, handleNext, handlePrev, handleSkip, handleComplete, steps.length]);

  if (!isActive) return null;

  return (
    <WalkthroughTooltip
      step={steps[currentStep]}
      stepIndex={currentStep}
      totalSteps={steps.length}
      onNext={handleNext}
      onPrev={handlePrev}
      onSkip={handleSkip}
      onComplete={handleComplete}
    />
  );
}

// Hook to manage walkthrough state
const WALKTHROUGH_KEY = 'mmc-walkthrough-completed';

export function useInteractiveWalkthrough() {
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Check localStorage first (fast)
    const completed = localStorage.getItem(WALKTHROUGH_KEY);
    if (completed) {
      setHasChecked(true);
      return;
    }

    // Also check DB for cross-device persistence
    const checkDB = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles')
          .select('onboarded_at')
          .eq('id', user.id)
          .single();
        if (data?.onboarded_at) {
          // Already onboarded on another device — sync localStorage
          localStorage.setItem(WALKTHROUGH_KEY, 'true');
          setHasChecked(true);
          return;
        }
      }
      // Not onboarded — show walkthrough
      const timer = setTimeout(() => setShowWalkthrough(true), 1000);
      return () => clearTimeout(timer);
    };
    checkDB();
    setHasChecked(true);
  }, []);

  const completeWalkthrough = useCallback(async () => {
    localStorage.setItem(WALKTHROUGH_KEY, 'true');
    setShowWalkthrough(false);
    
    // Persist to DB
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles')
        .update({ onboarded_at: new Date().toISOString() })
        .eq('id', user.id);
    }
  }, []);

  const resetWalkthrough = useCallback(() => {
    localStorage.removeItem(WALKTHROUGH_KEY);
    setShowWalkthrough(true);
  }, []);

  return {
    showWalkthrough,
    hasChecked,
    completeWalkthrough,
    resetWalkthrough,
  };
}
