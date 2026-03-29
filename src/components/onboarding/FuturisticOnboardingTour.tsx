/**
 * Futuristic Neural Network Onboarding Tour
 * Features neural network animations, holographic effects, and particle systems
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Database, 
  Code, 
  Play, 
  BarChart3, 
  Target,
  TrendingUp,
  Lightbulb,
  Zap,
  Sparkles,
  Brain,
  Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Neural network node type
interface NeuralNode {
  id: number;
  x: number;
  y: number;
  layer: number;
  vx: number;
  vy: number;
}

interface NeuralConnection {
  from: NeuralNode;
  to: NeuralNode;
  progress: number;
  active: boolean;
}

// Tour step interface
interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  features: string[];
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to MMC Elite',
    description: 'Your AI-powered trading strategy platform. Let\'s explore the neural core.',
    icon: Brain,
    gradient: 'from-primary via-chart-1 to-chart-2',
    features: ['Advanced backtesting', 'Neural optimization', 'Real-time analytics']
  },
  {
    id: 'data',
    title: 'Data Neural Hub',
    description: 'Import historical data and watch our neural networks process it in real-time.',
    icon: Database,
    gradient: 'from-chart-1 via-chart-2 to-chart-3',
    features: ['OHLCV data import', 'Auto timeframe detection', 'Quality validation']
  },
  {
    id: 'strategy',
    title: 'Strategy Matrix',
    description: 'Create powerful trading strategies with our YAML DSL or MQL5 integration.',
    icon: Code,
    gradient: 'from-chart-2 via-chart-3 to-chart-4',
    features: ['Template library', 'Version control', 'AI suggestions']
  },
  {
    id: 'backtest',
    title: 'Quantum Backtester',
    description: 'Run lightning-fast backtests with Web Workers - no UI freeze.',
    icon: Play,
    gradient: 'from-chart-3 via-chart-4 to-chart-5',
    features: ['Parallel processing', 'Live progress', 'Detailed metrics']
  },
  {
    id: 'analytics',
    title: 'Neural Analytics',
    description: 'Deep-dive with Monte Carlo simulations, Walk-Forward, and 100+ metrics.',
    icon: BarChart3,
    gradient: 'from-chart-4 via-chart-5 to-primary',
    features: ['Monte Carlo', 'Walk-Forward', 'Risk analysis']
  },
  {
    id: 'optimize',
    title: 'Genetic Optimizer',
    description: 'Find optimal parameters using evolutionary algorithms and neural networks.',
    icon: Target,
    gradient: 'from-chart-5 via-primary to-chart-1',
    features: ['Genetic algorithms', 'Grid search', 'Multi-objective']
  },
  {
    id: 'launch',
    title: 'Ready for Launch',
    description: 'You\'re all set! Start building your trading edge with MMC Elite.',
    icon: Rocket,
    gradient: 'from-primary via-chart-2 to-chart-4',
    features: ['24/7 support', 'Community', 'Documentation']
  }
];

// Neural Network Background Animation
function NeuralNetworkCanvas({ isActive }: { isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<NeuralNode[]>([]);
  const connectionsRef = useRef<NeuralConnection[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize nodes
    const nodeCount = 50;
    nodesRef.current = Array.from({ length: nodeCount }, (_, i) => ({
      id: i,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      layer: Math.floor(Math.random() * 5),
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5
    }));

    // Create connections
    connectionsRef.current = [];
    nodesRef.current.forEach((node, i) => {
      const nearbyNodes = nodesRef.current
        .filter((n, j) => j !== i)
        .sort((a, b) => {
          const distA = Math.hypot(a.x - node.x, a.y - node.y);
          const distB = Math.hypot(b.x - node.x, b.y - node.y);
          return distA - distB;
        })
        .slice(0, 3);

      nearbyNodes.forEach(nearNode => {
        connectionsRef.current.push({
          from: node,
          to: nearNode,
          progress: Math.random(),
          active: Math.random() > 0.5
        });
      });
    });

    const animate = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw nodes
      nodesRef.current.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // Draw node glow
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 8);
        gradient.addColorStop(0, `hsla(${200 + node.layer * 30}, 70%, 60%, 0.8)`);
        gradient.addColorStop(1, `hsla(${200 + node.layer * 30}, 70%, 60%, 0)`);
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw node core
        ctx.beginPath();
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${200 + node.layer * 30}, 80%, 70%, 1)`;
        ctx.fill();
      });

      // Draw connections with data flow
      connectionsRef.current.forEach(conn => {
        const dx = conn.to.x - conn.from.x;
        const dy = conn.to.y - conn.from.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 200) {
          const alpha = (1 - dist / 200) * 0.3;
          
          // Draw connection line
          ctx.beginPath();
          ctx.moveTo(conn.from.x, conn.from.y);
          ctx.lineTo(conn.to.x, conn.to.y);
          ctx.strokeStyle = `hsla(200, 70%, 60%, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Draw data pulse
          if (conn.active) {
            conn.progress += 0.02;
            if (conn.progress > 1) conn.progress = 0;

            const pulseX = conn.from.x + dx * conn.progress;
            const pulseY = conn.from.y + dy * conn.progress;

            ctx.beginPath();
            ctx.arc(pulseX, pulseY, 4, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${180 + conn.progress * 60}, 80%, 60%, ${alpha * 3})`;
            ctx.fill();
          }
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    if (isActive) {
      animate();
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}

// Holographic Step Card
function StepCard({ step, isActive }: { step: TourStep; isActive: boolean }) {
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
      animate={{ 
        opacity: isActive ? 1 : 0.3, 
        scale: isActive ? 1 : 0.9,
        rotateY: 0
      }}
      exit={{ opacity: 0, scale: 0.8, rotateY: 15 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="relative w-full max-w-md"
    >
      {/* Holographic border */}
      <div className={cn(
        "absolute -inset-[1px] rounded-2xl bg-gradient-to-r opacity-70 blur-sm",
        `bg-gradient-to-r ${step.gradient}`
      )} />
      
      {/* Glass card */}
      <div className="relative bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl p-8 overflow-hidden">
        {/* Scan line effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent"
          animate={{ y: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />

        {/* Grid overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          {/* Icon with glow */}
          <motion.div
            className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center mb-6",
              "bg-gradient-to-br shadow-lg",
              step.gradient
            )}
            animate={{ 
              boxShadow: [
                '0 0 20px hsla(var(--primary), 0.3)',
                '0 0 40px hsla(var(--primary), 0.5)',
                '0 0 20px hsla(var(--primary), 0.3)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Icon className="w-10 h-10 text-primary-foreground" />
          </motion.div>

          {/* Title with gradient text */}
          <h2 className={cn(
            "text-3xl font-bold mb-3 bg-gradient-to-r bg-clip-text text-transparent",
            step.gradient
          )}>
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-muted-foreground mb-6 text-lg">
            {step.description}
          </p>

          {/* Features */}
          <div className="space-y-3">
            {step.features.map((feature, i) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <motion.div
                  className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                >
                  <Sparkles className="w-3 h-3 text-primary" />
                </motion.div>
                <span className="text-foreground/80">{feature}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-primary/40 rounded-tl-2xl" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-primary/40 rounded-br-2xl" />
      </div>
    </motion.div>
  );
}

// Progress indicator with neural nodes
function NeuralProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-3 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className="relative"
          initial={false}
        >
          {/* Connection line */}
          {i < total - 1 && (
            <motion.div
              className="absolute top-1/2 left-full w-3 h-0.5"
              style={{ transform: 'translateY(-50%)' }}
              animate={{
                backgroundColor: i < current 
                  ? 'hsl(var(--primary))' 
                  : 'hsl(var(--muted))'
              }}
              transition={{ duration: 0.3 }}
            />
          )}
          
          {/* Node */}
          <motion.div
            className={cn(
              "w-4 h-4 rounded-full flex items-center justify-center",
              "transition-all duration-300"
            )}
            animate={{
              scale: i === current ? 1.5 : 1,
              backgroundColor: i <= current 
                ? 'hsl(var(--primary))' 
                : 'hsl(var(--muted))'
            }}
          >
            {i === current && (
              <motion.div
                className="absolute w-8 h-8 rounded-full border-2 border-primary"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

// Main Tour Component
interface FuturisticOnboardingTourProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function FuturisticOnboardingTour({ onComplete, onSkip }: FuturisticOnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  }, [currentStep, onComplete]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    onSkip?.();
    onComplete();
  }, [onSkip, onComplete]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') handleSkip();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleSkip]);

  const step = TOUR_STEPS[currentStep];

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl"
    >
      {/* Neural network background */}
      <NeuralNetworkCanvas isActive={true} />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/60"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800)
            }}
            animate={{
              y: [null, Math.random() * -200 - 100],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      {/* Close button */}
      <motion.button
        onClick={handleSkip}
        className="absolute top-6 right-6 p-2 rounded-full bg-card/50 border border-border/50 hover:bg-card/80 transition-colors z-10"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <X className="w-5 h-5 text-muted-foreground" />
      </motion.button>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-lg w-full">
        {/* Logo/Brand */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-2 mb-4"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
            MMC Elite
          </span>
        </motion.div>

        {/* Step Card */}
        <AnimatePresence mode="wait" custom={direction}>
          <StepCard 
            key={step.id} 
            step={step} 
            isActive={true}
          />
        </AnimatePresence>

        {/* Progress */}
        <NeuralProgress current={currentStep} total={TOUR_STEPS.length} />

        {/* Navigation */}
        <div className="flex items-center gap-4 w-full max-w-md justify-between">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <Button
            variant="link"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Skip Tour
          </Button>

          <Button
            onClick={handleNext}
            className={cn(
              "gap-2 bg-gradient-to-r",
              step.gradient
            )}
          >
            {currentStep === TOUR_STEPS.length - 1 ? (
              <>
                Get Started
                <Rocket className="w-4 h-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Keyboard hint */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground flex items-center gap-4"
      >
        <span className="flex items-center gap-1">
          <kbd className="px-2 py-0.5 rounded bg-muted text-muted-foreground">←</kbd>
          <kbd className="px-2 py-0.5 rounded bg-muted text-muted-foreground">→</kbd>
          Navigate
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-2 py-0.5 rounded bg-muted text-muted-foreground">Esc</kbd>
          Skip
        </span>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// Hook to manage futuristic tour state
const TOUR_KEY = 'mmc-futuristic-tour-completed';

export function useFuturisticTour() {
  const [showTour, setShowTour] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY);
    if (!completed) {
      const timer = setTimeout(() => {
        setShowTour(true);
        setIsReady(true);
      }, 500);
      return () => clearTimeout(timer);
    }
    setIsReady(true);
  }, []);

  const completeTour = useCallback(() => {
    localStorage.setItem(TOUR_KEY, 'true');
    setShowTour(false);
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_KEY);
    setShowTour(true);
  }, []);

  return {
    showTour,
    isReady,
    completeTour,
    resetTour
  };
}
