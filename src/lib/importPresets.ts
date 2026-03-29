/**
 * Import Presets for Common Broker Formats
 * Saves and manages column mapping configurations
 */

export interface ColumnMapping {
  sourceColumn: string;
  targetField: 'timestamp' | 'open' | 'high' | 'low' | 'close' | 'volume' | 'symbol' | 'none';
  transform?: 'none' | 'parseDate' | 'parseNumber' | 'trim';
}

export interface ImportPreset {
  id: string;
  name: string;
  description: string;
  broker?: string;
  mappings: ColumnMapping[];
  timestampFormat?: string;
  timezone?: string;
  skipRows?: number;
  delimiter?: ',' | ';' | '\t' | '|';
  dateFormat?: string;
  isBuiltIn?: boolean;
  createdAt: number;
  updatedAt: number;
}

// Built-in presets for common formats
export const BUILT_IN_PRESETS: ImportPreset[] = [
  {
    id: 'generic-ohlcv',
    name: 'Generic OHLCV',
    description: 'Standard OHLCV format with timestamp, open, high, low, close, volume columns',
    mappings: [
      { sourceColumn: 'time', targetField: 'timestamp', transform: 'parseDate' },
      { sourceColumn: 'timestamp', targetField: 'timestamp', transform: 'parseDate' },
      { sourceColumn: 'date', targetField: 'timestamp', transform: 'parseDate' },
      { sourceColumn: 'open', targetField: 'open', transform: 'parseNumber' },
      { sourceColumn: 'high', targetField: 'high', transform: 'parseNumber' },
      { sourceColumn: 'low', targetField: 'low', transform: 'parseNumber' },
      { sourceColumn: 'close', targetField: 'close', transform: 'parseNumber' },
      { sourceColumn: 'volume', targetField: 'volume', transform: 'parseNumber' },
      { sourceColumn: 'vol', targetField: 'volume', transform: 'parseNumber' },
    ],
    delimiter: ',',
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'mt5-csv',
    name: 'MetaTrader 5',
    description: 'MT5 history export format',
    broker: 'MetaTrader 5',
    mappings: [
      { sourceColumn: '<DATE>', targetField: 'timestamp', transform: 'parseDate' },
      { sourceColumn: '<TIME>', targetField: 'timestamp', transform: 'parseDate' },
      { sourceColumn: '<OPEN>', targetField: 'open', transform: 'parseNumber' },
      { sourceColumn: '<HIGH>', targetField: 'high', transform: 'parseNumber' },
      { sourceColumn: '<LOW>', targetField: 'low', transform: 'parseNumber' },
      { sourceColumn: '<CLOSE>', targetField: 'close', transform: 'parseNumber' },
      { sourceColumn: '<TICKVOL>', targetField: 'volume', transform: 'parseNumber' },
      { sourceColumn: '<VOL>', targetField: 'volume', transform: 'parseNumber' },
    ],
    dateFormat: 'YYYY.MM.DD HH:mm:ss',
    delimiter: '\t',
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'tradingview-csv',
    name: 'TradingView',
    description: 'TradingView chart export format',
    broker: 'TradingView',
    mappings: [
      { sourceColumn: 'time', targetField: 'timestamp', transform: 'parseDate' },
      { sourceColumn: 'open', targetField: 'open', transform: 'parseNumber' },
      { sourceColumn: 'high', targetField: 'high', transform: 'parseNumber' },
      { sourceColumn: 'low', targetField: 'low', transform: 'parseNumber' },
      { sourceColumn: 'close', targetField: 'close', transform: 'parseNumber' },
      { sourceColumn: 'Volume', targetField: 'volume', transform: 'parseNumber' },
    ],
    delimiter: ',',
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'zerodha-csv',
    name: 'Zerodha Kite',
    description: 'Zerodha Kite historical data format',
    broker: 'Zerodha',
    mappings: [
      { sourceColumn: 'date', targetField: 'timestamp', transform: 'parseDate' },
      { sourceColumn: 'open', targetField: 'open', transform: 'parseNumber' },
      { sourceColumn: 'high', targetField: 'high', transform: 'parseNumber' },
      { sourceColumn: 'low', targetField: 'low', transform: 'parseNumber' },
      { sourceColumn: 'close', targetField: 'close', transform: 'parseNumber' },
      { sourceColumn: 'volume', targetField: 'volume', transform: 'parseNumber' },
    ],
    timezone: 'Asia/Kolkata',
    delimiter: ',',
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'binance-csv',
    name: 'Binance',
    description: 'Binance exchange kline data format',
    broker: 'Binance',
    mappings: [
      { sourceColumn: 'Open time', targetField: 'timestamp', transform: 'parseNumber' },
      { sourceColumn: 'open_time', targetField: 'timestamp', transform: 'parseNumber' },
      { sourceColumn: 'Open', targetField: 'open', transform: 'parseNumber' },
      { sourceColumn: 'High', targetField: 'high', transform: 'parseNumber' },
      { sourceColumn: 'Low', targetField: 'low', transform: 'parseNumber' },
      { sourceColumn: 'Close', targetField: 'close', transform: 'parseNumber' },
      { sourceColumn: 'Volume', targetField: 'volume', transform: 'parseNumber' },
    ],
    delimiter: ',',
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
  },
];

const STORAGE_KEY = 'mmc_import_presets';

// Get all presets (built-in + custom)
export function getAllPresets(): ImportPreset[] {
  const customPresets = getCustomPresets();
  return [...BUILT_IN_PRESETS, ...customPresets];
}

// Get custom presets only
export function getCustomPresets(): ImportPreset[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save a custom preset
export function savePreset(preset: Omit<ImportPreset, 'id' | 'createdAt' | 'updatedAt'>): ImportPreset {
  const customPresets = getCustomPresets();
  const newPreset: ImportPreset = {
    ...preset,
    id: `custom-${Date.now()}`,
    isBuiltIn: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  customPresets.push(newPreset);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets));
  return newPreset;
}

// Update a custom preset
export function updatePreset(id: string, updates: Partial<ImportPreset>): boolean {
  const customPresets = getCustomPresets();
  const idx = customPresets.findIndex(p => p.id === id);
  if (idx === -1) return false;
  
  customPresets[idx] = { ...customPresets[idx], ...updates, updatedAt: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets));
  return true;
}

// Delete a custom preset
export function deletePreset(id: string): boolean {
  const customPresets = getCustomPresets();
  const filtered = customPresets.filter(p => p.id !== id);
  if (filtered.length === customPresets.length) return false;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

// Get a preset by ID
export function getPresetById(id: string): ImportPreset | undefined {
  return getAllPresets().find(p => p.id === id);
}

// Auto-detect preset from columns
export function detectPreset(columns: string[]): ImportPreset | undefined {
  const lowerColumns = columns.map(c => c.toLowerCase().trim());
  
  // Score each preset
  let bestMatch: ImportPreset | undefined;
  let bestScore = 0;
  
  for (const preset of getAllPresets()) {
    let score = 0;
    for (const mapping of preset.mappings) {
      if (lowerColumns.includes(mapping.sourceColumn.toLowerCase())) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = preset;
    }
  }
  
  // Require at least 4 matches for confidence
  return bestScore >= 4 ? bestMatch : undefined;
}
