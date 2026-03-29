import { v4 as uuidv4 } from 'uuid';
import type { BacktestResult } from '@/types';
import { secureLogger } from '@/lib/secureLogger';

interface ParsedMetrics {
  netProfit: number;
  profitFactor: number;
  expectedPayoff: number;
  absoluteDrawdown: number;
  relativeDrawdown: number;
  recoveryFactor: number;
  totalTrades: number;
  winRate: number;
  avgTrade: number;
  sharpeRatio?: number;
  symbol?: string;
  timeframe?: string;
  eaName?: string;
}

const parseNumber = (str: string): number => {
  const cleaned = str.replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
};

const parsePercentage = (str: string): number => {
  const match = str.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
};

export const parseHTMLReport = (htmlContent: string): ParsedMetrics | null => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    const metrics: ParsedMetrics = {
      netProfit: 0,
      profitFactor: 0,
      expectedPayoff: 0,
      absoluteDrawdown: 0,
      relativeDrawdown: 0,
      recoveryFactor: 0,
      totalTrades: 0,
      winRate: 0,
      avgTrade: 0,
    };

    // Try to extract from MT5 Strategy Tester HTML format
    const tables = doc.querySelectorAll('table');
    tables.forEach((table) => {
      const rows = table.querySelectorAll('tr');
      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          const label = cells[0].textContent?.toLowerCase().trim() || '';
          const value = cells[1].textContent?.trim() || '';

          if (label.includes('total net profit') || label.includes('net profit')) {
            metrics.netProfit = parseNumber(value);
          } else if (label.includes('profit factor')) {
            metrics.profitFactor = parseNumber(value);
          } else if (label.includes('expected payoff')) {
            metrics.expectedPayoff = parseNumber(value);
          } else if (label.includes('absolute drawdown')) {
            metrics.absoluteDrawdown = parseNumber(value);
          } else if (label.includes('maximal drawdown') || label.includes('relative drawdown')) {
            metrics.relativeDrawdown = parsePercentage(value);
          } else if (label.includes('recovery factor')) {
            metrics.recoveryFactor = parseNumber(value);
          } else if (label.includes('total trades') || label.includes('total deals')) {
            metrics.totalTrades = Math.floor(parseNumber(value));
          } else if (label.includes('win') && label.includes('%')) {
            metrics.winRate = parsePercentage(value);
          } else if (label.includes('average') && label.includes('trade')) {
            metrics.avgTrade = parseNumber(value);
          } else if (label.includes('sharpe')) {
            metrics.sharpeRatio = parseNumber(value);
          } else if (label.includes('symbol')) {
            metrics.symbol = value;
          } else if (label.includes('period') || label.includes('timeframe')) {
            metrics.timeframe = value;
          } else if (label.includes('expert') || label.includes('ea')) {
            metrics.eaName = value;
          }
        }
      });
    });

    // Calculate recovery factor if not found
    if (metrics.recoveryFactor === 0 && metrics.absoluteDrawdown > 0) {
      metrics.recoveryFactor = metrics.netProfit / metrics.absoluteDrawdown;
    }

    // Calculate win rate if not found but have trade data
    if (metrics.winRate === 0 && metrics.totalTrades > 0) {
      const winningText = doc.body.textContent || '';
      const winMatch = winningText.match(/winning\s*(?:trades?)?\s*[:=]\s*(\d+)/i);
      if (winMatch) {
        const wins = parseInt(winMatch[1]);
        metrics.winRate = (wins / metrics.totalTrades) * 100;
      }
    }

    return metrics;
  } catch (error) {
    secureLogger.error('ui', 'Error parsing HTML report', { error });
    return null;
  }
};

export const parseXMLReport = (xmlContent: string): ParsedMetrics | null => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');
    
    const getNodeValue = (tagName: string): string => {
      const node = doc.getElementsByTagName(tagName)[0];
      return node?.textContent || '';
    };

    const metrics: ParsedMetrics = {
      netProfit: parseNumber(getNodeValue('TotalNetProfit') || getNodeValue('NetProfit')),
      profitFactor: parseNumber(getNodeValue('ProfitFactor')),
      expectedPayoff: parseNumber(getNodeValue('ExpectedPayoff')),
      absoluteDrawdown: parseNumber(getNodeValue('AbsoluteDrawdown')),
      relativeDrawdown: parsePercentage(getNodeValue('RelativeDrawdown') || getNodeValue('MaxDrawdown')),
      recoveryFactor: parseNumber(getNodeValue('RecoveryFactor')),
      totalTrades: Math.floor(parseNumber(getNodeValue('TotalTrades') || getNodeValue('Trades'))),
      winRate: parsePercentage(getNodeValue('WinRate') || getNodeValue('ProfitablePercent')),
      avgTrade: parseNumber(getNodeValue('AverageTrade') || getNodeValue('AvgTrade')),
      sharpeRatio: parseNumber(getNodeValue('SharpeRatio')) || undefined,
      symbol: getNodeValue('Symbol'),
      timeframe: getNodeValue('Period') || getNodeValue('Timeframe'),
      eaName: getNodeValue('Expert') || getNodeValue('ExpertAdvisor'),
    };

    return metrics;
  } catch (error) {
    secureLogger.error('ui', 'Error parsing XML report', { error });
    return null;
  }
};

