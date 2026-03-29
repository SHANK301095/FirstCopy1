/**
 * First-Run 3-Step Onboarding Tour
 * Spec: Include first-run 3-step tour
 */

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Database, BookOpen, Play, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db';

interface OnboardingTourProps {
  onComplete: () => void;
}

const TOUR_STEPS = [
  {
    id: 1,
    title: 'Import Your Data',
    description: 'Start by uploading your historical price data in CSV format. We support OHLCV data with timestamps. You can map columns during import.',
    icon: Database,
    action: { label: 'Go to Data Manager', path: '/data' },
    tips: [
      'Supports CSV files with timestamps, OHLC, and volume',
      'Auto-detects timeframe and validates data quality',
      'Data is stored locally in IndexedDB — works offline!'
    ]
  },
  {
    id: 2,
    title: 'Create a Strategy',
    description: 'Define your trading strategy using our YAML DSL or paste MQL5 code. Set entry/exit conditions, indicators, and risk parameters.',
    icon: BookOpen,
    action: { label: 'Go to Strategies', path: '/strategies' },
    tips: [
      'Use sample strategies as templates',
      'Version control tracks all changes',
      'Clone and modify existing strategies'
    ]
  },
  {
    id: 3,
    title: 'Run Backtests',
    description: 'Execute your strategy against historical data. View equity curves, drawdowns, and detailed trade-by-trade analysis.',
    icon: Play,
    action: { label: 'Go to Workflow', path: '/' },
    tips: [
      'Backtests run in Web Workers — no page freeze',
      'Pause, resume, or cancel anytime',
      'Export results as CSV, JSON, HTML, or PDF'
    ]
  }
];

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsVisible(false);
    await db.updateSettings({ uiPrefs: { basicMode: false, tableColumns: [], showOnboarding: false, autoSaveResults: true } });
    onComplete();
  };

  const handleGoTo = (path: string) => {
    navigate(path);
    handleComplete();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onComplete();
  };

  if (!isVisible) return null;

  const step = TOUR_STEPS[currentStep];
  const StepIcon = step.icon;
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-lg mx-4 shadow-xl border-primary/20">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Step {currentStep + 1} of {TOUR_STEPS.length}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress */}
          <Progress value={progress} className="h-1 rounded-none" />

          {/* Content */}
          <div className="p-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-3 rounded-xl bg-primary/10">
                <StepIcon className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{step.title}</h2>
                <p className="text-muted-foreground mt-1">{step.description}</p>
              </div>
            </div>

            {/* Tips */}
            <div className="space-y-2">
              {step.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-chart-2 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{tip}</span>
                </div>
              ))}
            </div>

            {/* Action Button */}
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => handleGoTo(step.action.path)}
            >
              {step.action.label}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Footer Navigation */}
          <div className="flex items-center justify-between p-4 border-t bg-muted/30">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <div className="flex gap-1">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>

            {currentStep === TOUR_STEPS.length - 1 ? (
              <Button onClick={handleComplete}>
                Get Started
                <CheckCircle className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button variant="ghost" onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Hook to manage onboarding state
 */
export function useOnboarding() {
  const [showTour, setShowTour] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const settings = await db.getSettings();
        if (settings.uiPrefs.showOnboarding) {
          setShowTour(true);
        }
      } catch {
        // Failed to check onboarding state - continue without tour
      } finally {
        setIsLoading(false);
      }
    };
    
    checkOnboarding();
  }, []);

  const completeTour = () => {
    setShowTour(false);
  };

  return { showTour, isLoading, completeTour };
}
