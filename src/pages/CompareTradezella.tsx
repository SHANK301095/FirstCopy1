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
  { feature: 'Offline Mode (PWA)', mmc: true, competitor: false },
  { feature: 'INR Pricing', mmc: true, competitor: false },
  { feature: 'Trade Journal', mmc: true, competitor: true },
  { feature: 'P&L Calendar', mmc: true, competitor: true },
  { feature: 'Trade Replay', mmc: false, competitor: true },
  { feature: 'Mobile App', mmc: true, competitor: true },
  { feature: 'Price', mmc: '₹499/mo', competitor: '~₹2,500/mo' },
];

export default function CompareTradezella() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="MMCai vs Tradezella — Which Trading Journal is Better in 2026?"
        description="MMCai vs Tradezella comparison for Indian traders. Get 10+ more features at 80% lower cost with MMCai."
        keywords="Tradezella alternative, MMCai vs Tradezella, best trading journal India, Tradezella review"
        canonical="/compare/tradezella"
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
          <h1 className="text-3xl md:text-5xl font-bold mb-4">MMCai vs Tradezella</h1>
          <p className="text-lg text-muted-foreground mb-10">Why Indian traders choose MMCai over Tradezella</p>

          <Card className="overflow-hidden mb-12">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left p-4 font-medium text-muted-foreground">Feature</th>
                    <th className="p-4 text-center font-bold text-primary">MMCai</th>
                    <th className="p-4 text-center font-medium text-muted-foreground">Tradezella</th>
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

          <Card className="p-8 text-center bg-emerald-600/10 border-emerald-600/30">
            <h2 className="text-2xl font-bold mb-2">Get 5x the features at 80% less cost</h2>
            <p className="text-muted-foreground mb-6">MMCai is built for Indian traders. INR pricing, IST sessions, Hinglish AI.</p>
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
