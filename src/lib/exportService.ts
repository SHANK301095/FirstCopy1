/**
 * Export Service V3.0
 * CSV, JSON, HTML, PDF exports for datasets and results
 */

import { jsPDF } from 'jspdf';
import { db } from '@/db/index';

// Note: db is used by exportDatasetToCSV and exportDatasetToJSON below

export type ExportFormat = 'csv' | 'json' | 'html' | 'pdf';
export type ExportDataType = 'dataset' | 'backtest' | 'trades' | 'strategy' | 'portfolio' | 'tearsheet';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  dateRange?: { start: number; end: number };
  columns?: string[];
}

export interface ExportHistoryItem {
  id: string;
  filename: string;
  format: ExportFormat;
  dataType: ExportDataType;
  size: number;
  createdAt: string;
}

// Download helper
export function downloadFile(content: string | Blob, filename: string, type: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Simple CSV Export
export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      }).join(',')
    )
  ];
  downloadFile(csvRows.join('\n'), `${filename}.csv`, 'text/csv;charset=utf-8;');
}

// Simple JSON Export
export function exportToJSON(data: unknown, filename: string): void {
  downloadFile(JSON.stringify(data, null, 2), `${filename}.json`, 'application/json');
}

// PDF Export for Tearsheets
export function exportTearsheetPDF(
  data: {
    title: string;
    subtitle?: string;
    metrics: { label: string; value: string | number; change?: string }[];
    sections?: { title: string; content: string }[];
    footer?: string;
  },
  filename: string
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(data.title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  if (data.subtitle) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(data.subtitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
  }

  doc.setTextColor(0);
  const metricsPerRow = 3;
  const metricWidth = (pageWidth - 40) / metricsPerRow;
  
  data.metrics.forEach((metric, index) => {
    const col = index % metricsPerRow;
    const row = Math.floor(index / metricsPerRow);
    const x = 20 + col * metricWidth;
    const y = yPos + row * 25;

    doc.setDrawColor(200);
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(x, y, metricWidth - 5, 20, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(metric.label, x + 5, y + 7);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(String(metric.value), x + 5, y + 16);
  });

  yPos += Math.ceil(data.metrics.length / metricsPerRow) * 25 + 15;

  if (data.sections) {
    data.sections.forEach(section => {
      if (yPos > 250) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text(section.title, 20, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60);
      const lines = doc.splitTextToSize(section.content, pageWidth - 40);
      doc.text(lines, 20, yPos);
      yPos += lines.length * 5 + 10;
    });
  }

  doc.save(`${filename}.pdf`);
}

// Export history management
const EXPORT_HISTORY_KEY = 'mmc-export-history';

export function getExportHistory(): ExportHistoryItem[] {
  try {
    const stored = localStorage.getItem(EXPORT_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToExportHistory(item: Omit<ExportHistoryItem, 'id' | 'createdAt'>): void {
  const history = getExportHistory();
  history.unshift({ ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  localStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

export function clearExportHistory(): void {
  localStorage.removeItem(EXPORT_HISTORY_KEY);
}

// Export dataset to CSV
export async function exportDatasetToCSV(datasetId: string): Promise<string> {
  const dataset = await db.datasets.get(datasetId);
  if (!dataset) throw new Error('Dataset not found');

  const chunks = await db.datasetChunks
    .where('datasetId')
    .equals(datasetId)
    .sortBy('index');

  const headers = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];
  const rows: string[] = [headers.join(',')];

  for (const chunk of chunks) {
    for (const row of chunk.rows) {
      const [ts, o, h, l, c, v] = row;
      rows.push(`${new Date(ts).toISOString()},${o},${h},${l},${c},${v}`);
    }
  }

  return rows.join('\n');
}

// Export dataset to JSON
export async function exportDatasetToJSON(datasetId: string): Promise<string> {
  const dataset = await db.datasets.get(datasetId);
  if (!dataset) throw new Error('Dataset not found');

  const chunks = await db.datasetChunks
    .where('datasetId')
    .equals(datasetId)
    .sortBy('index');

  const bars: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> = [];

  for (const chunk of chunks) {
    for (const row of chunk.rows) {
      const [ts, o, h, l, c, v] = row;
      bars.push({
        timestamp: new Date(ts).toISOString(),
        open: o,
        high: h,
        low: l,
        close: c,
        volume: v,
      });
    }
  }

  return JSON.stringify({
    metadata: {
      name: dataset.name,
      symbol: dataset.symbol,
      timeframe: dataset.timeframe,
      rowCount: dataset.rowCount,
      rangeFrom: new Date(dataset.rangeFromTs).toISOString(),
      rangeTo: new Date(dataset.rangeToTs).toISOString(),
      exportedAt: new Date().toISOString(),
    },
    bars,
  }, null, 2);
}

// Export results to CSV
export function exportResultsToCSV(trades: Array<{
  entryTime: number | string;
  exitTime: number | string;
  symbol: string;
  direction: string;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  commission: number;
}>): string {
  const headers = ['Entry Time', 'Exit Time', 'Symbol', 'Direction', 'Entry Price', 'Exit Price', 'P&L', 'P&L %', 'Commission'];
  const rows = trades.map(t => [
    typeof t.entryTime === 'number' ? new Date(t.entryTime).toISOString() : t.entryTime,
    typeof t.exitTime === 'number' ? new Date(t.exitTime).toISOString() : t.exitTime,
    t.symbol,
    t.direction,
    t.entryPrice.toFixed(4),
    t.exitPrice.toFixed(4),
    t.pnl.toFixed(2),
    t.pnlPercent.toFixed(4),
    t.commission.toFixed(2),
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// Export results to JSON
export function exportResultsToJSON(results: {
  symbol?: string;
  dateRange?: string;
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  trades: unknown[];
  equityCurve?: number[];
}): string {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    summary: {
      symbol: results.symbol,
      dateRange: results.dateRange,
      netProfit: results.netProfit,
      grossProfit: results.grossProfit,
      grossLoss: results.grossLoss,
      maxDrawdownPercent: results.maxDrawdownPercent,
      sharpeRatio: results.sharpeRatio,
      winRate: results.winRate,
      profitFactor: results.profitFactor,
      totalTrades: results.totalTrades,
    },
    trades: results.trades,
    equityCurve: results.equityCurve,
  }, null, 2);
}

// Export results to HTML report
export function exportResultsToHTML(results: {
  symbol?: string;
  dateRange?: string;
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  sortinoRatio?: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  cagr?: number;
  expectancyR?: number;
  trades: Array<{
    id?: string;
    entryTime: number | string;
    exitTime: number | string;
    direction: string;
    pnl: number;
  }>;
  equityCurve?: number[];
}): string {
  const profitClass = results.netProfit >= 0 ? '#22c55e' : '#ef4444';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Backtest Report - ${results.symbol || 'Strategy'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      max-width: 1200px; 
      margin: 0 auto; 
      padding: 40px 20px; 
      background: linear-gradient(135deg, #0a0e14 0%, #1a1f2e 100%); 
      color: #f0f0f0; 
      min-height: 100vh;
    }
    h1 { color: #00d4ff; font-size: 2.5rem; margin-bottom: 10px; }
    h2 { color: #888; font-size: 1.2rem; margin: 30px 0 15px; }
    .subtitle { color: #666; margin-bottom: 30px; }
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 25px 0; }
    .stat-card { 
      background: linear-gradient(145deg, #1a1f2e 0%, #151a27 100%); 
      padding: 20px; 
      border-radius: 12px; 
      border: 1px solid #2a3040;
      transition: transform 0.2s;
    }
    .stat-card:hover { transform: translateY(-2px); }
    .stat-label { color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-value { font-size: 28px; font-weight: 700; margin-top: 8px; font-variant-numeric: tabular-nums; }
    .positive { color: #22c55e; }
    .negative { color: #ef4444; }
    .neutral { color: #00d4ff; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #2a3040; }
    th { background: #1a1f2e; color: #00d4ff; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
    tr:hover { background: rgba(0,212,255,0.05); }
    .badge { 
      display: inline-block; 
      padding: 4px 10px; 
      border-radius: 20px; 
      font-size: 11px; 
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-long { background: rgba(34,197,94,0.2); color: #22c55e; }
    .badge-short { background: rgba(239,68,68,0.2); color: #ef4444; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #2a3040; color: #666; font-size: 12px; }
    @media print { body { background: white; color: black; } .stat-card { border: 1px solid #ddd; } }
  </style>
</head>
<body>
  <h1>📊 Backtest Report</h1>
  <p class="subtitle">${results.symbol || 'Strategy'} | ${results.dateRange || 'All Data'} | Generated: ${new Date().toLocaleString()}</p>
  
  <h2>Performance Summary</h2>
  <div class="stat-grid">
    <div class="stat-card">
      <div class="stat-label">Net Profit</div>
      <div class="stat-value" style="color: ${profitClass}">₹${results.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Win Rate</div>
      <div class="stat-value neutral">${results.winRate.toFixed(1)}%</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Profit Factor</div>
      <div class="stat-value neutral">${results.profitFactor.toFixed(2)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Sharpe Ratio</div>
      <div class="stat-value neutral">${results.sharpeRatio.toFixed(2)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Max Drawdown</div>
      <div class="stat-value negative">-${results.maxDrawdownPercent.toFixed(1)}%</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Trades</div>
      <div class="stat-value">${results.totalTrades}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Winning Trades</div>
      <div class="stat-value positive">${results.winningTrades}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Losing Trades</div>
      <div class="stat-value negative">${results.losingTrades}</div>
    </div>
  </div>

  ${results.cagr !== undefined ? `
  <h2>Advanced Metrics</h2>
  <div class="stat-grid">
    <div class="stat-card">
      <div class="stat-label">CAGR</div>
      <div class="stat-value neutral">${results.cagr.toFixed(2)}%</div>
    </div>
    ${results.sortinoRatio !== undefined ? `
    <div class="stat-card">
      <div class="stat-label">Sortino Ratio</div>
      <div class="stat-value neutral">${results.sortinoRatio.toFixed(2)}</div>
    </div>` : ''}
    ${results.expectancyR !== undefined ? `
    <div class="stat-card">
      <div class="stat-label">Expectancy (R)</div>
      <div class="stat-value neutral">${results.expectancyR.toFixed(2)}</div>
    </div>` : ''}
  </div>` : ''}
  
  <h2>Trade Log (${results.trades.length} trades)</h2>
  <table>
    <thead>
      <tr>
        <th>Entry Time</th>
        <th>Exit Time</th>
        <th>Direction</th>
        <th>P&L</th>
      </tr>
    </thead>
    <tbody>
      ${results.trades.slice(0, 100).map(t => `
        <tr>
          <td>${typeof t.entryTime === 'number' ? new Date(t.entryTime).toLocaleString() : t.entryTime}</td>
          <td>${typeof t.exitTime === 'number' ? new Date(t.exitTime).toLocaleString() : t.exitTime}</td>
          <td><span class="badge badge-${t.direction}">${t.direction.toUpperCase()}</span></td>
          <td class="${t.pnl >= 0 ? 'positive' : 'negative'}">₹${t.pnl.toFixed(0)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ${results.trades.length > 100 ? `<p style="color:#666;margin-top:15px;font-size:13px;">Showing first 100 of ${results.trades.length} trades</p>` : ''}
  
  <div class="footer">
    <p>Generated by Abacus Backtesting Platform | ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>`;
}
