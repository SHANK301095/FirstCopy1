/**
 * Excel Export Module
 * Spec: One .xlsx with multi-sheet output
 * Uses exceljs for local generation
 */

import type { TesterRunResult, EAInfo, MT5Metrics, MT5Trade } from '@/types/electron-api';
import type { ExcelOverviewRow, ExcelRankingRow, ExcelTradeRow, DesktopSettings } from '../mt5/types';

// Dynamic import for exceljs (tree-shakable)
async function getExcelJS() {
  const ExcelJS = await import('exceljs');
  return ExcelJS.default || ExcelJS;
}

interface ExcelExportOptions {
  bulkSetName: string;
  runs: TesterRunResult[];
  eaInfos: Record<string, EAInfo>;
  settings?: DesktopSettings;
  includeDataQuality?: boolean;
  includeSettings?: boolean;
}

/**
 * Generate Excel file with all required sheets
 */
export async function generateExcelReport(options: ExcelExportOptions): Promise<Uint8Array> {
  const ExcelJS = await getExcelJS();
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'MMC';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  // 1. Overview_Compare sheet
  await addOverviewSheet(workbook, options);
  
  // 2. Rankings sheet
  await addRankingsSheet(workbook, options);
  
  // 3. Per-EA sheets
  await addPerEASheets(workbook, options);
  
  // 4. Optional: Data_Quality sheet
  if (options.includeDataQuality) {
    await addDataQualitySheet(workbook, options);
  }
  
  // 5. Optional: Settings_Snapshot sheet
  if (options.includeSettings && options.settings) {
    await addSettingsSheet(workbook, options);
  }
  
  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}

/**
 * Overview_Compare sheet with PASS/FAIL status
 */
async function addOverviewSheet(workbook: any, options: ExcelExportOptions): Promise<void> {
  const sheet = workbook.addWorksheet('Overview_Compare', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });
  
  // Define columns
  sheet.columns = [
    { header: 'Rank', key: 'rank', width: 6 },
    { header: 'EA Name', key: 'eaName', width: 25 },
    { header: 'Preset', key: 'presetName', width: 20 },
    { header: 'Net Profit', key: 'netProfit', width: 14 },
    { header: 'Max DD', key: 'maxDrawdown', width: 12 },
    { header: 'Max DD %', key: 'maxDrawdownPct', width: 10 },
    { header: 'Profit Factor', key: 'profitFactor', width: 12 },
    { header: 'Sharpe', key: 'sharpeRatio', width: 10 },
    { header: 'Total Trades', key: 'totalTrades', width: 12 },
    { header: 'Win Rate %', key: 'winRate', width: 10 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Error', key: 'errorText', width: 30 },
    { header: 'Duration (s)', key: 'duration', width: 12 },
    { header: 'Timestamp', key: 'timestamp', width: 18 },
  ];
  
  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  // Sort by net profit descending
  const sortedRuns = [...options.runs].sort((a, b) => 
    (b.metrics?.netProfit || 0) - (a.metrics?.netProfit || 0)
  );
  
  // Add data rows
  sortedRuns.forEach((run, index) => {
    const eaInfo = Object.values(options.eaInfos).find(ea => 
      run.runId.includes(ea.id) || ea.name === run.runId.split('_')[0]
    );
    
    const row: ExcelOverviewRow = {
      rank: index + 1,
      eaName: eaInfo?.name || 'Unknown',
      presetName: 'Default',
      netProfit: run.metrics?.netProfit || 0,
      maxDrawdown: run.metrics?.maxDrawdown || 0,
      maxDrawdownPct: run.metrics?.maxDrawdownPct || 0,
      profitFactor: run.metrics?.profitFactor || 0,
      sharpeRatio: run.metrics?.sharpeRatio || 0,
      totalTrades: run.metrics?.totalTrades || 0,
      winRate: run.metrics?.winRate || 0,
      status: run.cached ? 'REUSED' : run.success ? 'PASS' : 'FAIL',
      errorText: run.error,
      duration: run.duration / 1000,
      timestamp: Date.now(),
    };
    
    const dataRow = sheet.addRow(row);
    
    // Conditional formatting for status
    const statusCell = dataRow.getCell('status');
    if (row.status === 'PASS') {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF22C55E' },
      };
    } else if (row.status === 'FAIL') {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEF4444' },
      };
    } else {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' },
      };
    }
    
    // Format numbers
    dataRow.getCell('netProfit').numFmt = '₹#,##0.00';
    dataRow.getCell('maxDrawdown').numFmt = '₹#,##0.00';
    dataRow.getCell('maxDrawdownPct').numFmt = '0.00%';
    dataRow.getCell('profitFactor').numFmt = '0.00';
    dataRow.getCell('sharpeRatio').numFmt = '0.00';
    dataRow.getCell('winRate').numFmt = '0.00%';
  });
  
  // Add totals row
  const totalRow = sheet.addRow({
    rank: '',
    eaName: 'TOTAL / AVERAGE',
    presetName: '',
    netProfit: sortedRuns.reduce((sum, r) => sum + (r.metrics?.netProfit || 0), 0),
    maxDrawdown: Math.max(...sortedRuns.map(r => r.metrics?.maxDrawdown || 0)),
    maxDrawdownPct: Math.max(...sortedRuns.map(r => r.metrics?.maxDrawdownPct || 0)),
    profitFactor: sortedRuns.reduce((sum, r) => sum + (r.metrics?.profitFactor || 0), 0) / sortedRuns.length,
    sharpeRatio: sortedRuns.reduce((sum, r) => sum + (r.metrics?.sharpeRatio || 0), 0) / sortedRuns.length,
    totalTrades: sortedRuns.reduce((sum, r) => sum + (r.metrics?.totalTrades || 0), 0),
    winRate: sortedRuns.reduce((sum, r) => sum + (r.metrics?.winRate || 0), 0) / sortedRuns.length,
    status: `${sortedRuns.filter(r => r.success).length}/${sortedRuns.length}`,
    errorText: '',
    duration: sortedRuns.reduce((sum, r) => sum + r.duration, 0) / 1000,
    timestamp: '',
  });
  totalRow.font = { bold: true };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };
}

