/**
 * Alert Engine Hook - Evaluates alerts on trade changes, interval, and focus
 */
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTradesDB } from '@/hooks/useTradesDB';
import { evaluateAlerts, TriggeredAlert } from '@/lib/alertEngine';
import { toast } from 'sonner';

export function useAlertEngine() {
  const { user } = useAuth();
  const { trades, stats } = useTradesDB();
  const lastRunRef = useRef(0);

  const runEvaluation = useCallback(async () => {
    if (!user || trades.length === 0) return;

    // Throttle: min 30s between runs
    const now = Date.now();
    if (now - lastRunRef.current < 30_000) return;
    lastRunRef.current = now;

    try {
      // Load active alerts
      const { data: alertRows } = await supabase
        .from('trade_alerts')
        .select('id, type, title, severity, metadata, last_triggered_day, last_triggered_at')
        .eq('user_id', user.id)
        .eq('channel', 'in_app');

      if (!alertRows || alertRows.length === 0) return;

      const triggered = evaluateAlerts(trades, stats, alertRows as any, new Date());
      if (triggered.length === 0) return;

      const todayKey = new Date().toISOString().slice(0, 10);

      for (const t of triggered) {
        // Dedupe check: same alert_id + same day
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('alert_id', t.alert_id)
          .gte('created_at', todayKey + 'T00:00:00Z')
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Insert notification
        await supabase.from('notifications').insert({
          user_id: user.id,
          alert_id: t.alert_id,
          title: t.title,
          message: t.message,
          type: t.type,
        } as any);

        // Update alert last trigger
        await supabase
          .from('trade_alerts')
          .update({ last_triggered_day: todayKey, last_triggered_at: new Date().toISOString() } as any)
          .eq('id', t.alert_id);

        // Toast
        toast[t.type === 'success' ? 'success' : t.type === 'warning' ? 'warning' : 'info'](t.title, {
          description: t.message,
          duration: 8000,
          action: {
            label: 'View Details',
            onClick: () => { window.location.href = '/alerts'; },
          },
        });
      }
    } catch {
      // silent
    }
  }, [user, trades, stats]);

  // Run on trades change
  useEffect(() => {
    runEvaluation();
  }, [runEvaluation]);

  // Run every 5 minutes
  useEffect(() => {
    const interval = setInterval(runEvaluation, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [runEvaluation]);

  // Run on window focus
  useEffect(() => {
    const handler = () => runEvaluation();
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [runEvaluation]);
}
