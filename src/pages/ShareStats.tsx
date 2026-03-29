import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TrendingUp, Award, BarChart3, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/seo/SEOHead';
import mmcLogo from '@/assets/mmc-logo.png';

interface PublicStats {
  display_name: string;
  avatar_url: string | null;
  win_rate: number;
  profit_factor: number;
  total_trades: number;
  total_pnl: number;
}

export default function ShareStats() {
  const { userId } = useParams<{ userId: string }>();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPublicStats = async () => {
      if (!userId) { setNotFound(true); setLoading(false); return; }

      // Check if profile is public
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, is_public')
        .eq('id', userId)
        .single();

      if (!profile || !profile.is_public) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Fetch trade stats
      const { data: trades } = await supabase
        .from('trades')
        .select('pnl, status')
        .eq('user_id', userId)
        .eq('status', 'closed');

      const closedTrades = trades || [];
      const wins = closedTrades.filter(t => (t.pnl || 0) > 0).length;
      const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;
      const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const avgWin = closedTrades.filter(t => (t.pnl || 0) > 0).reduce((s, t) => s + (t.pnl || 0), 0) / Math.max(wins, 1);
      const losses = closedTrades.filter(t => (t.pnl || 0) < 0);
      const avgLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0) / Math.max(losses.length, 1));
      const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

      setStats({
        display_name: profile.display_name || 'Trader',
        avatar_url: profile.avatar_url,
        win_rate: Math.round(winRate),
        profit_factor: Math.round(profitFactor * 100) / 100,
        total_trades: closedTrades.length,
        total_pnl: Math.round(totalPnl),
      });
      setLoading(false);
    };

    fetchPublicStats();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading stats...</div>
      </div>
    );
  }

  if (notFound || !stats) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <SEOHead title="Trader Stats | MMCai" description="View trader performance stats on MMCai" />
        <p className="text-muted-foreground">This profile is private or doesn't exist.</p>
        <Button asChild><Link to="/landing">Visit MMCai <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </div>
    );
  }

  const isPositive = stats.total_pnl >= 0;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <SEOHead
        title={`${stats.display_name}'s Trading Stats | MMCai`}
        description={`${stats.display_name} has a ${stats.win_rate}% win rate across ${stats.total_trades} trades on MMCai.`}
      />

      <Card className="w-full max-w-md border-2 border-primary/20 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-background to-emerald-600/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">{stats.display_name}'s Trading Stats</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card/80 backdrop-blur-sm rounded-xl p-4 border">
              <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.win_rate}%</p>
            </div>
            <div className="bg-card/80 backdrop-blur-sm rounded-xl p-4 border">
              <p className="text-xs text-muted-foreground mb-1">Profit Factor</p>
              <p className="text-2xl font-bold text-primary">{stats.profit_factor}</p>
            </div>
            <div className="bg-card/80 backdrop-blur-sm rounded-xl p-4 border">
              <p className="text-xs text-muted-foreground mb-1">Total Trades</p>
              <p className="text-2xl font-bold">{stats.total_trades}</p>
            </div>
            <div className="bg-card/80 backdrop-blur-sm rounded-xl p-4 border">
              <p className="text-xs text-muted-foreground mb-1">Total P&L</p>
              <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-400' : 'text-destructive'}`}>
                {isPositive ? '+' : ''}₹{stats.total_pnl.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={mmcLogo} alt="MMCai" className="h-5 w-5" />
            <span className="text-xs text-muted-foreground font-medium">Powered by MMCai.app 🚀</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            <Award className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Want to track your trading performance like this?
        </p>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
          <Link to="/signup">
            Start Free on MMCai <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
