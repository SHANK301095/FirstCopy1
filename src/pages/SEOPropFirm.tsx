import { Link } from 'react-router-dom';
import { ArrowRight, Trophy, Shield, Bell, BarChart3, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SEOHead } from '@/components/seo/SEOHead';
import { Footer } from '@/components/layout/Footer';
import mmcLogo from '@/assets/mmc-logo.png';

const features = [
  { icon: Shield, title: 'Real-Time Drawdown Monitor', desc: 'Track daily and total drawdown exactly how FTMO calculates it. Never breach a limit again.' },
  { icon: BarChart3, title: 'Progress Dashboard', desc: 'Visual progress toward profit target with trading days counter and projected completion date.' },
  { icon: Bell, title: 'Smart Alerts', desc: 'Get notified when approaching daily loss limits or drawdown thresholds.' },
  { icon: Trophy, title: 'Multi-Challenge Support', desc: 'Track FTMO, Funded Next, The Funded Trader, and custom challenges simultaneously.' },
];

export default function SEOPropFirm() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Prop Firm Challenge Tracker | FTMO, Funded Next | MMCai"
        description="Track your prop firm challenge progress with real-time drawdown monitoring, smart alerts, and AI insights. Built for Indian prop traders."
        keywords="prop firm tracker, FTMO challenge tracker, funded trader India, prop firm drawdown monitor"
        canonical="/prop-firm-tracker"
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
            <span className="text-primary">Prop Firm</span> Challenge Tracker
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Real-time drawdown monitoring, progress tracking, and smart alerts — never breach a challenge rule again.
          </p>
          <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
            <Link to="/signup">Track Your Challenge Free <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            {features.map((f) => (
              <Card key={f.title} className="p-6">
                <f.icon className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <Card className="p-8 text-center bg-emerald-600/10 border-emerald-600/30 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-2">Pass your challenge with confidence</h2>
            <p className="text-muted-foreground mb-6">Join traders who passed FTMO using MMCai's tracker.</p>
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
