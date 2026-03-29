/**
 * Achievement Tracker - checks real DB data and upserts progress
 */
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type { Trade } from '@/hooks/useTradesDB';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: 'trading' | 'journal' | 'trades' | 'consistency';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xp: number;
  maxProgress: number;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // Trading (Backtests)
  { id: 'first_backtest', name: 'First Steps', description: 'Run your first backtest', category: 'trading', rarity: 'common', xp: 50, maxProgress: 1 },
  { id: 'backtest_10', name: 'Getting Warmed Up', description: 'Run 10 backtests', category: 'trading', rarity: 'common', xp: 100, maxProgress: 10 },
  { id: 'backtest_100', name: 'Backtest Warrior', description: 'Run 100 backtests', category: 'trading', rarity: 'rare', xp: 500, maxProgress: 100 },
  { id: 'profitable_strat', name: 'Green Machine', description: 'Create a profitable strategy', category: 'trading', rarity: 'common', xp: 100, maxProgress: 1 },
  { id: 'sharpe_2', name: 'Sharp Shooter', description: 'Achieve Sharpe ratio ≥ 2.0', category: 'trading', rarity: 'rare', xp: 300, maxProgress: 1 },
  { id: 'pf_3', name: 'Profit Master', description: 'Achieve profit factor ≥ 3.0', category: 'trading', rarity: 'epic', xp: 500, maxProgress: 1 },
  { id: 'low_dd', name: 'Risk Manager', description: 'Strategy with ≤ 5% max drawdown', category: 'trading', rarity: 'rare', xp: 400, maxProgress: 1 },

  // Journal
  { id: 'first_journal', name: 'Reflective', description: 'Write your first journal entry', category: 'journal', rarity: 'common', xp: 50, maxProgress: 1 },
  { id: 'journal_7', name: 'Week Writer', description: '7 consecutive days journaling', category: 'journal', rarity: 'rare', xp: 200, maxProgress: 7 },
  { id: 'journal_30', name: 'Monthly Chronicler', description: '30 consecutive days journaling', category: 'journal', rarity: 'epic', xp: 1000, maxProgress: 30 },

  // Trades
  { id: 'first_trade', name: 'First Blood', description: 'Log your first trade', category: 'trades', rarity: 'common', xp: 50, maxProgress: 1 },
  { id: 'trades_50', name: 'Consistent', description: 'Log 50 trades', category: 'trades', rarity: 'rare', xp: 300, maxProgress: 50 },
  { id: 'trades_100', name: 'Century', description: 'Log 100 trades', category: 'trades', rarity: 'epic', xp: 500, maxProgress: 100 },
  { id: 'win_streak_5', name: 'Hot Streak', description: '5 wins in a row', category: 'trades', rarity: 'rare', xp: 200, maxProgress: 5 },
  { id: 'win_streak_10', name: 'Unstoppable', description: '10 wins in a row', category: 'trades', rarity: 'epic', xp: 500, maxProgress: 10 },
  { id: 'profitable_month', name: 'Green Month', description: 'A full calendar month in profit', category: 'trades', rarity: 'rare', xp: 400, maxProgress: 1 },

  // Consistency
  { id: 'streak_7', name: 'Week Warrior', description: '7-day login streak', category: 'consistency', rarity: 'rare', xp: 200, maxProgress: 7 },
  { id: 'streak_30', name: 'Monthly Master', description: '30-day login streak', category: 'consistency', rarity: 'epic', xp: 1000, maxProgress: 30 },
];

interface AchievementRow {
  achievement_id: string;
  progress: number;
  unlocked: boolean;
  unlocked_at: string | null;
}

interface BacktestResult {
  netProfit?: number;
  sharpeRatio?: number;
  profitFactor?: number;
  maxDrawdown?: number;
}

