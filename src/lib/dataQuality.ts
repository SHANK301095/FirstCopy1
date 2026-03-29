/**
 * Data Quality & Auto-Detection
 * Phase B21-38: Auto-detect columns, quality scoring, gap detection
 */

export interface ColumnMapping {
  type: 'timestamp' | 'open' | 'high' | 'low' | 'close' | 'volume' | 'unknown';
  confidence: number;
}

export interface QualityResult {
  overallScore: number;
  completeness: number;
  consistency: number;
  validity: number;
  issues: Array<{ severity: 'error' | 'warning'; message: string; column?: string }>;
}

export interface DataGap {
  startTime: number;
  endTime: number;
  expectedBars: number;
  startIndex?: number;
  endIndex?: number;
  missingBars?: number;
}

export interface DataQualityScore {
  overall: number; // 0-100
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  gaps: DataGap[];
  issues: DataIssue[];
}

export interface DataIssue {
  type: 'gap' | 'spike' | 'duplicate' | 'invalid' | 'timezone';
  severity: 'low' | 'medium' | 'high';
  rowIndex?: number;
  description: string;
  suggestion?: string;
}

const TIMESTAMP_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/,
  /^\d{2}\/\d{2}\/\d{4}/,
  /^\d{4}\.\d{2}\.\d{2}/,
  /^\d{13,}$/,
  /^\d{10,}$/,
];

const COLUMN_NAME_HINTS: Record<string, string[]> = {
  timestamp: ['time', 'date', 'datetime', 'timestamp', 'dt', 'period'],
  open: ['open', 'o', 'first', 'opening'],
  high: ['high', 'h', 'max', 'hi'],
  low: ['low', 'l', 'min', 'lo'],
  close: ['close', 'c', 'last', 'closing', 'price'],
  volume: ['volume', 'vol', 'v', 'qty', 'quantity', 'tick_volume'],
};

export function detectColumnTypes(
  data: Record<string, unknown>[],
  columns: string[]
): Record<string, ColumnMapping> {
  const mappings: Record<string, ColumnMapping> = {};
  
  for (const col of columns) {
    const lowerCol = col.toLowerCase();
    if (COLUMN_NAME_HINTS.timestamp.some(h => lowerCol.includes(h))) {
      mappings[col] = { type: 'timestamp', confidence: 0.9 };
    } else if (COLUMN_NAME_HINTS.open.some(h => lowerCol === h || lowerCol.includes(h))) {
      mappings[col] = { type: 'open', confidence: 0.95 };
    } else if (COLUMN_NAME_HINTS.high.some(h => lowerCol === h || lowerCol.includes(h))) {
      mappings[col] = { type: 'high', confidence: 0.95 };
    } else if (COLUMN_NAME_HINTS.low.some(h => lowerCol === h || lowerCol.includes(h))) {
      mappings[col] = { type: 'low', confidence: 0.95 };
    } else if (COLUMN_NAME_HINTS.close.some(h => lowerCol === h || lowerCol.includes(h))) {
      mappings[col] = { type: 'close', confidence: 0.95 };
    } else if (COLUMN_NAME_HINTS.volume.some(h => lowerCol.includes(h))) {
      mappings[col] = { type: 'volume', confidence: 0.85 };
    } else {
      mappings[col] = { type: 'unknown', confidence: 0.5 };
    }
  }
  
  return mappings;
}

export function calculateQualityScore(
  data: Record<string, unknown>[],
  mappings: Record<string, ColumnMapping>
): QualityResult {
  const issues: QualityResult['issues'] = [];
  let nullCount = 0;
  let totalCells = 0;
  
  for (const row of data) {
    for (const [col, mapping] of Object.entries(mappings)) {
      totalCells++;
      if (row[col] === null || row[col] === undefined || row[col] === '') {
        nullCount++;
        if (mapping.type !== 'unknown') {
          issues.push({ severity: 'warning', message: `Missing value`, column: col });
        }
      }
    }
  }
  
  const completeness = totalCells > 0 ? ((totalCells - nullCount) / totalCells) * 100 : 100;
  const consistency = 95;
  const validity = 90;
  
  return {
    overallScore: (completeness + consistency + validity) / 3,
    completeness,
    consistency,
    validity,
    issues: issues.slice(0, 10),
  };
}

