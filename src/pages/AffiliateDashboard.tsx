/**
 * Affiliate Dashboard
 * Shows stats, link, and marketing materials for approved affiliates
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, ExternalLink, TrendingUp, Users, IndianRupee, MousePointer, ArrowRight, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AffiliateData {
  id: string;
  affiliate_code: string;
  status: string;
  commission_rate: number;
  created_at: string;
}

export default function AffiliateDashboard() {
  const { user } = useAuth();
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ clicks: 0, signups: 0, conversions: 0, revenue: 0, commissionEarned: 0 });
  const [commissions, setCommissions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    // Get affiliate record
    const { data: aff } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (aff) {
      setAffiliate(aff as AffiliateData);

      // Get clicks
      const { count: clickCount } = await supabase
        .from('affiliate_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('affiliate_id', aff.id);

      const { count: convertedCount } = await supabase
        .from('affiliate_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('affiliate_id', aff.id)
        .eq('converted', true);

      // Get commissions
      const { data: comms } = await supabase
        .from('affiliate_commissions')
        .select('*')
        .eq('affiliate_id', aff.id)
        .order('created_at', { ascending: false });

      const totalEarned = (comms || []).reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
      const paidCount = (comms || []).filter((c: any) => c.status === 'paid').length;

      setStats({
        clicks: clickCount || 0,
        signups: convertedCount || 0,
        conversions: paidCount,
        revenue: totalEarned / 0.3, // Approximate total revenue
        commissionEarned: totalEarned,
      });
      setCommissions(comms || []);
    }
    setLoading(false);
  };

  const affiliateLink = affiliate ? `${window.location.origin}/signup?aff=${affiliate.affiliate_code}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    toast.success('Affiliate link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-20 space-y-4">
        <h2 className="text-2xl font-bold">No Affiliate Account Found</h2>
        <p className="text-muted-foreground">You haven't applied for the affiliate program yet.</p>
        <Link to="/affiliate">
          <Button>Apply Now <ArrowRight className="h-4 w-4 ml-2" /></Button>
        </Link>
      </div>
    );
  }

  if (affiliate.status === 'pending') {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-20 space-y-4">
        <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
          <Clock className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold">Application Under Review</h2>
        <p className="text-muted-foreground">
          Your affiliate application is being reviewed. We'll notify you within 48 hours.
        </p>
        <Badge variant="secondary">Status: Pending</Badge>
      </div>
    );
  }

  if (affiliate.status === 'rejected') {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-20 space-y-4">
        <h2 className="text-2xl font-bold">Application Not Approved</h2>
        <p className="text-muted-foreground">Unfortunately, your application wasn't approved at this time.</p>
        <Badge variant="destructive">Status: Rejected</Badge>
      </div>
    );
  }

  const STAT_CARDS = [
    { label: 'Total Clicks', value: stats.clicks, icon: MousePointer, color: 'text-blue-500' },
    { label: 'Signups', value: stats.signups, icon: Users, color: 'text-emerald-500' },
    { label: 'Paid Conversions', value: stats.conversions, icon: TrendingUp, color: 'text-purple-500' },
    { label: 'Commission Earned', value: `₹${stats.commissionEarned.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-primary' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Affiliate Dashboard</h1>
          <p className="text-muted-foreground">Track your referrals and earnings</p>
        </div>
        <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
          Active • {(affiliate.commission_rate * 100).toFixed(0)}% Commission
        </Badge>
      </div>

      {/* Affiliate Link */}
      <Card variant="elevated">
        <CardContent className="py-5">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium mb-1.5">Your Affiliate Link</p>
              <div className="flex items-center gap-2">
                <Input value={affiliateLink} readOnly className="font-mono text-sm" />
                <Button onClick={copyLink} variant="outline" size="icon" className="shrink-0">
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((stat) => (
          <Card key={stat.label} variant="stat">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
          <CardDescription>Track your payouts</CardDescription>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <IndianRupee className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No commissions yet. Share your link to start earning!</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>{format(new Date(c.created_at), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="font-semibold">₹{c.amount?.toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'paid' ? 'default' : 'secondary'}>
                        {c.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Marketing Materials */}
      <Card>
        <CardHeader>
          <CardTitle>Marketing Materials</CardTitle>
          <CardDescription>Use these to promote MMCai</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-sm font-medium mb-2">📝 Promo Script (for videos/posts)</p>
            <p className="text-sm text-muted-foreground italic">
              "If you're serious about improving your trading, check out MMCai — it's India's most advanced trading journal with AI-powered insights, MT5 auto-sync, and backtesting. 
              Use my link in the description to get started free. I've been using it to track all my trades and the behavioral diagnostics are game-changing."
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => {
                navigator.clipboard.writeText("If you're serious about improving your trading, check out MMCai — it's India's most advanced trading journal with AI-powered insights, MT5 auto-sync, and backtesting. Use my link in the description to get started free.");
                toast.success('Script copied!');
              }}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Script
            </Button>
          </div>
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-sm font-medium mb-2">🎯 Key Selling Points</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Free plan available — easy for audience to try</li>
              <li>• MT5 auto-sync — no manual trade logging</li>
              <li>• AI-powered trade analysis and patterns</li>
              <li>• Prop firm tracker built-in</li>
              <li>• Made for Indian traders (INR, IST, Indian brokers)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
