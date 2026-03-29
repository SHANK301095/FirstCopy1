/**
 * Alert Engine - Evaluates trade alerts automatically
 * Supports: drawdown_breach, daily_loss_cap, win_streak, loss_streak, daily_profit_target, trade_count_limit
 */

import type { Trade, TradeStats } from '@/hooks/useTradesDB';

interface AlertConfig {
  id: string;
  type: string;
  title: string;
  severity: string | null;
  metadata: Record<string, unknown> | null;
  last_triggered_day: string | null;
  last_triggered_at: string | null;
}

export interface TriggeredAlert {
  alert_id: string;
  title: string;
  message: string;
  type: 'warning' | 'success' | 'info';
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getTodayTrades(trades: Trade[]): Trade[] {
  const today = getTodayKey();
  return trades.filter(t => t.entry_time?.slice(0, 10) === today && t.status === 'closed');
}

export function evaluateAlerts(
  trades: Trade[],
  stats: TradeStats | null,
  alerts: AlertConfig[],
  nowUtc: Date = new Date()
): TriggeredAlert[] {
  const triggered: TriggeredAlert[] = [];
  const todayKey = getTodayKey();
  const todayTrades = getTodayTrades(trades);
  const todayPnl = todayTrades.reduce((s, t) => s + (t.net_pnl || t.pnl || 0), 0);

  for (const alert of alerts) {
    // Anti-spam: max 1 fire per day
    if (alert.last_triggered_day === todayKey) continue;

    // Anti-spam: 5-min dedupe
    if (alert.last_triggered_at) {
      const lastMs = new Date(alert.last_triggered_at).getTime();
      if (nowUtc.getTime() - lastMs < 5 * 60 * 1000) continue;
    }

    const threshold = Number(alert.metadata?.threshold ?? 0);
    let shouldFire = false;
    let message = '';
    let type: TriggeredAlert['type'] = 'warning';

    switch (alert.type) {
      case 'drawdown_breach': {
        const dd = stats?.maxDrawdown ?? 0;
        if (dd > threshold) {
          shouldFire = true;
          message = `Max drawdown ${dd.toFixed(1)}% exceeds your ${threshold}% threshold`;
        }
        break;
      }
      case 'daily_loss_cap': {
        if (todayPnl < 0 && Math.abs(todayPnl) > threshold) {
          shouldFire = true;
          message = `Today's loss ₹${Math.abs(todayPnl).toLocaleString()} exceeds ₹${threshold.toLocaleString()} cap`;
        }
        break;
      }
      case 'win_streak': {
        const ws = stats?.currentStreak;
        if (ws && ws.type === 'win' && ws.count >= threshold) {
          shouldFire = true;
          message = `🔥 ${ws.count} consecutive wins! Keep it up!`;
          type = 'success';
        }
        break;
      }
      case 'loss_streak': {
        const ls = stats?.currentStreak;
        if (ls && ls.type === 'loss' && ls.count >= threshold) {
          shouldFire = true;
          message = `⚠️ ${ls.count} consecutive losses. Consider taking a break.`;
        }
        break;
      }
      case 'daily_profit_target': {
        if (todayPnl > 0 && todayPnl >= threshold) {
          shouldFire = true;
          message = `🎯 Daily profit target hit! +₹${todayPnl.toLocaleString()}`;
          type = 'success';
        }
        break;
      }
      case 'trade_count_limit': {
        if (todayTrades.length >= threshold) {
          shouldFire = true;
          message = `You've taken ${todayTrades.length} trades today (limit: ${threshold})`;
        }
        break;
      }
    }

    if (shouldFire) {
      triggered.push({
        alert_id: alert.id,
        title: alert.title,
        message,
        type,
      });
    }
  }

  return triggered;
}
