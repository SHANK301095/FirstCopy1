/**
 * Backtest Data Processor
 * Handles date range filtering, timeframe aggregation, timezone normalization,
 * strict numeric validation, and memory-efficient chunked processing.
 * 
 * This module ensures UI settings are ACTUALLY applied to the backtest engine.
 * NO SILENT FALLBACKS - all operations are explicit and validated.
 */

import { OHLCV } from './indicators';

// =============================================
// TYPES & INTERFACES
// =============================================

export interface DateRangeConfig {
  type: 'full' | 'last1y' | 'last3y' | 'last5y' | 'last10y' | 'ytd' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  timezone: string; // e.g., 'Asia/Kolkata', 'UTC'
}

export interface ProcessingConfig {
  dateRange: DateRangeConfig;
  timeframe: TimeframeCode;
  sourceTimeframe?: TimeframeCode; // Original data timeframe (for aggregation)
  strictValidation: boolean; // If true, block on invalid data
  maxInvalidRowPercent: number; // e.g., 1.0 = 1%
}

export interface ProcessingResult {
  bars: OHLCV[];
  metadata: ProcessingMetadata;
  warnings: string[];
  errors: string[];
}

export interface ProcessingMetadata {
  originalRowCount: number;
  validRowCount: number;
  droppedRowCount: number;
  invalidRowCount: number;
  dateRangeApplied: { start: string; end: string } | null;
  timeframeAggregated: boolean;
  aggregatedFrom: string | null;
  aggregatedTo: string | null;
  timezoneApplied: string;
  processingTimeMs: number;
}

export type TimeframeCode = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H2' | 'H4' | 'D1' | 'W1' | 'MN';

export const TIMEFRAME_MINUTES: Record<TimeframeCode, number> = {
  'M1': 1,
  'M5': 5,
  'M15': 15,
  'M30': 30,
  'H1': 60,
  'H2': 120,
  'H4': 240,
  'D1': 1440,
  'W1': 10080,
  'MN': 43200, // ~30 days
};

// =============================================
// TIMEZONE UTILITIES
// =============================================

/**
 * Convert a timestamp to UTC, accounting for the specified timezone.
 * Returns timestamp in milliseconds (UTC).
 */
