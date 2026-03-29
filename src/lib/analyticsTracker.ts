/**
 * Phase 10: Analytics Tracking
 * Lightweight privacy-respecting analytics (no external dependencies)
 * Stores events locally + optionally syncs to Supabase logs table
 */

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, string | number | boolean>;
  timestamp: number;
  page: string;
  sessionId: string;
}

const SESSION_KEY = 'mmc-analytics-session';
const BUFFER_KEY = 'mmc-analytics-buffer';
const MAX_BUFFER = 100;

let sessionId: string | null = null;

function getSessionId(): string {
  if (sessionId) return sessionId;
  sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

function getBuffer(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(BUFFER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBuffer(buffer: AnalyticsEvent[]): void {
  try {
    localStorage.setItem(BUFFER_KEY, JSON.stringify(buffer.slice(-MAX_BUFFER)));
  } catch { /* storage full */ }
}

/** Track an analytics event */
export function trackEvent(event: string, properties?: Record<string, string | number | boolean>): void {
  const entry: AnalyticsEvent = {
    event,
    properties,
    timestamp: Date.now(),
    page: window.location.pathname,
    sessionId: getSessionId(),
  };

  const buffer = getBuffer();
  buffer.push(entry);
  saveBuffer(buffer);
}

/** Track page view */
export function trackPageView(path?: string): void {
  trackEvent('page_view', { path: path || window.location.pathname });
}

/** Get analytics buffer for syncing */
export function getAnalyticsBuffer(): AnalyticsEvent[] {
  return getBuffer();
}

/** Clear analytics buffer after successful sync */
export function clearAnalyticsBuffer(): void {
  localStorage.removeItem(BUFFER_KEY);
}

/** Get basic session stats */
export function getSessionStats(): { pageViews: number; events: number; duration: number } {
  const buffer = getBuffer();
  const sid = getSessionId();
  const sessionEvents = buffer.filter(e => e.sessionId === sid);
  const pageViews = sessionEvents.filter(e => e.event === 'page_view').length;
  const first = sessionEvents[0]?.timestamp || Date.now();
  
  return {
    pageViews,
    events: sessionEvents.length,
    duration: Date.now() - first,
  };
}

/** Common tracking helpers */
export const analytics = {
  track: trackEvent,
  page: trackPageView,
  buffer: getAnalyticsBuffer,
  clear: clearAnalyticsBuffer,
  stats: getSessionStats,
  
  // Pre-defined events
  backtestRun: (strategyId: string) => trackEvent('backtest_run', { strategyId }),
  strategyCreate: (name: string) => trackEvent('strategy_create', { name }),
  dataImport: (format: string, rows: number) => trackEvent('data_import', { format, rows }),
  tradeSync: (broker: string, count: number) => trackEvent('trade_sync', { broker, count }),
  exportReport: (format: string) => trackEvent('export_report', { format }),
  aiQuery: (feature: string) => trackEvent('ai_query', { feature }),
};
