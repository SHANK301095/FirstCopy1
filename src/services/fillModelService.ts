/**
 * Fill Model Service — Production-grade paper trading fill simulation
 * Supports optimistic, realistic, and conservative fill models
 * Applies spread, slippage, commissions, and session constraints
 */

import type { SymbolMetadata } from '@/types/quant';

export type FillMode = 'optimistic' | 'realistic' | 'conservative';
export type OrderSide = 'buy' | 'sell';

export interface FillModelConfig {
  mode: FillMode;
  custom_spread_pips?: number;     // override spread
  custom_slippage_pips?: number;   // override slippage
  commission_per_lot?: number;      // override commission
}

export interface FillRequest {
  symbol: string;
  side: OrderSide;
  quantity: number;         // lots
  requested_price: number;  // mid or limit price
  order_type: 'market' | 'limit' | 'stop';
  symbol_meta?: SymbolMetadata;
}

export interface FillResult {
  filled: boolean;
  fill_price: number;
  spread_cost: number;
  slippage_cost: number;
  commission: number;
  total_cost: number;
  reject_reason?: string;
  details: {
    raw_spread_pips: number;
    applied_slippage_pips: number;
    fill_mode: FillMode;
  };
}

// Default fill parameters by mode
const FILL_PARAMS: Record<FillMode, {
  spread_multiplier: number;
  slippage_range: [number, number]; // pips [min, max]
  commission_per_lot: number;       // USD per standard lot
  reject_probability: number;       // chance of order rejection
  partial_fill_chance: number;      // chance of partial fill
}> = {
  optimistic: {
    spread_multiplier: 0.8,
    slippage_range: [0, 0.2],
    commission_per_lot: 3.5,
    reject_probability: 0,
    partial_fill_chance: 0,
  },
  realistic: {
    spread_multiplier: 1.0,
    slippage_range: [0.1, 0.8],
    commission_per_lot: 7.0,
    reject_probability: 0.02,
    partial_fill_chance: 0.05,
  },
  conservative: {
    spread_multiplier: 1.5,
    slippage_range: [0.5, 2.0],
    commission_per_lot: 10.0,
    reject_probability: 0.05,
    partial_fill_chance: 0.1,
  },
};

// Default spreads in pips for common symbols
const DEFAULT_SPREADS: Record<string, number> = {
  EURUSD: 1.2, GBPUSD: 1.5, USDJPY: 1.3, AUDUSD: 1.4, USDCAD: 1.6,
  NZDUSD: 1.8, EURGBP: 1.5, EURJPY: 1.8,
  XAUUSD: 30, XAGUSD: 25,
  BTCUSD: 50, ETHUSD: 3,
  US30: 2.5, US500: 0.5, NAS100: 1.5, UK100: 1.5, GER40: 1.5,
};

function getSpreadPips(symbol: string, meta?: SymbolMetadata): number {
  return DEFAULT_SPREADS[symbol] ?? 2.0;
}

function pipValue(symbol: string, meta?: SymbolMetadata): number {
  if (meta) return meta.tick_size;
  if (symbol.includes('JPY')) return 0.01;
  if (symbol === 'XAUUSD') return 0.01;
  if (symbol === 'BTCUSD') return 1;
  if (['US30', 'US500', 'NAS100', 'UK100', 'GER40'].includes(symbol)) return 0.01;
  return 0.0001;
}

function contractMultiplier(symbol: string, meta?: SymbolMetadata): number {
  if (meta) return meta.contract_multiplier;
  if (['US30', 'US500', 'NAS100', 'UK100', 'GER40'].includes(symbol)) return 1;
  if (symbol === 'XAUUSD') return 100;
  if (symbol === 'BTCUSD') return 1;
  return 100000; // standard forex lot
}

/**
 * Compute a deterministic-ish fill based on seed to allow reproducibility
 */
function deterministicRandom(seed: number): number {
  const x = Math.sin(seed * 12345.6789 + 0.1) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Simulate fill for an order
 */
export function simulateFill(
  request: FillRequest,
  config: FillModelConfig,
  seed?: number
): FillResult {
  const params = FILL_PARAMS[config.mode];
  const rng = seed !== undefined ? deterministicRandom(seed) : Math.random();
  const rng2 = seed !== undefined ? deterministicRandom(seed + 1) : Math.random();

  // Check rejection
  if (rng < params.reject_probability) {
    return {
      filled: false,
      fill_price: 0,
      spread_cost: 0,
      slippage_cost: 0,
      commission: 0,
      total_cost: 0,
      reject_reason: 'Order rejected by fill model (simulated market rejection)',
      details: { raw_spread_pips: 0, applied_slippage_pips: 0, fill_mode: config.mode },
    };
  }

  const pip = pipValue(request.symbol, request.symbol_meta);
  const multiplier = contractMultiplier(request.symbol, request.symbol_meta);

  // Spread
  const rawSpread = config.custom_spread_pips ?? getSpreadPips(request.symbol, request.symbol_meta);
  const adjustedSpread = rawSpread * params.spread_multiplier;
  const halfSpread = (adjustedSpread / 2) * pip;

  // Slippage (always adverse)
  const slippageRange = params.slippage_range;
  const slippagePips = config.custom_slippage_pips ??
    (slippageRange[0] + rng2 * (slippageRange[1] - slippageRange[0]));
  const slippageAmount = slippagePips * pip;

  // Fill price
  let fillPrice: number;
  if (request.side === 'buy') {
    fillPrice = request.requested_price + halfSpread + slippageAmount;
  } else {
    fillPrice = request.requested_price - halfSpread - slippageAmount;
  }

  // Round to price precision
  const precision = request.symbol_meta?.price_precision ?? (
    request.symbol.includes('JPY') ? 3 :
    request.symbol === 'XAUUSD' ? 2 :
    request.symbol === 'BTCUSD' ? 2 : 5
  );
  fillPrice = +fillPrice.toFixed(precision);

  // Costs
  const notional = request.quantity * multiplier;
  const spreadCost = adjustedSpread * pip * notional;
  const slippageCost = slippagePips * pip * notional;
  const commission = config.commission_per_lot ?? params.commission_per_lot;
  const totalCommission = commission * request.quantity;
  const totalCost = spreadCost + slippageCost + totalCommission;

  return {
    filled: true,
    fill_price: fillPrice,
    spread_cost: +spreadCost.toFixed(2),
    slippage_cost: +slippageCost.toFixed(2),
    commission: +totalCommission.toFixed(2),
    total_cost: +totalCost.toFixed(2),
    details: {
      raw_spread_pips: rawSpread,
      applied_slippage_pips: +slippagePips.toFixed(2),
      fill_mode: config.mode,
    },
  };
}

/**
 * Check if market is within session hours
 */
export function isMarketOpen(
  symbol: string,
  timestamp: Date,
  meta?: SymbolMetadata
): boolean {
  if (!meta?.session_open || !meta?.session_close) return true; // assume open
  const [oh, om] = meta.session_open.split(':').map(Number);
  const [ch, cm] = meta.session_close.split(':').map(Number);
  const hours = timestamp.getUTCHours();
  const mins = timestamp.getUTCMinutes();
  const current = hours * 60 + mins;
  const open = oh * 60 + om;
  const close = ch * 60 + cm;
  if (open < close) return current >= open && current < close;
  return current >= open || current < close; // overnight session
}
