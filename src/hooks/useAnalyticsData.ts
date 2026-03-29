/**
 * useAnalyticsData — Extracted analytics computation hook
 * Separates business logic from UI in Analytics page
 */
import { useMemo } from 'react';
import { useTradesDB, type Trade } from '@/hooks/useTradesDB';
import { safeNetPnl, MIN_SAMPLE_SIZE } from '@/lib/tradeMetrics';
import { format, differenceInMinutes, subDays, isAfter } from 'date-fns';

function pct(n: number, d: number) { return d > 0 ? (n / d) * 100 : 0; }

export function useAnalyticsData() {
  const { trades, loading, stats } = useTradesDB();

  const closed = useMemo(() =>
    trades.filter(t => t.status === 'closed').sort((a, b) =>
      new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime()
    ), [trades]);

  const insufficient = closed.length < MIN_SAMPLE_SIZE;

  /* ── Performance ── */
  const perfData = useMemo(() => {
    if (!stats || insufficient) return null;
    let cum = 0, peak = 0;
    const equity = closed.map(t => {
      cum += safeNetPnl(t);
      peak = Math.max(peak, cum);
      return { date: format(new Date(t.entry_time), 'dd MMM'), equity: Math.round(cum), dd: Math.round(cum - peak) };
    });
    const dayMap = new Map<string, number>();
    closed.forEach(t => {
      const d = t.entry_time.slice(0, 10);
      dayMap.set(d, (dayMap.get(d) || 0) + safeNetPnl(t));
    });
    const dailyPnl = [...dayMap.entries()].map(([d, v]) => ({ date: format(new Date(d), 'dd MMM'), pnl: Math.round(v) }));
    return { equity, dailyPnl };
  }, [closed, stats, insufficient]);

  /* ── Behavioral ── */
  const behavioral = useMemo(() => {
    if (insufficient) return null;
    let revengeCount = 0, revengeLoss = 0;
    for (let i = 1; i < closed.length; i++) {
      if (safeNetPnl(closed[i - 1]) < 0) {
        const diff = differenceInMinutes(new Date(closed[i].entry_time), new Date(closed[i - 1].entry_time));
        if (diff < 30) { revengeCount++; if (safeNetPnl(closed[i]) < 0) revengeLoss += Math.abs(safeNetPnl(closed[i])); }
      }
    }
    const dayMap = new Map<string, Trade[]>();
    closed.forEach(t => { const d = t.entry_time.slice(0, 10); dayMap.set(d, [...(dayMap.get(d) || []), t]); });
    const avgPerDay = closed.length / Math.max(1, dayMap.size);
    const overtradeDays = [...dayMap.entries()].filter(([, arr]) => arr.length > avgPerDay * 1.5);
    const overtradeLoss = overtradeDays.reduce((s, [, arr]) => {
      const excess = arr.slice(Math.ceil(avgPerDay));
      return s + excess.reduce((ss, t) => ss + Math.min(0, safeNetPnl(t)), 0);
    }, 0);
    let fomoCount = 0;
    for (let i = 1; i < closed.length; i++) {
      if (closed[i].symbol === closed[i - 1].symbol) {
        const diff = differenceInMinutes(new Date(closed[i].entry_time), new Date(closed[i - 1].entry_time));
        if (diff < 5) fomoCount++;
      }
    }
    const rulesFollowed = closed.filter(t => t.stop_loss != null && t.take_profit != null).length;
    const disciplineScore = Math.round(pct(rulesFollowed, closed.length));
    const emotionMap = new Map<string, number>();
    closed.forEach(t => t.emotions?.forEach(e => emotionMap.set(e, (emotionMap.get(e) || 0) + 1)));
    const topEmotions = [...emotionMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { revengeCount, revengeLoss, overtradeDays: overtradeDays.length, overtradeLoss: Math.abs(overtradeLoss), fomoCount, disciplineScore, topEmotions, avgPerDay: Math.round(avgPerDay * 10) / 10 };
  }, [closed, insufficient]);

  /* ── Setup ── */
  const setupData = useMemo(() => {
    if (insufficient) return null;
    const setupMap = new Map<string, { wins: number; losses: number; pnl: number; count: number }>();
    closed.forEach(t => {
      const setup = t.setup_type || t.strategy_tag || 'Untagged';
      const existing = setupMap.get(setup) || { wins: 0, losses: 0, pnl: 0, count: 0 };
      existing.count++; existing.pnl += safeNetPnl(t);
      if (safeNetPnl(t) > 0) existing.wins++; else if (safeNetPnl(t) < 0) existing.losses++;
      setupMap.set(setup, existing);
    });
    const setups = [...setupMap.entries()].map(([name, d]) => ({
      name, ...d, winRate: pct(d.wins, d.wins + d.losses), avgPnl: d.pnl / d.count,
    })).sort((a, b) => b.pnl - a.pnl);
    const best = setups[0];
    const mostTraded = [...setupMap.entries()].sort((a, b) => b[1].count - a[1].count)[0];
    return { setups, best, mostTraded: mostTraded ? { name: mostTraded[0], ...mostTraded[1] } : null };
  }, [closed, insufficient]);

  /* ── Regime ── */
  const regimeData = useMemo(() => {
    if (insufficient) return null;
    const sessionMap = new Map<string, { wins: number; losses: number; pnl: number; count: number }>();
    closed.forEach(t => {
      const session = t.session_tag || (() => {
        const h = new Date(t.entry_time).getUTCHours();
        if (h >= 1 && h < 7) return 'Asia';
        if (h >= 7 && h < 14) return 'Europe';
        return 'US';
      })();
      const e = sessionMap.get(session) || { wins: 0, losses: 0, pnl: 0, count: 0 };
      e.count++; e.pnl += safeNetPnl(t);
      if (safeNetPnl(t) > 0) e.wins++; else if (safeNetPnl(t) < 0) e.losses++;
      sessionMap.set(session, e);
    });
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dowMap = new Map<string, { pnl: number; count: number }>();
    closed.forEach(t => {
      const dow = days[new Date(t.entry_time).getDay()];
      const e = dowMap.get(dow) || { pnl: 0, count: 0 };
      e.count++; e.pnl += safeNetPnl(t);
      dowMap.set(dow, e);
    });
    return {
      sessions: [...sessionMap.entries()].map(([name, d]) => ({ name, ...d, winRate: pct(d.wins, d.wins + d.losses) })),
      dayOfWeek: days.map(d => ({ day: d, ...(dowMap.get(d) || { pnl: 0, count: 0 }) })),
    };
  }, [closed, insufficient]);

  /* ── Risk ── */
  const riskData = useMemo(() => {
    if (!stats || insufficient) return null;
    const pnls = closed.map(t => safeNetPnl(t));
    let clusters: { start: number; length: number; totalLoss: number }[] = [];
    let streak = 0, streakLoss = 0, streakStart = 0;
    for (let i = 0; i < pnls.length; i++) {
      if (pnls[i] < 0) {
        if (streak === 0) streakStart = i;
        streak++; streakLoss += pnls[i];
      } else {
        if (streak >= 3) clusters.push({ start: streakStart, length: streak, totalLoss: streakLoss });
        streak = 0; streakLoss = 0;
      }
    }
    if (streak >= 3) clusters.push({ start: streakStart, length: streak, totalLoss: streakLoss });
    const sorted = [...pnls].sort((a, b) => a - b);
    const tailCut = Math.max(1, Math.floor(sorted.length * 0.05));
    const tailAvg = sorted.slice(0, tailCut).reduce((s, v) => s + v, 0) / tailCut;
    const rolling: { idx: number; wr: number }[] = [];
    for (let i = 9; i < pnls.length; i++) {
      const window = pnls.slice(i - 9, i + 1);
      const wins = window.filter(p => p > 0).length;
      rolling.push({ idx: i, wr: (wins / 10) * 100 });
    }
    return { clusters, tailAvg, tailCut, rolling, worstLossStreak: stats.longestLossStreak };
  }, [closed, stats, insufficient]);

  /* ── Compare ── */
  const compareData = useMemo(() => {
    if (closed.length < MIN_SAMPLE_SIZE * 2) return null;
    const half = Math.floor(closed.length / 2);
    const calcHalf = (arr: Trade[]) => {
      const wins = arr.filter(t => safeNetPnl(t) > 0).length;
      const losses = arr.filter(t => safeNetPnl(t) < 0).length;
      const pnl = arr.reduce((s, t) => s + safeNetPnl(t), 0);
      return { count: arr.length, wins, losses, pnl, winRate: pct(wins, wins + losses), avg: pnl / arr.length };
    };
    const compliant = closed.filter(t => t.stop_loss != null && t.take_profit != null);
    const nonCompliant = closed.filter(t => t.stop_loss == null || t.take_profit == null);
    return {
      firstHalf: calcHalf(closed.slice(0, half)),
      secondHalf: calcHalf(closed.slice(half)),
      compliant: calcHalf(compliant.length > 0 ? compliant : []),
      nonCompliant: calcHalf(nonCompliant.length > 0 ? nonCompliant : []),
    };
  }, [closed]);

  /* ── AI Summary ── */
  const aiSummary = useMemo(() => {
    if (!stats || insufficient) return null;
    const lines: string[] = [];
    if (stats.winRate > 55) lines.push(`✅ Strong win rate at ${stats.winRate.toFixed(0)}% — edge is present`);
    else if (stats.winRate < 45) lines.push(`⚠️ Win rate at ${stats.winRate.toFixed(0)}% — need better entry filtering`);
    if (stats.profitFactor > 1.5) lines.push(`✅ Profit Factor ${stats.profitFactor.toFixed(2)} indicates healthy risk/reward`);
    else if (stats.profitFactor < 1) lines.push(`🚨 Profit Factor below 1 — system is net-negative`);
    if (behavioral?.revengeCount && behavioral.revengeCount > 3) lines.push(`⚠️ ${behavioral.revengeCount} revenge trades detected — costing ₹${behavioral.revengeLoss.toLocaleString()}`);
    if (behavioral?.disciplineScore != null && behavioral.disciplineScore < 60) lines.push(`⚠️ Discipline score ${behavioral.disciplineScore}% — SL/TP missing on many trades`);
    if (riskData?.clusters && riskData.clusters.length > 0) lines.push(`📊 ${riskData.clusters.length} loss cluster(s) detected — review position sizing during drawdowns`);
    if (setupData?.best) lines.push(`🏆 Best setup: "${setupData.best.name}" with ${(setupData.best.winRate).toFixed(1)}% win rate`);
    if (lines.length === 0) lines.push('📊 Not enough data points to generate meaningful summary yet.');
    return lines;
  }, [stats, behavioral, riskData, setupData, insufficient]);

  return {
    trades, loading, stats, closed, insufficient,
    perfData, behavioral, setupData, regimeData, riskData, compareData, aiSummary,
  };
}
