/**
 * Abstract Broker Adapter — unified interface for all broker integrations.
 * Each broker (MT5, Zerodha, IBKR, Alpaca, Binance) implements this contract.
 */

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type OrderStatus = 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected' | 'expired';
export type PositionDirection = 'long' | 'short';

export interface BrokerOrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;        // for limit/stop_limit
  stopPrice?: number;    // for stop/stop_limit
  stopLoss?: number;
  takeProfit?: number;
  magic?: number;        // MT5 magic number
  comment?: string;
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'DAY';
}

export interface BrokerOrderResult {
  orderId: string;
  brokerOrderId: string;
  status: OrderStatus;
  filledQty: number;
  avgFillPrice: number | null;
  commission: number;
  timestamp: string;
  rawResponse?: unknown;
}

export interface BrokerPosition {
  symbol: string;
  direction: PositionDirection;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  swap: number;
  commission: number;
  magic?: number;
  ticket?: number;
}

export interface BrokerAccountInfo {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number | null;
  currency: string;
  leverage: number;
  openPositions: number;
  pendingOrders: number;
}

export interface BrokerHealthStatus {
  connected: boolean;
  latencyMs: number;
  lastHeartbeat: string;
  terminalVersion?: string;
  serverName?: string;
}

/**
 * Abstract broker adapter — all broker integrations implement this interface.
 */
export interface IBrokerAdapter {
  readonly brokerType: string;
  readonly connectionId: string;

  // Connection lifecycle
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<BrokerHealthStatus>;

  // Account data
  getAccountInfo(): Promise<BrokerAccountInfo>;
  getPositions(): Promise<BrokerPosition[]>;

  // Order execution
  placeOrder(order: BrokerOrderRequest): Promise<BrokerOrderResult>;
  cancelOrder(orderId: string): Promise<boolean>;
  closePosition(symbol: string, quantity?: number): Promise<BrokerOrderResult>;
  closeAllPositions(): Promise<BrokerOrderResult[]>;

  // Safety
  emergencyStop(): Promise<void>;
}

/**
 * Base adapter with shared logging/error handling.
 * Concrete adapters extend this.
 */
export abstract class BaseBrokerAdapter implements IBrokerAdapter {
  abstract readonly brokerType: string;
  readonly connectionId: string;
  protected userId: string;

  constructor(connectionId: string, userId: string) {
    this.connectionId = connectionId;
    this.userId = userId;
  }

  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract healthCheck(): Promise<BrokerHealthStatus>;
  abstract getAccountInfo(): Promise<BrokerAccountInfo>;
  abstract getPositions(): Promise<BrokerPosition[]>;
  abstract placeOrder(order: BrokerOrderRequest): Promise<BrokerOrderResult>;
  abstract cancelOrder(orderId: string): Promise<boolean>;
  abstract closePosition(symbol: string, quantity?: number): Promise<BrokerOrderResult>;
  abstract closeAllPositions(): Promise<BrokerOrderResult[]>;

  async emergencyStop(): Promise<void> {
    console.warn(`[${this.brokerType}] EMERGENCY STOP triggered`);
    await this.closeAllPositions();
    await this.disconnect();
  }

  protected log(level: 'info' | 'warn' | 'error', message: string, meta?: unknown) {
    const prefix = `[BrokerAdapter:${this.brokerType}:${this.connectionId.slice(0, 8)}]`;
    if (level === 'error') console.error(prefix, message, meta);
    else if (level === 'warn') console.warn(prefix, message, meta);
    else console.log(prefix, message, meta);
  }
}
