/**
 * Quant Audit Service — Centralized audit trail for all quant operations
 */
import { supabase } from '@/integrations/supabase/client';

export async function logQuantAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  detail?: string,
  beforeState?: Record<string, unknown>,
  afterState?: Record<string, unknown>,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.from('quant_audit_log').insert([{
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      detail: detail || '',
      before_state: (beforeState as any) || null,
      after_state: (afterState as any) || null,
      metadata: (metadata as any) || null,
    }]);
  } catch (e) {
    console.warn('[QuantAudit] Failed to log:', e);
  }
}

export async function fetchQuantAuditLog(userId: string, limit = 100) {
  const { data } = await supabase
    .from('quant_audit_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}
