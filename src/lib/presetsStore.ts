/**
 * Presets Store
 * Save/load presets for costs model, session settings, risk model
 */

export interface CostModelPreset {
  id: string;
  name: string;
  commission: number; // % per trade
  slippage: number;   // ticks
  spread: number;     // points
  description?: string;
}

export interface SessionPreset {
  id: string;
  name: string;
  timezone: string;
  sessionStart: string; // HH:mm
  sessionEnd: string;   // HH:mm
  excludeWeekends: boolean;
  description?: string;
}

export interface RiskModelPreset {
  id: string;
  name: string;
  mode: 'fixed' | 'risk-percent' | 'kelly' | 'fixed-fractional';
  value: number;
  maxDrawdownStop?: number;
  dailyLossCap?: number;
  maxTradesPerDay?: number;
  description?: string;
}

export interface PresetsStore {
  costModels: CostModelPreset[];
  sessions: SessionPreset[];
  riskModels: RiskModelPreset[];
  activeCostModelId?: string;
  activeSessionId?: string;
  activeRiskModelId?: string;
}

const STORAGE_KEY = 'mmc-presets';

// Default presets
const DEFAULT_COST_MODELS: CostModelPreset[] = [
  {
    id: 'default-zerodha',
    name: 'Zerodha Equity',
    commission: 0.03,
    slippage: 1,
    spread: 0,
    description: 'Standard Zerodha equity delivery charges',
  },
  {
    id: 'default-forex',
    name: 'Forex Standard',
    commission: 0,
    slippage: 1,
    spread: 2,
    description: 'Typical forex spread-based costs',
  },
  {
    id: 'default-crypto',
    name: 'Crypto Exchange',
    commission: 0.1,
    slippage: 2,
    spread: 0,
    description: 'Standard crypto exchange maker fees',
  },
];

const DEFAULT_SESSIONS: SessionPreset[] = [
  {
    id: 'default-nse',
    name: 'NSE Trading Hours',
    timezone: 'Asia/Kolkata',
    sessionStart: '09:15',
    sessionEnd: '15:30',
    excludeWeekends: true,
    description: 'National Stock Exchange India',
  },
  {
    id: 'default-forex',
    name: 'Forex London Session',
    timezone: 'Europe/London',
    sessionStart: '08:00',
    sessionEnd: '16:00',
    excludeWeekends: true,
    description: 'London trading session',
  },
  {
    id: 'default-us',
    name: 'US Market Hours',
    timezone: 'America/New_York',
    sessionStart: '09:30',
    sessionEnd: '16:00',
    excludeWeekends: true,
    description: 'NYSE/NASDAQ regular hours',
  },
];

const DEFAULT_RISK_MODELS: RiskModelPreset[] = [
  {
    id: 'default-fixed',
    name: 'Fixed Size',
    mode: 'fixed',
    value: 1,
    description: 'Fixed lot/share size per trade',
  },
  {
    id: 'default-2pct',
    name: '2% Risk Per Trade',
    mode: 'risk-percent',
    value: 2,
    maxDrawdownStop: 20,
    description: 'Risk 2% of account per trade',
  },
  {
    id: 'default-conservative',
    name: 'Conservative',
    mode: 'risk-percent',
    value: 1,
    maxDrawdownStop: 10,
    dailyLossCap: 3,
    maxTradesPerDay: 5,
    description: 'Low risk with strict limits',
  },
];

// Get presets from storage
export function getPresets(): PresetsStore {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  
  return {
    costModels: DEFAULT_COST_MODELS,
    sessions: DEFAULT_SESSIONS,
    riskModels: DEFAULT_RISK_MODELS,
  };
}

