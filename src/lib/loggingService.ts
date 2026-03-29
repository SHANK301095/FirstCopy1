/**
 * Centralized Logging Service
 * Captures client errors, network errors, DB errors, auth errors
 * Logs to both IndexedDB (offline) and Supabase (online sync)
 */

import { supabase } from '@/integrations/supabase/client';
import { db } from '@/db/index';
import { toast } from '@/hooks/use-toast';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogScope = 'auth' | 'db' | 'network' | 'ui' | 'backtest' | 'optimizer' | 'system';

interface LogPayload {
  level: LogLevel;
  scope: LogScope;
  message: string;
  meta?: Record<string, unknown>;
  userId?: string;
  route?: string;
  action?: string;
  stackTrace?: string;
}

class LoggingService {
  private userId: string | null = null;
  private currentRoute: string = '/';
  private pendingLogs: LogPayload[] = [];
  private syncInterval: number | null = null;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingLogs();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Setup global error handlers
    this.setupGlobalErrorHandlers();

    // Sync pending logs every 30 seconds
    this.syncInterval = window.setInterval(() => {
      this.syncPendingLogs();
    }, 30000);
  }

  setUser(userId: string | null) {
    this.userId = userId;
  }

  setRoute(route: string) {
    this.currentRoute = route;
  }

  private setupGlobalErrorHandlers() {
    // Catch unhandled errors
    window.onerror = (message, source, lineno, colno, error) => {
      this.error('ui', `Unhandled error: ${message}`, {
        source,
        lineno,
        colno,
        stack: error?.stack,
      });
      return false;
    };

    // Catch unhandled promise rejections
    window.onunhandledrejection = (event) => {
      this.error('system', `Unhandled promise rejection: ${event.reason}`, {
        reason: String(event.reason),
        stack: event.reason?.stack,
      });
    };
  }

  private async logToIndexedDB(payload: LogPayload) {
    try {
      await db.log(payload.level, `[${payload.scope}] ${payload.message}`, {
        ...payload.meta,
        userId: payload.userId,
        route: payload.route,
        action: payload.action,
      });
    } catch {
      // Failed to log to IndexedDB - fail silently to avoid infinite loops
    }
  }

  private async logToSupabase(payload: LogPayload) {
    if (!this.isOnline || !this.userId) {
      this.pendingLogs.push(payload);
      return;
    }

    try {
      const { error } = await supabase.from('logs').insert({
        user_id: this.userId,
        level: payload.level,
        scope: payload.scope,
        message: payload.message,
        meta_json: {
          ...payload.meta,
          route: payload.route,
          action: payload.action,
          stackTrace: payload.stackTrace,
        },
      });

      if (error) {
        // Failed to log to Supabase - queue for retry
        this.pendingLogs.push(payload);
      }
    } catch {
      // Supabase logging error - queue for retry
      this.pendingLogs.push(payload);
    }
  }

  private async syncPendingLogs() {
    if (!this.isOnline || !this.userId || this.pendingLogs.length === 0) return;

    const logsToSync = [...this.pendingLogs];
    this.pendingLogs = [];

    for (const log of logsToSync) {
      await this.logToSupabase({ ...log, userId: this.userId });
    }
  }

  private async log(payload: LogPayload) {
    const enrichedPayload = {
      ...payload,
      userId: this.userId || undefined,
      route: this.currentRoute,
    };

    // Always log to IndexedDB
    await this.logToIndexedDB(enrichedPayload);

    // Log to Supabase for warn and error levels
    if (payload.level === 'warn' || payload.level === 'error') {
      await this.logToSupabase(enrichedPayload);
    }

    // Console output
    const consoleMethod = payload.level === 'error' ? 'error' : 
                          payload.level === 'warn' ? 'warn' : 
                          payload.level === 'debug' ? 'debug' : 'info';
    console[consoleMethod](`[${payload.scope}] ${payload.message}`, payload.meta);
  }

  debug(scope: LogScope, message: string, meta?: Record<string, unknown>) {
    this.log({ level: 'debug', scope, message, meta });
  }

  info(scope: LogScope, message: string, meta?: Record<string, unknown>) {
    this.log({ level: 'info', scope, message, meta });
  }

  warn(scope: LogScope, message: string, meta?: Record<string, unknown>) {
    this.log({ level: 'warn', scope, message, meta });
  }

  error(scope: LogScope, message: string, meta?: Record<string, unknown>, showToast = true) {
    this.log({ 
      level: 'error', 
      scope, 
      message, 
      meta,
      stackTrace: new Error().stack,
    });

    if (showToast) {
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  }

  // Specific error loggers
  authError(message: string, meta?: Record<string, unknown>) {
    this.error('auth', message, meta);
  }

  dbError(message: string, meta?: Record<string, unknown>) {
    this.error('db', message, meta);
  }

  networkError(message: string, meta?: Record<string, unknown>) {
    this.error('network', message, meta);
  }

  uiError(message: string, meta?: Record<string, unknown>) {
    this.error('ui', message, meta);
  }

  // Action tracking
  trackAction(action: string, meta?: Record<string, unknown>) {
    this.log({
      level: 'info',
      scope: 'ui',
      message: `Action: ${action}`,
      action,
      meta,
    });
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

// Export singleton instance
export const logger = new LoggingService();

// React hook for logging
export function useLogger() {
  return logger;
}
