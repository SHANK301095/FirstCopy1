import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Activity, FlaskConical, Dna, Shield, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SEOHead } from '@/components/seo/SEOHead';
import { Footer } from '@/components/layout/Footer';
import mmcLogo from '@/assets/mmc-logo.png';

const features = [
  { icon: BarChart3, title: 'Professional Backtesting', desc: 'Test any strategy on historical OHLCV data with 20+ performance metrics.' },
  { icon: Activity, title: 'Walk-Forward Analysis', desc: 'Out-of-sample validation to ensure your strategy works on unseen data.' },
  { icon: FlaskConical, title: 'Monte Carlo Simulation', desc: '10,000+ randomized scenarios to stress-test your equity curve.' },
  { icon: Dna, title: 'Genetic Optimizer', desc: 'Evolutionary algorithms find optimal parameters without overfitting.' },
  { icon: Shield, title: 'Stress Testing', desc: 'Simulate black swan events, flash crashes, and extreme volatility.' },
];

const metrics = [
  'Net Profit', 'Win Rate', 'Profit Factor', 'Sharpe Ratio', 'Sortino Ratio',
  'Max Drawdown', 'Calmar Ratio', 'Recovery Factor', 'Expected Value', 'VaR 95%',
];

export default function SEOBacktesting() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Professional Backtesting Software India | Walk-Forward & Monte Carlo | MMCai"
        description="India's most advanced backtesting platform. Walk-forward analysis, Monte Carlo simulation, genetic optimization, and stress testing — all in one tool."
        keywords="backtesting software India, walk-forward analysis, Monte Carlo simulation trading, strategy backtesting, trading backtest India"
        canonical="/backtesting"
      />

      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/landing" className="flex items-center gap-2">
            <img src={mmcLogo} alt="MMCai" className="h-7 w-7 object-contain" />
            <span className="text-lg font-bold text-primary">MMCai</span>
          </Link>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
            <Link to="/signup">Start Free <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 pt-20 pb-16 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Professional <span className="text-primary">Backtesting Software</span> for India
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Walk-forward analysis, Monte Carlo simulation, genetic optimization — hedge-fund grade tools at ₹499/month.
          </p>
          <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
            <Link to="/signup">Start Backtesting Free <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {features.map((f) => (
              <Card key={f.title} className="p-6">
                <f.icon className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Metrics */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-8">20+ Performance Metrics</h2>
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {metrics.map((m) => (
              <span key={m} className="inline-flex items-center gap-1.5 bg-muted/50 rounded-full px-4 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />{m}
              </span>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-16">
          <Card className="p-8 text-center bg-emerald-600/10 border-emerald-600/30 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-2">Start backtesting in 2 minutes</h2>
            <p className="text-muted-foreground mb-6">Upload your CSV data, pick a strategy, and get instant results.</p>
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
              <Link to="/signup">Try Free — No Credit Card <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
}
