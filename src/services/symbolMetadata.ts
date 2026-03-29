/**
 * Symbol Metadata Master — Centralized instrument specifications
 * Provides tick sizes, precision, session profiles, and broker mappings
 */

export interface SymbolMetadata {
  symbol: string;
  displayName: string;
  assetClass: 'forex' | 'index' | 'commodity' | 'crypto' | 'equity' | 'bond';
  exchange?: string;
  tickSize: number;
  pricePrecision: number;
  quantityPrecision: number;
  lotStep: number;
  minQuantity: number;
  maxQuantity?: number;
  contractMultiplier: number;
  quoteCurrency: string;
  baseCurrency?: string;
  marginStyle: 'percentage' | 'fixed' | 'tiered';
  defaultLeverage?: number;
  tradingTimezone: string;
  session: TradingSessionProfile;
  status: 'active' | 'suspended' | 'delisted';
}

export interface TradingSessionProfile {
  marketOpen: string;  // HH:MM in tradingTimezone
  marketClose: string;
  preMarket?: string;
  postMarket?: string;
  tradingDays: number[]; // 0=Sun, 1=Mon...6=Sat
  holidays?: string[];   // ISO date strings
  sessionGapMinutes?: number;
}

/**
 * Built-in symbol metadata registry
 * Covers common Forex, Index, Commodity, and Crypto instruments
 */
const SYMBOL_REGISTRY: Record<string, SymbolMetadata> = {
  EURUSD: {
    symbol: 'EURUSD', displayName: 'EUR/USD', assetClass: 'forex',
    tickSize: 0.00001, pricePrecision: 5, quantityPrecision: 2,
    lotStep: 0.01, minQuantity: 0.01, contractMultiplier: 100000,
    quoteCurrency: 'USD', baseCurrency: 'EUR',
    marginStyle: 'percentage', defaultLeverage: 100,
    tradingTimezone: 'America/New_York',
    session: { marketOpen: '17:00', marketClose: '17:00', tradingDays: [1, 2, 3, 4, 5] },
    status: 'active',
  },
  GBPUSD: {
    symbol: 'GBPUSD', displayName: 'GBP/USD', assetClass: 'forex',
    tickSize: 0.00001, pricePrecision: 5, quantityPrecision: 2,
    lotStep: 0.01, minQuantity: 0.01, contractMultiplier: 100000,
    quoteCurrency: 'USD', baseCurrency: 'GBP',
    marginStyle: 'percentage', defaultLeverage: 100,
    tradingTimezone: 'America/New_York',
    session: { marketOpen: '17:00', marketClose: '17:00', tradingDays: [1, 2, 3, 4, 5] },
    status: 'active',
  },
  USDJPY: {
    symbol: 'USDJPY', displayName: 'USD/JPY', assetClass: 'forex',
    tickSize: 0.001, pricePrecision: 3, quantityPrecision: 2,
    lotStep: 0.01, minQuantity: 0.01, contractMultiplier: 100000,
    quoteCurrency: 'JPY', baseCurrency: 'USD',
    marginStyle: 'percentage', defaultLeverage: 100,
    tradingTimezone: 'America/New_York',
    session: { marketOpen: '17:00', marketClose: '17:00', tradingDays: [1, 2, 3, 4, 5] },
    status: 'active',
  },
  XAUUSD: {
    symbol: 'XAUUSD', displayName: 'Gold', assetClass: 'commodity',
    tickSize: 0.01, pricePrecision: 2, quantityPrecision: 2,
    lotStep: 0.01, minQuantity: 0.01, contractMultiplier: 100,
    quoteCurrency: 'USD', baseCurrency: 'XAU',
    marginStyle: 'percentage', defaultLeverage: 50,
    tradingTimezone: 'America/New_York',
    session: { marketOpen: '18:00', marketClose: '17:00', tradingDays: [1, 2, 3, 4, 5] },
    status: 'active',
  },
  'NAS100': {
    symbol: 'NAS100', displayName: 'NASDAQ 100', assetClass: 'index',
    tickSize: 0.01, pricePrecision: 2, quantityPrecision: 2,
    lotStep: 0.01, minQuantity: 0.01, contractMultiplier: 1,
    quoteCurrency: 'USD',
    marginStyle: 'percentage', defaultLeverage: 50,
    tradingTimezone: 'America/New_York',
    session: { marketOpen: '09:30', marketClose: '16:00', preMarket: '04:00', postMarket: '20:00', tradingDays: [1, 2, 3, 4, 5] },
    status: 'active',
  },
  'US500': {
    symbol: 'US500', displayName: 'S&P 500', assetClass: 'index',
    tickSize: 0.01, pricePrecision: 2, quantityPrecision: 2,
    lotStep: 0.01, minQuantity: 0.01, contractMultiplier: 1,
    quoteCurrency: 'USD',
    marginStyle: 'percentage', defaultLeverage: 50,
    tradingTimezone: 'America/New_York',
    session: { marketOpen: '09:30', marketClose: '16:00', preMarket: '04:00', postMarket: '20:00', tradingDays: [1, 2, 3, 4, 5] },
    status: 'active',
  },
  BTCUSD: {
    symbol: 'BTCUSD', displayName: 'Bitcoin/USD', assetClass: 'crypto',
    tickSize: 0.01, pricePrecision: 2, quantityPrecision: 8,
    lotStep: 0.001, minQuantity: 0.001, contractMultiplier: 1,
    quoteCurrency: 'USD', baseCurrency: 'BTC',
    marginStyle: 'percentage', defaultLeverage: 10,
    tradingTimezone: 'UTC',
    session: { marketOpen: '00:00', marketClose: '23:59', tradingDays: [0, 1, 2, 3, 4, 5, 6] },
    status: 'active',
  },
  NIFTY50: {
    symbol: 'NIFTY50', displayName: 'Nifty 50', assetClass: 'index',
    tickSize: 0.05, pricePrecision: 2, quantityPrecision: 0,
    lotStep: 1, minQuantity: 1, contractMultiplier: 1,
    quoteCurrency: 'INR',
    marginStyle: 'percentage', defaultLeverage: 5,
    tradingTimezone: 'Asia/Kolkata',
    session: { marketOpen: '09:15', marketClose: '15:30', tradingDays: [1, 2, 3, 4, 5] },
    status: 'active',
  },
  BANKNIFTY: {
    symbol: 'BANKNIFTY', displayName: 'Bank Nifty', assetClass: 'index',
    tickSize: 0.05, pricePrecision: 2, quantityPrecision: 0,
    lotStep: 1, minQuantity: 1, contractMultiplier: 1,
    quoteCurrency: 'INR',
    marginStyle: 'percentage', defaultLeverage: 5,
    tradingTimezone: 'Asia/Kolkata',
    session: { marketOpen: '09:15', marketClose: '15:30', tradingDays: [1, 2, 3, 4, 5] },
    status: 'active',
  },
};

