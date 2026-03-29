/**
 * Shared trade metrics module — single source of truth
 * Used by: useTradesDB, TradeReports, AIAnalysisTabs, GrowthRoadmap, BehavioralDiagnostics, PropFirmTracker
 * 
 * RULES:
 * - Win rate denominator = decisive trades (wins + losses), excluding breakeven
 * - net_pnl = pnl - fees (if not pre-computed)
 * - fees default to 0 if null
 * - Sharpe/Sortino are NOT annualized (per-trade basis) for journal context
 * - "Insufficient sample" threshold = 5 trades minimum
 */

import type { Trade, TradeStats } from '@/hooks/useTradesDB';

export const MIN_SAMPLE_SIZE = 5;

/** Safely get net_pnl, handling null from DB */
export function safeNetPnl(t: Pick<Trade, 'net_pnl' | 'pnl' | 'fees'>): number {
  if (t.net_pnl != null) return t.net_pnl;
  return (t.pnl ?? 0) - (t.fees ?? 0);
}

/** Safely get fees, handling null from DB */
export function safeFees(t: Pick<Trade, 'fees'>): number {
  return t.fees ?? 0;
}

/** Compute full stats from a list of trades */
export function computeTradeStats(trades: Trade[]): TradeStats | null {
  const closed = trades.filter(t => t.status === 'closed');
  if (closed.length === 0) return null;

  const wins = closed.filter(t => safeNetPnl(t) > 0);
  const losses = closed.filter(t => safeNetPnl(t) < 0);
  const totalPnL = closed.reduce((s, t) => s + safeNetPnl(t), 0);
  const grossWin = wins.reduce((s, t) => s + safeNetPnl(t), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + safeNetPnl(t), 0));

  // Win rate: decisive trades only (excludes breakeven)
  const decisiveTrades = wins.length + losses.length;

  // Streaks
  let longestWin = 0, longestLoss = 0, curWin = 0, curLoss = 0;
  const sorted = [...closed].sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
  for (const t of sorted) {
    if (safeNetPnl(t) > 0) { curWin++; curLoss = 0; longestWin = Math.max(longestWin, curWin); }
    else if (safeNetPnl(t) < 0) { curLoss++; curWin = 0; longestLoss = Math.max(longestLoss, curLoss); }
    else { /* breakeven — don't break streak */ }
  }

  let currentStreak: { type: 'win' | 'loss'; count: number } = { type: 'win', count: 0 };
  const last = sorted[sorted.length - 1];
  if (last) {
    currentStreak = {
      type: safeNetPnl(last) >= 0 ? 'win' : 'loss',
      count: safeNetPnl(last) > 0 ? curWin : safeNetPnl(last) < 0 ? curLoss : 0,
    };
  }

  // Max drawdown
  let peak = 0, maxDD = 0, running = 0;
  for (const t of sorted) {
    running += safeNetPnl(t);
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDD) maxDD = dd;
  }

  const rMultiples = closed.filter(t => t.r_multiple != null).map(t => t.r_multiple!);

  return {
    totalTrades: closed.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    totalPnL,
    winRate: decisiveTrades > 0 ? (wins.length / decisiveTrades) * 100 : 0,
    avgWin: wins.length > 0 ? grossWin / wins.length : 0,
    avgLoss: losses.length > 0 ? grossLoss / losses.length : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
    expectancy: closed.length > 0 ? totalPnL / closed.length : 0,
    maxDrawdown: maxDD,
    bestTrade: Math.max(...closed.map(t => safeNetPnl(t))),
    worstTrade: Math.min(...closed.map(t => safeNetPnl(t))),
    avgRMultiple: rMultiples.length > 0 ? rMultiples.reduce((s, r) => s + r, 0) / rMultiples.length : 0,
    currentStreak,
    longestWinStreak: longestWin,
    longestLossStreak: longestLoss,
  };
}

/** Extended metrics for reports (Sharpe, Sortino, etc.) */
export function computeExtendedMetrics(closed: Trade[]) {
  if (closed.length === 0) return null;

  const wins = closed.filter(t => safeNetPnl(t) > 0);
  const losses = closed.filter(t => safeNetPnl(t) < 0);
  const pnls = closed.map(t => safeNetPnl(t));
  const totalPnL = pnls.reduce((s, p) => s + p, 0);
  const grossWin = wins.reduce((s, t) => s + safeNetPnl(t), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + safeNetPnl(t), 0));
  const decisiveTrades = wins.length + losses.length;
  const mean = totalPnL / closed.length;
  const variance = pnls.reduce((s, p) => s + (p - mean) ** 2, 0) / closed.length;
  const stdDev = Math.sqrt(variance);
  const downside = pnls.filter(p => p < 0);
  const downsideVar = downside.length > 0 ? downside.reduce((s, p) => s + p ** 2, 0) / downside.length : 1;
  const downsideDev = Math.sqrt(downsideVar);

  // Max DD
  let peak = 0, maxDD = 0, running = 0;
  const sorted = [...closed].sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
  for (const t of sorted) {
    running += safeNetPnl(t);
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDD) maxDD = dd;
  }

  const rMultiples = closed.filter(t => t.r_multiple != null).map(t => t.r_multiple!);

  return {
    totalTrades: closed.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    breakeven: closed.length - wins.length - losses.length,
    winRate: decisiveTrades > 0 ? (wins.length / decisiveTrades) * 100 : 0,
    totalPnL,
    grossProfit: grossWin,
    grossLoss: -grossLoss,
    avgWin: wins.length > 0 ? grossWin / wins.length : 0,
    avgLoss: losses.length > 0 ? grossLoss / losses.length : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
    expectancy: mean,
    maxDrawdown: maxDD,
    bestTrade: Math.max(...pnls),
    worstTrade: Math.min(...pnls),
    avgTrade: mean,
    stdDev,
    sharpeRatio: stdDev > 0 ? mean / stdDev : 0,
    sortinoRatio: downsideDev > 0 ? mean / downsideDev : 0,
    recoveryFactor: maxDD > 0 ? totalPnL / maxDD : totalPnL > 0 ? Infinity : 0,
    avgRMultiple: rMultiples.length > 0 ? rMultiples.reduce((s, r) => s + r, 0) / rMultiples.length : 0,
    totalFees: closed.reduce((s, t) => s + safeFees(t), 0),
    avgHoldingTime: 'N/A' as const,
    longWinRate: (() => {
      const longs = closed.filter(t => t.direction === 'long');
      const longWins = longs.filter(t => safeNetPnl(t) > 0);
      const longLosses = longs.filter(t => safeNetPnl(t) < 0);
      const decisive = longWins.length + longLosses.length;
      return decisive > 0 ? (longWins.length / decisive) * 100 : 0;
    })(),
    shortWinRate: (() => {
      const shorts = closed.filter(t => t.direction === 'short');
      const shortWins = shorts.filter(t => safeNetPnl(t) > 0);
      const shortLosses = shorts.filter(t => safeNetPnl(t) < 0);
      const decisive = shortWins.length + shortLosses.length;
      return decisive > 0 ? (shortWins.length / decisive) * 100 : 0;
    })(),
  };
}

/** Escape a CSV field value (handle commas, quotes, newlines) */
export function escapeCSVField(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
