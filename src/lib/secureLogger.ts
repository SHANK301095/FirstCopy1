/**
 * Secure Centralized Logger
 * Replaces console.log with sanitized logging that redacts sensitive data
 */

import { db } from '@/db/index';
import { supabase } from '@/integrations/supabase/client';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogScope = 'auth' | 'db' | 'network' | 'ui' | 'backtest' | 'optimizer' | 'system' | 'workspace' | 'scanner' | 'cleanup' | 'analytics' | 'pwa' | 'admin' | 'sentinel' | 'quality' | 'sync' | 'strategy' | 'achievements' | 'data' | 'workflow';

// Patterns to redact
const SENSITIVE_PATTERNS = [
  /token[s]?["']?\s*[:=]\s*["']?[a-zA-Z0-9_-]{10,}/gi,
  /invite[_-]?code["']?\s*[:=]\s*["']?[a-zA-Z0-9_-]{10,}/gi,
  /authorization["']?\s*[:=]\s*["']?bearer\s+[a-zA-Z0-9._-]+/gi,
  /password["']?\s*[:=]\s*["']?[^"'\s,}]+/gi,
  /secret["']?\s*[:=]\s*["']?[^"'\s,}]+/gi,
  /api[_-]?key["']?\s*[:=]\s*["']?[a-zA-Z0-9_-]{10,}/gi,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // emails
  /\+?\d{10,15}/g, // phone numbers
];

// Keys to redact in objects
const SENSITIVE_KEYS = [
  'token', 'tokens', 'password', 'secret', 'apiKey', 'api_key',
  'authorization', 'auth', 'invite', 'invite_token', 'token_hash',
  'email', 'phone', 'ssn', 'creditCard', 'credit_card'
];

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  
  if (typeof value === 'string') {
    let sanitized = value;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    return sanitized;
  }
  
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  
  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeValue(val);
      }
    }
    return sanitized;
  }
  
  return value;
}

function formatMessage(message: string): string {
  let sanitized = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  scope: LogScope;
  message: string;
  meta?: Record<string, unknown>;
}

interface LogPayload {
  level: LogLevel;
  scope: LogScope;
  message: string;
  meta?: Record<string, unknown>;
  userId?: string;
  route?: string;
}

class SecureLogger {
  private userId: string | null = null;
  private currentRoute: string = '/';
  private pendingLogs: LogPayload[] = [];
  private recentLogs: LogEntry[] = [];
  private maxRecentLogs: number = 100;
  private isOnline: boolean = navigator.onLine;
  private isProduction: boolean = import.meta.env.PROD;

  constructor() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingLogs();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Setup global error handlers
    this.setupGlobalErrorHandlers();
  }

  setUser(userId: string | null) {
    this.userId = userId;
  }

  setRoute(route: string) {
    this.currentRoute = route;
  }

  private setupGlobalErrorHandlers() {
    window.onerror = (message, source, lineno, colno, error) => {
      this.error('ui', `Unhandled error: ${formatMessage(String(message))}`, {
        source: formatMessage(String(source)),
        lineno,
        colno,
      });
      return false;
    };

    window.onunhandledrejection = (event) => {
      this.error('system', `Unhandled promise rejection`, {
        reason: formatMessage(String(event.reason)),
      });
    };
  }

  private async logToIndexedDB(payload: LogPayload) {
    try {
      await db.log(payload.level, `[${payload.scope}] ${payload.message}`, 
        sanitizeValue(payload.meta) as Record<string, unknown>);
    } catch {
      // Silent fail for IndexedDB errors
    }
  }

  private async logToSupabase(payload: LogPayload) {
    if (!this.isOnline || !this.userId) {
      this.pendingLogs.push(payload);
      return;
    }

    try {
      await supabase.from('logs').insert([{
        user_id: this.userId,
        level: payload.level,
        scope: payload.scope,
        message: formatMessage(payload.message),
        meta_json: JSON.parse(JSON.stringify(sanitizeValue(payload.meta) || {})),
      }]);
    } catch {
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
      message: formatMessage(payload.message),
      meta: sanitizeValue(payload.meta) as Record<string, unknown>,
      userId: this.userId || undefined,
      route: this.currentRoute,
    };

    // Store in memory for debug bundle
    this.storeRecentLog(enrichedPayload);

    // Always log to IndexedDB
    await this.logToIndexedDB(enrichedPayload);

    // Log to Supabase for warn and error levels
    if (payload.level === 'warn' || payload.level === 'error') {
      await this.logToSupabase(enrichedPayload);
    }

    // Console output only in development
    if (!this.isProduction) {
      const consoleMethod = payload.level === 'error' ? 'error' : 
                            payload.level === 'warn' ? 'warn' : 
                            payload.level === 'debug' ? 'debug' : 'info';
      console[consoleMethod](`[${payload.scope}] ${enrichedPayload.message}`, enrichedPayload.meta);
    }
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

  error(scope: LogScope, message: string, meta?: Record<string, unknown>) {
    this.log({ level: 'error', scope, message, meta });
  }

  // Convenience methods
  authError(message: string, meta?: Record<string, unknown>) {
    this.error('auth', message, meta);
  }

  dbError(message: string, meta?: Record<string, unknown>) {
    this.error('db', message, meta);
  }

  networkError(message: string, meta?: Record<string, unknown>) {
    this.error('network', message, meta);
  }

  workspaceError(message: string, meta?: Record<string, unknown>) {
    this.error('workspace', message, meta);
  }

  // Get recent logs for debug bundle (sanitized, in-memory only)
  getRecentLogs(count: number = 10): LogEntry[] {
    return this.recentLogs.slice(-count);
  }

  // Store log entry in memory for debug bundle
  private storeRecentLog(payload: LogPayload) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level: payload.level,
      scope: payload.scope,
      message: formatMessage(payload.message),
      meta: sanitizeValue(payload.meta) as Record<string, unknown>,
    };
    
    this.recentLogs.push(entry);
    
    // Prune old logs
    if (this.recentLogs.length > this.maxRecentLogs) {
      this.recentLogs = this.recentLogs.slice(-this.maxRecentLogs);
    }
  }
}

// Export singleton instance
export const secureLogger = new SecureLogger();

// Wrapper functions for easy console.log replacement
export function logDebug(scope: LogScope, message: string, meta?: Record<string, unknown>) {
  secureLogger.debug(scope, message, meta);
}

export function logInfo(scope: LogScope, message: string, meta?: Record<string, unknown>) {
  secureLogger.info(scope, message, meta);
}

export function logWarn(scope: LogScope, message: string, meta?: Record<string, unknown>) {
  secureLogger.warn(scope, message, meta);
}

export function logError(scope: LogScope, message: string, meta?: Record<string, unknown>) {
  secureLogger.error(scope, message, meta);
}
