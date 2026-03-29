/**
 * Dataset Quality Validation Service
 * Checks OHLCV data for issues that impact backtests and replay
 */

export interface QualityIssue {
  type: 'missing_bars' | 'duplicate_bars' | 'out_of_order' | 'abnormal_jump' | 'invalid_ohlc' | 'zero_price' | 'gap' | 'negative_volume';
  severity: 'warning' | 'error';
  index: number;
  message: string;
  value?: number;
}

export interface DataQualityReport {
  totalBars: number;
  issues: QualityIssue[];
  missingBars: number;
  duplicateBars: number;
  outOfOrderBars: number;
  abnormalJumps: number;
  invalidOhlc: number;
  gapCount: number;
  score: number; // 0-100, higher is better
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  checkedAt: string;
}

interface OHLCVBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * Run comprehensive quality checks on OHLCV data
 */
export function validateDataQuality(bars: OHLCVBar[], expectedIntervalMs?: number): DataQualityReport {
  const issues: QualityIssue[] = [];
  let missingBars = 0;
  let duplicateBars = 0;
  let outOfOrderBars = 0;
  let abnormalJumps = 0;
  let invalidOhlc = 0;
  let gapCount = 0;

  if (bars.length === 0) {
    return {
      totalBars: 0, issues: [], missingBars: 0, duplicateBars: 0,
      outOfOrderBars: 0, abnormalJumps: 0, invalidOhlc: 0, gapCount: 0,
      score: 0, grade: 'F', checkedAt: new Date().toISOString(),
    };
  }

  // Detect interval if not provided
  if (!expectedIntervalMs && bars.length > 2) {
    const diffs: number[] = [];
    for (let i = 1; i < Math.min(bars.length, 100); i++) {
      diffs.push(bars[i].timestamp - bars[i - 1].timestamp);
    }
    diffs.sort((a, b) => a - b);
    expectedIntervalMs = diffs[Math.floor(diffs.length / 2)]; // median
  }

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];

    // Invalid OHLC structure
    if (bar.high < bar.low || bar.open <= 0 || bar.close <= 0 || bar.high <= 0 || bar.low <= 0) {
      invalidOhlc++;
      issues.push({ type: 'invalid_ohlc', severity: 'error', index: i, message: `Invalid OHLC at index ${i}: O=${bar.open} H=${bar.high} L=${bar.low} C=${bar.close}` });
    }

    // Zero/negative price
    if (bar.close <= 0 || bar.open <= 0) {
      issues.push({ type: 'zero_price', severity: 'error', index: i, message: `Zero/negative price at index ${i}` });
    }

    // Negative volume
    if (bar.volume !== undefined && bar.volume < 0) {
      issues.push({ type: 'negative_volume', severity: 'warning', index: i, message: `Negative volume at index ${i}`, value: bar.volume });
    }

    if (i > 0) {
      const prev = bars[i - 1];
      const dt = bar.timestamp - prev.timestamp;

      // Out of order
      if (dt < 0) {
        outOfOrderBars++;
        issues.push({ type: 'out_of_order', severity: 'error', index: i, message: `Timestamp out of order at index ${i}` });
      }

      // Duplicate
      if (dt === 0) {
        duplicateBars++;
        issues.push({ type: 'duplicate_bars', severity: 'warning', index: i, message: `Duplicate timestamp at index ${i}` });
      }

      // Gap detection (>3x expected interval)
      if (expectedIntervalMs && dt > expectedIntervalMs * 3 && dt > 0) {
        gapCount++;
        const gapHours = (dt / 3600000).toFixed(1);
        issues.push({ type: 'gap', severity: 'warning', index: i, message: `${gapHours}h gap at index ${i}` });
      }

      // Missing bars (between 1.5x and 3x expected)
      if (expectedIntervalMs && dt > expectedIntervalMs * 1.5 && dt <= expectedIntervalMs * 3) {
        missingBars++;
        issues.push({ type: 'missing_bars', severity: 'warning', index: i, message: `Missing bar(s) at index ${i}` });
      }

      // Abnormal price jump (>10% in one bar)
      const pctChange = Math.abs(bar.close - prev.close) / prev.close;
      if (pctChange > 0.10) {
        abnormalJumps++;
        issues.push({ type: 'abnormal_jump', severity: 'warning', index: i, message: `${(pctChange * 100).toFixed(1)}% jump at index ${i}`, value: pctChange });
      }
    }
  }

  // Score calculation
  const totalIssues = issues.length;
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const ratio = totalIssues / bars.length;
  let score = Math.max(0, Math.round(100 - (ratio * 500) - (errorCount * 10)));
  score = Math.min(100, Math.max(0, score));

  const grade: DataQualityReport['grade'] =
    score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';

  return {
    totalBars: bars.length,
    issues: issues.slice(0, 200), // cap at 200 issues for UI
    missingBars,
    duplicateBars,
    outOfOrderBars,
    abnormalJumps,
    invalidOhlc,
    gapCount,
    score,
    grade,
    checkedAt: new Date().toISOString(),
  };
}
