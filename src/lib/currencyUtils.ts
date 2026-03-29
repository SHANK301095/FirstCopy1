/**
 * Multi-currency Accounting Utilities
 * Supports FX conversion, multi-currency portfolios, and P&L calculations
 */

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'INR' | 'AUD' | 'CAD' | 'CHF' | 'CNY' | 'HKD';

export interface ExchangeRate {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  timestamp: Date;
}

export interface CurrencyAmount {
  value: number;
  currency: CurrencyCode;
}

export interface MultiCurrencyPosition {
  id: string;
  name: string;
  baseCurrency: CurrencyCode;
  value: number;
  pnl: number;
  pnlPercent: number;
}

export interface ConvertedPosition extends MultiCurrencyPosition {
  convertedValue: number;
  convertedPnl: number;
  targetCurrency: CurrencyCode;
  fxRate: number;
  fxImpact: number; // P&L from FX movement
}

// Default exchange rates (vs USD) - in production, these would come from an API
const DEFAULT_RATES: Record<CurrencyCode, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 154.50,
  INR: 83.25,
  AUD: 1.53,
  CAD: 1.36,
  CHF: 0.88,
  CNY: 7.24,
  HKD: 7.82,
};

// Currency symbols for display
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'Fr',
  CNY: '¥',
  HKD: 'HK$',
};

// Currency display names
export const CURRENCY_NAMES: Record<CurrencyCode, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  INR: 'Indian Rupee',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
  CHF: 'Swiss Franc',
  CNY: 'Chinese Yuan',
  HKD: 'Hong Kong Dollar',
};

// All supported currencies
export const SUPPORTED_CURRENCIES: CurrencyCode[] = Object.keys(DEFAULT_RATES) as CurrencyCode[];

/**
 * Get exchange rate between two currencies
 */
export function getExchangeRate(from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return 1.0;
  
  // Convert via USD as base
  const fromToUsd = 1 / DEFAULT_RATES[from];
  const usdToTarget = DEFAULT_RATES[to];
  
  return fromToUsd * usdToTarget;
}

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): number {
  const rate = getExchangeRate(from, to);
  return amount * rate;
}

/**
 * Format currency amount for display
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode,
  options?: {
    compact?: boolean;
    decimals?: number;
    showSymbol?: boolean;
    showCode?: boolean;
  }
): string {
  const { compact = false, decimals = 2, showSymbol = true, showCode = false } = options || {};
  
  let displayValue: string;
  let suffix = '';
  
  if (compact && Math.abs(amount) >= 1000000) {
    displayValue = (amount / 1000000).toFixed(1);
    suffix = 'M';
  } else if (compact && Math.abs(amount) >= 1000) {
    displayValue = (amount / 1000).toFixed(1);
    suffix = 'K';
  } else {
    displayValue = amount.toFixed(decimals);
  }
  
  // Add thousand separators
  const parts = displayValue.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  displayValue = parts.join('.');
  
  const symbol = showSymbol ? CURRENCY_SYMBOLS[currency] : '';
  const code = showCode ? ` ${currency}` : '';
  
  return `${symbol}${displayValue}${suffix}${code}`;
}

/**
 * Calculate FX impact on P&L
 * Compares P&L at current rate vs historical rate
 */
export function calculateFxImpact(
  pnlInBase: number,
  baseCurrency: CurrencyCode,
  targetCurrency: CurrencyCode,
  currentRate: number,
  historicalRate: number
): number {
  if (baseCurrency === targetCurrency) return 0;
  
  const pnlAtHistorical = pnlInBase * historicalRate;
  const pnlAtCurrent = pnlInBase * currentRate;
  
  return pnlAtCurrent - pnlAtHistorical;
}

/**
 * Convert multiple positions to a target currency
 */
export function convertPositions(
  positions: MultiCurrencyPosition[],
  targetCurrency: CurrencyCode
): ConvertedPosition[] {
  return positions.map(pos => {
    const rate = getExchangeRate(pos.baseCurrency, targetCurrency);
    const convertedValue = pos.value * rate;
    const convertedPnl = pos.pnl * rate;
    
    // Simulate historical rate for FX impact calculation
    const historicalRate = rate * (1 + (Math.random() - 0.5) * 0.02); // ±1% variance
    const fxImpact = calculateFxImpact(pos.pnl, pos.baseCurrency, targetCurrency, rate, historicalRate);
    
    return {
      ...pos,
      convertedValue,
      convertedPnl,
      targetCurrency,
      fxRate: rate,
      fxImpact,
    };
  });
}

/**
 * Calculate aggregated portfolio value in target currency
 */
export function calculatePortfolioValue(
  positions: MultiCurrencyPosition[],
  targetCurrency: CurrencyCode
): {
  totalValue: number;
  totalPnl: number;
  totalFxImpact: number;
  bySourceCurrency: Record<CurrencyCode, { value: number; pnl: number; weight: number }>;
} {
  const converted = convertPositions(positions, targetCurrency);
  
  const totalValue = converted.reduce((sum, p) => sum + p.convertedValue, 0);
  const totalPnl = converted.reduce((sum, p) => sum + p.convertedPnl, 0);
  const totalFxImpact = converted.reduce((sum, p) => sum + p.fxImpact, 0);
  
  // Group by source currency
  const bySourceCurrency: Record<string, { value: number; pnl: number; weight: number }> = {};
  
  for (const pos of converted) {
    const key = pos.baseCurrency;
    if (!bySourceCurrency[key]) {
      bySourceCurrency[key] = { value: 0, pnl: 0, weight: 0 };
    }
    bySourceCurrency[key].value += pos.convertedValue;
    bySourceCurrency[key].pnl += pos.convertedPnl;
  }
  
  // Calculate weights
  for (const key of Object.keys(bySourceCurrency)) {
    bySourceCurrency[key].weight = totalValue > 0 
      ? (bySourceCurrency[key].value / totalValue) * 100 
      : 0;
  }
  
  return {
    totalValue,
    totalPnl,
    totalFxImpact,
    bySourceCurrency: bySourceCurrency as Record<CurrencyCode, { value: number; pnl: number; weight: number }>,
  };
}

/**
 * Generate exchange rate matrix for all currency pairs
 */
export function getExchangeRateMatrix(): Record<CurrencyCode, Record<CurrencyCode, number>> {
  const matrix: Record<string, Record<string, number>> = {};
  
  for (const from of SUPPORTED_CURRENCIES) {
    matrix[from] = {};
    for (const to of SUPPORTED_CURRENCIES) {
      matrix[from][to] = getExchangeRate(from, to);
    }
  }
  
  return matrix as Record<CurrencyCode, Record<CurrencyCode, number>>;
}

/**
 * Parse currency code from string (e.g., "EURUSD" -> { base: 'EUR', quote: 'USD' })
 */
export function parseCurrencyPair(pair: string): { base: CurrencyCode; quote: CurrencyCode } | null {
  const normalized = pair.toUpperCase().replace(/[^A-Z]/g, '');
  
  if (normalized.length === 6) {
    const base = normalized.slice(0, 3) as CurrencyCode;
    const quote = normalized.slice(3, 6) as CurrencyCode;
    
    if (SUPPORTED_CURRENCIES.includes(base) && SUPPORTED_CURRENCIES.includes(quote)) {
      return { base, quote };
    }
  }
  
  return null;
}