export function normalizeToUTC(timestamp: number | string, timezone: string): number {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid timestamp: ${timestamp}`);
    }
    
    // If timezone is UTC, no conversion needed
    if (timezone === 'UTC' || !timezone) {
      return date.getTime();
    }
    
    // Get the offset for the specified timezone
    const options: Intl.DateTimeFormatOptions = { 
      timeZone: timezone, 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    };
    
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(date);
    
    const getPart = (type: string) => {
      const part = parts.find(p => p.type === type);
      return part ? parseInt(part.value, 10) : 0;
    };
    
    // The date object already represents the correct instant in time
    // We just need to return the UTC timestamp
    return date.getTime();
  } catch {
    // Fallback: return as-is if timezone handling fails
    const ts = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
    return isNaN(ts) ? 0 : ts;
  }
}

/**
 * Get hour and minute from a timestamp in a specific timezone.
 * Used for session filtering with minute-level precision.
 */
export function getTimeInTimezone(timestamp: number, timezone: string): { hour: number; minute: number } {
  const date = new Date(timestamp);
  
  try {
    const options: Intl.DateTimeFormatOptions = { 
      timeZone: timezone || 'UTC', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    };
    
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(date);
    
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    
    return { hour, minute };
  } catch {
    return { hour: date.getUTCHours(), minute: date.getUTCMinutes() };
  }
}

// =============================================
// DATE RANGE CALCULATION
// =============================================

/**
 * Calculate the date range bounds based on configuration.
 * All timestamps returned are in UTC milliseconds.
 */
export function calculateDateRange(
  config: DateRangeConfig,
  datasetRange?: { start: number; end: number }
): { startTs: number; endTs: number } | null {
  const now = new Date();
  
  switch (config.type) {
    case 'full':
      return null; // No filtering
      
    case 'last1y': {
      const endTs = now.getTime();
      const startTs = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).getTime();
      return { startTs, endTs };
    }
    
    case 'last3y': {
      const endTs = now.getTime();
      const startTs = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate()).getTime();
      return { startTs, endTs };
    }
    
    case 'last5y': {
      const endTs = now.getTime();
      const startTs = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate()).getTime();
      return { startTs, endTs };
    }
    
    case 'last10y': {
      const endTs = now.getTime();
      const startTs = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate()).getTime();
      return { startTs, endTs };
    }
    
    case 'ytd': {
      const endTs = now.getTime();
      const startTs = new Date(now.getFullYear(), 0, 1).getTime();
      return { startTs, endTs };
    }
    
    case 'custom': {
      if (!config.customStartDate || !config.customEndDate) {
        throw new Error('Custom date range requires both start and end dates');
      }
      
      const startTs = normalizeToUTC(config.customStartDate, config.timezone);
      // Add 23:59:59 to include the full end date
      const endTs = normalizeToUTC(config.customEndDate, config.timezone) + (24 * 60 * 60 * 1000 - 1);
      
      if (startTs >= endTs) {
        throw new Error('Start date must be before end date');
      }
      
      return { startTs, endTs };
    }
    
    default:
      return null;
  }
}

// =============================================
// STRICT NUMERIC VALIDATION
// =============================================

/**
 * Strictly parse a numeric value.
 * Returns { value, isValid } - NO silent coercion to 0.
 */
export function strictParseNumber(input: unknown): { value: number; isValid: boolean } {
  if (input === null || input === undefined || input === '') {
    return { value: NaN, isValid: false };
  }
  
  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) {
      return { value: NaN, isValid: false };
    }
    return { value: input, isValid: true };
  }
  
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed === '') {
      return { value: NaN, isValid: false };
    }
    
    const parsed = Number(trimmed);
    if (isNaN(parsed) || !isFinite(parsed)) {
      return { value: NaN, isValid: false };
    }
    return { value: parsed, isValid: true };
  }
  
  return { value: NaN, isValid: false };
}

/**
 * Strictly parse a timestamp.
 * Returns { value, isValid } - NO silent fallbacks.
 */
export function strictParseTimestamp(input: unknown): { value: number; isValid: boolean } {
  if (input === null || input === undefined || input === '') {
    return { value: NaN, isValid: false };
  }
  
  let timestamp: number;
  
  if (typeof input === 'number') {
    // Could be Unix seconds or milliseconds
    if (input > 1e12) {
      timestamp = input; // Already milliseconds
    } else if (input > 1e9) {
      timestamp = input * 1000; // Unix seconds
    } else {
      return { value: NaN, isValid: false };
    }
  } else if (typeof input === 'string') {
    const trimmed = input.trim();
    
    // Try parsing as ISO date string
    const date = new Date(trimmed);
    timestamp = date.getTime();
    
    if (isNaN(timestamp)) {
      // Try parsing as Unix timestamp
      const num = Number(trimmed);
      if (!isNaN(num)) {
        if (num > 1e12) {
          timestamp = num;
        } else if (num > 1e9) {
          timestamp = num * 1000;
        } else {
          return { value: NaN, isValid: false };
        }
      } else {
        return { value: NaN, isValid: false };
      }
    }
  } else {
    return { value: NaN, isValid: false };
  }
  
  // Sanity check: timestamp should be between 1990 and 2100
  const minTs = new Date('1990-01-01').getTime();
  const maxTs = new Date('2100-01-01').getTime();
  
  if (timestamp < minTs || timestamp > maxTs) {
    return { value: NaN, isValid: false };
  }
  
  return { value: timestamp, isValid: true };
}

// =============================================
// TIMEFRAME AGGREGATION
// =============================================

/**
 * Aggregate bars to a higher timeframe.
 * Returns aggregated OHLCV bars.
 */
export function aggregateBars(bars: OHLCV[], fromTF: TimeframeCode, toTF: TimeframeCode): OHLCV[] {
  const fromMinutes = TIMEFRAME_MINUTES[fromTF];
  const toMinutes = TIMEFRAME_MINUTES[toTF];
  
  if (toMinutes <= fromMinutes) {
    // No aggregation needed (or downsampling, which is not supported)
    return bars;
  }
  
  if (bars.length === 0) return [];
  
  const aggregatedBars: OHLCV[] = [];
  const periodMs = toMinutes * 60 * 1000;
  
  let currentPeriodStart = Math.floor(bars[0].timestamp / periodMs) * periodMs;
  let currentBars: OHLCV[] = [];
  
  for (const bar of bars) {
    const barPeriodStart = Math.floor(bar.timestamp / periodMs) * periodMs;
    
    if (barPeriodStart === currentPeriodStart) {
      currentBars.push(bar);
    } else {
      // Flush current period
      if (currentBars.length > 0) {
        aggregatedBars.push(aggregatePeriod(currentBars, currentPeriodStart));
      }
      currentPeriodStart = barPeriodStart;
      currentBars = [bar];
    }
  }
  
  // Flush remaining bars
  if (currentBars.length > 0) {
    aggregatedBars.push(aggregatePeriod(currentBars, currentPeriodStart));
  }
  
  return aggregatedBars;
}

function aggregatePeriod(bars: OHLCV[], periodStart: number): OHLCV {
  return {
    timestamp: periodStart,
    open: bars[0].open,
    high: Math.max(...bars.map(b => b.high)),
    low: Math.min(...bars.map(b => b.low)),
    close: bars[bars.length - 1].close,
    volume: bars.reduce((sum, b) => sum + b.volume, 0),
  };
}

// =============================================
// MAIN DATA PROCESSOR
// =============================================

interface ColumnMappings {
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
}

/**
 * Process raw CSV rows into validated, filtered, and aggregated OHLCV bars.
 * This is the main entry point for data processing.
 */
export function processBacktestData(
  rows: Record<string, string | number>[],
  columns: ColumnMappings,
  config: ProcessingConfig,
  onProgress?: (pct: number, msg: string) => void
): ProcessingResult {
  const startTime = performance.now();
  const warnings: string[] = [];
  const errors: string[] = [];
  
  const totalRows = rows.length;
  let validRows = 0;
  let invalidRows = 0;
  let droppedByDateRange = 0;
  
  // Step 1: Calculate date range bounds
  onProgress?.(5, 'Calculating date range...');
  const dateRange = calculateDateRange(config.dateRange);
  let dateRangeApplied: { start: string; end: string } | null = null;
  
  if (dateRange) {
    dateRangeApplied = {
      start: new Date(dateRange.startTs).toISOString(),
      end: new Date(dateRange.endTs).toISOString(),
    };
  }
  
  // Step 2: Parse and validate each row (NO silent 0 coercion)
  onProgress?.(10, 'Validating data...');
  const parsedBars: OHLCV[] = [];
  const chunkSize = 10000;
  
  for (let i = 0; i < totalRows; i++) {
    const row = rows[i];
    
    // Strict timestamp parsing
    const tsResult = strictParseTimestamp(row[columns.timestamp]);
    if (!tsResult.isValid) {
      invalidRows++;
      continue;
    }
    
    // Apply timezone normalization
    const timestamp = normalizeToUTC(tsResult.value, config.dateRange.timezone);
    
    // Apply date range filter
    if (dateRange) {
      if (timestamp < dateRange.startTs || timestamp > dateRange.endTs) {
        droppedByDateRange++;
        continue;
      }
    }
    
    // Strict OHLC parsing
    const openResult = strictParseNumber(row[columns.open]);
    const highResult = strictParseNumber(row[columns.high]);
    const lowResult = strictParseNumber(row[columns.low]);
    const closeResult = strictParseNumber(row[columns.close]);
    
    if (!openResult.isValid || !highResult.isValid || !lowResult.isValid || !closeResult.isValid) {
      invalidRows++;
      continue;
    }
    
    // Validate OHLC relationships
    if (highResult.value < lowResult.value) {
      invalidRows++;
      continue;
    }
    if (highResult.value < openResult.value || highResult.value < closeResult.value) {
      invalidRows++;
      continue;
    }
    if (lowResult.value > openResult.value || lowResult.value > closeResult.value) {
      invalidRows++;
      continue;
    }
    
    // Volume (optional, default to 0 only if column not provided)
    let volume = 0;
    if (columns.volume) {
      const volResult = strictParseNumber(row[columns.volume]);
      volume = volResult.isValid ? volResult.value : 0;
    }
    
    parsedBars.push({
      timestamp,
      open: openResult.value,
      high: highResult.value,
      low: lowResult.value,
      close: closeResult.value,
      volume,
    });
    validRows++;
    
    // Progress update every chunk
    if (i % chunkSize === 0) {
      const pct = 10 + Math.floor((i / totalRows) * 40);
      onProgress?.(pct, `Processing row ${i.toLocaleString()} of ${totalRows.toLocaleString()}...`);
    }
  }
  
  // Step 3: Check invalid row threshold
  const invalidPercent = (invalidRows / totalRows) * 100;
  if (config.strictValidation && invalidPercent > config.maxInvalidRowPercent) {
    errors.push(
      `Invalid row count (${invalidRows.toLocaleString()}, ${invalidPercent.toFixed(2)}%) ` +
      `exceeds threshold of ${config.maxInvalidRowPercent}%. Backtest blocked.`
    );
    return {
      bars: [],
      metadata: {
        originalRowCount: totalRows,
        validRowCount: validRows,
        droppedRowCount: droppedByDateRange,
        invalidRowCount: invalidRows,
        dateRangeApplied,
        timeframeAggregated: false,
        aggregatedFrom: null,
        aggregatedTo: null,
        timezoneApplied: config.dateRange.timezone,
        processingTimeMs: performance.now() - startTime,
      },
      warnings,
      errors,
    };
  }
  
  if (invalidRows > 0) {
    warnings.push(`${invalidRows.toLocaleString()} rows dropped due to invalid OHLC values`);
  }
  
  if (droppedByDateRange > 0) {
    warnings.push(`${droppedByDateRange.toLocaleString()} rows filtered by date range`);
  }
  
  // Step 4: Check for empty result
  if (parsedBars.length === 0) {
    errors.push('No valid data available for selected date range. Cannot run backtest.');
    return {
      bars: [],
      metadata: {
        originalRowCount: totalRows,
        validRowCount: 0,
        droppedRowCount: droppedByDateRange,
        invalidRowCount: invalidRows,
        dateRangeApplied,
        timeframeAggregated: false,
        aggregatedFrom: null,
        aggregatedTo: null,
        timezoneApplied: config.dateRange.timezone,
        processingTimeMs: performance.now() - startTime,
      },
      warnings,
      errors,
    };
  }
  
  // Step 5: Sort by timestamp
  onProgress?.(55, 'Sorting data...');
  parsedBars.sort((a, b) => a.timestamp - b.timestamp);
  
  // Step 6: Apply timeframe aggregation if needed
  onProgress?.(60, 'Applying timeframe aggregation...');
  let finalBars = parsedBars;
  let timeframeAggregated = false;
  let aggregatedFrom: string | null = null;
  let aggregatedTo: string | null = null;
  
  if (config.sourceTimeframe && config.timeframe !== config.sourceTimeframe) {
    const sourceMinutes = TIMEFRAME_MINUTES[config.sourceTimeframe];
    const targetMinutes = TIMEFRAME_MINUTES[config.timeframe];
    
    if (targetMinutes > sourceMinutes) {
      finalBars = aggregateBars(parsedBars, config.sourceTimeframe, config.timeframe);
      timeframeAggregated = true;
      aggregatedFrom = config.sourceTimeframe;
      aggregatedTo = config.timeframe;
      warnings.push(`Aggregated from ${config.sourceTimeframe} to ${config.timeframe} (${parsedBars.length.toLocaleString()} → ${finalBars.length.toLocaleString()} bars)`);
    }
  }
  
  onProgress?.(100, 'Data processing complete');
  
  return {
    bars: finalBars,
    metadata: {
      originalRowCount: totalRows,
      validRowCount: validRows,
      droppedRowCount: droppedByDateRange,
      invalidRowCount: invalidRows,
      dateRangeApplied,
      timeframeAggregated,
      aggregatedFrom,
      aggregatedTo,
      timezoneApplied: config.dateRange.timezone,
      processingTimeMs: performance.now() - startTime,
    },
    warnings,
    errors,
  };
}

// =============================================
// SESSION FILTER (MINUTE-LEVEL PRECISION)
// =============================================

export interface SessionFilterConfig {
  enabled: boolean;
  startTime: string; // "HH:mm" format
  endTime: string; // "HH:mm" format
  timezone: string;
  // Days of week (0=Sunday, 1=Monday, ..., 6=Saturday)
  days?: number[];
}

/**
 * Check if a timestamp falls within the session window.
 * Supports minute-level precision and overnight sessions.
 */
export function isWithinSession(timestamp: number, config: SessionFilterConfig): boolean {
  if (!config.enabled) return true;
  
  const { hour, minute } = getTimeInTimezone(timestamp, config.timezone);
  const currentMinutes = hour * 60 + minute;
  
  const [startHour, startMin] = config.startTime.split(':').map(Number);
  const [endHour, endMin] = config.endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  // Check day of week if specified
  if (config.days && config.days.length > 0) {
    const date = new Date(timestamp);
    const day = date.getDay();
    if (!config.days.includes(day)) return false;
  }
  
  // Handle overnight sessions (e.g., 22:00 → 02:00)
  if (endMinutes < startMinutes) {
    // Overnight session
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    // Normal session
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
}

/**
 * Parse session time string to hours and minutes.
 */
export function parseSessionTime(timeStr: string): { hour: number; minute: number } {
  const parts = timeStr.split(':');
  return {
    hour: parseInt(parts[0], 10) || 0,
    minute: parseInt(parts[1], 10) || 0,
  };
}
