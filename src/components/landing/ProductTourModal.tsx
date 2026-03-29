import { useState, forwardRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Brain, 
  Globe, 
  BarChart3, 
  Shield, 
  Rocket,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductTourModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tourSteps = [
  {
    icon: Rocket,
    title: 'Welcome to Version 3.0',
    description: 'Experience a completely reimagined backtesting platform with powerful new features designed for professional traders.',
    visual: (
      <div className="relative h-48 bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 rounded-xl overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-6xl font-bold text-gradient animate-pulse">3.0</div>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.3),transparent_70%)]" />
      </div>
    ),
    gradient: 'from-primary to-primary',
  },
  {
    icon: Zap,
    title: '10x Faster Processing',
    description: 'Our new parallel processing engine runs 50,000+ backtests per minute. What used to take hours now completes in seconds.',
    visual: (
      <div className="relative h-48 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-amber-500/5 rounded-xl overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i}
              className="h-24 w-3 bg-gradient-to-t from-amber-500 to-orange-400 rounded-full animate-pulse"
              style={{ animationDelay: `${i * 150}ms`, height: `${60 + Math.random() * 40}%` }}
            />
          ))}
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex justify-between text-sm text-muted-foreground">
          <span>Before: 2 hours</span>
          <span className="text-success font-semibold">Now: 12 seconds</span>
        </div>
      </div>
    ),
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    icon: Brain,
    title: 'AI-Powered Insights',
    description: 'GPT-5 integration analyzes your strategies, detects anomalies, and suggests optimizations automatically.',
    visual: (
      <div className="relative h-48 bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-purple-500/5 rounded-xl overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <Brain className="h-20 w-20 text-purple-400 animate-pulse" />
            <div className="absolute -inset-4 bg-purple-500/20 rounded-full blur-xl animate-ping" style={{ animationDuration: '2s' }} />
          </div>
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-center text-sm text-purple-300">
          "Detected potential overfitting in parameters 3-7"
        </div>
      </div>
    ),
    gradient: 'from-purple-500 to-pink-600',
  },
  {
    icon: Globe,
    title: 'Real-Time Collaboration',
    description: 'Work with your team in shared workspaces. See live cursors, instant syncing, and collaborate on strategies together.',
    visual: (
      <div className="relative h-48 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-emerald-500/5 rounded-xl overflow-hidden p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">SC</div>
          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">MT</div>
          <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white">JW</div>
          <span className="text-sm text-muted-foreground ml-2">3 collaborators online</span>
        </div>
        <div className="space-y-2">
          <div className="h-6 bg-muted/50 rounded animate-pulse" style={{ width: '80%' }} />
          <div className="h-6 bg-muted/50 rounded animate-pulse" style={{ width: '60%', animationDelay: '200ms' }} />
          <div className="h-6 bg-emerald-500/30 rounded border border-emerald-500/50" style={{ width: '70%' }}>
            <span className="text-xs text-emerald-400 px-2">Sarah is editing...</span>
          </div>
        </div>
      </div>
    ),
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: BarChart3,
    title: '100+ Analytics Metrics',
    description: 'Monte Carlo simulations, Walk-Forward analysis, Regime Detection, and comprehensive risk metrics all in one place.',
    visual: (
      <div className="relative h-48 bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-blue-500/5 rounded-xl overflow-hidden p-4">
        <div className="grid grid-cols-3 gap-2 h-full">
          {['Sharpe', 'Sortino', 'Calmar', 'Max DD', 'Win Rate', 'Profit Factor'].map((metric, i) => (
            <div key={metric} className="bg-muted/50 rounded-lg p-2 flex flex-col justify-between animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <span className="text-xs text-muted-foreground">{metric}</span>
              <span className="text-sm font-semibold text-blue-400">{(Math.random() * 3 + 1).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    gradient: 'from-blue-500 to-cyan-600',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant with end-to-end encryption. Your strategies and data are always protected.',
    visual: (
      <div className="relative h-48 bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-indigo-500/5 rounded-xl overflow-hidden flex items-center justify-center">
        <div className="relative">
          <Shield className="h-20 w-20 text-indigo-400" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-6 w-6 rounded-full bg-success flex items-center justify-center">
              <span className="text-xs text-white">✓</span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-4 text-xs text-muted-foreground">
          <span>🔒 SOC 2</span>
          <span>🔐 E2E Encrypted</span>
          <span>🛡️ GDPR</span>
        </div>
      </div>
    ),
    gradient: 'from-indigo-500 to-violet-600',
  },
];

export const ProductTourModal = forwardRef<HTMLDivElement, ProductTourModalProps>(
  function ProductTourModal({ open, onOpenChange }, ref) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onOpenChange(false);
      setCurrentStep(0);
    }
  };
  
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const step = tourSteps[currentStep];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-card border-border/50">
        <div className="relative">
          {/* Header */}
          <div className="p-6 pb-0">
            <div className="flex items-center justify-between mb-4">
              <Badge variant="glow" className="text-xs">
                Product Tour
              </Badge>
              <span className="text-xs text-muted-foreground">
                {currentStep + 1} of {tourSteps.length}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="flex gap-1 mb-6">
              {tourSteps.map((_, index) => (
                <div 
                  key={index}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all duration-300",
                    index <= currentStep 
                      ? `bg-gradient-to-r ${step.gradient}` 
                      : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>
          
          {/* Content */}
          <div className="px-6 pb-6">
            <div className="mb-6 transition-all duration-500 animate-fade-in" key={currentStep}>
              {step.visual}
            </div>
            
            <div className="flex items-start gap-4 mb-6">
              <div className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0",
                "bg-gradient-to-br",
                step.gradient
              )}>
                <step.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              
              <div className="flex gap-1.5">
                {tourSteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      index === currentStep 
                        ? "w-6 bg-primary" 
                        : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )}
                  />
                ))}
              </div>
              
              <Button 
                variant="default" 
                size="sm"
                onClick={handleNext}
                className="gap-1"
              >
                {currentStep === tourSteps.length - 1 ? 'Get Started' : 'Next'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

ProductTourModal.displayName = 'ProductTourModal';