// Aliases
const SYMBOL_ALIASES: Record<string, string> = {
  'GOLD': 'XAUUSD',
  'NASDAQ': 'NAS100',
  'NASDAQ100': 'NAS100',
  'SP500': 'US500',
  'SPX500': 'US500',
  'BITCOIN': 'BTCUSD',
  'BTC': 'BTCUSD',
};

/**
 * Get symbol metadata by symbol name (supports aliases)
 */
export function getSymbolMetadata(symbol: string): SymbolMetadata | null {
  const normalized = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return SYMBOL_REGISTRY[normalized] || SYMBOL_REGISTRY[SYMBOL_ALIASES[normalized]] || null;
}

/**
 * Get all registered symbols
 */
export function getAllSymbols(): SymbolMetadata[] {
  return Object.values(SYMBOL_REGISTRY);
}

/**
 * Get symbols filtered by asset class
 */
export function getSymbolsByClass(assetClass: SymbolMetadata['assetClass']): SymbolMetadata[] {
  return Object.values(SYMBOL_REGISTRY).filter(s => s.assetClass === assetClass);
}

/**
 * Check if market is currently open for a symbol
 */
export function isMarketOpen(symbol: string, now?: Date): boolean {
  const meta = getSymbolMetadata(symbol);
  if (!meta) return false;

  const currentTime = now || new Date();
  const dayOfWeek = currentTime.getUTCDay();

  if (!meta.session.tradingDays.includes(dayOfWeek)) return false;

  // Simplified check — full timezone conversion would need a timezone library
  return true; // For now, return true on trading days
}

/**
 * Round price to symbol's tick size
 */
export function roundToTick(price: number, symbol: string): number {
  const meta = getSymbolMetadata(symbol);
  if (!meta) return price;
  return Math.round(price / meta.tickSize) * meta.tickSize;
}

/**
 * Round quantity to symbol's lot step
 */
export function roundToLotStep(qty: number, symbol: string): number {
  const meta = getSymbolMetadata(symbol);
  if (!meta) return qty;
  return Math.max(meta.minQuantity, Math.round(qty / meta.lotStep) * meta.lotStep);
}
