/**
 * PDF Export Utility
 * Spec: PDF via local jsPDF with embedded fonts
 * Enhanced: Multi-page reports with equity curve visualization
 */

import jsPDF from 'jspdf';
import type { BacktestMetrics, Trade } from '@/db';

interface PDFExportOptions {
  title: string;
  metrics: BacktestMetrics;
  trades: Trade[];
  equity?: number[];
  settings?: {
    dataset: string;
    strategy: string;
    dateRange: string;
  };
  includeAllTrades?: boolean;
  includeEquityChart?: boolean;
  includeMonthlyBreakdown?: boolean;
}

// Helper to draw a mini equity curve
function drawEquityCurve(doc: jsPDF, equity: number[], x: number, y: number, width: number, height: number) {
  if (equity.length < 2) return;

  const minVal = Math.min(...equity);
  const maxVal = Math.max(...equity);
  const range = maxVal - minVal || 1;

  // Background
  doc.setFillColor(248, 250, 252);
  doc.rect(x, y, width, height, 'F');

  // Border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(x, y, width, height, 'S');

  // Draw the curve
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.8);

  const points: [number, number][] = equity.map((val, idx) => [
    x + (idx / (equity.length - 1)) * width,
    y + height - ((val - minVal) / range) * height
  ]);

  for (let i = 1; i < points.length; i++) {
    doc.line(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
  }

  // Fill area under curve
  doc.setFillColor(59, 130, 246);
  doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
  
  // Labels
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`₹${maxVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, x + 2, y + 8);
  doc.text(`₹${minVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, x + 2, y + height - 3);
}

// Helper to calculate monthly P&L
function getMonthlyBreakdown(trades: Trade[]): { month: string; pnl: number; trades: number }[] {
  const monthlyMap = new Map<string, { pnl: number; trades: number }>();

  trades.forEach(trade => {
    const date = new Date(trade.exitTs);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyMap.get(key) || { pnl: 0, trades: 0 };
    monthlyMap.set(key, { pnl: existing.pnl + trade.pnl, trades: existing.trades + 1 });
  });

  return Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => ({ month, ...data }));
}

