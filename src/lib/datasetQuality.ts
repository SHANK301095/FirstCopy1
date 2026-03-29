/**
 * Dataset Quality Analysis Engine
 * Detects gaps, duplicates, timezone drift, outliers, missing OHLCV
 */

import { db, Dataset, DatasetChunk } from '@/db/index';

export interface QualityIssue {
  type: 'gap' | 'duplicate' | 'timezone_drift' | 'outlier' | 'missing_ohlcv' | 'bad_candle';
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  details: string;
  suggestion: 'drop' | 'merge' | 'resample' | 'fill' | 'review';
}

export interface QualityScanResult {
  datasetId: string;
  scannedAt: number;
  totalBars: number;
  issues: QualityIssue[];
  summary: {
    gaps: number;
    duplicates: number;
    timezoneDriftDetected: boolean;
    outliers: number;
    missingOHLCV: number;
    badCandles: number;
    qualityScore: number; // 0-100
  };
  expectedTimeframe: string;
  detectedTimeframe: string;
  recommendations: string[];
}

export interface QualityScanProgress {
  phase: 'loading' | 'analyzing' | 'complete';
  progress: number;
  message: string;
}

// Timeframe detection in milliseconds
const TIMEFRAME_MS: Record<string, number> = {
  'M1': 60000,
  'M5': 300000,
  'M15': 900000,
  'M30': 1800000,
  'H1': 3600000,
  'H4': 14400000,
  'D1': 86400000,
  'W1': 604800000,
};

/**
 * Detect timeframe from bar intervals
 */
function detectTimeframe(intervals: number[]): string {
  if (intervals.length === 0) return 'Unknown';
  
  // Get median interval (more robust than average)
  const sorted = [...intervals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  // Find closest matching timeframe
  let closest = 'Unknown';
  let minDiff = Infinity;
  
  for (const [tf, ms] of Object.entries(TIMEFRAME_MS)) {
    const diff = Math.abs(median - ms);
    if (diff < minDiff) {
      minDiff = diff;
      closest = tf;
    }
  }
  
  // Only accept if within 10% tolerance
  const tolerance = TIMEFRAME_MS[closest] * 0.1;
  return minDiff <= tolerance ? closest : 'Unknown';
}

/**
 * Check if a candle is "bad" (invalid OHLC relationship)
 */
function isBadCandle(o: number, h: number, l: number, c: number): boolean {
  if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c)) return true;
  if (o <= 0 || h <= 0 || l <= 0 || c <= 0) return true;
  if (h < l) return true; // High should be >= Low
  if (h < o || h < c) return true; // High should be >= Open and Close
  if (l > o || l > c) return true; // Low should be <= Open and Close
  return false;
}

/**
 * Detect price outliers using IQR method
 */
function detectOutliers(prices: number[]): Set<number> {
  const sorted = [...prices].filter(p => !isNaN(p) && p > 0).sort((a, b) => a - b);
  if (sorted.length < 10) return new Set();
  
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - (iqr * 3); // 3x IQR for extreme outliers
  const upperBound = q3 + (iqr * 3);
  
  const outlierIndices = new Set<number>();
  prices.forEach((p, i) => {
    if (p < lowerBound || p > upperBound) {
      outlierIndices.add(i);
    }
  });
  
  return outlierIndices;
}

/**
 * Detect timezone drift (unusual hour patterns in timestamps)
 */
function detectTimezoneDrift(timestamps: number[]): boolean {
  if (timestamps.length < 100) return false;
  
  // Check distribution of hours
  const hourCounts = new Map<number, number>();
  timestamps.forEach(ts => {
    const hour = new Date(ts).getUTCHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });
  
  // If data only appears in specific hours, might indicate timezone issues
  const activeHours = Array.from(hourCounts.entries()).filter(([, count]) => count > timestamps.length * 0.01);
  
  // If trading data appears in unusual patterns for forex (should be 24h except weekends)
  // This is a heuristic - could be refined based on asset type
  return activeHours.length > 0 && activeHours.length < 8;
}

/**
 * Perform quality scan on a dataset
 */
