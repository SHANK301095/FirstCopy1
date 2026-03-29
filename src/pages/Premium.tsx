import { useState } from 'react';
import { Crown, Sparkles, Zap, Brain, Shield, Clock, Check, Loader2, MessageSquare, Search, AlertTriangle, Gift, Timer, Bot, HeadphonesIcon, ArrowRight, Star, Rocket } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { PageTitle } from '@/components/ui/PageTitle';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// AI Tools - Available to ALL users (no premium gating)
const aiTools = [
  {
    icon: Sparkles,
    title: 'AI Code Generator',
    description: 'Generate production-ready trading strategy code from natural language.',
    link: '/workflow?tab=strategy&mode=generate',
    popular: true,
  },
  {
    icon: Brain,
    title: 'Sentinel AI',
    description: 'Advanced AI assistant for trading insights and optimization.',
    link: '/sentinel',
    popular: true,
  },
  {
    icon: Search,
    title: 'Pattern Recognition',
    description: 'AI-powered chart pattern detection and setup identification.',
    link: '/pattern-recognition',
    popular: false,
  },
  {
    icon: AlertTriangle,
    title: 'Stress Testing',
    description: 'Simulate adverse market conditions and volatility spikes.',
    link: '/stress-testing',
    popular: false,
  },
];

