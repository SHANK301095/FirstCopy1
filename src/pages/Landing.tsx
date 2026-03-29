import { useState, useEffect, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, Brain, Zap, TrendingUp, ChevronRight, Play, Star,
  ArrowRight, Sparkles, CheckCircle2, Check, Bot, Trophy,
  Calendar, Target, Smartphone, Shield, ChevronDown, Menu, X,
  FlaskConical, Dna, Activity, LineChart, Layers, Lock,
  Gauge, Users, FileText, Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ProductTourModal } from '@/components/landing/ProductTourModal';
import { Footer } from '@/components/layout/Footer';
import { usePlatformStats } from '@/hooks/usePlatformStats';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import mmcLogo from '@/assets/mmc-logo.png';

/* ─────────────────── DATA ─────────────────── */

const whyMMC = [
  { icon: Brain, title: 'AI-Powered Insights', desc: 'Pattern detection, behavioral diagnostics, and personalized coaching — all powered by advanced AI.' },
  { icon: BarChart3, title: 'Hedge-Fund Grade Backtesting', desc: 'Walk-forward, Monte Carlo, genetic optimizer & stress testing — tools only institutions had access to.' },
  { icon: Zap, title: 'MT5 Auto-Sync', desc: 'One-click EA setup. Trades sync automatically every 5 minutes. Zero manual data entry.' },
  { icon: Trophy, title: 'Prop Firm Tracker', desc: 'Track challenge progress, daily drawdown limits & profit targets across FTMO, MyForexFunds & more.' },
  { icon: Shield, title: 'Bank-Grade Security', desc: 'End-to-end encryption, row-level access control, and encrypted credential vault. Your data stays yours.' },
  { icon: Smartphone, title: 'Works Offline', desc: 'Full PWA with offline support. Journal, analyze, and backtest — even without internet.' },
  { icon: Gauge, title: 'Real-Time Risk Lab', desc: 'Position sizing, Kelly criterion, risk-of-ruin calculator & advanced drawdown analytics.' },
  { icon: Award, title: 'Gamified Growth', desc: 'Achievements, XP system, trading streaks & leaderboards to keep you disciplined and motivated.' },
];

const featureCards = [
  { icon: Bot, title: 'AI Trade Copilot', desc: 'Natural language chat to analyze trades, detect patterns, and get actionable insights instantly.' },
  { icon: BarChart3, title: 'Professional Backtesting', desc: 'Walk-forward, Monte Carlo, stress testing — institutional tools for retail traders.' },
  { icon: Brain, title: 'Behavioral Diagnostics', desc: 'Identify emotional biases, revenge trading, and cognitive traps in your trading psychology.' },
  { icon: Calendar, title: 'Smart Journal', desc: 'Daily P&L heatmap, pre-market plans, post-market reviews with mood & confidence tracking.' },
  { icon: Trophy, title: 'Prop Firm Mode', desc: 'Track multiple challenge accounts with real-time drawdown monitoring and progress alerts.' },
  { icon: Zap, title: 'MT5 Auto-Sync', desc: 'One-click EA installation. Trades flow in automatically. No manual logging ever again.' },
  { icon: Target, title: 'Risk Lab', desc: 'Kelly criterion, fixed fractional, risk-of-ruin — all the tools to master position sizing.' },
  { icon: Star, title: 'Achievements & XP', desc: 'Gamified milestones and trading streaks to build consistency and discipline.' },
  { icon: Smartphone, title: 'Works Everywhere', desc: 'PWA with offline support. Desktop, tablet, or mobile — even without internet.' },
];

const aiChecklist = [
  'Pattern detection across 7 dimensions',
  'Behavioral bias identification',
  'Pre-trade setup matching',
  'Natural language copilot chat',
  'Personalized growth roadmap',
  'Offline AI (no API needed)',
];

const backtestCards = [
  { icon: Activity, title: 'Walk-Forward Analysis', desc: 'Out-of-sample validation to ensure your strategy works on unseen data.' },
  { icon: FlaskConical, title: 'Monte Carlo Simulation', desc: 'Run 10,000+ randomized scenarios to stress-test your equity curve.' },
  { icon: Dna, title: 'Genetic Optimizer', desc: 'Evolutionary algorithms find optimal parameters without overfitting.' },
  { icon: Shield, title: 'Stress Testing', desc: 'Simulate black swan events, flash crashes, and extreme volatility.' },
];

