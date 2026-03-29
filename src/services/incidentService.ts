/**
 * Incident Service — Create, track, and manage quant incidents
 */
import { supabase } from '@/integrations/supabase/client';
import type { IncidentSeverity, IncidentStatus } from '@/types/quant';

export async function createIncident(
  userId: string,
  incident: {
    type: string;
    severity: IncidentSeverity;
    title: string;
    detail: string;
    deployment_id?: string;
    strategy_id?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const { data, error } = await supabase
    .from('incidents')
    .insert({
      user_id: userId,
      type: incident.type,
      severity: incident.severity,
      status: 'open',
      title: incident.title,
      detail: incident.detail,
      deployment_id: incident.deployment_id || null,
      strategy_id: incident.strategy_id || null,
      metadata: (incident.metadata as any) || null,
    })
    .select('id')
    .single();
  return { success: !error, id: data?.id, error: error?.message };
}

export async function fetchIncidents(userId: string, statusFilter?: IncidentStatus, limit = 100) {
  let query = supabase
    .from('incidents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data } = await query;
  return data || [];
}

export async function updateIncidentStatus(
  userId: string,
  incidentId: string,
  status: IncidentStatus,
  notes?: string
) {
  const updates: Record<string, unknown> = { status };
  if (status === 'acknowledged') updates.acknowledged_at = new Date().toISOString();
  if (status === 'resolved') {
    updates.resolved_at = new Date().toISOString();
    if (notes) updates.resolution_notes = notes;
  }

  await supabase
    .from('incidents')
    .update(updates)
    .eq('id', incidentId)
    .eq('user_id', userId);
}

export async function getIncidentCounts(userId: string) {
  const { data } = await supabase
    .from('incidents')
    .select('severity, status')
    .eq('user_id', userId)
    .in('status', ['open', 'acknowledged', 'investigating']);

  const counts = { open: 0, critical: 0, elevated: 0, warning: 0 };
  for (const row of data || []) {
    if (row.status === 'open') counts.open++;
    if (row.severity === 'critical') counts.critical++;
    else if (row.severity === 'elevated') counts.elevated++;
    else if (row.severity === 'warning') counts.warning++;
  }
  return counts;
}
