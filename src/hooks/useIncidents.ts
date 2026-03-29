/**
 * Hook for real-time incident tracking
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchIncidents,
  createIncident,
  updateIncidentStatus,
  getIncidentCounts,
} from '@/services/incidentService';

export function useIncidents() {
  const { user } = useAuth();
  const [active, setActive] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ open: 0, critical: 0, elevated: 0, warning: 0 });

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [activeData, recentData, c] = await Promise.all([
      fetchIncidents(user.id, 'open' as any, 50),
      fetchIncidents(user.id, undefined, 100),
      getIncidentCounts(user.id),
    ]);
    setActive(activeData);
    setRecent(recentData);
    setCounts(c);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('incidents-rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'incidents',
        filter: `user_id=eq.${user.id}`,
      }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, refresh]);

  const create = useCallback(async (incident: Parameters<typeof createIncident>[1]) => {
    if (!user) return null;
    return createIncident(user.id, incident);
  }, [user]);

  const acknowledge = useCallback(async (id: string) => {
    if (!user) return;
    await updateIncidentStatus(user.id, id, 'acknowledged' as any);
    refresh();
  }, [user, refresh]);

  const resolve = useCallback(async (id: string, notes?: string) => {
    if (!user) return;
    await updateIncidentStatus(user.id, id, 'resolved' as any, notes);
    refresh();
  }, [user, refresh]);

  return {
    active,
    recent,
    loading,
    counts,
    create,
    acknowledge,
    resolve,
    refresh,
    openCount: counts.open,
    criticalCount: counts.critical,
  };
}
