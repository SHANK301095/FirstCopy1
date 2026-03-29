/**
 * Paper Order Engine — Full order lifecycle management
 * Handles: market/limit/stop orders, SL/TP, trailing stop, fill model integration
 */

import { simulateFill, type FillModelConfig, type FillResult } from './fillModelService';
import type { OHLCV } from './replayEngine';

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop';
export type OrderStatus = 'created' | 'accepted' | 'working' | 'partially_filled' | 'filled' | 'canceled' | 'rejected' | 'expired';

export interface PaperOrderEntry {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;          // limit/stop price
  stop_loss?: number;
  take_profit?: number;
  trailing_stop_pips?: number;
  status: OrderStatus;
  filled_quantity: number;
  avg_fill_price: number;
  fees: number;
  slippage: number;
  fill_result?: FillResult;
  reject_reason?: string;
  created_at: number;     // unix ms
  filled_at?: number;
  closed_at?: number;
}

export interface PaperPositionEntry {
  id: string;
  order_id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  avg_entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  realized_pnl: number;
  stop_loss?: number;
  take_profit?: number;
  trailing_stop_pips?: number;
  trailing_stop_price?: number;
  opened_at: number;
}

export interface PaperAccountState {
  balance: number;
  equity: number;
  used_margin: number;
  free_margin: number;
  unrealized_pnl: number;
  realized_pnl: number;
  total_fees: number;
  positions: PaperPositionEntry[];
  orders: PaperOrderEntry[];
  closed_trades: PaperOrderEntry[];
  event_log: EventLogEntry[];
}

export interface EventLogEntry {
  ts: number;
  type: 'order_created' | 'order_filled' | 'order_rejected' | 'order_canceled' |
        'position_opened' | 'position_closed' | 'sl_triggered' | 'tp_triggered' |
        'trailing_stop_updated' | 'margin_call' | 'risk_blocked';
  message: string;
  data?: Record<string, unknown>;
}

function getContractMultiplier(symbol: string): number {
  if (['US30', 'US500', 'NAS100', 'UK100', 'GER40'].includes(symbol)) return 1;
  if (symbol === 'XAUUSD') return 100;
  if (symbol === 'BTCUSD') return 1;
  return 100000;
}

function getMarginPerLot(symbol: string): number {
  if (symbol === 'BTCUSD') return 2000;
  if (symbol === 'XAUUSD') return 1500;
  if (['US30', 'US500', 'NAS100'].includes(symbol)) return 500;
  return 1000; // forex
}

export class PaperOrderEngine {
  private state: PaperAccountState;
  private fillConfig: FillModelConfig;
  private tickCounter = 0;

  constructor(initialBalance: number, fillConfig: FillModelConfig) {
    this.fillConfig = fillConfig;
    this.state = {
      balance: initialBalance,
      equity: initialBalance,
      used_margin: 0,
      free_margin: initialBalance,
      unrealized_pnl: 0,
      realized_pnl: 0,
      total_fees: 0,
      positions: [],
      orders: [],
      closed_trades: [],
      event_log: [],
    };
  }

  getState(): PaperAccountState {
    return { ...this.state };
  }

  setFillConfig(config: FillModelConfig): void {
    this.fillConfig = config;
  }

  /**
   * Submit a new order
   */
  submitOrder(params: {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    price?: number;
    stop_loss?: number;
    take_profit?: number;
    trailing_stop_pips?: number;
    currentPrice: number;
  }): PaperOrderEntry {
    const order: PaperOrderEntry = {
      id: crypto.randomUUID(),
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      quantity: params.quantity,
      price: params.price,
      stop_loss: params.stop_loss,
      take_profit: params.take_profit,
      trailing_stop_pips: params.trailing_stop_pips,
      status: 'created',
      filled_quantity: 0,
      avg_fill_price: 0,
      fees: 0,
      slippage: 0,
      created_at: Date.now(),
    };

    // Margin check
    const requiredMargin = params.quantity * getMarginPerLot(params.symbol);
    if (requiredMargin > this.state.free_margin) {
      order.status = 'rejected';
      order.reject_reason = 'Insufficient margin';
      this.addEvent('order_rejected', `Order rejected: insufficient margin for ${params.symbol}`, { order_id: order.id });
      this.state.orders.push(order);
      return order;
    }

    // Market orders fill immediately
    if (params.type === 'market') {
      return this.fillOrder(order, params.currentPrice);
    }

    // Limit/stop orders go to working state
    order.status = 'working';
    this.state.orders.push(order);
    this.addEvent('order_created', `${params.type} ${params.side} ${params.quantity} ${params.symbol} @ ${params.price}`, { order_id: order.id });
    return order;
  }