/**
 * Rankings sheet with Top 10 lists
 */
async function addRankingsSheet(workbook: any, options: ExcelExportOptions): Promise<void> {
  const sheet = workbook.addWorksheet('Rankings');
  
  const successfulRuns = options.runs.filter(r => r.success && r.metrics);
  
  // Helper to create ranking section
  const addRankingSection = (
    startRow: number,
    title: string,
    data: { eaName: string; value: number }[]
  ) => {
    sheet.getCell(`A${startRow}`).value = title;
    sheet.getCell(`A${startRow}`).font = { bold: true, size: 14 };
    sheet.mergeCells(`A${startRow}:C${startRow}`);
    
    sheet.getCell(`A${startRow + 1}`).value = 'Rank';
    sheet.getCell(`B${startRow + 1}`).value = 'EA Name';
    sheet.getCell(`C${startRow + 1}`).value = 'Value';
    sheet.getRow(startRow + 1).font = { bold: true };
    
    data.slice(0, 10).forEach((item, i) => {
      sheet.getCell(`A${startRow + 2 + i}`).value = i + 1;
      sheet.getCell(`B${startRow + 2 + i}`).value = item.eaName;
      sheet.getCell(`C${startRow + 2 + i}`).value = item.value;
    });
  };
  
  // Top 10 by Return
  const byReturn = successfulRuns
    .map(r => ({
      eaName: r.runId,
      value: r.metrics!.netProfit,
    }))
    .sort((a, b) => b.value - a.value);
  addRankingSection(1, 'Top 10 by Return', byReturn);
  
  // Top 10 by Lowest DD
  const byDD = successfulRuns
    .map(r => ({
      eaName: r.runId,
      value: r.metrics!.maxDrawdownPct,
    }))
    .sort((a, b) => a.value - b.value);
  addRankingSection(15, 'Top 10 Lowest Drawdown %', byDD);
  
  // Top 10 by Sharpe
  const bySharpe = successfulRuns
    .map(r => ({
      eaName: r.runId,
      value: r.metrics!.sharpeRatio,
    }))
    .sort((a, b) => b.value - a.value);
  addRankingSection(29, 'Top 10 by Sharpe Ratio', bySharpe);
  
  // Return vs DD Buckets
  sheet.getCell('A43').value = 'Return vs Drawdown Buckets';
  sheet.getCell('A43').font = { bold: true, size: 14 };
  
  const buckets = [
    { label: 'High Return + Low DD', filter: (m: MT5Metrics) => m.netProfit > 5000 && m.maxDrawdownPct < 10 },
    { label: 'High Return + High DD', filter: (m: MT5Metrics) => m.netProfit > 5000 && m.maxDrawdownPct >= 10 },
    { label: 'Low Return + Low DD', filter: (m: MT5Metrics) => m.netProfit <= 5000 && m.maxDrawdownPct < 10 },
    { label: 'Low Return + High DD', filter: (m: MT5Metrics) => m.netProfit <= 5000 && m.maxDrawdownPct >= 10 },
  ];
  
  buckets.forEach((bucket, i) => {
    const count = successfulRuns.filter(r => r.metrics && bucket.filter(r.metrics)).length;
    sheet.getCell(`A${45 + i}`).value = bucket.label;
    sheet.getCell(`B${45 + i}`).value = count;
  });
  
  // Set column widths
  sheet.getColumn('A').width = 30;
  sheet.getColumn('B').width = 25;
  sheet.getColumn('C').width = 15;
}