export async function exportToPDF(options: PDFExportOptions): Promise<void> {
  const { title, metrics, trades, equity, settings, includeAllTrades, includeEquityChart = true, includeMonthlyBreakdown = true } = options;
  const doc = new jsPDF();

  // Colors - typed as tuples
  const primaryColor: [number, number, number] = [59, 130, 246];
  const successColor: [number, number, number] = [34, 197, 94];
  const dangerColor: [number, number, number] = [239, 68, 68];
  const mutedColor: [number, number, number] = [148, 163, 184];
  const darkBg: [number, number, number] = [15, 23, 42];
  const textDark: [number, number, number] = [30, 41, 59];
  const white: [number, number, number] = [255, 255, 255];
  const lightBg: [number, number, number] = [248, 250, 252];

  let y = 20;

  // ===== PAGE 1: SUMMARY =====
  
  // Header
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(0, 0, 210, 45, 'F');
  
  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(title || 'Backtest Report', 15, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 34);
  
  // Version badge
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(15, 38, 30, 5, 1, 1, 'F');
  doc.setFontSize(7);
  doc.text('MMC v3.0', 17, 42);

  y = 55;

  // Settings Summary
  if (settings) {
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(15, y - 5, 180, 15, 2, 2, 'F');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dataset: ${settings.dataset}  •  Strategy: ${settings.strategy}  •  Period: ${settings.dateRange}`, 20, y + 3);
    y += 20;
  }

  // Performance Summary Cards
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Performance Summary', 15, y);
  y += 8;

  // Draw 4 summary cards
  const cardWidth = 42;
  const cardHeight = 30;
  const cardGap = 4;
  const summaryCards = [
    { label: 'Net Profit', value: `₹${metrics.netProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: metrics.netProfit >= 0 ? successColor : dangerColor },
    { label: 'Win Rate', value: `${metrics.winRate.toFixed(1)}%`, color: metrics.winRate >= 50 ? successColor : dangerColor },
    { label: 'Max Drawdown', value: `${metrics.maxDrawdownPct.toFixed(2)}%`, color: dangerColor },
    { label: 'Sharpe Ratio', value: metrics.sharpeRatio.toFixed(2), color: metrics.sharpeRatio >= 1 ? successColor : primaryColor },
  ];

  summaryCards.forEach((card, idx) => {
    const cardX = 15 + idx * (cardWidth + cardGap);
    
    // Card background
    doc.setFillColor(white[0], white[1], white[2]);
    doc.roundedRect(cardX, y, cardWidth, cardHeight, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, y, cardWidth, cardHeight, 2, 2, 'S');
    
    // Label
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(card.label, cardX + 4, y + 8);
    
    // Value
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.value, cardX + 4, y + 20);
  });

  y += cardHeight + 15;

  // Equity Curve Section
  if (includeEquityChart && equity && equity.length > 1) {
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Equity Curve', 15, y);
    y += 5;
    
    drawEquityCurve(doc, equity, 15, y, 180, 40);
    y += 50;
  }

  // Key Metrics Grid
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Detailed Metrics', 15, y);
  y += 8;

  const metricsData = [
    { label: 'Sortino Ratio', value: metrics.sortinoRatio.toFixed(2), positive: metrics.sortinoRatio > 1 },
    { label: 'Profit Factor', value: metrics.profitFactor.toFixed(2), positive: metrics.profitFactor > 1.5 },
    { label: 'Total Trades', value: metrics.totalTrades.toString(), positive: true },
    { label: 'Winning Trades', value: metrics.winningTrades.toString(), positive: true },
    { label: 'Losing Trades', value: metrics.losingTrades.toString(), positive: false },
    { label: 'Avg Hold (bars)', value: metrics.avgHoldBars.toFixed(1), positive: true },
    { label: 'Avg Win', value: `₹${metrics.avgWin.toFixed(0)}`, positive: true },
    { label: 'Avg Loss', value: `₹${Math.abs(metrics.avgLoss).toFixed(0)}`, positive: false },
    { label: 'Expectancy', value: `₹${metrics.expectancy.toFixed(0)}`, positive: metrics.expectancy > 0 },
    { label: 'Recovery Factor', value: (metrics.recoveryFactor || 0).toFixed(2), positive: (metrics.recoveryFactor || 0) > 1 },
    { label: 'Gross Profit', value: `₹${metrics.grossProfit.toFixed(0)}`, positive: true },
    { label: 'Gross Loss', value: `₹${Math.abs(metrics.grossLoss).toFixed(0)}`, positive: false },
  ];

  doc.setFontSize(9);
  const colWidth = 60;
  const rowHeight = 8;
  const cols = 3;

  metricsData.forEach((metric, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 15 + col * colWidth;
    const currentY = y + row * rowHeight;

    // Background for alternating rows
    if (row % 2 === 0) {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(15, currentY - 4, 180, rowHeight, 'F');
    }

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(metric.label, x, currentY);

    // Value
    doc.setFont('helvetica', 'bold');
    if (metric.positive) {
      doc.setTextColor(successColor[0], successColor[1], successColor[2]);
    } else {
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    }
    doc.text(metric.value, x + 35, currentY);
  });

  y += Math.ceil(metricsData.length / cols) * rowHeight + 10;

  // Monthly Breakdown (if space permits and enabled)
  if (includeMonthlyBreakdown && trades.length > 0 && y < 220) {
    const monthlyData = getMonthlyBreakdown(trades);
    
    if (monthlyData.length > 0) {
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Monthly P&L Breakdown', 15, y);
      y += 6;

      // Draw monthly bars (max 12 months)
      const displayMonths = monthlyData.slice(-12);
      const barWidth = 14;
      const maxPnl = Math.max(...displayMonths.map(m => Math.abs(m.pnl)));
      const barAreaHeight = 25;

      displayMonths.forEach((month, idx) => {
        const barX = 15 + idx * (barWidth + 1);
        const barHeight = maxPnl > 0 ? (Math.abs(month.pnl) / maxPnl) * barAreaHeight : 0;
        const isPositive = month.pnl >= 0;

        // Bar
        doc.setFillColor(isPositive ? successColor[0] : dangerColor[0], isPositive ? successColor[1] : dangerColor[1], isPositive ? successColor[2] : dangerColor[2]);
        doc.rect(barX, y + barAreaHeight - barHeight, barWidth - 2, barHeight, 'F');

        // Month label
        doc.setFontSize(6);
        doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
        doc.text(month.month.slice(5), barX + 2, y + barAreaHeight + 5);
      });

      y += barAreaHeight + 15;
    }
  }

  // Footer
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(0, 280, 210, 17, 'F');
  
  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Generated by MMC — AI-Engineered Trading Intelligence Platform', 15, 289);
  doc.text('Page 1', 190, 289);

  // ===== PAGE 2: TRADES TABLE =====
  const tradesToShow = includeAllTrades ? trades : trades.slice(0, 50);
  
  if (tradesToShow.length > 0) {
    doc.addPage();
    
    // Header
    doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.rect(0, 0, 210, 25, 'F');
    
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Trade History (${tradesToShow.length} of ${trades.length})`, 15, 17);

    y = 35;

    // Table header
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(15, y - 5, 180, 10, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);

    const headers = ['#', 'Entry Date', 'Exit Date', 'Dir', 'Entry', 'Exit', 'P&L', 'Bars', 'Reason'];
    const colWidths = [10, 25, 25, 15, 25, 25, 25, 15, 30];
    let x = 15;

    headers.forEach((header, i) => {
      doc.text(header, x, y);
      x += colWidths[i];
    });

    y += 8;

    // Table rows
    doc.setFont('helvetica', 'normal');
    let pageNum = 2;

    tradesToShow.forEach((trade, idx) => {
      if (y > 275) {
        // Footer
        doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
        doc.rect(0, 280, 210, 17, 'F');
        doc.setTextColor(white[0], white[1], white[2]);
        doc.setFontSize(8);
        doc.text(`Page ${pageNum}`, 190, 289);
        
        // New page
        doc.addPage();
        pageNum++;
        y = 20;
        
        // Repeat header
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.rect(15, y - 5, 180, 10, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        x = 15;
        headers.forEach((header, i) => {
          doc.text(header, x, y);
          x += colWidths[i];
        });
        y += 8;
        doc.setFont('helvetica', 'normal');
      }

      // Alternating row background
      if (idx % 2 === 0) {
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.rect(15, y - 4, 180, 7, 'F');
      }

      x = 15;
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);

      // Trade number
      doc.text(String(idx + 1), x, y);
      x += colWidths[0];

      // Entry date
      doc.text(new Date(trade.entryTs).toLocaleDateString(), x, y);
      x += colWidths[1];

      // Exit date
      doc.text(new Date(trade.exitTs).toLocaleDateString(), x, y);
      x += colWidths[2];

      // Direction
      doc.setTextColor(trade.direction === 'long' ? successColor[0] : dangerColor[0], trade.direction === 'long' ? successColor[1] : dangerColor[1], trade.direction === 'long' ? successColor[2] : dangerColor[2]);
      doc.text(trade.direction.toUpperCase(), x, y);
      x += colWidths[3];

      // Entry price
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(trade.entryPrice.toFixed(2), x, y);
      x += colWidths[4];

      // Exit price
      doc.text(trade.exitPrice.toFixed(2), x, y);
      x += colWidths[5];

      // P&L
      if (trade.pnl >= 0) {
        doc.setTextColor(successColor[0], successColor[1], successColor[2]);
      } else {
        doc.setTextColor(dangerColor[0], dangerColor[1], dangerColor[2]);
      }
      doc.text(`₹${trade.pnl.toFixed(0)}`, x, y);
      x += colWidths[6];

      // Bars held
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.text(String(trade.holdBars || '-'), x, y);
      x += colWidths[7];

      // Exit reason
      doc.text(trade.exitReason.slice(0, 15), x, y);

      y += 7;
    });

    // Final footer
    doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.rect(0, 280, 210, 17, 'F');
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(8);
    doc.text('Generated by MMC', 15, 289);
    doc.text(`Page ${pageNum}`, 190, 289);
  }

  // Save
  const filename = `backtest-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

/**
 * Export analytics report as PDF
 */
export async function exportAnalyticsPDF(
  metrics: BacktestMetrics,
  trades: Trade[],
  runName: string
): Promise<void> {
  return exportToPDF({
    title: runName || 'Backtest Analytics Report',
    metrics,
    trades,
    settings: {
      dataset: 'N/A',
      strategy: runName,
      dateRange: trades.length > 0 
        ? `${new Date(trades[0].entryTs).toLocaleDateString()} - ${new Date(trades[trades.length - 1].exitTs).toLocaleDateString()}`
        : 'N/A'
    }
  });
}
