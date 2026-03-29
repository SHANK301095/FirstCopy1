/**
 * Pricing Page - FREE vs PRO plan with gating
 * Part of MMCai.app Projournx feature set
 */
import { useState } from 'react';
import {
  Crown, Check, X, Zap, Shield, BarChart2,
  TrendingUp, Brain, Trophy, Download, Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PageTitle } from '@/components/ui/PageTitle';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { toast } from 'sonner';

const FEATURES = [
  { name: 'Trades per month', free: '50', pro: 'Unlimited', icon: BarChart2 },
  { name: 'Basic Dashboard & Stats', free: true, pro: true, icon: TrendingUp },
  { name: 'Manual Trade Logging', free: true, pro: true, icon: Zap },
  { name: 'CSV Import', free: true, pro: true, icon: Download },
  { name: 'MT4/MT5 Auto-Sync', free: false, pro: true, icon: Zap },
  { name: 'AI Pattern Detection', free: false, pro: true, icon: Brain },
  { name: 'Personal Playbook', free: false, pro: true, icon: Crown },
  { name: 'Prop Firm Mode (9 Firms)', free: false, pro: true, icon: Trophy },
  { name: 'Advanced Reports (20+ Metrics)', free: false, pro: true, icon: BarChart2 },
  { name: 'PDF/CSV Export', free: false, pro: true, icon: Download },
  { name: 'Behavioral Diagnostics', free: false, pro: true, icon: Brain },
  { name: 'Risk Lab Tools', free: false, pro: true, icon: Shield },
  { name: 'Screenshot Gallery', free: false, pro: true, icon: Users },
  { name: 'Priority Support', free: false, pro: true, icon: Shield },
];

export default function Pricing() {
  const { isPremium } = usePremiumStatus();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const monthlyPrice = 679;
  const yearlyPrice = 5499;
  const currentPrice = billingCycle === 'monthly' ? monthlyPrice : yearlyPrice;
  const monthlySaving = billingCycle === 'yearly' ? Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <div className="text-center space-y-3">
        <PageTitle title="Choose Your Plan" subtitle="India's #1 AI Trading Journal" />
        <p className="text-sm text-muted-foreground">Start free, upgrade when you need more power</p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3">
        <Button variant={billingCycle === 'monthly' ? 'default' : 'outline'} size="sm" onClick={() => setBillingCycle('monthly')}>Monthly</Button>
        <Button variant={billingCycle === 'yearly' ? 'default' : 'outline'} size="sm" onClick={() => setBillingCycle('yearly')}>
          Yearly {monthlySaving > 0 && <Badge className="ml-1.5 text-[10px]">Save {monthlySaving}%</Badge>}
        </Button>
      </div>

      {/* Plan Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Free Plan */}
        <Card className="relative">
          <CardHeader className="pb-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Free</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">₹0</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <p className="text-xs text-muted-foreground">50 trades/month, basic stats</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full" disabled={!isPremium}>
              {isPremium ? 'Downgrade' : 'Current Plan'}
            </Button>
            <div className="space-y-2 pt-2">
              {FEATURES.map(f => (
                <div key={f.name} className="flex items-center gap-2 text-xs">
                  {f.free ? (
                    <Check className="h-3.5 w-3.5 text-profit flex-shrink-0" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
                  )}
                  <span className={cn(!f.free && 'text-muted-foreground/50')}>{f.name}</span>
                  {typeof f.free === 'string' && <Badge variant="secondary" className="ml-auto text-[10px]">{f.free}</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="relative border-primary/50 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground px-3">Most Popular</Badge>
          </div>
          <CardHeader className="pb-4 pt-6">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <p className="text-xs uppercase tracking-wider text-primary font-medium">Pro</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-primary">₹{currentPrice}</span>
              <span className="text-sm text-muted-foreground">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
            </div>
            <p className="text-xs text-muted-foreground">Unlimited trades + AI + all features</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={() => toast.info('Payment integration coming soon!')}>
              <Crown className="h-4 w-4 mr-1.5" />
              {isPremium ? 'Current Plan' : 'Upgrade to Pro'}
            </Button>
            <div className="space-y-2 pt-2">
              {FEATURES.map(f => (
                <div key={f.name} className="flex items-center gap-2 text-xs">
                  <Check className="h-3.5 w-3.5 text-profit flex-shrink-0" />
                  <span>{f.name}</span>
                  {typeof f.pro === 'string' && <Badge variant="default" className="ml-auto text-[10px]">{f.pro}</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