  /**
   * Process a new bar — check pending orders, SL/TP, trailing stops
   */
  processBar(bar: OHLCV, symbol: string): void {
    this.tickCounter++;

    // Check working orders for fills
    const workingOrders = this.state.orders.filter(o => o.status === 'working' && o.symbol === symbol);
    for (const order of workingOrders) {
      if (this.shouldFillPendingOrder(order, bar)) {
        this.fillOrder(order, order.price ?? bar.close);
      }
    }

    // Update positions
    for (const pos of this.state.positions) {
      if (pos.symbol !== symbol) continue;

      pos.current_price = bar.close;
      const mult = getContractMultiplier(symbol);
      pos.unrealized_pnl = pos.side === 'buy'
        ? (bar.close - pos.avg_entry_price) * pos.quantity * mult
        : (pos.avg_entry_price - bar.close) * pos.quantity * mult;

      // Trailing stop update
      if (pos.trailing_stop_pips && pos.trailing_stop_pips > 0) {
        const pip = symbol.includes('JPY') ? 0.01 : symbol === 'XAUUSD' ? 0.01 : symbol === 'BTCUSD' ? 1 : 0.0001;
        const trailDist = pos.trailing_stop_pips * pip;
        if (pos.side === 'buy') {
          const newStop = bar.high - trailDist;
          if (!pos.trailing_stop_price || newStop > pos.trailing_stop_price) {
            pos.trailing_stop_price = newStop;
            this.addEvent('trailing_stop_updated', `Trailing stop → ${newStop.toFixed(5)} for ${symbol}`);
          }
        } else {
          const newStop = bar.low + trailDist;
          if (!pos.trailing_stop_price || newStop < pos.trailing_stop_price) {
            pos.trailing_stop_price = newStop;
            this.addEvent('trailing_stop_updated', `Trailing stop → ${newStop.toFixed(5)} for ${symbol}`);
          }
        }
      }

      // Check SL
      const effectiveSL = pos.trailing_stop_price ?? pos.stop_loss;
      if (effectiveSL) {
        if ((pos.side === 'buy' && bar.low <= effectiveSL) ||
            (pos.side === 'sell' && bar.high >= effectiveSL)) {
          this.closePosition(pos.id, effectiveSL, 'sl_triggered');
          continue;
        }
      }

      // Check TP
      if (pos.take_profit) {
        if ((pos.side === 'buy' && bar.high >= pos.take_profit) ||
            (pos.side === 'sell' && bar.low <= pos.take_profit)) {
          this.closePosition(pos.id, pos.take_profit, 'tp_triggered');
          continue;
        }
      }
    }

    // Update account
    this.recalculateAccount();
  }

  /**
   * Close a position at given price
   */
  closePosition(positionId: string, exitPrice: number, reason?: string): void {
    const posIdx = this.state.positions.findIndex(p => p.id === positionId);
    if (posIdx === -1) return;

    const pos = this.state.positions[posIdx];
    const mult = getContractMultiplier(pos.symbol);
    const pnl = pos.side === 'buy'
      ? (exitPrice - pos.avg_entry_price) * pos.quantity * mult
      : (pos.avg_entry_price - exitPrice) * pos.quantity * mult;

    // Apply exit fill cost
    const exitFill = simulateFill({
      symbol: pos.symbol,
      side: pos.side === 'buy' ? 'sell' : 'buy',
      quantity: pos.quantity,
      requested_price: exitPrice,
      order_type: 'market',
    }, this.fillConfig, this.tickCounter + 9999);

    const fees = exitFill.commission;
    const netPnl = pnl - fees;

    this.state.balance += netPnl;
    this.state.realized_pnl += netPnl;
    this.state.total_fees += fees;
    this.state.used_margin -= pos.quantity * getMarginPerLot(pos.symbol);

    // Create closed trade record
    const closedTrade: PaperOrderEntry = {
      id: crypto.randomUUID(),
      symbol: pos.symbol,
      side: pos.side,
      type: 'market',
      quantity: pos.quantity,
      status: 'filled',
      filled_quantity: pos.quantity,
      avg_fill_price: pos.avg_entry_price,
      fees,
      slippage: exitFill.slippage_cost,
      created_at: pos.opened_at,
      filled_at: pos.opened_at,
      closed_at: Date.now(),
    };
    this.state.closed_trades.push(closedTrade);

    // Remove position
    this.state.positions.splice(posIdx, 1);

    const eventType = reason === 'sl_triggered' ? 'sl_triggered' :
                      reason === 'tp_triggered' ? 'tp_triggered' : 'position_closed';
    this.addEvent(eventType as EventLogEntry['type'],
      `${pos.symbol} ${pos.side} closed @ ${exitPrice.toFixed(5)}, PnL: ${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(2)}`,
      { position_id: pos.id, pnl: netPnl }
    );

    this.recalculateAccount();
  }