/**
 * Per-EA detail sheets
 */
async function addPerEASheets(workbook: any, options: ExcelExportOptions): Promise<void> {
  const successfulRuns = options.runs.filter(r => r.success && r.metrics);
  
  successfulRuns.slice(0, 20).forEach((run, index) => {
    const sheetName = `EA_${String(index + 1).padStart(2, '0')}_${run.runId.slice(0, 15)}`;
    const sheet = workbook.addWorksheet(sheetName);
    
    // KPI Summary section
    sheet.getCell('A1').value = 'KPI Summary';
    sheet.getCell('A1').font = { bold: true, size: 14 };
    
    const metrics = run.metrics!;
    const kpis = [
      ['Net Profit', metrics.netProfit],
      ['Gross Profit', metrics.grossProfit],
      ['Gross Loss', metrics.grossLoss],
      ['Profit Factor', metrics.profitFactor],
      ['Sharpe Ratio', metrics.sharpeRatio],
      ['Recovery Factor', metrics.recoveryFactor],
      ['Max Drawdown', metrics.maxDrawdown],
      ['Max Drawdown %', metrics.maxDrawdownPct],
      ['Total Trades', metrics.totalTrades],
      ['Winning Trades', metrics.winningTrades],
      ['Losing Trades', metrics.losingTrades],
      ['Win Rate %', metrics.winRate],
      ['Avg Win', metrics.avgWin],
      ['Avg Loss', metrics.avgLoss],
      ['Largest Win', metrics.largestWin],
      ['Largest Loss', metrics.largestLoss],
    ];
    
    kpis.forEach(([label, value], i) => {
      sheet.getCell(`A${3 + i}`).value = label;
      sheet.getCell(`B${3 + i}`).value = value;
    });
    
    // Equity series (if available)
    if (run.equity && run.equity.length > 0) {
      sheet.getCell('D1').value = 'Equity Curve';
      sheet.getCell('D1').font = { bold: true };
      
      run.equity.slice(0, 500).forEach((val, i) => {
        sheet.getCell(`D${2 + i}`).value = val;
      });
    }
    
    // Drawdown series
    if (run.drawdown && run.drawdown.length > 0) {
      sheet.getCell('E1').value = 'Drawdown';
      sheet.getCell('E1').font = { bold: true };
      
      run.drawdown.slice(0, 500).forEach((val, i) => {
        sheet.getCell(`E${2 + i}`).value = val;
      });
    }
    
    // Trades table
    if (run.trades && run.trades.length > 0) {
      const tradesStartRow = 25;
      sheet.getCell(`A${tradesStartRow}`).value = 'Trades';
      sheet.getCell(`A${tradesStartRow}`).font = { bold: true, size: 14 };
      
      const tradeHeaders = ['Ticket', 'Open Time', 'Close Time', 'Type', 'Lots', 'Open', 'Close', 'Profit', 'Comment'];
      tradeHeaders.forEach((h, i) => {
        sheet.getCell(tradesStartRow + 1, i + 1).value = h;
      });
      sheet.getRow(tradesStartRow + 1).font = { bold: true };
      
      run.trades.slice(0, 100).forEach((trade, i) => {
        const row = tradesStartRow + 2 + i;
        sheet.getCell(row, 1).value = trade.ticket;
        sheet.getCell(row, 2).value = new Date(trade.openTime).toLocaleString();
        sheet.getCell(row, 3).value = new Date(trade.closeTime).toLocaleString();
        sheet.getCell(row, 4).value = trade.type.toUpperCase();
        sheet.getCell(row, 5).value = trade.lots;
        sheet.getCell(row, 6).value = trade.openPrice;
        sheet.getCell(row, 7).value = trade.closePrice;
        sheet.getCell(row, 8).value = trade.profit;
        sheet.getCell(row, 9).value = trade.comment;
      });
    }
    
    // Set column widths
    sheet.getColumn('A').width = 20;
    sheet.getColumn('B').width = 15;
    sheet.getColumn('C').width = 5;
    sheet.getColumn('D').width = 12;
    sheet.getColumn('E').width = 12;
  });
}

