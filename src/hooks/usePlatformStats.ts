import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlatformStats {
  totalUsers: number;
  totalTrades: number;
  totalBacktests: number;
}

const CACHE_KEY = 'mmc_platform_stats';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function roundToNearest(n: number, nearest: number = 100): number {
  if (n < 100) return n;
  return Math.round(n / nearest) * nearest;
}

export function usePlatformStats() {
  const [stats, setStats] = useState<PlatformStats>({ totalUsers: 0, totalTrades: 0, totalBacktests: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setStats(data);
          setLoading(false);
          return;
        }
      } catch { /* ignore */ }
    }

    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.rpc('get_platform_stats');
        if (!error && data) {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          const newStats: PlatformStats = {
            totalUsers: roundToNearest(parsed.total_users || 0),
            totalTrades: roundToNearest(parsed.total_trades || 0),
            totalBacktests: roundToNearest(parsed.total_backtests || 0),
          };
          setStats(newStats);
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: newStats, timestamp: Date.now() }));
        }
      } catch { /* fallback to defaults */ }
      setLoading(false);
    };

    fetchStats();
  }, []);

  return { stats, loading };
}
