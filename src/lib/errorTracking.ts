/**
 * Error Tracking & Monitoring Service
 * 
 * Conditionally initializes Sentry if VITE_SENTRY_DSN is set.
 * If DSN is missing or Sentry SDK not installed, operates as silent no-op.
 * Safe to call even without @sentry/react installed — no build breaks.
 */

interface ErrorContext {
  userId?: string;
  page?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

interface ErrorEvent {
  message: string;
  stack?: string;
  context: ErrorContext;
  timestamp: string;
  level: "error" | "warning" | "info";
  release?: string;
}

// In-memory error buffer for debugging (limited to last 50 errors)
const errorBuffer: ErrorEvent[] = [];
const MAX_BUFFER_SIZE = 50;

// Sentry reference (set dynamically if available)
let SentryRef: any = null;

function getRelease(): string {
  return import.meta.env.VITE_APP_VERSION || 
         import.meta.env.VITE_SUPABASE_PROJECT_ID?.slice(0, 8) || 
         "dev";
}

/**
 * Capture and log an error
 */
export function captureError(
  error: Error | string,
  context: ErrorContext = {}
): void {
  const errorEvent: ErrorEvent = {
    message: typeof error === "string" ? error : error.message,
    stack: typeof error === "object" ? error.stack : undefined,
    context: {
      ...context,
      page: context.page || window.location.pathname,
    },
    timestamp: new Date().toISOString(),
    level: "error",
    release: getRelease(),
  };

  // Add to buffer
  errorBuffer.push(errorEvent);
  if (errorBuffer.length > MAX_BUFFER_SIZE) {
    errorBuffer.shift();
  }

  // Console logging (always active)
  console.error("[MMC Error]", errorEvent.message, {
    stack: errorEvent.stack,
    context: errorEvent.context,
    release: errorEvent.release,
  });

  // Send to Sentry if available
  if (SentryRef) {
    try {
      const errorObj = typeof error === "string" ? new Error(error) : error;
      SentryRef.captureException(errorObj, {
        tags: { page: context.page, action: context.action },
        extra: context.metadata,
        ...(context.userId ? { user: { id: context.userId } } : {}),
      });
    } catch {
      // Sentry call failed — swallow silently
    }
  }
}

/**
 * Capture a warning (non-critical issue)
 */
export function captureWarning(
  message: string,
  context: ErrorContext = {}
): void {
  const event: ErrorEvent = {
    message,
    context: {
      ...context,
      page: context.page || window.location.pathname,
    },
    timestamp: new Date().toISOString(),
    level: "warning",
    release: getRelease(),
  };

  errorBuffer.push(event);
  if (errorBuffer.length > MAX_BUFFER_SIZE) {
    errorBuffer.shift();
  }

  console.warn("[MMC Warning]", message, context);

  if (SentryRef) {
    try {
      SentryRef.captureMessage(message, { level: "warning", extra: context.metadata });
    } catch {}
  }
}

/**
 * Log an info event for monitoring
 */
export function captureInfo(
  message: string,
  context: ErrorContext = {}
): void {
  console.info("[MMC Info]", message, context);
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, metadata?: Record<string, unknown>): void {
  if (SentryRef) {
    try { SentryRef.setUser({ id: userId, ...metadata }); } catch {}
  }
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext(): void {
  if (SentryRef) {
    try { SentryRef.setUser(null); } catch {}
  }
}

/**
 * Get recent errors (for debugging)
 */
export function getRecentErrors(): ErrorEvent[] {
  return [...errorBuffer];
}

/**
 * Track critical flow success/failure
 */
export function trackCriticalFlow(
  flowName: string,
  success: boolean,
  durationMs?: number,
  metadata?: Record<string, unknown>
): void {
  const event = {
    flow: flowName,
    success,
    durationMs,
    ...metadata,
    timestamp: new Date().toISOString(),
  };

  if (success) {
    console.info("[MMC Flow]", flowName, "completed", event);
  } else {
    console.error("[MMC Flow]", flowName, "failed", event);
    if (SentryRef) {
      try { SentryRef.captureMessage(`Flow failed: ${flowName}`, { level: "error", extra: event }); } catch {}
    }
  }
}

/**
 * Initialize error tracking
 * Loads Sentry dynamically if VITE_SENTRY_DSN is set.
 * Completely silent no-op if DSN is missing or SDK not installed.
 */
export function initErrorTracking(): void {
  // Global error handler (always active for buffer + console)
  window.addEventListener("error", (event) => {
    captureError(event.error || event.message, {
      action: "global_error",
    });
  });

  // Unhandled promise rejection handler
  window.addEventListener("unhandledrejection", (event) => {
    captureError(
      event.reason instanceof Error 
        ? event.reason 
        : String(event.reason),
      { action: "unhandled_rejection" }
    );
  });

  // Try loading Sentry if DSN is configured
  // Uses a try/catch around dynamic import so builds never break
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) {
    try {
      // @ts-ignore - optional dependency
      const loadSentry = new Function('return import("@sentry/react")');
      loadSentry()
        .then((Sentry: any) => {
          Sentry.init({
            dsn,
            environment: import.meta.env.MODE,
            release: getRelease(),
            tracesSampleRate: 0.1,
          });
          SentryRef = Sentry;
        })
        .catch(() => {
          // @sentry/react not installed — silent no-op
        });
    } catch {
      // Dynamic import not available — silent no-op
    }
  }
}

/**
 * Performance monitoring hook
 */
export function measurePerformance(
  name: string,
  fn: () => void | Promise<void>
): () => Promise<void> {
  return async () => {
    const start = performance.now();
    try {
      await fn();
      const duration = performance.now() - start;
      console.info("[MMC Perf]", name, `${duration.toFixed(2)}ms`);
    } catch (error) {
      const duration = performance.now() - start;
      captureError(error as Error, {
        action: name,
        metadata: { durationMs: duration },
      });
      throw error;
    }
  };
}
