/**
 * Order Router — centralized dispatch layer between strategy signals
 * and broker adapters. Handles pre-trade risk checks, routing, and audit.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  IBrokerAdapter,
  BrokerOrderRequest,
  BrokerOrderResult,
} from './brokerAdapter';
import { MT5BrokerAdapter } from './mt5BrokerAdapter';
import { runRiskCheck } from './riskEnforcementService';
import type { RiskCheckResult } from '@/types/quant';

export type RouteDecision = 'routed' | 'blocked' | 'no_adapter' | 'error';

export interface RouteResult {
  decision: RouteDecision;
  riskCheck: RiskCheckResult | null;
  orderResult: BrokerOrderResult | null;
  reason?: string;
}

// In-memory adapter cache (per session)
const adapterCache = new Map<string, IBrokerAdapter>();

/**
 * Create or retrieve the broker adapter for a given deployment.
 */
export function getOrCreateAdapter(
  brokerType: string,
  connectionId: string,
  userId: string,
  accountId: string
): IBrokerAdapter | null {
  const key = `${brokerType}:${connectionId}`;

  if (adapterCache.has(key)) {
    return adapterCache.get(key)!;
  }

  let adapter: IBrokerAdapter | null = null;

  switch (brokerType) {
    case 'mt5':
      adapter = new MT5BrokerAdapter(connectionId, userId, accountId);
      break;
    // Future: case 'zerodha': adapter = new ZerodhaAdapter(...); break;
    // Future: case 'ibkr':    adapter = new IBKRAdapter(...); break;
    default:
      console.warn(`[OrderRouter] No adapter for broker type: ${brokerType}`);
      return null;
  }

  adapterCache.set(key, adapter);
  return adapter;
}

/**
 * Route an order through risk checks → broker adapter → audit log.
 */
export async function routeOrder(
  deploymentId: string,
  userId: string,
  brokerType: string,
  connectionId: string,
  accountId: string,
  order: BrokerOrderRequest
): Promise<RouteResult> {
  // 1. Get or create adapter
  const adapter = getOrCreateAdapter(brokerType, connectionId, userId, accountId);
  if (!adapter) {
    return { decision: 'no_adapter', riskCheck: null, orderResult: null, reason: `No adapter for ${brokerType}` };
  }

  // 2. Pre-trade risk check
  const riskCheck = await runRiskCheck(userId, 'pre_order', {
    symbol: order.symbol,
    order_side: order.side,
    order_quantity: order.quantity,
  });
  if (!riskCheck.passed) {
    const reasons = riskCheck.breaches.map(b => b.rule_type);
    await logRouteEvent(deploymentId, userId, 'blocked', order, null, riskCheck);
    return { decision: 'blocked', riskCheck, orderResult: null, reason: reasons.join('; ') };
  }

  // 3. Execute via adapter
  try {
    const result = await adapter.placeOrder(order);
    await logRouteEvent(deploymentId, userId, 'routed', order, result, riskCheck);

    // Update deployment stats
    await supabase
      .from('live_deployments')
      .update({
        last_signal_at: new Date().toISOString(),
        trades_executed: undefined, // Will be incremented by trigger or next sync
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', deploymentId);

    return { decision: 'routed', riskCheck, orderResult: result };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await logRouteEvent(deploymentId, userId, 'error', order, null, riskCheck, errMsg);
    return { decision: 'error', riskCheck, orderResult: null, reason: errMsg };
  }
}

/**
 * Emergency kill — close all positions across all active adapters.
 */
export async function emergencyKillAll(userId: string): Promise<void> {
  console.error('[OrderRouter] EMERGENCY KILL ALL');

  for (const [key, adapter] of adapterCache.entries()) {
    try {
      await adapter.emergencyStop();
      console.log(`[OrderRouter] Stopped adapter: ${key}`);
    } catch (err) {
      console.error(`[OrderRouter] Failed to stop adapter: ${key}`, err);
    }
  }

  // Also update all running deployments in DB
  await supabase
    .from('live_deployments')
    .update({
      status: 'stopped',
      pause_reason: 'Emergency kill switch',
      updated_at: new Date().toISOString(),
    } as any)
    .eq('user_id', userId)
    .in('status', ['running', 'paused']);

  adapterCache.clear();
}

/**
 * Log route decision for audit trail.
 */
async function logRouteEvent(
  deploymentId: string,
  userId: string,
  decision: string,
  order: BrokerOrderRequest,
  result: BrokerOrderResult | null,
  riskCheck: RiskCheckResult | null,
  error?: string
) {
  try {
    await supabase.from('logs').insert({
      user_id: userId,
      scope: 'order_router',
      level: decision === 'error' ? 'error' : decision === 'blocked' ? 'warn' : 'info',
      message: `Order ${decision}: ${order.side} ${order.quantity} ${order.symbol}`,
      meta_json: {
        deployment_id: deploymentId,
        decision,
        order: { symbol: order.symbol, side: order.side, type: order.type, qty: order.quantity },
        risk: riskCheck ? { passed: riskCheck.passed, breaches: riskCheck.breaches.map(b => b.rule_type) } : null,
        result: result ? { orderId: result.orderId, status: result.status } : null,
        error: error || null,
      },
    });
  } catch (logErr) {
    console.error('[OrderRouter] Failed to log route event', logErr);
  }
}

/**
 * Get adapter health for a specific connection.
 */
export async function checkAdapterHealth(
  brokerType: string,
  connectionId: string,
  userId: string,
  accountId: string
) {
  const adapter = getOrCreateAdapter(brokerType, connectionId, userId, accountId);
  if (!adapter) return null;
  return adapter.healthCheck();
}
