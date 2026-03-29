/**
 * Phase 11: Deriv API Wrapper
 * Client-side wrapper for Deriv WebSocket API
 * Handles connection, authentication, tick streaming
 */

export interface DerivConfig {
  appId: string;
  endpoint?: string;
}

export interface DerivTickStream {
  symbol: string;
  epoch: number;
  quote: number;
  ask: number;
  bid: number;
}

type MessageHandler = (data: unknown) => void;

export class DerivAPIWrapper {
  private ws: WebSocket | null = null;
  private config: DerivConfig;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reqId = 0;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;
  private activeSubscriptions: string[] = [];
  private pendingRequests: Map<number, { resolve: (d: unknown) => void; reject: (e: Error) => void }> = new Map();

  constructor(config: DerivConfig) {
    this.config = config;
  }

  /** Connect to Deriv WebSocket */
  async connect(): Promise<void> {
    const endpoint = this.config.endpoint || 'wss://ws.binaryws.com/websockets/v3';
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${endpoint}?app_id=${this.config.appId}`);
      
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(new Error('Connection failed'));
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle pending request responses
          if (data.req_id && this.pendingRequests.has(data.req_id)) {
            const pending = this.pendingRequests.get(data.req_id)!;
            this.pendingRequests.delete(data.req_id);
            if (data.error) {
              pending.reject(new Error(data.error.message || 'API error'));
            } else {
              pending.resolve(data);
            }
          }
          
          // Handle subscriptions
          if (data.tick) {
            this.emit('tick', {
              symbol: data.tick.symbol,
              epoch: data.tick.epoch,
              quote: data.tick.quote,
              ask: data.tick.ask,
              bid: data.tick.bid,
            });
          }
          
          if (data.ohlc) {
            this.emit('ohlc', data.ohlc);
          }
        } catch {
          // Invalid JSON
        }
      };
      
      this.ws.onclose = () => {
        this.emit('close', null);
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
          this.reconnectAttempts++;
          this.reconnectTimer = setTimeout(async () => {
            try {
              await this.connect();
              this.reconnectAttempts = 0;
              for (const sym of this.activeSubscriptions) {
                await this.subscribeTicks(sym);
              }
              this.emit('reconnected', null);
            } catch {
              // onclose retry cycle will continue if reconnect fails
            }
          }, delay);
        }
      };
    });
  }

  /** Send request and wait for response */
  private send<T>(payload: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected'));
        return;
      }
      
      const reqId = ++this.reqId;
      this.pendingRequests.set(reqId, { resolve: resolve as (d: unknown) => void, reject });
      this.ws.send(JSON.stringify({ ...payload, req_id: reqId }));
      
      // Timeout
      setTimeout(() => {
        if (this.pendingRequests.has(reqId)) {
          this.pendingRequests.delete(reqId);
          reject(new Error('Request timeout'));
        }
      }, 30_000);
    });
  }

  /** Subscribe to tick stream */
  async subscribeTicks(symbol: string): Promise<void> {
    await this.send({ ticks: symbol, subscribe: 1 });
    if (!this.activeSubscriptions.includes(symbol)) {
      this.activeSubscriptions.push(symbol);
    }
  }

  /** Get tick history */
  async getTickHistory(symbol: string, count: number = 1000): Promise<unknown> {
    return this.send({
      ticks_history: symbol,
      count,
      end: 'latest',
      style: 'ticks',
    });
  }

  /** Get OHLC candles */
  async getCandles(symbol: string, granularity: number = 60, count: number = 500): Promise<unknown> {
    return this.send({
      ticks_history: symbol,
      count,
      end: 'latest',
      granularity,
      style: 'candles',
    });
  }

  /** Get available symbols */
  async getActiveSymbols(): Promise<unknown> {
    return this.send({ active_symbols: 'brief' });
  }

  /** Event handling */
  on(event: string, handler: MessageHandler): void {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
  }

  off(event: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      this.handlers.set(event, handlers.filter(h => h !== handler));
    }
  }

  private emit(event: string, data: unknown): void {
    this.handlers.get(event)?.forEach(h => h(data));
  }

  /** Disconnect */
  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.activeSubscriptions = [];
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingRequests.forEach(p => p.reject(new Error('Disconnected')));
    this.pendingRequests.clear();
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
