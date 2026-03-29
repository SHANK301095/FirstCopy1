/**
 * Quality Scan Results Persistence Store
 * Stores scan results in Dexie for persistence across refresh
 */

import { db } from '@/db/index';
import type { QualityScanResult } from '@/lib/datasetQuality';

// Extend Dexie DB with quality scans table
export interface StoredQualityScan {
  id: string;
  datasetId: string;
  scannedAt: number;
  totalBars: number;
  qualityScore: number;
  summary: {
    gaps: number;
    duplicates: number;
    timezoneDriftDetected: boolean;
    outliers: number;
    missingOHLCV: number;
    badCandles: number;
  };
  expectedTimeframe: string;
  detectedTimeframe: string;
  recommendations: string[];
  issuesCount: number;
  // We don't store all issues to save space - just the summary
}

// Store quality scan result (lightweight version)
export async function storeQualityScan(result: QualityScanResult): Promise<void> {
  const storedScan: StoredQualityScan = {
    id: result.datasetId,
    datasetId: result.datasetId,
    scannedAt: result.scannedAt,
    totalBars: result.totalBars,
    qualityScore: result.summary.qualityScore,
    summary: {
      gaps: result.summary.gaps,
      duplicates: result.summary.duplicates,
      timezoneDriftDetected: result.summary.timezoneDriftDetected,
      outliers: result.summary.outliers,
      missingOHLCV: result.summary.missingOHLCV,
      badCandles: result.summary.badCandles,
    },
    expectedTimeframe: result.expectedTimeframe,
    detectedTimeframe: result.detectedTimeframe,
    recommendations: result.recommendations,
    issuesCount: result.issues.length,
  };

  // Store in localStorage as a simple persistence layer
  const scans = getStoredScans();
  scans[result.datasetId] = storedScan;
  localStorage.setItem('mmc-quality-scans', JSON.stringify(scans));
}

// Get stored scan for a dataset
export function getStoredScan(datasetId: string): StoredQualityScan | null {
  const scans = getStoredScans();
  return scans[datasetId] || null;
}

// Get all stored scans
export function getStoredScans(): Record<string, StoredQualityScan> {
  try {
    const stored = localStorage.getItem('mmc-quality-scans');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Delete stored scan
export function deleteStoredScan(datasetId: string): void {
  const scans = getStoredScans();
  delete scans[datasetId];
  localStorage.setItem('mmc-quality-scans', JSON.stringify(scans));
}

// Export quality report as CSV
export function exportQualityReportCSV(result: QualityScanResult): string {
  const lines: string[] = [];
  
  // Header info
  lines.push('Dataset Quality Report');
  lines.push(`Scanned At,${new Date(result.scannedAt).toISOString()}`);
  lines.push(`Total Bars,${result.totalBars}`);
  lines.push(`Quality Score,${result.summary.qualityScore}/100`);
  lines.push(`Detected Timeframe,${result.detectedTimeframe}`);
  lines.push(`Expected Timeframe,${result.expectedTimeframe}`);
  lines.push('');
  
  // Summary
  lines.push('Summary');
  lines.push(`Gaps,${result.summary.gaps}`);
  lines.push(`Duplicates,${result.summary.duplicates}`);
  lines.push(`Outliers,${result.summary.outliers}`);
  lines.push(`Bad Candles,${result.summary.badCandles}`);
  lines.push(`Missing OHLCV,${result.summary.missingOHLCV}`);
  lines.push(`Timezone Drift Detected,${result.summary.timezoneDriftDetected ? 'Yes' : 'No'}`);
  lines.push('');
  
  // Recommendations
  lines.push('Recommendations');
  result.recommendations.forEach(rec => lines.push(rec));
  lines.push('');
  
  // Issues (first 500)
  if (result.issues.length > 0) {
    lines.push('Issues (First 500)');
    lines.push('Type,Severity,Timestamp,Details,Suggestion');
    result.issues.slice(0, 500).forEach(issue => {
      lines.push(`${issue.type},${issue.severity},${new Date(issue.timestamp).toISOString()},"${issue.details.replace(/"/g, '""')}",${issue.suggestion}`);
    });
  }
  
  return lines.join('\n');
}

// Get quality badge info based on score
export function getQualityBadge(score: number): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (score >= 90) return { label: 'Excellent', variant: 'default' };
  if (score >= 70) return { label: 'Good', variant: 'secondary' };
  if (score >= 50) return { label: 'Fair', variant: 'outline' };
  return { label: 'Poor', variant: 'destructive' };
}