export function detectGaps(timestamps: number[], expectedIntervalMs = 3600000): DataGap[] {
  const gaps: DataGap[] = [];
  const sorted = [...timestamps].sort((a, b) => a - b);
  
  for (let i = 1; i < sorted.length; i++) {
    const diff = sorted[i] - sorted[i - 1];
    if (diff > expectedIntervalMs * 1.5) {
      gaps.push({
        startTime: sorted[i - 1],
        endTime: sorted[i],
        expectedBars: Math.floor(diff / expectedIntervalMs) - 1,
      });
    }
  }
  
  return gaps;
}

export function autoDetectColumns(
  headers: string[],
  sampleRows: string[][]
): Array<{ name: string; detectedType: ColumnMapping['type']; confidence: number; sampleValues: string[] }> {
  return headers.map((header, idx) => {
    const samples = sampleRows.slice(0, 5).map(row => row[idx] || '');
    const detected = detectColumnType(header, samples);
    
    return {
      name: header,
      detectedType: detected.type,
      confidence: detected.confidence,
      sampleValues: samples,
    };
  });
}

function detectColumnType(
  header: string,
  samples: string[]
): { type: ColumnMapping['type']; confidence: number } {
  const lowerHeader = header.toLowerCase().trim();
  
  // Check name hints first
  for (const [type, hints] of Object.entries(COLUMN_NAME_HINTS)) {
    if (hints.some(hint => lowerHeader.includes(hint))) {
      return { 
        type: type as ColumnMapping['type'], 
        confidence: 0.9 
      };
    }
  }
  
  // Analyze sample values
  const nonEmpty = samples.filter(s => s && s.trim());
  if (nonEmpty.length === 0) {
    return { type: 'unknown', confidence: 0 };
  }
  
  // Check if timestamp
  const timestampMatches = nonEmpty.filter(s => 
    TIMESTAMP_PATTERNS.some(p => p.test(s.trim()))
  ).length;
  if (timestampMatches / nonEmpty.length > 0.8) {
    return { type: 'timestamp', confidence: 0.85 };
  }
  
  // Check if numeric (OHLCV candidates)
  const numericSamples = nonEmpty.filter(s => !isNaN(parseFloat(s)));
  if (numericSamples.length / nonEmpty.length > 0.9) {
    // Large integers likely volume
    const avg = numericSamples.reduce((a, b) => a + parseFloat(b), 0) / numericSamples.length;
    if (avg > 10000 && !lowerHeader.includes('price')) {
      return { type: 'volume', confidence: 0.6 };
    }
    // Otherwise could be OHLC
    return { type: 'unknown', confidence: 0.3 };
  }
  
  return { type: 'unknown', confidence: 0 };
}

