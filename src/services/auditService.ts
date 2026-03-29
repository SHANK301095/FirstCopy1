/**
 * Audit Service — logs major quant actions for traceability
 * Uses audit_logs table via the log_audit_event DB function
 */
import { supabase } from '@/integrations/supabase/client';

export type AuditAction =
  | 'optimization_started'
  | 'optimization_completed'
  | 'parameter_promoted'
  | 'strategy_readiness_changed'
  | 'strategy_quarantined'
  | 'deployment_created'
  | 'deployment_paused'
  | 'deployment_resumed'
  | 'deployment_stopped'
  | 'emergency_stop'
  | 'order_blocked_by_risk'
  | 'strategy_replaced'
  | 'rebalance_approved'
  | 'rebalance_executed'
  | 'manual_override'
  | 'kill_switch_activated'
  | 'risk_policy_changed'
  | 'walk_forward_completed'
  | 'monte_carlo_completed'
  | 'selection_run_completed';

export interface AuditEntry {
  action: AuditAction;
  entity_type: string;
  entity_id?: string;
  before_data?: Record<string, unknown>;
  after_data?: Record<string, unknown>;
  reason?: string;
}

/**
 * Log an audit event — uses the DB function for atomic insert + alert
 */
export async function logAudit(entry: AuditEntry): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_audit_event', {
      p_action: entry.action,
      p_entity_type: entry.entity_type,
      p_entity_id: entry.entity_id || null,
      p_before_data: entry.before_data ? JSON.parse(JSON.stringify(entry.before_data)) : null,
      p_after_data: entry.after_data ? JSON.parse(JSON.stringify(entry.after_data)) : null,
      p_reason: entry.reason || null,
    });

    if (error) {
      console.error('[AuditService] Log failed:', error.message);
      return null;
    }
    return data as string;
  } catch (e) {
    console.error('[AuditService] Error:', e);
    return null;
  }
}

/**
 * Fetch recent audit trail for current user
 */
export async function fetchAuditTrail(limit = 50): Promise<any[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[AuditService] Fetch failed:', error.message);
    return [];
  }
  return data || [];
}
