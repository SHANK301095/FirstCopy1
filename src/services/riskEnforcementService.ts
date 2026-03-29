/**
 * Risk Enforcement Service — Centralized risk checks
 * Enforces policies BEFORE orders, not just display
 */
import { supabase } from '@/integrations/supabase/client';
import type { RiskPolicy, RiskRule, RiskBreach, RiskCheckPoint, RiskCheckResult } from '@/types/quant';

/** Run pre-trade risk check against all active policies for the user */
export async function runRiskCheck(
  userId: string,
  checkpoint: RiskCheckPoint,
  context: {
    deployment_id?: string;
    symbol?: string;
    order_side?: 'buy' | 'sell';
    order_quantity?: number;
    order_notional?: number;
    current_positions?: number;
    current_daily_loss?: number;
    current_drawdown?: number;
    current_exposure?: number;
  }
): Promise<RiskCheckResult> {
  // Fetch active policies
  const { data: policies } = await supabase
    .from('risk_policies')
    .select('*')
    .eq('user_id', userId)
    .eq('enabled', true);

  if (!policies || policies.length === 0) {
    return { passed: true, checkpoint, breaches: [], timestamp: new Date().toISOString() };
  }

  const breaches: RiskBreach[] = [];

  for (const policy of policies) {
    const rules = (policy.rules as any as RiskRule[]) || [];

    for (const rule of rules) {
      let breached = false;
      let currentValue = 0;

      switch (rule.type) {
        case 'max_daily_loss':
          currentValue = Math.abs(context.current_daily_loss || 0);
          breached = currentValue >= rule.limit;
          break;
        case 'max_drawdown':
          currentValue = Math.abs(context.current_drawdown || 0);
          breached = currentValue >= rule.limit;
          break;
        case 'max_positions':
          currentValue = context.current_positions || 0;
          breached = currentValue >= rule.limit;
          break;
        case 'max_symbol_exposure':
        case 'max_strategy_exposure':
          currentValue = context.current_exposure || 0;
          breached = currentValue >= rule.limit;
          break;
        case 'max_notional':
          currentValue = context.order_notional || 0;
          breached = currentValue > rule.limit;
          break;
        case 'kill_switch':
          // Kill switch is always a breach if active
          breached = true;
          currentValue = 1;
          break;
      }

      if (breached) {
        const breach: RiskBreach = {
          id: crypto.randomUUID(),
          policy_id: policy.id,
          rule_type: rule.type,
          current_value: currentValue,
          limit_value: rule.limit,
          action_taken: rule.action,
          deployment_id: context.deployment_id,
          acknowledged: false,
          created_at: new Date().toISOString(),
        };
        breaches.push(breach);

        // Persist breach
        await supabase.from('risk_breaches').insert({
          user_id: userId,
          policy_id: policy.id,
          rule_type: rule.type,
          current_value: currentValue,
          limit_value: rule.limit,
          action_taken: rule.action,
          deployment_id: context.deployment_id || null,
        });
      }
    }
  }

  const hasBlockingBreach = breaches.some(b => b.action_taken === 'block' || b.action_taken === 'stop');

  return {
    passed: !hasBlockingBreach,
    checkpoint,
    breaches,
    timestamp: new Date().toISOString(),
  };
}

/** Fetch user's risk policies */
export async function fetchRiskPolicies(userId: string) {
  const { data } = await supabase
    .from('risk_policies')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}

/** Create or update a risk policy */
export async function upsertRiskPolicy(userId: string, policy: {
  id?: string;
  name: string;
  scope: string;
  scope_id?: string;
  rules: RiskRule[];
  enabled: boolean;
}) {
  if (policy.id) {
    const { error } = await supabase
      .from('risk_policies')
      .update({
        name: policy.name,
        scope: policy.scope,
        scope_id: policy.scope_id || null,
        rules: policy.rules as any,
        enabled: policy.enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', policy.id)
      .eq('user_id', userId);
    return { success: !error, error: error?.message };
  }

  const { data, error } = await supabase
    .from('risk_policies')
    .insert({
      user_id: userId,
      name: policy.name,
      scope: policy.scope,
      scope_id: policy.scope_id || null,
      rules: policy.rules as any,
      enabled: policy.enabled,
    })
    .select('id')
    .single();

  return { success: !error, id: data?.id, error: error?.message };
}

/** Fetch recent breaches */
export async function fetchRecentBreaches(userId: string, limit = 50) {
  const { data } = await supabase
    .from('risk_breaches')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

/** Acknowledge a breach */
export async function acknowledgeBreach(userId: string, breachId: string) {
  await supabase
    .from('risk_breaches')
    .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
    .eq('id', breachId)
    .eq('user_id', userId);
}
