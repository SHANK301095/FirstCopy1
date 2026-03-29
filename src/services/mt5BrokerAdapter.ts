/**
 * MT5 Broker Adapter — sends commands to the Runner Agent via the runner_commands table.
 * The Runner Agent polls this table and routes to the MT5 Controller EA.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  BaseBrokerAdapter,
  BrokerOrderRequest,
  BrokerOrderResult,
  BrokerPosition,
  BrokerAccountInfo,
  BrokerHealthStatus,
} from './brokerAdapter';

export class MT5BrokerAdapter extends BaseBrokerAdapter {
  readonly brokerType = 'mt5';
  private accountId: string;
  private terminalId: string | null = null;

  constructor(connectionId: string, userId: string, accountId: string) {
    super(connectionId, userId);
    this.accountId = accountId;
  }

  async connect(): Promise<boolean> {
    this.log('info', 'Connecting to MT5 account', { accountId: this.accountId });

    const { data } = await supabase
      .from('mt5_accounts')
      .select('*')
      .eq('id', this.connectionId)
      .eq('user_id', this.userId)
      .single();

    if (!data) {
      this.log('error', 'MT5 account not found');
      return false;
    }

    // Check heartbeat staleness
    const lastHeartbeat = data.last_heartbeat_at ? new Date(data.last_heartbeat_at) : null;
    const staleMs = lastHeartbeat ? Date.now() - lastHeartbeat.getTime() : Infinity;
    const isOnline = staleMs < 30_000;

    if (!isOnline) {
      this.log('warn', 'MT5 account heartbeat stale', { staleMs });
    }

    return isOnline;
  }

  async disconnect(): Promise<void> {
    this.log('info', 'Disconnecting MT5 adapter');
  }

  async healthCheck(): Promise<BrokerHealthStatus> {
    const { data } = await supabase
      .from('mt5_accounts')
      .select('last_heartbeat_at, connection_status, terminal_build, server_name, sync_latency_ms')
      .eq('id', this.connectionId)
      .single();

    if (!data) {
      return { connected: false, latencyMs: -1, lastHeartbeat: '' };
    }

    const lastHb = data.last_heartbeat_at || '';
    const staleMs = lastHb ? Date.now() - new Date(lastHb).getTime() : Infinity;

    return {
      connected: data.connection_status === 'connected' && staleMs < 60_000,
      latencyMs: data.sync_latency_ms || 0,
      lastHeartbeat: lastHb,
      terminalVersion: data.terminal_build || undefined,
      serverName: data.server_name || undefined,
    };
  }

  async getAccountInfo(): Promise<BrokerAccountInfo> {
    // Get latest equity snapshot
    const { data } = await supabase
      .from('mt5_equity_snapshots')
      .select('*')
      .eq('account_id', this.connectionId)
      .eq('user_id', this.userId)
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      return {
        balance: 0, equity: 0, margin: 0, freeMargin: 0,
        marginLevel: null, currency: 'USD', leverage: 100,
        openPositions: 0, pendingOrders: 0,
      };
    }

    return {
      balance: data.balance,
      equity: data.equity,
      margin: data.margin || 0,
      freeMargin: data.free_margin || 0,
      marginLevel: data.margin_level,
      currency: 'USD',
      leverage: 100,
      openPositions: data.positions_count || 0,
      pendingOrders: data.orders_count || 0,
    };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    const { data } = await supabase
      .from('mt5_positions')
      .select('*')
      .eq('account_id', this.connectionId)
      .eq('user_id', this.userId)
      .eq('is_open', true);

    if (!data) return [];

    return data.map(p => ({
      symbol: p.symbol,
      direction: p.direction as 'long' | 'short',
      quantity: p.volume,
      entryPrice: p.open_price,
      currentPrice: p.current_price || p.open_price,
      unrealizedPnl: p.profit || 0,
      swap: p.swap || 0,
      commission: p.commission || 0,
      magic: p.magic_number || undefined,
      ticket: p.ticket,
    }));
  }

  async placeOrder(order: BrokerOrderRequest): Promise<BrokerOrderResult> {
    this.log('info', 'Placing MT5 order via runner command', order);

    // Insert a runner command that the agent will pick up
    const { data, error } = await supabase
      .from('runner_commands')
      .insert({
        runner_id: this.terminalId || this.connectionId,
        command_type: 'PLACE_ORDER',
        status: 'queued',
        payload: {
          account_id: this.accountId,
          symbol: order.symbol,
          side: order.side,
          type: order.type,
          quantity: order.quantity,
          price: order.price,
          stop_price: order.stopPrice,
          sl: order.stopLoss,
          tp: order.takeProfit,
          magic: order.magic,
          comment: order.comment || 'MMC_BRIDGE',
        },
      } as any)
      .select()
      .single();

    if (error) {
      this.log('error', 'Failed to queue order command', error);
      return {
        orderId: '',
        brokerOrderId: '',
        status: 'rejected',
        filledQty: 0,
        avgFillPrice: null,
        commission: 0,
        timestamp: new Date().toISOString(),
        rawResponse: error,
      };
    }

    return {
      orderId: data?.id || '',
      brokerOrderId: data?.id || '',
      status: 'pending',
      filledQty: 0,
      avgFillPrice: null,
      commission: 0,
      timestamp: new Date().toISOString(),
    };
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    const { error } = await supabase
      .from('runner_commands')
      .insert({
        runner_id: this.connectionId,
        command_type: 'CANCEL_ORDER',
        status: 'queued',
        payload: { order_id: orderId },
      } as any);

    return !error;
  }

  async closePosition(symbol: string, quantity?: number): Promise<BrokerOrderResult> {
    return this.placeOrder({
      symbol,
      side: 'sell', // Will be resolved by the agent based on position direction
      type: 'market',
      quantity: quantity || 0, // 0 = close full position
      comment: 'MMC_CLOSE',
    });
  }

  async closeAllPositions(): Promise<BrokerOrderResult[]> {
    this.log('warn', 'Closing all MT5 positions via PANIC_STOP');

    await supabase
      .from('runner_commands')
      .insert({
        runner_id: this.connectionId,
        command_type: 'PANIC_STOP',
        status: 'queued',
        payload: { close_positions: true },
      } as any);

    return [];
  }
}
