/**
 * Cost Model Configuration
 * Symbol-wise slippage, spread, and commission settings
 */

import { db } from '@/db/index';

export interface SymbolCostConfig {
  symbol: string;
  slippage: number; // In price points
  spread: number; // In price points
  commission: number; // As percentage
  enabled: boolean;
}

export interface CostModelSettings {
  defaultSlippage: number;
  defaultSpread: number;
  defaultCommission: number;
  symbolOverrides: SymbolCostConfig[];
  applySlippage: boolean;
  applySpread: boolean;
  applyCommission: boolean;
}

const DEFAULT_COST_MODEL: CostModelSettings = {
  defaultSlippage: 0.5,
  defaultSpread: 1.0,
  defaultCommission: 0.01,
  symbolOverrides: [],
  applySlippage: true,
  applySpread: true,
  applyCommission: true,
};

const STORAGE_KEY = 'mmc-cost-model';

/**
 * Load cost model settings from localStorage
 */
export function loadCostModelSettings(): CostModelSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_COST_MODEL, ...JSON.parse(saved) };
    }
  } catch {
    // Ignore parse errors
  }
  return { ...DEFAULT_COST_MODEL };
}

/**
 * Save cost model settings to localStorage
 */
export function saveCostModelSettings(settings: CostModelSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Get cost config for a specific symbol
 */
export function getSymbolCostConfig(
  symbol: string,
  settings: CostModelSettings
): { slippage: number; spread: number; commission: number } {
  const override = settings.symbolOverrides.find(
    o => o.symbol.toUpperCase() === symbol.toUpperCase() && o.enabled
  );
  
  return {
    slippage: settings.applySlippage ? (override?.slippage ?? settings.defaultSlippage) : 0,
    spread: settings.applySpread ? (override?.spread ?? settings.defaultSpread) : 0,
    commission: settings.applyCommission ? (override?.commission ?? settings.defaultCommission) : 0,
  };
}

/**
 * Calculate total costs for a trade
 */
export function calculateTradeCosts(
  entryPrice: number,
  exitPrice: number,
  size: number,
  symbol: string,
  settings: CostModelSettings
): {
  slippageCost: number;
  spreadCost: number;
  commissionCost: number;
  totalCost: number;
} {
  const config = getSymbolCostConfig(symbol, settings);
  
  // Slippage applied to both entry and exit
  const slippageCost = (config.slippage * 2) * size;
  
  // Spread applied to entry
  const spreadCost = config.spread * size;
  
  // Commission as percentage of trade value
  const entryValue = entryPrice * size;
  const exitValue = exitPrice * size;
  const commissionCost = (entryValue + exitValue) * (config.commission / 100);
  
  return {
    slippageCost,
    spreadCost,
    commissionCost,
    totalCost: slippageCost + spreadCost + commissionCost,
  };
}

/**
 * Get common forex symbol defaults
 */
export function getForexDefaults(): SymbolCostConfig[] {
  return [
    { symbol: 'EURUSD', slippage: 0.2, spread: 0.8, commission: 0.007, enabled: true },
    { symbol: 'GBPUSD', slippage: 0.3, spread: 1.0, commission: 0.007, enabled: true },
    { symbol: 'USDJPY', slippage: 0.2, spread: 0.9, commission: 0.007, enabled: true },
    { symbol: 'XAUUSD', slippage: 1.0, spread: 2.5, commission: 0.01, enabled: true },
    { symbol: 'BTCUSD', slippage: 5.0, spread: 10.0, commission: 0.05, enabled: true },
  ];
}

/**
 * Get common Indian stock defaults
 */
export function getIndianStockDefaults(): SymbolCostConfig[] {
  return [
    { symbol: 'NIFTY', slippage: 0.5, spread: 1.0, commission: 0.03, enabled: true },
    { symbol: 'BANKNIFTY', slippage: 1.0, spread: 2.0, commission: 0.03, enabled: true },
    { symbol: 'RELIANCE', slippage: 0.5, spread: 0.5, commission: 0.03, enabled: true },
    { symbol: 'TCS', slippage: 0.5, spread: 0.5, commission: 0.03, enabled: true },
  ];
}

/**
 * Validate cost model settings
 */
export function validateCostModelSettings(settings: CostModelSettings): string[] {
  const errors: string[] = [];
  
  if (settings.defaultSlippage < 0) {
    errors.push('Default slippage cannot be negative');
  }
  if (settings.defaultSpread < 0) {
    errors.push('Default spread cannot be negative');
  }
  if (settings.defaultCommission < 0 || settings.defaultCommission > 10) {
    errors.push('Default commission should be between 0% and 10%');
  }
  
  settings.symbolOverrides.forEach((override, i) => {
    if (!override.symbol.trim()) {
      errors.push(`Symbol ${i + 1} has empty name`);
    }
    if (override.slippage < 0) {
      errors.push(`${override.symbol}: slippage cannot be negative`);
    }
  });
  
  return errors;
}
