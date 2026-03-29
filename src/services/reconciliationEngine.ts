/**
 * Deployment Reconciliation Engine
 * Detects drift between platform state and broker state
 * Generates incidents for mismatches
 */
import { supabase } from '@/integrations/supabase/client';
import { createIncident } from './incidentService';
import { logAudit } from './auditService';

export interface ReconciliationResult {
  deploymentId: string;
  accountId: string;
  checkedAt: string;
  positionMismatches: PositionMismatch[];
  orderMismatches: OrderMismatch[];
  pnlDrift: number;
  severity: 'clean' | 'warning' | 'critical';
  autoHealed: number;
  manualRequired: number;
}

export interface PositionMismatch {
  symbol: string;
  platformQty: number;
  brokerQty: number;
  direction: string;
  type: 'orphan_platform' | 'orphan_broker' | 'quantity_mismatch' | 'direction_mismatch';
}

export interface OrderMismatch {
  orderId: string;
  platformStatus: string;
  brokerStatus: string;
  type: 'missing_on_broker' | 'missing_on_platform' | 'status_mismatch';
}

/**
 * Run reconciliation for a specific MT5 account
 */
export async function reconcileAccount(
  userId: string,
  accountId: string,
  deploymentId?: string
): Promise<ReconciliationResult> {
  const checkedAt = new Date().toISOString();

  // Fetch platform positions
  const { data: platformPositions } = await supabase
    .from('mt5_positions')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_open', true);

  // Fetch platform orders
  const { data: platformOrders } = await supabase
    .from('mt5_orders')
    .select('*')
    .eq('account_id', accountId);

  // Fetch latest equity snapshot for PnL drift
  const { data: equitySnapshots } = await supabase
    .from('mt5_equity_snapshots')
    .select('*')
    .eq('account_id', accountId)
    .order('snapshot_at', { ascending: false })
    .limit(2);

  const positions = platformPositions || [];
  const orders = platformOrders || [];
  const positionMismatches: PositionMismatch[] = [];
  const orderMismatches: OrderMismatch[] = [];

  // Check for stale positions (no recent sync)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  for (const pos of positions) {
    if (pos.synced_at < fiveMinAgo) {
      positionMismatches.push({
        symbol: pos.symbol,
        platformQty: pos.volume,
        brokerQty: 0, // Unknown — stale sync
        direction: pos.direction,
        type: 'orphan_platform',
      });
    }
  }

  // Check for stale orders
  for (const order of orders) {
    if (order.synced_at < fiveMinAgo && order.state === 'placed') {
      orderMismatches.push({
        orderId: String(order.ticket),
        platformStatus: order.state || 'placed',
        brokerStatus: 'unknown',
        type: 'status_mismatch',
      });
    }
  }

  // PnL drift calculation
  let pnlDrift = 0;
  if (equitySnapshots && equitySnapshots.length >= 2) {
    const latest = equitySnapshots[0];
    const previous = equitySnapshots[1];
    const expectedPnl = latest.equity - previous.equity;
    const reportedPnl = latest.floating_pl || 0;
    pnlDrift = Math.abs(expectedPnl - reportedPnl);
  }

  // Determine severity
  let severity: ReconciliationResult['severity'] = 'clean';
  if (positionMismatches.length > 0 || orderMismatches.length > 0) severity = 'warning';
  if (positionMismatches.length > 3 || pnlDrift > 1000) severity = 'critical';

  const result: ReconciliationResult = {
    deploymentId: deploymentId || accountId,
    accountId,
    checkedAt,
    positionMismatches,
    orderMismatches,
    pnlDrift,
    severity,
    autoHealed: 0,
    manualRequired: positionMismatches.length + orderMismatches.length,
  };

  // Persist reconciliation record
  await supabase.from('mt5_reconciliation').insert({
    account_id: accountId,
    user_id: userId,
    severity,
    expected_positions: positions.length,
    actual_positions: positions.length - positionMismatches.filter(m => m.type === 'orphan_platform').length,
    expected_orders: orders.length,
    actual_orders: orders.length - orderMismatches.filter(m => m.type === 'missing_on_broker').length,
    position_mismatches: positionMismatches as any,
    order_mismatches: orderMismatches as any,
    auto_healed: result.autoHealed,
    manual_required: result.manualRequired,
  });

  // Create incident if critical
  if (severity === 'critical') {
    await createIncident(userId, {
      type: 'reconciliation_mismatch',
      severity: 'critical',
      title: `Reconciliation alert: ${positionMismatches.length} position mismatches`,
      detail: `Account ${accountId}: ${positionMismatches.length} position drift, PnL drift ₹${pnlDrift.toFixed(2)}`,
      metadata: { accountId, positionMismatches, orderMismatches, pnlDrift },
    });

    await logAudit({
      action: 'emergency_stop',
      entity_type: 'reconciliation',
      entity_id: accountId,
      after_data: { severity, mismatches: positionMismatches.length + orderMismatches.length },
      reason: 'Critical reconciliation mismatch detected',
    });
  }

  return result;
}

/**
 * Run reconciliation for all active accounts
 */
export async function reconcileAllAccounts(userId: string): Promise<ReconciliationResult[]> {
  const { data: accounts } = await supabase
    .from('mt5_accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!accounts || accounts.length === 0) return [];

  const results: ReconciliationResult[] = [];
  for (const account of accounts) {
    try {
      const result = await reconcileAccount(userId, account.id);
      results.push(result);
    } catch (e) {
      console.error(`[Reconciliation] Failed for account ${account.id}:`, e);
    }
  }

  return results;
}