// Save presets to storage
export function savePresets(presets: PresetsStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

// Cost Model CRUD
export function addCostModelPreset(preset: Omit<CostModelPreset, 'id'>): CostModelPreset {
  const presets = getPresets();
  const newPreset: CostModelPreset = {
    ...preset,
    id: `cost-${Date.now()}`,
  };
  presets.costModels.push(newPreset);
  savePresets(presets);
  return newPreset;
}

export function updateCostModelPreset(id: string, updates: Partial<CostModelPreset>): void {
  const presets = getPresets();
  const idx = presets.costModels.findIndex(p => p.id === id);
  if (idx !== -1) {
    presets.costModels[idx] = { ...presets.costModels[idx], ...updates };
    savePresets(presets);
  }
}

export function deleteCostModelPreset(id: string): void {
  const presets = getPresets();
  presets.costModels = presets.costModels.filter(p => p.id !== id);
  if (presets.activeCostModelId === id) {
    presets.activeCostModelId = undefined;
  }
  savePresets(presets);
}

// Session CRUD
export function addSessionPreset(preset: Omit<SessionPreset, 'id'>): SessionPreset {
  const presets = getPresets();
  const newPreset: SessionPreset = {
    ...preset,
    id: `session-${Date.now()}`,
  };
  presets.sessions.push(newPreset);
  savePresets(presets);
  return newPreset;
}

export function updateSessionPreset(id: string, updates: Partial<SessionPreset>): void {
  const presets = getPresets();
  const idx = presets.sessions.findIndex(p => p.id === id);
  if (idx !== -1) {
    presets.sessions[idx] = { ...presets.sessions[idx], ...updates };
    savePresets(presets);
  }
}

export function deleteSessionPreset(id: string): void {
  const presets = getPresets();
  presets.sessions = presets.sessions.filter(p => p.id !== id);
  if (presets.activeSessionId === id) {
    presets.activeSessionId = undefined;
  }
  savePresets(presets);
}

// Risk Model CRUD
export function addRiskModelPreset(preset: Omit<RiskModelPreset, 'id'>): RiskModelPreset {
  const presets = getPresets();
  const newPreset: RiskModelPreset = {
    ...preset,
    id: `risk-${Date.now()}`,
  };
  presets.riskModels.push(newPreset);
  savePresets(presets);
  return newPreset;
}

export function updateRiskModelPreset(id: string, updates: Partial<RiskModelPreset>): void {
  const presets = getPresets();
  const idx = presets.riskModels.findIndex(p => p.id === id);
  if (idx !== -1) {
    presets.riskModels[idx] = { ...presets.riskModels[idx], ...updates };
    savePresets(presets);
  }
}

export function deleteRiskModelPreset(id: string): void {
  const presets = getPresets();
  presets.riskModels = presets.riskModels.filter(p => p.id !== id);
  if (presets.activeRiskModelId === id) {
    presets.activeRiskModelId = undefined;
  }
  savePresets(presets);
}

// Active preset setters
export function setActiveCostModel(id: string | undefined): void {
  const presets = getPresets();
  presets.activeCostModelId = id;
  savePresets(presets);
}

export function setActiveSession(id: string | undefined): void {
  const presets = getPresets();
  presets.activeSessionId = id;
  savePresets(presets);
}

export function setActiveRiskModel(id: string | undefined): void {
  const presets = getPresets();
  presets.activeRiskModelId = id;
  savePresets(presets);
}

// Get active presets
export function getActiveCostModel(): CostModelPreset | undefined {
  const presets = getPresets();
  if (!presets.activeCostModelId) return presets.costModels[0];
  return presets.costModels.find(p => p.id === presets.activeCostModelId);
}

export function getActiveSession(): SessionPreset | undefined {
  const presets = getPresets();
  if (!presets.activeSessionId) return presets.sessions[0];
  return presets.sessions.find(p => p.id === presets.activeSessionId);
}

export function getActiveRiskModel(): RiskModelPreset | undefined {
  const presets = getPresets();
  if (!presets.activeRiskModelId) return presets.riskModels[0];
  return presets.riskModels.find(p => p.id === presets.activeRiskModelId);
}