export async function checkAndUpdateAchievements(
  userId: string,
  trades: Trade[],
  backtestResults?: BacktestResult[],
): Promise<string[]> {
  // Load current achievements
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('achievement_id, progress, unlocked')
    .eq('user_id', userId);

  const current = new Map<string, AchievementRow>(
    (existing || []).map((r: any) => [r.achievement_id, r])
  );

  // Compute stats
  const closedTrades = trades.filter(t => t.status === 'closed');
  const backtestCount = backtestResults?.length ?? 0;

  // Also get backtest count from DB (results table)
  const { count: dbBacktestCount } = await supabase
    .from('results')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const totalBacktests = Math.max(backtestCount, dbBacktestCount ?? 0);

  // Journal stats
  const { data: journalEntries } = await supabase
    .from('journal_entries')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(365);

  const journalDates = (journalEntries || []).map((e: any) => e.date as string);
  const journalCount = journalDates.length;
  const journalStreak = computeConsecutiveDays(journalDates);

  // Trade streaks
  const sorted = [...closedTrades].sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
  let maxWinStreak = 0, curWin = 0;
  sorted.forEach(t => {
    if (t.net_pnl > 0) { curWin++; maxWinStreak = Math.max(maxWinStreak, curWin); }
    else curWin = 0;
  });

  // Profitable month check
  const monthPnl = new Map<string, number>();
  closedTrades.forEach(t => {
    const month = t.entry_time.slice(0, 7); // YYYY-MM
    monthPnl.set(month, (monthPnl.get(month) || 0) + t.net_pnl);
  });
  const hasProfitableMonth = [...monthPnl.values()].some(v => v > 0);

  // Login streak from profiles.last_seen
  const { data: profile } = await supabase
    .from('profiles')
    .select('last_seen')
    .eq('id', userId)
    .maybeSingle();

  // Update last_seen to now
  await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', userId);

  // Backtest result checks
  const hasProfitable = backtestResults?.some(r => (r.netProfit ?? 0) > 0) ?? false;
  const hasSharpe2 = backtestResults?.some(r => (r.sharpeRatio ?? 0) >= 2.0) ?? false;
  const hasPf3 = backtestResults?.some(r => (r.profitFactor ?? 0) >= 3.0) ?? false;
  const hasLowDd = backtestResults?.some(r => (r.maxDrawdown ?? 100) <= 5) ?? false;

  // Also check DB results for backtest achievements
  const { data: dbResults } = await supabase
    .from('results')
    .select('summary_json')
    .eq('user_id', userId)
    .limit(500);

  const dbBacktestChecks = (dbResults || []).reduce((acc, r: any) => {
    const s = r.summary_json || {};
    if ((s.netProfit ?? s.net_profit ?? 0) > 0) acc.profitable = true;
    if ((s.sharpeRatio ?? s.sharpe_ratio ?? 0) >= 2.0) acc.sharpe2 = true;
    if ((s.profitFactor ?? s.profit_factor ?? 0) >= 3.0) acc.pf3 = true;
    if ((s.maxDrawdown ?? s.max_drawdown ?? 100) <= 5) acc.lowDd = true;
    return acc;
  }, { profitable: false, sharpe2: false, pf3: false, lowDd: false });

  // Build progress map
  const progressMap: Record<string, { progress: number; unlocked: boolean }> = {
    first_backtest: { progress: Math.min(1, totalBacktests), unlocked: totalBacktests >= 1 },
    backtest_10: { progress: Math.min(10, totalBacktests), unlocked: totalBacktests >= 10 },
    backtest_100: { progress: Math.min(100, totalBacktests), unlocked: totalBacktests >= 100 },
    profitable_strat: { progress: (hasProfitable || dbBacktestChecks.profitable) ? 1 : 0, unlocked: hasProfitable || dbBacktestChecks.profitable },
    sharpe_2: { progress: (hasSharpe2 || dbBacktestChecks.sharpe2) ? 1 : 0, unlocked: hasSharpe2 || dbBacktestChecks.sharpe2 },
    pf_3: { progress: (hasPf3 || dbBacktestChecks.pf3) ? 1 : 0, unlocked: hasPf3 || dbBacktestChecks.pf3 },
    low_dd: { progress: (hasLowDd || dbBacktestChecks.lowDd) ? 1 : 0, unlocked: hasLowDd || dbBacktestChecks.lowDd },

    first_journal: { progress: Math.min(1, journalCount), unlocked: journalCount >= 1 },
    journal_7: { progress: Math.min(7, journalStreak), unlocked: journalStreak >= 7 },
    journal_30: { progress: Math.min(30, journalStreak), unlocked: journalStreak >= 30 },

    first_trade: { progress: Math.min(1, closedTrades.length), unlocked: closedTrades.length >= 1 },
    trades_50: { progress: Math.min(50, closedTrades.length), unlocked: closedTrades.length >= 50 },
    trades_100: { progress: Math.min(100, closedTrades.length), unlocked: closedTrades.length >= 100 },
    win_streak_5: { progress: Math.min(5, maxWinStreak), unlocked: maxWinStreak >= 5 },
    win_streak_10: { progress: Math.min(10, maxWinStreak), unlocked: maxWinStreak >= 10 },
    profitable_month: { progress: hasProfitableMonth ? 1 : 0, unlocked: hasProfitableMonth },

    streak_7: { progress: 0, unlocked: false }, // computed separately below
    streak_30: { progress: 0, unlocked: false },
  };

  // Login streak (approximate from last_seen — simple daily check)
  // For now, just track via profile last_seen. Actual streak needs daily log.
  // We'll use journal streak as proxy for consistency or just show progress from profile.

  const newlyUnlocked: string[] = [];

  // Upsert all
  for (const def of ACHIEVEMENT_DEFS) {
    const computed = progressMap[def.id];
    if (!computed) continue;

    const prev = current.get(def.id);
    const wasUnlocked = prev?.unlocked ?? false;
    const isNowUnlocked = computed.unlocked;

    if (isNowUnlocked && !wasUnlocked) {
      newlyUnlocked.push(def.id);
    }

    // Only upsert if changed
    if (!prev || prev.progress !== computed.progress || prev.unlocked !== isNowUnlocked) {
      await supabase.from('user_achievements').upsert({
        user_id: userId,
        achievement_id: def.id,
        progress: computed.progress,
        unlocked: isNowUnlocked,
        unlocked_at: isNowUnlocked && !wasUnlocked ? new Date().toISOString() : (prev as any)?.unlocked_at ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,achievement_id' });
    }
  }

  // Daily challenges
  await generateDailyChallenges(userId, closedTrades, journalDates);

  return newlyUnlocked;
}

async function generateDailyChallenges(userId: string, trades: Trade[], journalDates: string[]) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const challengeIds = [
    `daily_${today}_backtest`,
    `daily_${today}_journal`,
    `daily_${today}_trade`,
  ];

  // Check existing
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('achievement_id, progress')
    .eq('user_id', userId)
    .in('achievement_id', challengeIds);

  const existingMap = new Map((existing || []).map((r: any) => [r.achievement_id, r]));

  // Compute today's stats
  const todayTrades = trades.filter(t => t.entry_time.slice(0, 10) === today);
  const wins = todayTrades.filter(t => t.net_pnl > 0).length;
  const hasJournal = journalDates.includes(today);

  const { count: todayBacktests } = await supabase
    .from('results')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00`);

  const challenges = [
    { id: `daily_${today}_backtest`, progress: Math.min(1, todayBacktests ?? 0), unlocked: (todayBacktests ?? 0) >= 1 },
    { id: `daily_${today}_journal`, progress: hasJournal ? 1 : 0, unlocked: hasJournal },
    { id: `daily_${today}_trade`, progress: Math.min(2, wins), unlocked: wins >= 2 },
  ];

  for (const ch of challenges) {
    const prev = existingMap.get(ch.id);
    if (!prev || prev.progress !== ch.progress) {
      await supabase.from('user_achievements').upsert({
        user_id: userId,
        achievement_id: ch.id,
        progress: ch.progress,
        unlocked: ch.unlocked,
        unlocked_at: ch.unlocked ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,achievement_id' });
    }
  }
}

function computeConsecutiveDays(sortedDatesDesc: string[]): number {
  if (sortedDatesDesc.length === 0) return 0;
  const dates = new Set(sortedDatesDesc);
  let streak = 0;
  const d = new Date();
  while (dates.has(format(d, 'yyyy-MM-dd'))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
