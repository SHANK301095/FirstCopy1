/**
 * MT5 Status Card — live sync widget for dashboard with real-time polling
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, ArrowRight, Activity, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

interface MT5Account {
  id: string;
  account_number: string;
  broker_name: string;
  connection_status: string;
  last_heartbeat_at: string | null;
  last_sync_at: string | null;
  sync_latency_ms: number | null;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 3000) return 'Live';
  if (diff < 10000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function MT5StatusCard() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [syncPulse, setSyncPulse] = useState(false);
  const [, setTick] = useState(0); // force re-render for live timer

  const fetchAccounts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('mt5_accounts')
      .select('id, account_number, broker_name, connection_status, last_heartbeat_at, last_sync_at, sync_latency_ms')
      .eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(3);
    if (data) {
      const prev = accounts[0]?.last_sync_at;
      const next = (data as MT5Account[])[0]?.last_sync_at;
      if (prev && next && prev !== next) {
        setSyncPulse(true);
        setTimeout(() => setSyncPulse(false), 800);
      }
      setAccounts(data as MT5Account[]);
    }
  }, [user, accounts]);

  // Poll every 3s for near-real-time feel
  useEffect(() => {
    fetchAccounts();
    const iv = setInterval(fetchAccounts, 3000);
    return () => clearInterval(iv);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tick every second to update "Xs ago" display
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  // Realtime subscription for instant UI update
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('mt5-status-card')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mt5_accounts' }, () => {
        fetchAccounts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (accounts.length === 0) return null;

  const primary = accounts[0];
  const TEN_MINUTES = 10 * 60 * 1000;
  const hbDiff = primary.last_heartbeat_at ? Date.now() - new Date(primary.last_heartbeat_at).getTime() : Infinity;
  const isConnected = hbDiff < TEN_MINUTES;
  const lastSyncDiff = primary.last_sync_at ? Date.now() - new Date(primary.last_sync_at).getTime() : Infinity;
  const isLive = isConnected && lastSyncDiff < 10000;

  return (
    <Card className={cn('transition-all', isLive ? 'border-chart-2/40' : isConnected ? 'border-chart-2/20' : 'border-border')}>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('relative h-8 w-8 rounded-full flex items-center justify-center',
              isLive ? 'bg-chart-2/20' : isConnected ? 'bg-chart-2/10' : 'bg-muted')}>
              {isLive ? (
                <Activity className={cn('h-4 w-4 text-chart-2', syncPulse && 'scale-125 transition-transform')} />
              ) : isConnected ? (
                <Wifi className="h-4 w-4 text-chart-2" />
              ) : (
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              )}
              {isLive && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-chart-2 animate-ping opacity-75" />
              )}
              {isLive && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-chart-2" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">MT5 Sync</span>
                <Badge variant="outline" className={cn('text-[10px] gap-1',
                  isLive ? 'border-chart-2/50 text-chart-2' : isConnected ? 'border-chart-2/30 text-chart-2' : 'text-muted-foreground')}>
                  {isLive ? <><Zap className="h-2.5 w-2.5" /> Live</> : isConnected ? 'Connected' : 'Offline'}
                </Badge>
                {primary.sync_latency_ms && isConnected && (
                  <span className="text-[10px] font-mono text-muted-foreground">{primary.sync_latency_ms}ms</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {primary.broker_name} — ****{primary.account_number.slice(-4)} · {timeAgo(primary.last_sync_at)}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link to="/mt5-sync">Manage <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default MT5StatusCard;