// Premium-only features (require premium subscription)
const premiumOnlyFeatures = [
  {
    icon: Zap,
    title: 'Priority Processing',
    description: 'Backtests run first with dedicated compute resources.',
  },
  {
    icon: Shield,
    title: 'Advanced Analytics',
    description: 'Monte Carlo, walk-forward analysis, and stress testing.',
    link: '/advanced-analytics',
  },
  {
    icon: Clock,
    title: 'Extended History',
    description: 'Access longer historical data for comprehensive testing.',
  },
  {
    icon: HeadphonesIcon,
    title: 'Premium Support',
    description: 'Priority support with faster response times.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function Premium() {
  const { user } = useAuth();
  const { isPremium, isLoading, trial, startTrial } = usePremiumStatus();
  const [requestMessage, setRequestMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);

  const handleStartTrial = async () => {
    if (!user) {
      toast.error('Please log in to start a trial');
      return;
    }

    setIsStartingTrial(true);
    try {
      const success = await startTrial();
      if (success) {
        toast.success('🎉 Trial Started!', {
          description: 'You now have 3 days of free premium access. Enjoy all features!',
        });
      } else {
        toast.error('Could not start trial. You may have already used your trial.');
      }
    } catch (error) {
      toast.error('Failed to start trial');
    } finally {
      setIsStartingTrial(false);
    }
  };

  const handleRequestPremium = async () => {
    if (!user) {
      toast.error('Please log in to request premium access');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('logs').insert({
        user_id: user.id,
        scope: 'premium_request',
        level: 'info',
        message: 'Premium access request submitted',
        meta_json: {
          request_message: requestMessage || 'No message provided',
          user_email: user.email,
        },
      });

      if (error) throw error;

      toast.success('Premium request submitted!', {
        description: 'An admin will review your request shortly.',
      });
      setRequestMessage('');
    } catch (error) {
      console.error('Error submitting premium request:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-premium to-premium-strong animate-pulse" />
            <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-white" />
          </div>
          <p className="text-muted-foreground text-sm">Loading premium status...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      className="animate-fade-in max-w-5xl mx-auto space-y-8 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <PageTitle
        title="Premium Features"
        subtitle="Unlock the full potential of MMC with premium access"
      />

      {/* Current Status - Hero Card */}
      <motion.div variants={itemVariants}>
        <Card className={`relative overflow-hidden ${
          isPremium 
            ? 'bg-gradient-to-br from-premium/15 via-premium-strong/10 to-transparent border-premium/40 shadow-lg shadow-premium/10' 
            : 'bg-gradient-to-br from-muted/60 to-card border-border/50'
        }`}>
          {/* Animated background glow for premium */}
          {isPremium && (
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 right-0 w-64 h-64 bg-premium/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-premium-strong/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            </div>
          )}
          
          <CardContent className="relative pt-6 pb-6">
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div className="flex items-center gap-5">
                <motion.div 
                  className={`h-16 w-16 rounded-2xl flex items-center justify-center relative ${
                    isPremium 
                      ? 'bg-gradient-to-br from-premium via-premium-strong to-orange-600 shadow-xl shadow-premium/40' 
                      : 'bg-muted/80 border border-border'
                  }`}
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Crown className={`h-8 w-8 ${isPremium ? 'text-white' : 'text-muted-foreground'}`} />
                  {isPremium && (
                    <motion.div 
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-success"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: 'spring' }}
                    >
                      <Check className="h-4 w-4 text-white p-0.5" />
                    </motion.div>
                  )}
                </motion.div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className={`text-2xl font-bold tracking-tight ${isPremium ? 'text-premium' : ''}`}>
                      {isPremium 
                        ? (trial.isOnTrial ? 'Premium Trial' : 'Premium Active')
                        : 'Free Plan'
                      }
                    </h3>
                    {isPremium && <PremiumBadge size="sm" showText={false} />}
                    {trial.isOnTrial && (
                      <Badge className="bg-premium/20 text-premium border-premium/30 gap-1.5 font-medium">
                        <Timer className="h-3 w-3" />
                        {trial.daysRemaining} day{trial.daysRemaining !== 1 ? 's' : ''} left
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {isPremium 
                      ? (trial.isOnTrial 
                          ? `Your trial expires on ${trial.expiresAt?.toLocaleDateString('en-IN', { dateStyle: 'medium' })}` 
                          : 'You have full access to all premium features'
                        )
                      : 'Upgrade to unlock all features and remove limits'
                    }
                  </p>
                </div>
              </div>
              {isPremium && !trial.isOnTrial && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-success text-sm font-medium">Active</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Trial Card - Show only if not premium and hasn't used trial */}
      <AnimatePresence>
        {!isPremium && !trial.hasUsedTrial && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -20 }}
            data-trial-section
          >
            <Card className="relative overflow-hidden border-primary/40 shadow-lg shadow-primary/10">
              {/* Animated gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent" />
              <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl" />
              
              <CardContent className="relative pt-8 pb-8">
                <div className="flex items-center justify-between flex-wrap gap-8">
                  <div className="flex items-center gap-5">
                    <motion.div 
                      className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary via-primary to-purple-500 flex items-center justify-center shadow-xl shadow-primary/30"
                      animate={{ 
                        boxShadow: ['0 0 20px hsl(var(--primary) / 0.3)', '0 0 40px hsl(var(--primary) / 0.5)', '0 0 20px hsl(var(--primary) / 0.3)']
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Gift className="h-8 w-8 text-white" />
                    </motion.div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-bold">Try Premium Free</h3>
                        <Badge className="bg-primary/20 text-primary border-primary/30 font-semibold">
                          3 Days
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        Experience all premium features with no commitment. No credit card required.
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleStartTrial}
                    disabled={isStartingTrial}
                    size="lg"
                    className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white shadow-lg shadow-primary/25 font-semibold px-8 h-12 text-base"
                  >
                    {isStartingTrial ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Rocket className="h-5 w-5 mr-2" />
                        Start Free Trial
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trial Expired Notice */}
      <AnimatePresence>
        {!isPremium && trial.hasUsedTrial && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-warning/30 bg-gradient-to-br from-warning/5 to-transparent">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center border border-warning/20">
                    <Timer className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-warning">Trial Expired</h3>
                    <p className="text-sm text-muted-foreground">
                      Your free trial has ended. Request premium access below to continue using all features.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Tools Section - Available to ALL users */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">AI Tools</h2>
          <Badge variant="secondary" className="text-xs font-normal">Free for all</Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {aiTools.map((tool, index) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="group relative h-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/40 bg-gradient-to-br from-primary/5 via-transparent to-transparent border-primary/15">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl shrink-0 bg-primary/10 group-hover:bg-primary/15 transition-colors border border-primary/10">
                      <tool.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        {tool.title}
                        {tool.popular && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-0">
                            <Star className="h-2.5 w-2.5 mr-0.5" />
                            Popular
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs leading-relaxed">
                        {tool.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="h-4 w-4 rounded-full bg-success/15 flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-success" />
                      </div>
                      <span className="text-success text-xs font-medium">Free Access</span>
                    </div>
                    {tool.link && (
                      <Button 
                        asChild 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs px-2 text-primary hover:text-primary hover:bg-primary/10 group-hover:translate-x-0.5 transition-transform"
                      >
                        <Link to={tool.link}>
                          Open
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Premium Features Section - Orange/Gold Theme */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-5">
          <div className="h-8 w-8 rounded-lg bg-premium/15 flex items-center justify-center">
            <Crown className="h-4 w-4 text-premium" />
          </div>
          <h2 className="text-lg font-semibold text-premium">Premium Exclusive</h2>
          <Badge className="text-xs bg-gradient-to-r from-premium to-premium-strong text-white border-0 font-medium shadow-sm shadow-premium/25">
            PRO
          </Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {premiumOnlyFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Card className={`group relative h-full transition-all duration-300 border-premium/20 bg-gradient-to-br from-premium/8 via-premium-strong/5 to-transparent ${
                isPremium 
                  ? 'hover:border-premium/50 hover:shadow-lg hover:shadow-premium/10' 
                  : 'hover:border-premium/35'
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl shrink-0 bg-gradient-to-br from-premium/20 to-premium-strong/10 border border-premium/15 group-hover:from-premium/25 group-hover:to-premium-strong/15 transition-colors">
                      <feature.icon className="h-5 w-5 text-premium" />
                    </div>
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <CardTitle className="text-sm font-semibold text-foreground">
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="text-xs leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isPremium ? (
                        <>
                          <div className="h-4 w-4 rounded-full bg-success/15 flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-success" />
                          </div>
                          <span className="text-success text-xs font-medium">Unlocked</span>
                        </>
                      ) : (
                        <>
                          <div className="h-4 w-4 rounded-full bg-premium/15 flex items-center justify-center">
                            <Crown className="h-2.5 w-2.5 text-premium" />
                          </div>
                          <span className="text-premium text-xs font-medium">Premium</span>
                        </>
                      )}
                    </div>
                    {feature.link && isPremium && (
                      <Button 
                        asChild 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs px-2 text-premium hover:text-premium hover:bg-premium/10 group-hover:translate-x-0.5 transition-transform"
                      >
                        <Link to={feature.link}>
                          Open
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    )}
                    {!isPremium && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs px-2 text-premium hover:text-premium hover:bg-premium/10"
                        onClick={() => {
                          const trialSection = document.querySelector('[data-trial-section]');
                          if (trialSection) {
                            trialSection.scrollIntoView({ behavior: 'smooth' });
                          } else {
                            toast.info('Start a free trial or request premium access below!');
                          }
                        }}
                      >
                        Unlock
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Request Premium Access */}
      <AnimatePresence>
        {!isPremium && (
          <motion.div variants={itemVariants}>
            <Card className="border-dashed border-2 border-premium/25 bg-gradient-to-br from-premium/5 via-transparent to-transparent">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-premium/10 flex items-center justify-center border border-premium/20">
                    <MessageSquare className="h-5 w-5 text-premium" />
                  </div>
                  <div>
                    <CardTitle className="text-premium text-lg">Request Premium Access</CardTitle>
                    <CardDescription className="text-sm">
                      Send a request to get permanent premium access
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Tell us why you'd like premium access... (optional)"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  rows={3}
                  className="resize-none border-premium/20 focus:border-premium/50 bg-background/50"
                />
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    Your request will be reviewed by an administrator
                  </p>
                  <Button 
                    onClick={handleRequestPremium} 
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-premium to-premium-strong hover:from-premium/90 hover:to-premium-strong/90 text-white shadow-lg shadow-premium/25 font-medium"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Crown className="h-4 w-4 mr-2" />
                        Submit Request
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Already Premium (not on trial) */}
      <AnimatePresence>
        {isPremium && !trial.isOnTrial && (
          <motion.div variants={itemVariants}>
            <Card className="border-success/30 bg-gradient-to-br from-success/8 via-emerald-500/5 to-transparent">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20">
                    <Check className="h-7 w-7 text-success" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-success text-lg">You're All Set!</h3>
                    <p className="text-muted-foreground">
                      You have full access to all premium features. Thank you for being a premium member!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