const pricingPlans = [
  {
    name: 'Free',
    price: '₹0',
    period: 'forever',
    desc: 'Get started with journaling basics',
    features: ['50 trades/month', 'Basic journal', 'Calendar heatmap', 'CSV import', 'Community support'],
    cta: 'Start Free',
    popular: false,
  },
  {
    name: 'Pro',
    price: '₹499',
    period: '/month',
    desc: 'For serious traders who want an edge',
    features: ['Unlimited trades', 'AI Copilot', 'Full backtesting suite', 'MT5 Auto-Sync', 'Behavioral diagnostics', 'Prop firm tracker', 'Priority support'],
    cta: 'Start Pro Trial',
    popular: true,
  },
  {
    name: 'Elite',
    price: '₹1,499',
    period: '/month',
    desc: 'For professional & prop firm traders',
    features: ['Everything in Pro', 'Genetic optimizer', 'Walk-forward analysis', 'Team workspaces', 'API access', 'Custom AI models', 'Dedicated support'],
    cta: 'Start Elite Trial',
    popular: false,
  },
];

const testimonials = [
  { quote: "MMC ka AI copilot mera game changer hai. Win rate 45% se 72% ho gaya 3 months mein.", author: "Rajesh Sharma", role: "Full-time Trader, Mumbai", stats: "+₹8.2L", winRate: "72% WR" },
  { quote: "Auto-sync se manually logging ka jhanjhat khatam. Now I focus 100% on trading, not data entry.", author: "Priya Patel", role: "Options Trader, Ahmedabad", stats: "+₹5.4L", winRate: "68% WR" },
  { quote: "Backtesting suite is unreal. Walk-forward + Monte Carlo at this price? No other platform comes close.", author: "Amit Kumar", role: "Algo Trader, Bangalore", stats: "+₹12.1L", winRate: "75% WR" },
  { quote: "Behavioral diagnostics showed me I revenge trade on Fridays. Fixing that alone saved me ₹2L/month.", author: "Sneha Reddy", role: "Intraday Trader, Hyderabad", stats: "+₹3.8L", winRate: "65% WR" },
  { quote: "Prop firm tracker is exactly what I needed. Passed FTMO Phase 1 in 8 days using MMC insights.", author: "Vikram Singh", role: "Prop Firm Trader, Delhi", stats: "+₹6.7L", winRate: "70% WR" },
  { quote: "Part-time trader hoon, but MMC ne mujhe professional level analytics de diya. Incredible value.", author: "Meera Joshi", role: "Part-time Trader, Pune", stats: "+₹2.9L", winRate: "71% WR" },
];

const faqs = [
  { q: 'How does MT5 auto-sync work?', a: 'You install a small Expert Advisor (EA) in your MT5 terminal. It automatically sends your closed trades to MMC every few minutes via a secure API. No manual logging needed — just drag the EA onto any chart and forget it.' },
  { q: 'Do I need coding knowledge to use MMC?', a: 'Not at all! MMC is designed for traders, not developers. The AI copilot understands plain English/Hinglish. For backtesting, we provide a visual strategy builder — no code required.' },
  { q: 'Is my trading data safe?', a: 'Absolutely. All data is encrypted at rest and in transit. We use bank-grade security with row-level access controls. Your data is never shared with anyone — ever.' },
  { q: 'Can I use MMC offline?', a: 'Yes! MMC is a Progressive Web App (PWA) with full offline support. Your journal, analytics, and even AI features work without an internet connection. Data syncs automatically when you\'re back online.' },
  { q: 'Which brokers are supported?', a: 'We currently support MT5-compatible brokers including Exness, IC Markets, XM, FBS, Pepperstone, Alpari, RoboForex, FXTM, and more. Zerodha/Kite integration is coming soon.' },
];

/* ─────────────────── COMPONENT ─────────────────── */

