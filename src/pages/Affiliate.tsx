/**
 * Affiliate Program Landing Page
 * Public page for trading influencers to apply
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, IndianRupee, Users, TrendingUp, Zap, Copy, Gift, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import mmcLogo from '@/assets/mmc-logo.png';

const HOW_IT_WORKS = [
  { step: '1', title: 'Apply & Get Approved', desc: 'Fill out the form below. We review applications within 48 hours.' },
  { step: '2', title: 'Get Your Unique Link', desc: 'Once approved, you get a tracked affiliate link to share.' },
  { step: '3', title: 'Promote to Your Audience', desc: 'Share MMCai in your videos, posts, and community.' },
  { step: '4', title: 'Earn 30% Recurring', desc: 'Get 30% of every subscription payment, every month.' },
];

const COMMISSION_TIERS = [
  { plan: 'Pro Monthly', price: '₹499/mo', commission: '₹150/mo', highlight: false },
  { plan: 'Pro Annual', price: '₹4,499/yr', commission: '₹1,350/yr', highlight: true },
  { plan: 'Elite Monthly', price: '₹1,499/mo', commission: '₹450/mo', highlight: false },
  { plan: 'Elite Annual', price: '₹12,999/yr', commission: '₹3,900/yr', highlight: true },
];

export default function Affiliate() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    platform: '',
    channelUrl: '',
    subscriberCount: '',
    tradingNiche: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.platform) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Generate a unique affiliate code
      const code = form.name.replace(/[^a-zA-Z]/g, '').slice(0, 6).toUpperCase() + 
        Math.random().toString(36).slice(2, 6).toUpperCase();

      const userId = user?.id || '00000000-0000-0000-0000-000000000000';

      const { error } = await supabase.from('affiliates').insert({
        user_id: userId,
        affiliate_code: code,
        applicant_name: form.name,
        applicant_email: form.email,
        platform: form.platform,
        channel_url: form.channelUrl,
        subscriber_count: form.subscriberCount,
        trading_niche: form.tradingNiche,
        status: 'pending',
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Application submitted! We\'ll review within 48 hours.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-2">
            <img src={mmcLogo} alt="MMCai" className="h-8 w-auto" />
            <span className="font-bold text-lg">MMCai</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/affiliate/dashboard">
                <Button variant="outline" size="sm">Dashboard</Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm">Login</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge variant="secondary" className="px-4 py-1.5 text-sm">
            <Gift className="h-3.5 w-3.5 mr-1.5" /> Partner Program
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Earn <span className="text-primary">30% Recurring</span> Commission
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Join the MMCai affiliate program. Promote India's most advanced trading journal 
            and earn every month your referrals stay subscribed.
          </p>
          <div className="flex items-center justify-center gap-6 pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">₹450</p>
              <p className="text-sm text-muted-foreground">per Elite referral/mo</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">Lifetime</p>
              <p className="text-sm text-muted-foreground">recurring payouts</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">UPI</p>
              <p className="text-sm text-muted-foreground">monthly payments</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((item) => (
              <Card key={item.step} variant="interactive" className="text-center">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary font-bold text-xl flex items-center justify-center mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Commission structure */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Commission Structure</h2>
          <p className="text-center text-muted-foreground mb-10">Earn 30% on every payment. Paid monthly via UPI/bank transfer.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COMMISSION_TIERS.map((tier) => (
              <Card key={tier.plan} variant={tier.highlight ? 'stat' : 'default'} className={tier.highlight ? 'border-primary/30' : ''}>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">{tier.plan}</p>
                  <p className="text-lg font-semibold mb-2">{tier.price}</p>
                  <div className="h-px bg-border my-3" />
                  <p className="text-sm text-muted-foreground">You earn</p>
                  <p className="text-2xl font-bold text-primary">{tier.commission}</p>
                  <p className="text-xs text-muted-foreground mt-1">per referral</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-16 px-4 bg-muted/30" id="apply">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Apply Now</h2>
          
          {submitted ? (
            <Card variant="elevated">
              <CardContent className="py-12 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Check className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Application Submitted!</h3>
                <p className="text-muted-foreground">
                  We'll review your application within 48 hours and get back to you via email.
                </p>
                {user && (
                  <Link to="/affiliate/dashboard">
                    <Button className="mt-4">Go to Dashboard <ArrowRight className="h-4 w-4 ml-2" /></Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Affiliate Application</CardTitle>
                <CardDescription>Tell us about yourself and your audience</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input 
                        value={form.name} 
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                        placeholder="Your full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input 
                        type="email"
                        value={form.email} 
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Platform *</Label>
                    <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="twitter">Twitter/X</SelectItem>
                        <SelectItem value="telegram">Telegram</SelectItem>
                        <SelectItem value="blog">Blog/Website</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Channel/Profile URL</Label>
                      <Input 
                        value={form.channelUrl} 
                        onChange={e => setForm(f => ({ ...f, channelUrl: e.target.value }))} 
                        placeholder="https://youtube.com/@yourchannel"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subscriber/Follower Count</Label>
                      <Input 
                        value={form.subscriberCount} 
                        onChange={e => setForm(f => ({ ...f, subscriberCount: e.target.value }))} 
                        placeholder="e.g. 50K"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Trading Niche</Label>
                    <Input 
                      value={form.tradingNiche} 
                      onChange={e => setForm(f => ({ ...f, tradingNiche: e.target.value }))} 
                      placeholder="e.g. Options Trading, Forex, Scalping"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit Application'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/40 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} MMCai. All rights reserved.</p>
      </footer>
    </div>
  );
}
