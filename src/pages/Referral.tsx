import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, Gift, Users, Award, Share2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SEOHead } from '@/components/seo/SEOHead';

interface ReferralRow {
  id: string;
  referred_id: string | null;
  referral_code: string;
  status: string;
  created_at: string;
  converted_at: string | null;
}

export default function Referral() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Get user's referral code from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profile?.referral_code) {
        setReferralCode(profile.referral_code);
      }

      // Get referral history
      const { data: refs } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (refs) setReferrals(refs as unknown as ReferralRow[]);
      setLoading(false);
    })();
  }, [user]);

  const shareUrl = `https://mmcai.app/signup?ref=${referralCode}`;
  const shareText = `Check out MMCai — India's best trading journal! Get 2 weeks Pro free: ${shareUrl}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const converted = referrals.filter(r => r.status === 'converted' || r.status === 'rewarded').length;
  const freeMonths = referrals.filter(r => r.status === 'rewarded').length;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
      <SEOHead
        title="Invite Friends & Earn Free Pro | MMCai"
        description="Share MMCai with friends and earn free Pro months."
        noIndex
      />

      {/* Hero */}
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-2xl bg-primary/10 mb-2">
          <Gift className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Invite Friends, Earn Free Pro</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Share your referral link. When a friend signs up, you get <strong className="text-foreground">1 month Pro free</strong> and they get <strong className="text-foreground">2 weeks Pro free</strong>.
        </p>
      </div>

      {/* Referral Code Card */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Your Referral Code</p>
            <p className="text-3xl font-bold font-mono tracking-widest text-primary">{referralCode || '...'}</p>
          </div>

          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
            <code className="flex-1 text-sm truncate text-muted-foreground">{shareUrl}</code>
            <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handleWhatsApp} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Share2 className="h-4 w-4" /> WhatsApp
            </Button>
            <Button onClick={handleTwitter} variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" /> Twitter/X
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-2xl font-bold">{referrals.length}</p>
            <p className="text-xs text-muted-foreground">Invited</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Check className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{converted}</p>
            <p className="text-xs text-muted-foreground">Converted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{freeMonths}</p>
            <p className="text-xs text-muted-foreground">Free Months</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Referral History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-6">Loading...</div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Users className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">No referrals yet. Share your link above!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {referrals.map((ref) => (
                <div key={ref.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">
                      {ref.referred_id ? 'User signed up' : 'Pending signup'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ref.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <Badge variant={
                    ref.status === 'rewarded' ? 'default' :
                    ref.status === 'converted' ? 'secondary' : 'outline'
                  }>
                    {ref.status === 'rewarded' ? '🎁 Rewarded' :
                     ref.status === 'converted' ? '✅ Converted' : '⏳ Pending'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="bg-muted/20">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3">How it works</h3>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">1</span>Share your referral link with a friend</li>
            <li className="flex items-start gap-2"><span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">2</span>They sign up and get 2 weeks Pro free</li>
            <li className="flex items-start gap-2"><span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0">3</span>You get 1 month Pro free — automatically!</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
