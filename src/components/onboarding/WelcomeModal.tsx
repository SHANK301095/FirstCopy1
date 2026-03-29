/**
 * WelcomeModal - First-login onboarding flow (4 slides)
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Rocket, Target, BarChart3, Bot, Trophy,
  ChevronRight, ChevronLeft, Upload, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const GOALS = [
  { id: 'journal', icon: Target, label: 'I want to journal my trades', emoji: '🎯' },
  { id: 'backtest', icon: BarChart3, label: 'I want to backtest strategies', emoji: '📊' },
  { id: 'mt5', icon: Bot, label: 'I trade on MT5 and want auto-sync', emoji: '🤖' },
  { id: 'propfirm', icon: Trophy, label: "I'm doing a prop firm challenge", emoji: '🏆' },
] as const;

type GoalId = typeof GOALS[number]['id'];

const GOAL_TIPS: Record<GoalId, { action: string; link: string; tips: string[] }> = {
  journal: {
    action: 'Import your first trades',
    link: '/trades',
    tips: ['Log trades daily for pattern detection', 'Write journal entries after each session', 'Review your weekly performance'],
  },
  backtest: {
    action: 'Upload your first dataset',
    link: '/workflow',
    tips: ['Start with a simple EMA crossover', 'Use walk-forward analysis for robustness', 'Compare strategies side by side'],
  },
  mt5: {
    action: 'Connect your MT5 account',
    link: '/mt5-sync',
    tips: ['Auto-sync pulls trades in real-time', 'Set risk alerts for drawdown protection', 'Review daily P&L on the dashboard'],
  },
  propfirm: {
    action: 'Set up your challenge',
    link: '/prop-firm',
    tips: ['Track daily drawdown vs limits', 'Set alerts before you hit max loss', 'Journal every trade for consistency'],
  },
};

export function WelcomeModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<GoalId | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!user) return;
    const localFlag = localStorage.getItem('mmc_onboarded');
    if (localFlag === 'true') return;

    // Check DB
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('onboarded_at')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.onboarded_at) {
        localStorage.setItem('mmc_onboarded', 'true');
        return;
      }
      setOpen(true);
    })();
  }, [user]);

  const handleComplete = async () => {
    if (!user) return;
    // Save goal + onboarded_at
    await supabase.from('profiles').update({
      trader_goal: selectedGoal,
      onboarded_at: new Date().toISOString(),
    } as any).eq('id', user.id);
    localStorage.setItem('mmc_onboarded', 'true');
    setOpen(false);
    if (selectedGoal) {
      navigate(GOAL_TIPS[selectedGoal].link);
    }
  };

  const firstName = user?.user_metadata?.display_name?.split(' ')[0] || 
                     user?.email?.split('@')[0] || 'Trader';

  const canAdvance = slide !== 1 || selectedGoal !== null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden [&>button]:hidden">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-5">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i === slide ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
            )} />
          ))}
        </div>

        <div className="p-6 min-h-[340px] flex flex-col">
          {/* SLIDE 0: Welcome */}
          {slide === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 rounded-2xl bg-primary/10 animate-bounce">
                <Rocket className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Welcome to MMCai, {firstName}! 🎉</h2>
              <p className="text-muted-foreground max-w-sm">
                India's most powerful trading analytics platform. Let's set you up in 60 seconds.
              </p>
            </div>
          )}

          {/* SLIDE 1: Goal selection */}
          {slide === 1 && (
            <div className="flex-1 flex flex-col space-y-4">
              <h2 className="text-lg font-semibold text-center">What best describes you?</h2>
              <div className="grid gap-3 flex-1">
                {GOALS.map(goal => (
                  <button
                    key={goal.id}
                    onClick={() => setSelectedGoal(goal.id)}
                    className={cn(
                      'flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all',
                      selectedGoal === goal.id
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                        : 'border-border hover:border-primary/30 hover:bg-muted/30'
                    )}
                  >
                    <span className="text-xl">{goal.emoji}</span>
                    <span className="text-sm font-medium">{goal.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE 2: Quick setup based on goal */}
          {slide === 2 && selectedGoal && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">{GOAL_TIPS[selectedGoal].action}</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                We'll take you there right after setup. You can always change this later.
              </p>
            </div>
          )}

          {/* SLIDE 3: All set! */}
          {slide === 3 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
              {showConfetti && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute animate-confetti"
                      style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 0.5}s`,
                        backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'][i % 5],
                        width: 8, height: 8, borderRadius: i % 2 ? '50%' : '2px',
                      }}
                    />
                  ))}
                </div>
              )}
              <div className="p-4 rounded-2xl bg-profit/10">
                <Sparkles className="h-10 w-10 text-profit" />
              </div>
              <h2 className="text-2xl font-bold">You're all set! 🚀</h2>
              {selectedGoal && (
                <div className="text-left bg-muted/30 rounded-lg p-4 w-full max-w-sm">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Tips</p>
                  <ul className="space-y-1.5">
                    {GOAL_TIPS[selectedGoal].tips.map((tip, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span> {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                onClick={() => { handleComplete(); navigate('/referral'); }}
                className="text-sm text-primary hover:underline mt-2"
              >
                🎁 Share MMCai and earn free Pro months →
              </button>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between p-4 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSlide(s => s - 1)}
            disabled={slide === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {slide < 3 ? (
            <Button
              size="sm"
              onClick={() => {
                setSlide(s => s + 1);
                if (slide === 2) setShowConfetti(true);
              }}
              disabled={!canAdvance}
              className="gap-1"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleComplete} className="gap-1">
              Go to Dashboard <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