/**
 * Data Quality sheet
 */
async function addDataQualitySheet(workbook: any, options: ExcelExportOptions): Promise<void> {
  const sheet = workbook.addWorksheet('Data_Quality');
  
  sheet.getCell('A1').value = 'Data Quality Report';
  sheet.getCell('A1').font = { bold: true, size: 16 };
  
  sheet.getCell('A3').value = 'Bulk Set Name';
  sheet.getCell('B3').value = options.bulkSetName;
  
  sheet.getCell('A4').value = 'Total Runs';
  sheet.getCell('B4').value = options.runs.length;
  
  sheet.getCell('A5').value = 'Successful';
  sheet.getCell('B5').value = options.runs.filter(r => r.success).length;
  
  sheet.getCell('A6').value = 'Failed';
  sheet.getCell('B6').value = options.runs.filter(r => !r.success).length;
  
  sheet.getCell('A7').value = 'Cached/Reused';
  sheet.getCell('B7').value = options.runs.filter(r => r.cached).length;
  
  sheet.getCell('A9').value = 'Generated At';
  sheet.getCell('B9').value = new Date().toLocaleString();
  
  sheet.getColumn('A').width = 20;
  sheet.getColumn('B').width = 30;
}

/**
 * Settings Snapshot sheet
 */
async function addSettingsSheet(workbook: any, options: ExcelExportOptions): Promise<void> {
  if (!options.settings) return;
  
  const sheet = workbook.addWorksheet('Settings_Snapshot');
  
  sheet.getCell('A1').value = 'Settings Snapshot';
  sheet.getCell('A1').font = { bold: true, size: 16 };
  
  const settings = options.settings;
  const entries = [
    ['MT5 MetaEditor Path', settings.mt5Paths.metaeditor],
    ['MT5 Terminal Path', settings.mt5Paths.terminal],
    ['MT5 Data Folder', settings.mt5Paths.dataFolder],
    ['Worker Count', settings.workers.count],
    ['Performance Mode', settings.performance.mode],
    ['Cache Enabled', settings.performance.cacheEnabled],
    ['Default Batch Size', settings.defaults.batchSize],
    ['Default Concurrency', settings.defaults.concurrency],
    ['Default Symbol', settings.defaults.symbol],
    ['Default Period', settings.defaults.period],
    ['Default Deposit', settings.defaults.deposit],
    ['Default Leverage', settings.defaults.leverage],
  ];
  
  entries.forEach(([key, value], i) => {
    sheet.getCell(`A${3 + i}`).value = key;
    sheet.getCell(`B${3 + i}`).value = String(value);
  });
  
  sheet.getColumn('A').width = 25;
  sheet.getColumn('B').width = 50;
}

/**
 * Export to file with locked-file fallback
 */
export async function exportExcelFile(
  options: ExcelExportOptions,
  targetPath: string
): Promise<{ success: boolean; path: string; fallbackUsed: boolean; error?: string }> {
  try {
    const buffer = await generateExcelReport(options);
    
    // Try to write to target path
    const api = window.electronAPI;
    if (!api) {
    // In web mode, trigger download
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
      a.download = targetPath.split('/').pop() || 'backtest-report.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return { success: true, path: targetPath, fallbackUsed: false };
    }
    
    // Try to write via Electron
    try {
      // Convert buffer to base64 for IPC
      const base64 = btoa(String.fromCharCode(...buffer));
      await api.writeFile(targetPath, base64);
      return { success: true, path: targetPath, fallbackUsed: false };
    } catch (writeError) {
      // File might be locked, use timestamped fallback
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fallbackPath = targetPath.replace('.xlsx', `_${timestamp}.xlsx`);
      
      const base64 = btoa(String.fromCharCode(...buffer));
      await api.writeFile(fallbackPath, base64);
      
      return {
        success: true,
        path: fallbackPath,
        fallbackUsed: true,
        error: `Original file locked, saved to: ${fallbackPath}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      path: targetPath,
      fallbackUsed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
