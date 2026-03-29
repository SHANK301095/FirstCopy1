/**
 * Premium Welcome Screen
 * Beautiful first-time user experience with animated steps and quick-start paths
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Database, Code, Play, BarChart3, ArrowRight, 
  CheckCircle, Rocket, BookOpen, Users, X, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const WELCOME_KEY = 'mmc-welcome-completed';

interface PremiumWelcomeScreenProps {
  onComplete: (path: 'demo' | 'library' | 'fresh' | 'skip') => void;
}

const FEATURES = [
  { icon: Database, label: 'Data Manager', desc: 'Upload & manage OHLCV datasets' },
  { icon: Code, label: 'Strategy Editor', desc: 'Write & test trading logic' },
  { icon: Play, label: 'Backtest Engine', desc: 'Run strategies on historical data' },
  { icon: BarChart3, label: 'Analytics', desc: 'Deep performance analysis' },
];

const PATHS = [
  {
    id: 'demo' as const,
    icon: Rocket,
    title: 'Try Demo',
    desc: 'Instant backtest with sample data & strategy',
    accent: 'from-primary/20 to-primary/5',
    border: 'border-primary/30 hover:border-primary/50',
    badge: 'Fastest',
  },
  {
    id: 'library' as const,
    icon: BookOpen,
    title: 'Browse Library',
    desc: 'Explore public datasets & strategies',
    accent: 'from-emerald-500/20 to-emerald-500/5',
    border: 'border-emerald-500/30 hover:border-emerald-500/50',
    badge: 'Recommended',
  },
  {
    id: 'fresh' as const,
    icon: Users,
    title: 'Start Fresh',
    desc: 'Upload your own data & strategy',
    accent: 'from-amber-500/20 to-amber-500/5',
    border: 'border-amber-500/30 hover:border-amber-500/50',
    badge: 'Advanced',
  },
];

export function PremiumWelcomeScreen({ onComplete }: PremiumWelcomeScreenProps) {
  const [step, setStep] = useState(0); // 0 = welcome, 1 = features, 2 = choose path

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 backdrop-blur-xl"
    >
      {/* Skip button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-6 right-6 text-muted-foreground"
        onClick={() => onComplete('skip')}
      >
        Skip <X className="h-4 w-4 ml-1" />
      </Button>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col items-center text-center max-w-lg mx-4"
          >
            {/* Logo animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-2xl shadow-primary/30 mb-8"
            >
              <Sparkles className="h-10 w-10 text-primary-foreground" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl md:text-4xl font-bold tracking-tight mb-3"
            >
              Welcome to MMC
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground text-lg mb-8 leading-relaxed"
            >
              The most powerful backtesting platform for traders.
              <br />
              <span className="text-foreground/80">Data → Strategy → Backtest → Results</span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button size="lg" onClick={() => setStep(1)} className="rounded-xl px-8 gap-2">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>

            {/* Progress dots */}
            <div className="flex gap-2 mt-8">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/20"
                  )}
                />
              ))}
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="features"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center text-center max-w-2xl mx-4"
          >
            <h2 className="text-2xl font-bold mb-2">How it works</h2>
            <p className="text-muted-foreground mb-8">Four simple steps to profitable strategies</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-8">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-muted/30 border border-border/50"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <f.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{f.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                  </div>
                  {i < FEATURES.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 hidden md:block absolute right-0 top-1/2 -translate-y-1/2" />
                  )}
                </motion.div>
              ))}
            </div>

            <Button size="lg" onClick={() => setStep(2)} className="rounded-xl px-8 gap-2">
              Choose Your Path <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="flex gap-2 mt-8">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/20"
                  )}
                />
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="paths"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center text-center max-w-2xl mx-4"
          >
            <h2 className="text-2xl font-bold mb-2">Choose your path</h2>
            <p className="text-muted-foreground mb-8">How would you like to start?</p>

            <div className="grid gap-4 w-full md:grid-cols-3">
              {PATHS.map((path, i) => (
                <motion.button
                  key={path.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onComplete(path.id)}
                  className={cn(
                    "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all text-left",
                    `bg-gradient-to-b ${path.accent} ${path.border}`
                  )}
                >
                  <div className="w-14 h-14 rounded-2xl bg-background/80 flex items-center justify-center shadow-sm">
                    <path.icon className="h-7 w-7 text-foreground" />
                  </div>
                  <Badge variant="secondary" className="text-xs">{path.badge}</Badge>
                  <h3 className="font-bold text-lg">{path.title}</h3>
                  <p className="text-sm text-muted-foreground">{path.desc}</p>
                </motion.button>
              ))}
            </div>

            <div className="flex gap-2 mt-8">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/20"
                  )}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Hook to manage welcome screen state
export function useWelcomeScreen() {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(WELCOME_KEY);
    if (!completed) {
      const timer = setTimeout(() => setShowWelcome(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeWelcome = useCallback((path: 'demo' | 'library' | 'fresh' | 'skip') => {
    localStorage.setItem(WELCOME_KEY, 'true');
    setShowWelcome(false);
    return path;
  }, []);

  const resetWelcome = useCallback(() => {
    localStorage.removeItem(WELCOME_KEY);
    setShowWelcome(true);
  }, []);

  return { showWelcome, completeWelcome, resetWelcome };
}