const Landing = forwardRef<HTMLDivElement>(function Landing(_, ref) {
  const [mounted, setMounted] = useState(false);
  const [showProductTour, setShowProductTour] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { stats: platformStats } = usePlatformStats();

  useEffect(() => {
    setMounted(true);
    document.title = "MMC — The Intelligent Trading Platform";
  }, []);

  return (
    <div ref={ref} className="min-h-screen bg-background overflow-hidden">
      {/* ═══ Animated BG ═══ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/[0.07] blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[hsl(250_80%_60%/0.06)] blur-[120px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[40vw] h-[40vw] rounded-full bg-[hsl(160_70%_45%/0.04)] blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '4s' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`, backgroundSize: '80px 80px' }} />
        {mounted && [...Array(15)].map((_, i) => (
          <div key={i} className="absolute w-1 h-1 rounded-full bg-primary/30" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animation: `float ${8 + Math.random() * 12}s ease-in-out infinite`, animationDelay: `${Math.random() * 5}s` }} />
        ))}
      </div>

      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl safe-area-pt">
        <div className="container mx-auto flex h-14 md:h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <img src={mmcLogo} alt="MMC" className="h-7 w-7 md:h-8 md:w-8 object-contain" width="32" height="32" loading="eager" />
            <span className="text-lg md:text-xl font-bold text-primary">MMC</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#why-mmc" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Why MMC</a>
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#backtesting" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Backtesting</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-9 px-3 text-xs md:text-sm hidden sm:inline-flex" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button size="sm" className="h-9 px-3 text-xs md:text-sm bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
              <Link to="/signup">
                Start Free <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl px-4 py-4 space-y-3">
            {['why-mmc', 'features', 'backtesting', 'pricing', 'faq'].map(s => (
              <a key={s} href={`#${s}`} className="block text-sm text-muted-foreground py-2" onClick={() => setMobileMenuOpen(false)}>
                {s === 'why-mmc' ? 'Why MMC' : s === 'faq' ? 'FAQ' : s.charAt(0).toUpperCase() + s.slice(1)}
              </a>
            ))}
            <Link to="/login" className="block text-sm py-2 text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Login</Link>
          </div>
        )}
      </nav>

      {/* ═══ SECTION 1: HERO ═══ */}
      <section className="relative pt-24 pb-12 md:pt-40 md:pb-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className={cn("max-w-5xl mx-auto text-center transition-all duration-1000", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8")}>
            <Badge variant="secondary" className="mb-4 md:mb-6 text-xs">
              <Sparkles className="mr-1 h-3 w-3" /> The Intelligent Trading Platform
            </Badge>

            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-4 md:mb-6 tracking-tight">
              <span className="text-foreground">Trade Smarter with</span>
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-primary to-[hsl(250_80%_65%)] bg-clip-text text-transparent">AI-Powered Intelligence</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-6 md:mb-8 leading-relaxed px-2">
              MMC combines{' '}
              <span className="text-foreground font-semibold">AI Journaling</span>,{' '}
              <span className="text-foreground font-semibold">Institutional Backtesting</span> &{' '}
              <span className="text-foreground font-semibold">Behavioral Analytics</span>{' '}
              into one powerful platform built for serious traders.
            </p>

            {/* CTAs */}
            <div className={cn("flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 md:mb-10 px-4 transition-all duration-700 delay-300", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
              <Button className="w-full sm:w-auto sm:min-w-[200px] h-12 text-base bg-emerald-600 hover:bg-emerald-700 text-white group" asChild>
                <Link to="/signup">
                  Start Free <ChevronRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full sm:w-auto sm:min-w-[200px] h-12 text-base group" onClick={() => setShowProductTour(true)}>
                <Play className="mr-2 h-5 w-5" /> Watch Demo
              </Button>
            </div>

            {/* Social Proof */}
            <div className={cn("flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs md:text-sm text-muted-foreground transition-all duration-700 delay-500", mounted ? "opacity-100" : "opacity-0")}>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <AnimatedCounter value={platformStats.totalUsers || 500} duration={1500} />+ Traders
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <AnimatedCounter value={platformStats.totalTrades || 10000} duration={1500} /> Trades Analyzed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <AnimatedCounter value={platformStats.totalBacktests || 1000} duration={1500} /> Backtests Run
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                MT5 Auto-Sync
              </span>
            </div>
          </div>

          {/* Hero Visual + Floating Cards */}
          <div className={cn("mt-10 md:mt-20 relative transition-all duration-1000 delay-300 hidden sm:block", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12")}>
            <div className="relative mx-auto max-w-5xl">
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-primary/20 to-[hsl(250_80%_60%/0.2)] rounded-2xl blur-2xl opacity-60" />
              <Card className="relative p-1 overflow-hidden border">
                <div className="relative bg-card rounded-xl p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-destructive" />
                      <div className="h-3 w-3 rounded-full bg-warning" />
                      <div className="h-3 w-3 rounded-full bg-success" />
                    </div>
                    <Badge variant="secondary" className="text-xs"><Sparkles className="mr-1 h-3 w-3" />Live Dashboard</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {[{ label: 'Total P&L', value: '+₹4,23,450', color: 'text-emerald-400' }, { label: 'Win Rate', value: '68.4%', color: 'text-emerald-400' }, { label: 'Profit Factor', value: '2.14', color: 'text-primary' }, { label: 'Trades', value: '847', color: 'text-foreground' }].map(s => (
                      <div key={s.label} className="bg-muted/50 rounded-xl p-4">
                        <p className="text-[10px] md:text-xs text-muted-foreground mb-1">{s.label}</p>
                        <p className={cn("text-sm md:text-lg font-bold font-mono", s.color)}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="h-48 md:h-64 bg-muted/30 rounded-xl relative overflow-hidden">
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="heroGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="hsl(150 80% 50%)" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="hsl(150 80% 50%)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,160 Q80,140 160,120 T320,100 T480,60 T640,80 T800,30" fill="none" stroke="hsl(150 80% 50%)" strokeWidth="2.5" style={{ strokeDasharray: 1200, strokeDashoffset: mounted ? 0 : 1200, transition: 'stroke-dashoffset 2s ease-out' }} />
                      <path d="M0,160 Q80,140 160,120 T320,100 T480,60 T640,80 T800,30 L800,250 L0,250 Z" fill="url(#heroGrad)" className={cn("transition-opacity duration-1000 delay-[1500ms]", mounted ? "opacity-100" : "opacity-0")} />
                    </svg>
                    <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-bold text-emerald-400 font-mono">+127.4%</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Floating mini-cards */}
              <div className="absolute -left-6 top-1/4 hidden lg:block animate-[float_6s_ease-in-out_infinite]">
                <Card className="p-3 border bg-background/95 backdrop-blur-sm shadow-xl">
                  <p className="text-xs text-muted-foreground">Today's P&L</p>
                  <p className="text-lg font-bold text-emerald-400 font-mono">+₹23,450</p>
                </Card>
              </div>
              <div className="absolute -right-6 top-1/3 hidden lg:block animate-[float_8s_ease-in-out_infinite_1s]">
                <Card className="p-3 border bg-background/95 backdrop-blur-sm shadow-xl">
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                  <p className="text-lg font-bold text-primary font-mono">68%</p>
                </Card>
              </div>
              <div className="absolute -right-4 bottom-1/4 hidden lg:block animate-[float_7s_ease-in-out_infinite_2s]">
                <Card className="p-3 border bg-background/95 backdrop-blur-sm shadow-xl flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">AI Found</p>
                    <p className="text-sm font-bold">3 Patterns</p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 2: WHY CHOOSE MMC ═══ */}
      <section id="why-mmc" className="py-16 md:py-24 bg-muted/20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-10 md:mb-16">
            <Badge variant="secondary" className="mb-4"><Layers className="mr-1 h-3 w-3" /> Why MMC</Badge>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4">
              Why Serious Traders Choose <span className="text-primary">MMC</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              One platform. Every tool you need to become a consistently profitable trader.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {whyMMC.map((item, i) => (
              <Card key={item.title} className={cn("p-6 group hover:border-primary/50 transition-all duration-300 relative overflow-hidden", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8")} style={{ transitionDelay: `${i * 60}ms` }}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full" />
                <div className="relative">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 3: FEATURES GRID ═══ */}
      <section id="features" className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-10 md:mb-16">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4">
              Everything a Serious Trader <span className="text-primary">Needs</span>
            </h2>
            <p className="text-muted-foreground">39+ features. One platform. Zero compromise.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {featureCards.map((f, i) => (
              <Card key={f.title} className={cn("p-6 group hover:border-primary/50 transition-all duration-300", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8")} style={{ transitionDelay: `${i * 60}ms` }}>
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 4: AI HIGHLIGHT ═══ */}
      <section id="ai" className="py-16 md:py-24 bg-muted/20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-10 md:mb-16">
            <Badge variant="secondary" className="mb-4"><Brain className="mr-1 h-3 w-3" /> AI-Powered</Badge>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4">
              Your AI Trading <span className="text-primary">Copilot</span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center max-w-6xl mx-auto">
            <div className="space-y-4">
              {aiChecklist.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-sm md:text-base">{item}</span>
                </div>
              ))}
            </div>

            <Card className="p-5 md:p-6 border relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
              <div className="relative space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-sm">MMC AI Copilot</span>
                  <Badge variant="secondary" className="text-[10px]">Live</Badge>
                </div>

                <div className="flex justify-end">
                  <div className="bg-primary/15 border border-primary/25 rounded-2xl rounded-br-md px-4 py-2 max-w-[80%]">
                    <p className="text-sm">What's my best trading session?</p>
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="bg-muted/50 border border-border/50 rounded-2xl rounded-bl-md px-4 py-3 max-w-[90%]">
                    <p className="text-sm leading-relaxed">
                      Your <span className="text-emerald-400 font-semibold">London session (8-11 AM)</span> shows{' '}
                      <span className="text-primary font-semibold">72% win rate</span> vs 48% in other sessions. 23 trades analyzed.
                    </p>
                    <div className="mt-3 p-2.5 bg-background/50 rounded-lg border border-border/30">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-emerald-400 font-mono font-bold">72% WR</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-mono">PF: 2.8</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-mono">23 trades</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 px-4 py-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 5: BACKTESTING POWER ═══ */}
      <section id="backtesting" className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-10 md:mb-16">
            <Badge variant="secondary" className="mb-4"><BarChart3 className="mr-1 h-3 w-3" /> Backtesting</Badge>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4">
              Institutional-Grade Backtesting.<br /><span className="text-primary">Now for Retail Traders.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {backtestCards.map((c, i) => (
              <Card key={c.title} className={cn("p-6 text-center group hover:border-primary/50 transition-all duration-300", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8")} style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <c.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{c.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 6: PRICING ═══ */}
      <section id="pricing" className="py-16 md:py-24 bg-muted/20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-10 md:mb-16">
            <Badge variant="secondary" className="mb-4">Pricing</Badge>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4">
              Simple, Transparent <span className="text-primary">Pricing</span>
            </h2>
            <p className="text-muted-foreground">Start free. Upgrade when you're ready.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <Card key={plan.name} className={cn("p-6 relative flex flex-col transition-all duration-300", plan.popular && "border-emerald-500/50 scale-[1.03] shadow-xl shadow-emerald-500/10", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8")} style={{ transitionDelay: `${i * 100}ms` }}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-emerald-600 text-white hover:bg-emerald-600">
                    <Star className="mr-1 h-3 w-3" /> Most Popular
                  </Badge>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.desc}</p>
                </div>
                <div className="space-y-3 mb-6 flex-1">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-sm">{f}</span>
                    </div>
                  ))}
                </div>
                <Button variant={plan.popular ? "default" : "outline"} className={cn("w-full", plan.popular && "bg-emerald-600 hover:bg-emerald-700 text-white")} asChild>
                  <Link to="/signup">{plan.cta}</Link>
                </Button>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            All plans include 14-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* ═══ SECTION 7: TESTIMONIALS ═══ */}
      <section id="testimonials" className="py-16 md:py-24 overflow-hidden">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-10 md:mb-16">
            <Badge variant="secondary" className="mb-4">Testimonials</Badge>
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              Trusted by Traders Across India <span className="text-primary">🇮🇳</span>
            </h2>
          </div>

          <div className="relative">
            <div className="flex gap-5 animate-[marquee_40s_linear_infinite]">
              {[...testimonials, ...testimonials].map((t, i) => (
                <Card key={i} className="p-5 min-w-[320px] max-w-[360px] shrink-0 flex flex-col">
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(5)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-warning text-warning" />)}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-4">"{t.quote}"</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-sm font-bold text-white">
                        {t.author[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.author}</p>
                        <p className="text-[11px] text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] text-emerald-400 border-emerald-500/30">
                      {t.stats} • {t.winRate}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 8: FAQ ═══ */}
      <section id="faq" className="py-16 md:py-24 bg-muted/20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-10 md:mb-16">
            <Badge variant="secondary" className="mb-4">FAQ</Badge>
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              Frequently Asked <span className="text-primary">Questions</span>
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, i) => (
              <Card key={i} className="overflow-hidden">
                <button className="w-full flex items-center justify-between p-5 text-left" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="font-medium text-sm md:text-base pr-4">{faq.q}</span>
                  <ChevronDown className={cn("h-5 w-5 text-muted-foreground shrink-0 transition-transform", openFaq === i && "rotate-180")} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 pt-0">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 9: FINAL CTA ═══ */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <Card className="relative overflow-hidden border">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-primary/5 to-purple-500/10" />
            <div className="relative p-8 md:p-16 text-center">
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4">
                Ready to Trade <span className="text-emerald-400">Smarter?</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                Join <AnimatedCounter value={platformStats.totalUsers || 500} duration={1500} />+ traders who transformed their trading with MMC's AI-powered intelligence.
              </p>
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white group h-12 px-8 text-base" asChild>
                <Link to="/signup">
                  Start Free Today <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                No credit card required • Cancel anytime • Join <AnimatedCounter value={platformStats.totalUsers || 500} duration={1500} />+ traders
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <Footer />

      {/* Product Tour Modal */}
      <ProductTourModal open={showProductTour} onOpenChange={setShowProductTour} />
    </div>
  );
});

export default Landing;
