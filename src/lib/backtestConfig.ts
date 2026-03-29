/**
 * Advanced Backtest Configuration
 * Phase A1-20: Multi-timeframe, tick simulation, commission templates, session times
 */

export interface SessionTime {
  startHour: number;
  endHour: number;
}

export interface SessionPreset {
  id: string;
  name: string;
  timezone: string;
  sessions: SessionTime[];
}

export const SESSION_PRESETS: SessionPreset[] = [
  { id: 'all_day', name: '24/7 Trading', timezone: 'UTC', sessions: [] },
  { id: 'asian', name: 'Asian Session', timezone: 'Asia/Tokyo', sessions: [{ startHour: 0, endHour: 9 }] },
  { id: 'london', name: 'London Session', timezone: 'Europe/London', sessions: [{ startHour: 8, endHour: 16 }] },
  { id: 'newyork', name: 'New York Session', timezone: 'America/New_York', sessions: [{ startHour: 9, endHour: 17 }] },
  { id: 'sydney', name: 'Sydney Session', timezone: 'Australia/Sydney', sessions: [{ startHour: 21, endHour: 6 }] },
  { id: 'india', name: 'India (NSE/BSE)', timezone: 'Asia/Kolkata', sessions: [{ startHour: 9, endHour: 15 }] },
  { id: 'london_ny', name: 'London + NY Overlap', timezone: 'Europe/London', sessions: [{ startHour: 8, endHour: 12 }, { startHour: 13, endHour: 17 }] },
];

export interface CommissionTemplate {
  id: string;
  name: string;
  type: 'per-lot' | 'per-trade' | 'percent' | 'tiered';
  value: number;
  tiers?: { minLots: number; rate: number }[];
}

export const COMMISSION_TEMPLATES: CommissionTemplate[] = [
  { id: 'zerodha', name: 'Zerodha (India)', type: 'per-trade', value: 20 },
  { id: 'interactive', name: 'Interactive Brokers', type: 'per-lot', value: 0.005 },
  { id: 'forex-standard', name: 'Forex Standard', type: 'per-lot', value: 7 },
  { id: 'percent-small', name: '0.01% Per Trade', type: 'percent', value: 0.01 },
  { id: 'percent-standard', name: '0.05% Per Trade', type: 'percent', value: 0.05 },
  { 
    id: 'tiered-volume', 
    name: 'Volume Tiered', 
    type: 'tiered', 
    value: 0,
    tiers: [
      { minLots: 0, rate: 0.05 },
      { minLots: 100, rate: 0.03 },
      { minLots: 500, rate: 0.02 },
      { minLots: 1000, rate: 0.01 },
    ]
  },
];

export interface SlippageProfile {
  id: string;
  name: string;
  baseTicks: number;
  volatilityMultiplier: number;
  description: string;
}

export const SLIPPAGE_PROFILES: SlippageProfile[] = [
  { id: 'none', name: 'No Slippage', baseTicks: 0, volatilityMultiplier: 0, description: 'Ideal execution' },
  { id: 'low', name: 'Low (ECN)', baseTicks: 0.5, volatilityMultiplier: 0.1, description: 'ECN/Direct market' },
  { id: 'medium', name: 'Medium (Retail)', baseTicks: 2, volatilityMultiplier: 0.3, description: 'Standard retail broker' },
  { id: 'high', name: 'High (Volatile)', baseTicks: 5, volatilityMultiplier: 0.5, description: 'High volatility periods' },
  { id: 'hft', name: 'HFT Realistic', baseTicks: 0.1, volatilityMultiplier: 0.05, description: 'Sub-millisecond execution' },
];

export type TimeframeCode = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H2' | 'H3' | 'H4' | 'H6' | 'D1' | 'W1' | 'MN';

export const TIMEFRAME_MINUTES: Record<TimeframeCode, number> = {
  M1: 1,
  M5: 5,
  M15: 15,
  M30: 30,
  H1: 60,
  H2: 120,
  H3: 180,
  H4: 240,
  H6: 360,
  D1: 1440,
  W1: 10080,
  MN: 43200,
};

export interface MultiTimeframeConfig {
  primary: TimeframeCode;
  secondary?: TimeframeCode;
  tertiary?: TimeframeCode;
  syncMode: 'close' | 'open' | 'high' | 'low';
}

export interface AdvancedBacktestConfig {
  // Capital & Risk
  initialCapital: number;
  baseCurrency: string;
  riskPerTrade: number;
  maxConcurrentTrades: number;
  maxTradesPerDay: number;
  dailyLossCap: number;
  
  // Costs
  commissionTemplate: string;
  customCommission?: number;
  slippageProfile: string;
  spreadPoints: number;
  swapLong: number;
  swapShort: number;
  
  // Session
  sessionFilter: boolean;
  sessionPreset: string;
  customSessionStart?: string;
  customSessionEnd?: string;
  
  // Multi-timeframe
  multiTimeframe: MultiTimeframeConfig;
  
  // Simulation
  tickSimulation: boolean;
  barMagnification: boolean;
  partialFills: boolean;
  orderQueuePosition: boolean;
  gapHandling: 'skip' | 'slippage' | 'close';
  
  // Advanced
  warmupPeriod: number;
  marginCallLevel: number;
  stopOutLevel: number;
  correlationAwareSizing: boolean;
}

export function getDefaultAdvancedConfig(): AdvancedBacktestConfig {
  return {
    initialCapital: 100000,
    baseCurrency: 'INR',
    riskPerTrade: 1,
    maxConcurrentTrades: 5,
    maxTradesPerDay: 10,
    dailyLossCap: 3,
    
    commissionTemplate: 'zerodha',
    slippageProfile: 'medium',
    spreadPoints: 2,
    swapLong: 0,
    swapShort: 0,
    
    sessionFilter: false,
    sessionPreset: 'india',
    
    multiTimeframe: {
      primary: 'H1',
      syncMode: 'close',
    },
    
    tickSimulation: false,
    barMagnification: false,
    partialFills: false,
    orderQueuePosition: false,
    gapHandling: 'slippage',
    
    warmupPeriod: 50,
    marginCallLevel: 100,
    stopOutLevel: 50,
    correlationAwareSizing: false,
  };
}

export function calculateCommission(
  template: CommissionTemplate,
  tradeValue: number,
  lots: number
): number {
  switch (template.type) {
    case 'per-lot':
      return template.value * lots;
    case 'per-trade':
      return template.value;
    case 'percent':
      return tradeValue * (template.value / 100);
    case 'tiered':
      if (!template.tiers) return 0;
      const tier = [...template.tiers]
        .reverse()
        .find(t => lots >= t.minLots);
      return tier ? tradeValue * (tier.rate / 100) : 0;
    default:
      return 0;
  }
}

export function calculateSlippage(
  profile: SlippageProfile,
  volatilityPercent: number
): number {
  return profile.baseTicks + (profile.volatilityMultiplier * volatilityPercent);
}