export async function scanDatasetQuality(
  datasetId: string,
  onProgress?: (progress: QualityScanProgress) => void
): Promise<QualityScanResult> {
  onProgress?.({ phase: 'loading', progress: 0, message: 'Loading dataset...' });
  
  // Get dataset metadata
  const dataset = await db.datasets.get(datasetId);
  if (!dataset) {
    throw new Error(`Dataset not found: ${datasetId}`);
  }
  
  // Load all chunks
  const chunks = await db.datasetChunks
    .where('datasetId')
    .equals(datasetId)
    .sortBy('index');
  
  onProgress?.({ phase: 'loading', progress: 20, message: 'Extracting bars...' });
  
  // Flatten all bars: [[ts, o, h, l, c, v], ...]
  const allBars: number[][] = [];
  for (const chunk of chunks) {
    allBars.push(...chunk.rows);
  }
  
  if (allBars.length === 0) {
    return {
      datasetId,
      scannedAt: Date.now(),
      totalBars: 0,
      issues: [],
      summary: {
        gaps: 0,
        duplicates: 0,
        timezoneDriftDetected: false,
        outliers: 0,
        missingOHLCV: 0,
        badCandles: 0,
        qualityScore: 0,
      },
      expectedTimeframe: dataset.timeframe,
      detectedTimeframe: 'Unknown',
      recommendations: ['Dataset is empty'],
    };
  }
  
  onProgress?.({ phase: 'analyzing', progress: 30, message: 'Analyzing timestamps...' });
  
  const issues: QualityIssue[] = [];
  const timestamps: number[] = [];
  const intervals: number[] = [];
  const closes: number[] = [];
  const seenTimestamps = new Set<number>();
  
  // First pass: collect timestamps and detect duplicates
  for (let i = 0; i < allBars.length; i++) {
    const bar = allBars[i];
    const ts = bar[0];
    
    timestamps.push(ts);
    closes.push(bar[4]); // Close price
    
    // Check for duplicate timestamps
    if (seenTimestamps.has(ts)) {
      issues.push({
        type: 'duplicate',
        severity: 'medium',
        timestamp: ts,
        details: `Duplicate timestamp at bar ${i}`,
        suggestion: 'drop',
      });
    }
    seenTimestamps.add(ts);
    
    // Calculate interval to previous bar
    if (i > 0) {
      intervals.push(ts - timestamps[i - 1]);
    }
  }
  
  onProgress?.({ phase: 'analyzing', progress: 50, message: 'Detecting gaps and timeframe...' });
  
  // Detect timeframe
  const detectedTimeframe = detectTimeframe(intervals);
  const expectedInterval = TIMEFRAME_MS[detectedTimeframe] || TIMEFRAME_MS[dataset.timeframe] || 60000;
  
  // Gap detection (intervals significantly larger than expected)
  const gapThreshold = expectedInterval * 2; // 2x expected interval = gap
  for (let i = 0; i < intervals.length; i++) {
    if (intervals[i] > gapThreshold) {
      // Skip weekend gaps for forex (Fri 22:00 to Sun 22:00)
      const fromDate = new Date(timestamps[i]);
      const toDate = new Date(timestamps[i + 1]);
      const isWeekendGap = fromDate.getUTCDay() === 5 && toDate.getUTCDay() === 0;
      
      if (!isWeekendGap) {
        const gapHours = Math.round(intervals[i] / 3600000);
        issues.push({
          type: 'gap',
          severity: gapHours > 24 ? 'high' : 'medium',
          timestamp: timestamps[i],
          details: `Gap of ~${gapHours}h between bars ${i} and ${i + 1}`,
          suggestion: gapHours > 24 ? 'review' : 'fill',
        });
      }
    }
  }
  
  onProgress?.({ phase: 'analyzing', progress: 70, message: 'Checking candle validity...' });
  
  // Check each bar for issues
  for (let i = 0; i < allBars.length; i++) {
    const [ts, o, h, l, c, v] = allBars[i];
    
    // Missing OHLCV values
    if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c)) {
      issues.push({
        type: 'missing_ohlcv',
        severity: 'high',
        timestamp: ts,
        details: `Missing OHLCV values at bar ${i}`,
        suggestion: 'drop',
      });
    }
    
    // Bad candle (invalid OHLC relationship)
    if (isBadCandle(o, h, l, c)) {
      issues.push({
        type: 'bad_candle',
        severity: 'high',
        timestamp: ts,
        details: `Invalid OHLC relationship at bar ${i}: O=${o}, H=${h}, L=${l}, C=${c}`,
        suggestion: 'drop',
      });
    }
  }
  
  onProgress?.({ phase: 'analyzing', progress: 85, message: 'Detecting outliers...' });
  
  // Outlier detection
  const outlierIndices = detectOutliers(closes);
  for (const idx of outlierIndices) {
    issues.push({
      type: 'outlier',
      severity: 'medium',
      timestamp: timestamps[idx],
      details: `Price outlier at bar ${idx}: ${closes[idx]}`,
      suggestion: 'review',
    });
  }
  
  // Timezone drift detection
  const timezoneDriftDetected = detectTimezoneDrift(timestamps);
  if (timezoneDriftDetected) {
    issues.push({
      type: 'timezone_drift',
      severity: 'low',
      timestamp: timestamps[0],
      details: 'Unusual timestamp distribution detected - possible timezone mismatch',
      suggestion: 'review',
    });
  }
  
  onProgress?.({ phase: 'complete', progress: 100, message: 'Scan complete' });
  
  // Calculate summary
  const summary = {
    gaps: issues.filter(i => i.type === 'gap').length,
    duplicates: issues.filter(i => i.type === 'duplicate').length,
    timezoneDriftDetected,
    outliers: issues.filter(i => i.type === 'outlier').length,
    missingOHLCV: issues.filter(i => i.type === 'missing_ohlcv').length,
    badCandles: issues.filter(i => i.type === 'bad_candle').length,
    qualityScore: 0,
  };
  
  // Calculate quality score (100 = perfect, 0 = unusable)
  const highIssues = issues.filter(i => i.severity === 'high').length;
  const mediumIssues = issues.filter(i => i.severity === 'medium').length;
  const lowIssues = issues.filter(i => i.severity === 'low').length;
  
  const issuePenalty = (highIssues * 10 + mediumIssues * 3 + lowIssues) / allBars.length * 100;
  summary.qualityScore = Math.max(0, Math.round(100 - Math.min(100, issuePenalty)));
  
  // Generate recommendations
  const recommendations: string[] = [];
  if (summary.duplicates > 0) {
    recommendations.push(`Remove ${summary.duplicates} duplicate bars`);
  }
  if (summary.gaps > 5) {
    recommendations.push('Consider filling gaps with forward-fill or interpolation');
  }
  if (summary.badCandles > 0) {
    recommendations.push(`Drop ${summary.badCandles} invalid candles before backtesting`);
  }
  if (summary.outliers > 10) {
    recommendations.push('Review and potentially cap extreme price outliers');
  }
  if (timezoneDriftDetected) {
    recommendations.push('Verify timezone settings match data source');
  }
  if (detectedTimeframe !== dataset.timeframe && detectedTimeframe !== 'Unknown') {
    recommendations.push(`Detected timeframe (${detectedTimeframe}) differs from declared (${dataset.timeframe})`);
  }
  if (summary.qualityScore >= 90) {
    recommendations.push('Data quality is excellent - ready for backtesting');
  } else if (summary.qualityScore >= 70) {
    recommendations.push('Data quality is acceptable - consider fixing major issues');
  } else {
    recommendations.push('Data quality needs improvement before reliable backtesting');
  }
  
  return {
    datasetId,
    scannedAt: Date.now(),
    totalBars: allBars.length,
    issues,
    summary,
    expectedTimeframe: dataset.timeframe,
    detectedTimeframe,
    recommendations,
  };
}

/**
 * Export quality report as JSON
 */
export function exportQualityReport(result: QualityScanResult): string {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    ...result,
    issues: result.issues.slice(0, 1000), // Limit issues in export
  }, null, 2);
}

/**
 * Get quality score color
 */
export function getQualityScoreColor(score: number): string {
  if (score >= 90) return 'text-green-500';
  if (score >= 70) return 'text-yellow-500';
  if (score >= 50) return 'text-orange-500';
  return 'text-destructive';
}

/**
 * Get quality score label
 */
export function getQualityScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 30) return 'Poor';
  return 'Unusable';
}
