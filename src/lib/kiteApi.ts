import { supabase } from '@/integrations/supabase/client';

export interface KiteConnection {
  id: string;
  broker_type: string;
  display_name: string;
  account_id: string;
  status: string;
  last_sync_at: string;
  token_expiry: string;
  metadata: {
    user_name?: string;
    user_shortname?: string;
    email?: string;
    broker?: string;
    exchanges?: string[];
    products?: string[];
    order_types?: string[];
  };
}

export interface KiteHolding {
  tradingsymbol: string;
  exchange: string;
  isin: string;
  quantity: number;
  authorised_date: string;
  average_price: number;
  last_price: number;
  close_price: number;
  pnl: number;
  day_change: number;
  day_change_percentage: number;
  t1_quantity: number;
  used_quantity: number;
  collateral_quantity: number;
  collateral_type: string;
}

export interface KitePosition {
  tradingsymbol: string;
  exchange: string;
  instrument_token: number;
  product: string;
  quantity: number;
  overnight_quantity: number;
  multiplier: number;
  average_price: number;
  close_price: number;
  last_price: number;
  value: number;
  pnl: number;
  m2m: number;
  unrealised: number;
  realised: number;
  buy_quantity: number;
  buy_price: number;
  buy_value: number;
  buy_m2m: number;
  sell_quantity: number;
  sell_price: number;
  sell_value: number;
  sell_m2m: number;
  day_buy_quantity: number;
  day_buy_price: number;
  day_buy_value: number;
  day_sell_quantity: number;
  day_sell_price: number;
  day_sell_value: number;
}

export interface KiteOrder {
  order_id: string;
  parent_order_id: string | null;
  exchange_order_id: string | null;
  placed_by: string;
  variety: string;
  status: string;
  tradingsymbol: string;
  exchange: string;
  instrument_token: number;
  transaction_type: string;
  order_type: string;
  product: string;
  validity: string;
  price: number;
  quantity: number;
  trigger_price: number;
  average_price: number;
  filled_quantity: number;
  pending_quantity: number;
  cancelled_quantity: number;
  disclosed_quantity: number;
  order_timestamp: string;
  exchange_timestamp: string | null;
  status_message: string | null;
  tag: string | null;
}

export interface KiteMargins {
  available: number;
  used: number;
  equity: {
    enabled: boolean;
    net: number;
    available: {
      adhoc_margin: number;
      cash: number;
      opening_balance: number;
      live_balance: number;
      collateral: number;
      intraday_payin: number;
    };
    utilised: {
      debits: number;
      exposure: number;
      m2m_realised: number;
      m2m_unrealised: number;
      option_premium: number;
      payout: number;
      span: number;
      holding_sales: number;
      turnover: number;
      liquid_collateral: number;
      stock_collateral: number;
    };
  };
  commodity: {
    enabled: boolean;
    net: number;
    available: {
      adhoc_margin: number;
      cash: number;
      opening_balance: number;
      live_balance: number;
      collateral: number;
      intraday_payin: number;
    };
    utilised: {
      debits: number;
      exposure: number;
      m2m_realised: number;
      m2m_unrealised: number;
      option_premium: number;
      payout: number;
      span: number;
      holding_sales: number;
      turnover: number;
      liquid_collateral: number;
      stock_collateral: number;
    };
  };
}

export interface KitePortfolioSummary {
  holdings: {
    count: number;
    value: number;
    pnl: number;
    items: KiteHolding[];
  };
  positions: {
    count: number;
    pnl: number;
    net: KitePosition[];
    day: KitePosition[];
  };
  margins: KiteMargins;
  orders: {
    count: number;
    items: KiteOrder[];
  };
  account_id: string;
}

export interface PlaceOrderParams {
  tradingsymbol: string;
  exchange: 'NSE' | 'BSE' | 'NFO' | 'BFO' | 'MCX' | 'CDS';
  transaction_type: 'BUY' | 'SELL';
  order_type: 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';
  quantity: number;
  product: 'CNC' | 'NRML' | 'MIS';
  price?: number;
  trigger_price?: number;
  validity?: 'DAY' | 'IOC' | 'TTL';
  variety?: 'regular' | 'amo' | 'co' | 'iceberg' | 'auction';
  disclosed_quantity?: number;
  tag?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function callKiteFunction(functionName: string, action: string, options?: RequestInit & { params?: Record<string, string> }) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  
  const params = new URLSearchParams({ action, ...options?.params });
  const url = `${SUPABASE_URL}/functions/v1/${functionName}?${params}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  
  return data;
}

export const kiteApi = {
  // Auth functions
  getLoginUrl: async (redirectUrl?: string): Promise<string> => {
    const result = await callKiteFunction('kite-auth', 'login-url', {
      params: redirectUrl ? { redirect_url: redirectUrl } : undefined,
    });
    return result.login_url;
  },

  handleCallback: async (requestToken: string): Promise<{ user_id: string; user_name: string }> => {
    const result = await callKiteFunction('kite-auth', 'callback', {
      params: { request_token: requestToken },
    });
    return result;
  },

  getConnectionStatus: async (): Promise<KiteConnection | null> => {
    const result = await callKiteFunction('kite-auth', 'status');
    return result.connection;
  },

  disconnect: async (): Promise<void> => {
    await callKiteFunction('kite-auth', 'disconnect');
  },

  // Portfolio functions
  getPortfolioSummary: async (): Promise<KitePortfolioSummary> => {
    return callKiteFunction('kite-portfolio', 'summary');
  },

  getHoldings: async (): Promise<KiteHolding[]> => {
    const result = await callKiteFunction('kite-portfolio', 'holdings');
    return result.holdings;
  },

  getPositions: async (): Promise<{ net: KitePosition[]; day: KitePosition[] }> => {
    return callKiteFunction('kite-portfolio', 'positions');
  },

  getOrders: async (): Promise<KiteOrder[]> => {
    const result = await callKiteFunction('kite-portfolio', 'orders');
    return result.orders;
  },

  getTrades: async (): Promise<any[]> => {
    const result = await callKiteFunction('kite-portfolio', 'trades');
    return result.trades;
  },

  getMargins: async (): Promise<KiteMargins> => {
    const result = await callKiteFunction('kite-portfolio', 'margins');
    return result.margins;
  },

  // Order functions
  placeOrder: async (params: PlaceOrderParams): Promise<{ order_id: string }> => {
    return callKiteFunction('kite-orders', 'place', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  modifyOrder: async (orderId: string, params: Partial<PlaceOrderParams> & { variety?: string }): Promise<{ order_id: string }> => {
    return callKiteFunction('kite-orders', 'modify', {
      method: 'PUT',
      body: JSON.stringify({ order_id: orderId, ...params }),
    });
  },

  cancelOrder: async (orderId: string, variety = 'regular'): Promise<{ order_id: string }> => {
    return callKiteFunction('kite-orders', 'cancel', {
      method: 'DELETE',
      params: { order_id: orderId, variety },
    });
  },

  getOrderHistory: async (orderId: string): Promise<any[]> => {
    const result = await callKiteFunction('kite-orders', 'history', {
      params: { order_id: orderId },
    });
    return result.history;
  },

  exitPosition: async (params: { tradingsymbol: string; exchange: string; quantity: number; product: string; position_type: 'long' | 'short' }): Promise<{ order_id: string }> => {
    return callKiteFunction('kite-orders', 'exit-position', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};