  /**
   * Cancel a working order
   */
  cancelOrder(orderId: string): void {
    const order = this.state.orders.find(o => o.id === orderId);
    if (order && order.status === 'working') {
      order.status = 'canceled';
      this.addEvent('order_canceled', `Order canceled: ${order.symbol} ${order.side}`, { order_id: orderId });
    }
  }

  /**
   * Reset engine to initial state
   */
  reset(initialBalance: number): void {
    this.state = {
      balance: initialBalance,
      equity: initialBalance,
      used_margin: 0,
      free_margin: initialBalance,
      unrealized_pnl: 0,
      realized_pnl: 0,
      total_fees: 0,
      positions: [],
      orders: [],
      closed_trades: [],
      event_log: [],
    };
    this.tickCounter = 0;
  }

  // ─── Private ─────────────────────────────────────────

  private fillOrder(order: PaperOrderEntry, currentPrice: number): PaperOrderEntry {
    const fill = simulateFill({
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      requested_price: currentPrice,
      order_type: order.type,
    }, this.fillConfig, this.tickCounter);

    if (!fill.filled) {
      order.status = 'rejected';
      order.reject_reason = fill.reject_reason;
      order.fill_result = fill;
      this.addEvent('order_rejected', `Order rejected: ${fill.reject_reason}`, { order_id: order.id });
      return order;
    }

    order.status = 'filled';
    order.filled_quantity = order.quantity;
    order.avg_fill_price = fill.fill_price;
    order.fees = fill.commission;
    order.slippage = fill.slippage_cost;
    order.fill_result = fill;
    order.filled_at = Date.now();

    // Deduct fees
    this.state.balance -= fill.commission;
    this.state.total_fees += fill.commission;

    // Create position
    const position: PaperPositionEntry = {
      id: crypto.randomUUID(),
      order_id: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      avg_entry_price: fill.fill_price,
      current_price: fill.fill_price,
      unrealized_pnl: 0,
      realized_pnl: 0,
      stop_loss: order.stop_loss,
      take_profit: order.take_profit,
      trailing_stop_pips: order.trailing_stop_pips,
      opened_at: Date.now(),
    };

    this.state.positions.push(position);
    this.state.used_margin += order.quantity * getMarginPerLot(order.symbol);

    // Update order in list
    const existingIdx = this.state.orders.findIndex(o => o.id === order.id);
    if (existingIdx >= 0) {
      this.state.orders[existingIdx] = order;
    } else {
      this.state.orders.push(order);
    }

    this.addEvent('order_filled',
      `${order.side.toUpperCase()} ${order.quantity} ${order.symbol} filled @ ${fill.fill_price} (spread: ${fill.details.raw_spread_pips}p, slip: ${fill.details.applied_slippage_pips}p, fee: $${fill.commission})`,
      { order_id: order.id, fill }
    );
    this.addEvent('position_opened',
      `Position opened: ${order.side} ${order.quantity} ${order.symbol} @ ${fill.fill_price}`,
      { position_id: position.id }
    );

    this.recalculateAccount();
    return order;
  }

  private shouldFillPendingOrder(order: PaperOrderEntry, bar: OHLCV): boolean {
    if (!order.price) return false;
    if (order.type === 'limit') {
      if (order.side === 'buy' && bar.low <= order.price) return true;
      if (order.side === 'sell' && bar.high >= order.price) return true;
    }
    if (order.type === 'stop') {
      if (order.side === 'buy' && bar.high >= order.price) return true;
      if (order.side === 'sell' && bar.low <= order.price) return true;
    }
    return false;
  }

  private recalculateAccount(): void {
    const unrealizedPnl = this.state.positions.reduce((sum, p) => sum + p.unrealized_pnl, 0);
    this.state.unrealized_pnl = unrealizedPnl;
    this.state.equity = this.state.balance + unrealizedPnl;
    this.state.free_margin = this.state.equity - this.state.used_margin;
  }

  private addEvent(type: EventLogEntry['type'], message: string, data?: Record<string, unknown>): void {
    this.state.event_log.push({ ts: Date.now(), type, message, data });
    // Keep last 500 events
    if (this.state.event_log.length > 500) {
      this.state.event_log = this.state.event_log.slice(-500);
    }
  }
}
