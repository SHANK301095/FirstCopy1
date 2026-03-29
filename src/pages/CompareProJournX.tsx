import { Link } from 'react-router-dom';
import { ArrowRight, Check, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SEOHead } from '@/components/seo/SEOHead';
import { Footer } from '@/components/layout/Footer';
import mmcLogo from '@/assets/mmc-logo.png';

const comparisonData = [
  { feature: 'MT5 Auto-Sync', mmc: true, competitor: false },
  { feature: 'Professional Backtesting', mmc: true, competitor: false },
  { feature: 'Walk-Forward Analysis', mmc: true, competitor: false },
  { feature: 'Monte Carlo Simulation', mmc: true, competitor: false },
  { feature: 'AI Copilot Chat', mmc: true, competitor: false },
  { feature: 'Behavioral Diagnostics', mmc: true, competitor: false },
  { feature: 'Prop Firm Tracker', mmc: true, competitor: false },
  { feature: 'Genetic Optimizer', mmc: true, competitor: false },
  { feature: 'Stress Testing', mmc: true, competitor: false },
  { feature: 'Achievements & Gamification', mmc: true, competitor: false },
  { feature: 'Risk of Ruin Calculator', mmc: true, competitor: false },
  { feature: 'Performance Attribution', mmc: true, competitor: false },
  { feature: 'Offline Mode (PWA)', mmc: true, competitor: false },
  { feature: 'Trade Journal', mmc: true, competitor: true },
  { feature: 'P&L Calendar', mmc: true, competitor: true },
  { feature: 'CSV Import', mmc: true, competitor: true },
  { feature: 'Mobile App', mmc: true, competitor: true },
  { feature: 'Price', mmc: '₹499/mo', competitor: '₹849/mo' },
];

const switchReasons = [
  { title: '13 More Features', desc: 'MMCai has professional backtesting, AI copilot, behavioral diagnostics, and more — none available in ProJournX.' },
  { title: '42% Lower Price', desc: '₹499/mo vs ₹849/mo. More features for less money. Simple math.' },
  { title: 'MT5 Auto-Sync', desc: 'Your trades journal themselves. No manual logging. ProJournX requires CSV upload every time.' },
  { title: 'Works Offline', desc: 'MMCai is a PWA with full offline support. Journal, analyze, and review trades without internet.' },
  { title: 'AI That Speaks Hinglish', desc: 'Ask the AI copilot questions in English or Hinglish. Get instant insights about your trading patterns.' },
  { title: 'Prop Firm Support', desc: 'Built-in challenge tracker with real-time drawdown monitoring. ProJournX has nothing for prop firm traders.' },
];

export default function CompareProJournX() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="MMCai vs ProJournX — Full Comparison 2026 | Which is Better?"
        description="Detailed feature-by-feature comparison of MMCai and ProJournX. See why 500+ Indian traders switched to MMCai for 42% lower price and 13 more features."
        keywords="ProJournX alternative, MMCai vs ProJournX, best trading journal India, ProJournX review"
        canonical="/compare/projournx"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: 'MMCai vs ProJournX — Full Comparison 2026',
          description: 'Detailed comparison of MMCai and ProJournX trading journals',
          author: { '@type': 'Organization', name: 'MMCai' },
        }}
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

      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <Link to="/landing" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Home
          </Link>

          <Badge variant="secondary" className="mb-4">Updated February 2026</Badge>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">MMCai vs ProJournX</h1>
          <p className="text-lg text-muted-foreground mb-10">Full feature comparison — see why traders are switching to MMCai</p>

          {/* Comparison Table */}
          <Card className="overflow-hidden mb-12">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left p-4 font-medium text-muted-foreground">Feature</th>
                    <th className="p-4 text-center font-bold text-primary">MMCai</th>
                    <th className="p-4 text-center font-medium text-muted-foreground">ProJournX</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row) => (
                    <tr key={row.feature} className="border-b border-border/20">
                      <td className="p-4 font-medium">{row.feature}</td>
                      <td className="p-4 text-center">
                        {typeof row.mmc === 'boolean' ? (
                          row.mmc ? <Check className="h-5 w-5 text-emerald-500 mx-auto" /> : <X className="h-5 w-5 text-destructive mx-auto" />
                        ) : (
                          <span className="font-bold text-emerald-500">{row.mmc}</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {typeof row.competitor === 'boolean' ? (
                          row.competitor ? <Check className="h-5 w-5 text-emerald-500 mx-auto" /> : <X className="h-5 w-5 text-destructive mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">{row.competitor}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Why Switch */}
          <h2 className="text-2xl font-bold mb-6">Why Traders Switch from ProJournX to MMCai</h2>
          <div className="grid gap-4 sm:grid-cols-2 mb-12">
            {switchReasons.map((r) => (
              <Card key={r.title} className="p-5">
                <h3 className="font-semibold mb-1">{r.title}</h3>
                <p className="text-sm text-muted-foreground">{r.desc}</p>
              </Card>
            ))}
          </div>

          {/* CTA */}
          <Card className="p-8 text-center bg-emerald-600/10 border-emerald-600/30">
            <h2 className="text-2xl font-bold mb-2">Ready to upgrade?</h2>
            <p className="text-muted-foreground mb-6">Join 500+ traders who switched from ProJournX to MMCai</p>
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
              <Link to="/signup">Start Free — No Credit Card <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