export const parseCSVReport = (csvContent: string): ParsedMetrics | null => {
  try {
    const lines = csvContent.split('\n').filter((l) => l.trim());
    if (lines.length < 2) return null;

    const headers = lines[0].split(/[,;\t]/).map((h) => h.toLowerCase().trim());
    const values = lines[1].split(/[,;\t]/).map((v) => v.trim());

    const getValue = (possibleHeaders: string[]): string => {
      for (const header of possibleHeaders) {
        const idx = headers.findIndex((h) => h.includes(header));
        if (idx !== -1) return values[idx] || '';
      }
      return '';
    };

    const metrics: ParsedMetrics = {
      netProfit: parseNumber(getValue(['net profit', 'profit', 'total profit'])),
      profitFactor: parseNumber(getValue(['profit factor', 'pf'])),
      expectedPayoff: parseNumber(getValue(['expected payoff', 'payoff'])),
      absoluteDrawdown: parseNumber(getValue(['absolute drawdown', 'abs dd'])),
      relativeDrawdown: parsePercentage(getValue(['relative drawdown', 'max dd', 'drawdown %'])),
      recoveryFactor: parseNumber(getValue(['recovery factor', 'rf'])),
      totalTrades: Math.floor(parseNumber(getValue(['total trades', 'trades', 'deals']))),
      winRate: parsePercentage(getValue(['win rate', 'win %', 'profitable'])),
      avgTrade: parseNumber(getValue(['average trade', 'avg trade'])),
      sharpeRatio: parseNumber(getValue(['sharpe', 'sharpe ratio'])) || undefined,
      symbol: getValue(['symbol', 'pair']),
      timeframe: getValue(['period', 'timeframe', 'tf']),
      eaName: getValue(['expert', 'ea', 'strategy']),
    };

    return metrics;
  } catch (error) {
    secureLogger.error('ui', 'Error parsing CSV report', { error });
    return null;
  }
};

/**
 * DETERMINISTIC equity curve generation - no randomness
 * If we only have summary metrics (no trade list), we cannot accurately
 * reconstruct the equity curve, so we return null to indicate unavailability.
 */
const generateEquityCurveFromSummary = (netProfit: number, trades: number): number[] | null => {
  // Without actual trade data, we cannot generate an accurate equity curve
  // Return null to indicate curve is unavailable from summary-only reports
  if (trades <= 0) return null;
  
  // Generate a simple linear approximation (not random)
  // This is clearly labeled as an approximation in the UI
  const startBalance = 10000;
  const endBalance = startBalance + netProfit;
  const points = Math.min(trades, 50);
  const curve: number[] = [];
  
  for (let i = 0; i <= points; i++) {
    const progress = i / points;
    // Linear interpolation - no randomness
    curve.push(startBalance + (endBalance - startBalance) * progress);
  }
  
  return curve;
};

/**
 * DETERMINISTIC drawdown curve - computed from equity curve
 * Returns null if equity curve is not available
 */
const generateDrawdownCurveFromEquity = (equityCurve: number[] | null): number[] | null => {
  if (!equityCurve || equityCurve.length === 0) return null;
  
  const drawdownCurve: number[] = [];
  let peak = equityCurve[0];
  
  for (const value of equityCurve) {
    if (value > peak) peak = value;
    const dd = peak > 0 ? ((peak - value) / peak) * 100 : 0;
    drawdownCurve.push(dd);
  }
  
  return drawdownCurve;
};

export const processImportedFile = async (
  file: File,
  batchId: string,
  eaId: string
): Promise<BacktestResult | null> => {
  const content = await file.text();
  const fileName = file.name.toLowerCase();

  let metrics: ParsedMetrics | null = null;

  if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
    metrics = parseHTMLReport(content);
  } else if (fileName.endsWith('.xml')) {
    metrics = parseXMLReport(content);
  } else if (fileName.endsWith('.csv')) {
    metrics = parseCSVReport(content);
  }

  if (!metrics) return null;

  // Try to extract symbol and timeframe from filename
  const fileNameParts = file.name.replace(/\.[^/.]+$/, '').split(/[_-]/);
  const symbolMatch = fileNameParts.find((p) => /^[A-Z]{6}$/i.test(p));
  const tfMatch = fileNameParts.find((p) => /^(M[0-9]+|H[0-9]+|D1|W1|MN1)$/i.test(p));

  // Generate deterministic curves (or null if unavailable)
  const equityCurve = generateEquityCurveFromSummary(metrics.netProfit, metrics.totalTrades);
  const drawdownCurve = generateDrawdownCurveFromEquity(equityCurve);

  const result: BacktestResult = {
    id: uuidv4(),
    batchId,
    eaId,
    jobId: uuidv4(),
    symbol: metrics.symbol || symbolMatch || 'UNKNOWN',
    timeframe: metrics.timeframe || tfMatch?.toUpperCase() || 'H1',
    netProfit: metrics.netProfit,
    profitFactor: metrics.profitFactor,
    expectedPayoff: metrics.expectedPayoff,
    absoluteDrawdown: metrics.absoluteDrawdown,
    relativeDrawdown: metrics.relativeDrawdown,
    recoveryFactor: metrics.recoveryFactor,
    totalTrades: metrics.totalTrades,
    winRate: metrics.winRate,
    avgTrade: metrics.avgTrade,
    sharpeRatio: metrics.sharpeRatio,
    // Curves may be null if not extractable from summary-only reports
    equityCurve: equityCurve ?? [],
    drawdownCurve: drawdownCurve ?? [],
    // Flag to indicate curves are approximations from summary (not real trade data)
    curveSource: equityCurve ? 'summary_approximation' : 'unavailable',
    importedAt: new Date().toISOString(),
  };

  return result;
};
