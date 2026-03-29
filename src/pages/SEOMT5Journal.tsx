import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Shield, Smartphone, Bot, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SEOHead } from '@/components/seo/SEOHead';
import { Footer } from '@/components/layout/Footer';
import mmcLogo from '@/assets/mmc-logo.png';

const steps = [
  { num: '1', title: 'Generate Sync Key', desc: 'One click in MMCai to get your unique key.' },
  { num: '2', title: 'Install the EA', desc: 'Download and drop the EA file into MT5.' },
  { num: '3', title: 'Done — Trades Sync', desc: 'Every closed trade appears in your journal automatically.' },
];

const benefits = [
  'Zero manual data entry',
  'Commissions & swap included',
  'P&L heatmap auto-generated',
  'Behavioral pattern detection',
  'Win rate by session & symbol',
  'Drawdown alerts',
];

export default function SEOMT5Journal() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="MT5 Auto-Sync Trade Journal | Automatic Logging | MMCai"
        description="Automatically sync your MT5 trades to a professional trading journal. Zero manual logging. AI-powered analytics. Built for Indian traders."
        keywords="MT5 trade journal, MT5 auto sync, automatic trade logging MT5, MetaTrader 5 journal India"
        canonical="/mt5-journal"
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
        <section className="container mx-auto px-4 pt-20 pb-16 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-primary">MT5 Auto-Sync</span> Trade Journal
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Your MT5 trades journal themselves. Install the EA once, and every trade automatically appears in MMCai with full analytics.
          </p>
          <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
            <Link to="/signup">Connect MT5 Free <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </section>

        {/* Steps */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-10">Setup in 2 Minutes</h2>
          <div className="grid gap-6 md:grid-cols-3 max-w-3xl mx-auto">
            {steps.map((s) => (
              <Card key={s.num} className="p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary font-bold text-xl flex items-center justify-center mx-auto mb-3">{s.num}</div>
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-8">What You Get</h2>
          <div className="grid gap-3 sm:grid-cols-2 max-w-xl mx-auto">
            {benefits.map((b) => (
              <div key={b} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                <span>{b}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <Card className="p-8 text-center bg-emerald-600/10 border-emerald-600/30 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-2">Stop logging trades manually</h2>
            <p className="text-muted-foreground mb-6">Join 500+ MT5 traders who auto-sync with MMCai.</p>
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
              <Link to="/signup">Start Free <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
}