export function calculateDataQuality(
  rows: number[][],
  expectedTimeframeMinutes: number
): DataQualityScore {
  if (rows.length < 2) {
    return {
      overall: 0,
      completeness: 0,
      accuracy: 0,
      consistency: 0,
      timeliness: 0,
      gaps: [],
      issues: [{ type: 'invalid', severity: 'high', description: 'Insufficient data rows' }],
    };
  }
  
  const issues: DataIssue[] = [];
  const gaps: DataGap[] = [];
  
  // Check completeness - detect gaps
  const expectedInterval = expectedTimeframeMinutes * 60 * 1000;
  let totalExpectedBars = 0;
  let totalMissingBars = 0;
  
  for (let i = 1; i < rows.length; i++) {
    const timeDiff = rows[i][0] - rows[i - 1][0];
    const expectedBars = Math.round(timeDiff / expectedInterval);
    
    if (expectedBars > 1) {
      const missingBars = expectedBars - 1;
      totalMissingBars += missingBars;
      totalExpectedBars += expectedBars;
      
      if (missingBars > 5) {
        gaps.push({
          startTime: rows[i - 1][0],
          endTime: rows[i][0],
          startIndex: i - 1,
          endIndex: i,
          expectedBars,
          missingBars,
        });
        
        issues.push({
          type: 'gap',
          severity: missingBars > 20 ? 'high' : 'medium',
          rowIndex: i,
          description: `Missing ${missingBars} bars between rows ${i - 1} and ${i}`,
          suggestion: 'Consider filling gaps or filtering this period',
        });
      }
    } else {
      totalExpectedBars += 1;
    }
  }
  
  // Check accuracy - price spikes
  for (let i = 1; i < rows.length; i++) {
    const prevClose = rows[i - 1][4];
    const currOpen = rows[i][1];
    const currHigh = rows[i][2];
    const currLow = rows[i][3];
    const currClose = rows[i][4];
    
    // High-Low sanity check
    if (currHigh < currLow) {
      issues.push({
        type: 'invalid',
        severity: 'high',
        rowIndex: i,
        description: 'High price is lower than Low price',
        suggestion: 'Swap High and Low values',
      });
    }
    
    // OHLC sanity check
    if (currOpen > currHigh || currOpen < currLow || 
        currClose > currHigh || currClose < currLow) {
      issues.push({
        type: 'invalid',
        severity: 'medium',
        rowIndex: i,
        description: 'Open or Close outside High-Low range',
      });
    }
    
    // Spike detection (>10% move)
    if (prevClose > 0) {
      const change = Math.abs((currOpen - prevClose) / prevClose);
      if (change > 0.1) {
        issues.push({
          type: 'spike',
          severity: 'medium',
          rowIndex: i,
          description: `Large gap of ${(change * 100).toFixed(1)}% between bars`,
        });
      }
    }
  }
  
  // Check for duplicates
  const timestamps = new Set<number>();
  for (let i = 0; i < rows.length; i++) {
    if (timestamps.has(rows[i][0])) {
      issues.push({
        type: 'duplicate',
        severity: 'high',
        rowIndex: i,
        description: 'Duplicate timestamp found',
        suggestion: 'Remove duplicate rows',
      });
    }
    timestamps.add(rows[i][0]);
  }
  
  // Calculate scores
  const completeness = totalExpectedBars > 0 
    ? Math.max(0, 100 - (totalMissingBars / totalExpectedBars) * 100) 
    : 100;
  
  const accuracyIssues = issues.filter(i => i.type === 'invalid' || i.type === 'spike').length;
  const accuracy = Math.max(0, 100 - (accuracyIssues / rows.length) * 500);
  
  const duplicateIssues = issues.filter(i => i.type === 'duplicate').length;
  const consistency = Math.max(0, 100 - (duplicateIssues / rows.length) * 500);
  
  // Timeliness - how recent is the data
  const latestTimestamp = Math.max(...rows.map(r => r[0]));
  const daysSinceLatest = (Date.now() - latestTimestamp) / (1000 * 60 * 60 * 24);
  const timeliness = daysSinceLatest < 1 ? 100 : 
                     daysSinceLatest < 7 ? 80 :
                     daysSinceLatest < 30 ? 60 :
                     daysSinceLatest < 365 ? 40 : 20;
  
  const overall = (completeness * 0.35 + accuracy * 0.3 + consistency * 0.2 + timeliness * 0.15);
  
  return {
    overall: Math.round(overall),
    completeness: Math.round(completeness),
    accuracy: Math.round(accuracy),
    consistency: Math.round(consistency),
    timeliness: Math.round(timeliness),
    gaps,
    issues,
  };
}

export function detectTimeframe(timestamps: number[]): string {
  if (timestamps.length < 2) return 'Unknown';
  
  // Calculate most common interval
  const intervals: number[] = [];
  for (let i = 1; i < Math.min(timestamps.length, 100); i++) {
    intervals.push(timestamps[i] - timestamps[i - 1]);
  }
  
  intervals.sort((a, b) => a - b);
  const medianInterval = intervals[Math.floor(intervals.length / 2)];
  const minutes = Math.round(medianInterval / (1000 * 60));
  
  if (minutes <= 1) return 'M1';
  if (minutes <= 5) return 'M5';
  if (minutes <= 15) return 'M15';
  if (minutes <= 30) return 'M30';
  if (minutes <= 60) return 'H1';
  if (minutes <= 240) return 'H4';
  if (minutes <= 1440) return 'D1';
  if (minutes <= 10080) return 'W1';
  return 'MN';
}

export function getQualityBadge(score: number): { label: string; variant: 'success' | 'warning' | 'destructive' } {
  if (score >= 90) return { label: 'Excellent', variant: 'success' };
  if (score >= 70) return { label: 'Good', variant: 'success' };
  if (score >= 50) return { label: 'Fair', variant: 'warning' };
  return { label: 'Poor', variant: 'destructive' };
}
