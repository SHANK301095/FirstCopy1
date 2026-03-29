/**
 * Dataset Quality Pipeline — Validates OHLCV data integrity
 * Checks: missing bars, duplicates, out-of-order, abnormal jumps, invalid OHLC, gaps
 * Returns a structured quality report for downstream consumers
 */

export interface OHLCVBar {
  time: number; // Unix timestamp ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DatasetQualityIssue {
  type:
    | 'missing_bars'
    | 'duplicate_bars'
    | 'out_of_order'
    | 'abnormal_jump'
    | 'invalid_ohlc'
    | 'non_positive_price'
    | 'zero_volume'
    | 'session_gap'
    | 'empty_window';
  severity: 'info' | 'warning' | 'critical';
  barIndex: number;
  timestamp?: number;
  detail: string;
}

export interface DatasetQualityReport {
  datasetId?: string;
  totalBars: number;
  validBars: number;
  issues: DatasetQualityIssue[];
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  checkedAt: string;
  summary: string;
}

export interface QualityCheckConfig {
  /** Expected bar interval in milliseconds (e.g., 3600000 for H1) */
  expectedIntervalMs?: number;
  /** Max allowed price jump as fraction (0.1 = 10%) */
  maxJumpPct?: number;
  /** Whether to check for zero volume */
  checkVolume?: boolean;
  /** Max consecutive missing bars before critical */
  maxConsecutiveMissing?: number;
}

const DEFAULT_CONFIG: QualityCheckConfig = {
  expectedIntervalMs: 3600000, // H1
  maxJumpPct: 0.15,
  checkVolume: true,
  maxConsecutiveMissing: 10,
};

/**
 * Run full quality check on OHLCV dataset
 */
export function runDatasetQualityCheck(
  bars: OHLCVBar[],
  config: QualityCheckConfig = {},
  datasetId?: string
): DatasetQualityReport {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const issues: DatasetQualityIssue[] = [];

  if (bars.length === 0) {
    return {
      datasetId,
      totalBars: 0,
      validBars: 0,
      issues: [{ type: 'empty_window', severity: 'critical', barIndex: 0, detail: 'Dataset is empty' }],
      score: 0,
      grade: 'F',
      checkedAt: new Date().toISOString(),
      summary: 'Empty dataset — no bars to validate',
    };
  }

  let validBars = 0;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    let barValid = true;

    // 1. Invalid OHLC structure
    if (bar.high < bar.low) {
      issues.push({
        type: 'invalid_ohlc',
        severity: 'critical',
        barIndex: i,
        timestamp: bar.time,
        detail: `High (${bar.high}) < Low (${bar.low})`,
      });
      barValid = false;
    }

    if (bar.open > bar.high || bar.open < bar.low || bar.close > bar.high || bar.close < bar.low) {
      issues.push({
        type: 'invalid_ohlc',
        severity: 'warning',
        barIndex: i,
        timestamp: bar.time,
        detail: `Open/Close outside High/Low range`,
      });
      barValid = false;
    }

    // 2. Non-positive prices
    if (bar.open <= 0 || bar.high <= 0 || bar.low <= 0 || bar.close <= 0) {
      issues.push({
        type: 'non_positive_price',
        severity: 'critical',
        barIndex: i,
        timestamp: bar.time,
        detail: `Non-positive price detected: O=${bar.open} H=${bar.high} L=${bar.low} C=${bar.close}`,
      });
      barValid = false;
    }

    // 3. Zero volume check
    if (cfg.checkVolume && bar.volume === 0 && i > 0 && i < bars.length - 1) {
      issues.push({
        type: 'zero_volume',
        severity: 'info',
        barIndex: i,
        timestamp: bar.time,
        detail: 'Zero volume bar',
      });
    }

    // 4. Out-of-order timestamps
    if (i > 0 && bar.time <= bars[i - 1].time) {
      issues.push({
        type: bar.time === bars[i - 1].time ? 'duplicate_bars' : 'out_of_order',
        severity: bar.time === bars[i - 1].time ? 'warning' : 'critical',
        barIndex: i,
        timestamp: bar.time,
        detail: bar.time === bars[i - 1].time
          ? `Duplicate timestamp at index ${i}`
          : `Out-of-order: ${bar.time} <= ${bars[i - 1].time}`,
      });
      barValid = false;
    }

    // 5. Missing bars (gaps)
    if (i > 0 && cfg.expectedIntervalMs) {
      const gap = bar.time - bars[i - 1].time;
      const expectedGaps = Math.round(gap / cfg.expectedIntervalMs);
      if (expectedGaps > 1 && expectedGaps <= (cfg.maxConsecutiveMissing || 10)) {
        issues.push({
          type: 'missing_bars',
          severity: expectedGaps > 5 ? 'warning' : 'info',
          barIndex: i,
          timestamp: bar.time,
          detail: `${expectedGaps - 1} missing bars between index ${i - 1} and ${i}`,
        });
      } else if (expectedGaps > (cfg.maxConsecutiveMissing || 10)) {
        issues.push({
          type: 'session_gap',
          severity: 'warning',
          barIndex: i,
          timestamp: bar.time,
          detail: `Large gap: ${expectedGaps - 1} missing bars (~${(gap / 3600000).toFixed(1)}h)`,
        });
      }
    }

    // 6. Abnormal price jumps
    if (i > 0 && cfg.maxJumpPct) {
      const prevClose = bars[i - 1].close;
      if (prevClose > 0) {
        const jumpPct = Math.abs(bar.open - prevClose) / prevClose;
        if (jumpPct > cfg.maxJumpPct) {
          issues.push({
            type: 'abnormal_jump',
            severity: jumpPct > cfg.maxJumpPct * 2 ? 'critical' : 'warning',
            barIndex: i,
            timestamp: bar.time,
            detail: `${(jumpPct * 100).toFixed(1)}% jump from prev close ${prevClose} to open ${bar.open}`,
          });
        }
      }
    }

    if (barValid) validBars++;
  }

  // Score calculation
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  let score = 100;
  score -= criticalCount * 15;
  score -= warningCount * 5;
  score -= infoCount * 1;
  score = Math.max(0, Math.min(100, score));

  const grade: DatasetQualityReport['grade'] =
    score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';

  const summary = issues.length === 0
    ? `Clean dataset: ${bars.length} bars, no issues found`
    : `${bars.length} bars checked: ${criticalCount} critical, ${warningCount} warnings, ${infoCount} info issues`;

  return {
    datasetId,
    totalBars: bars.length,
    validBars,
    issues,
    score,
    grade,
    checkedAt: new Date().toISOString(),
    summary,
  };
}

/**
 * Infer expected interval from bar timestamps
 */
export function inferBarInterval(bars: OHLCVBar[]): number {
  if (bars.length < 3) return 3600000; // default H1
  const diffs: number[] = [];
  for (let i = 1; i < Math.min(bars.length, 50); i++) {
    const d = bars[i].time - bars[i - 1].time;
    if (d > 0) diffs.push(d);
  }
  if (diffs.length === 0) return 3600000;
  diffs.sort((a, b) => a - b);
  return diffs[Math.floor(diffs.length / 2)]; // median
}
