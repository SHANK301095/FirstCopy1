/**
 * Phase 7: Worker Stability Utilities
 * Cancellation flags, timeout kill switch, debug signal logging
 */

/** Cancellation flag for long-running worker tasks */
export class CancellationToken {
  private _cancelled = false;
  private _reason?: string;

  get isCancelled(): boolean {
    return this._cancelled;
  }

  get reason(): string | undefined {
    return this._reason;
  }

  cancel(reason = 'User cancelled'): void {
    this._cancelled = true;
    this._reason = reason;
  }

  /** Check and throw if cancelled — call inside loops */
  throwIfCancelled(): void {
    if (this._cancelled) {
      throw new CancellationError(this._reason ?? 'Operation cancelled');
    }
  }

  reset(): void {
    this._cancelled = false;
    this._reason = undefined;
  }
}

export class CancellationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CancellationError';
  }
}

/**
 * Timeout kill switch — wraps a promise with a timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label = 'Operation'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Debug signal logger — only logs in development
 */
export class DebugSignalLogger {
  private signals: { timestamp: number; type: string; data?: unknown }[] = [];
  private enabled: boolean;
  private maxSignals: number;

  constructor(enabled = false, maxSignals = 1000) {
    this.enabled = enabled;
    this.maxSignals = maxSignals;
  }

  log(type: string, data?: unknown): void {
    if (!this.enabled) return;
    if (this.signals.length >= this.maxSignals) {
      this.signals.shift(); // FIFO
    }
    this.signals.push({ timestamp: Date.now(), type, data });
  }

  getSignals(): typeof this.signals {
    return [...this.signals];
  }

  clear(): void {
    this.signals = [];
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

/**
 * Configurable PRNG seed for deterministic worker runs
 */
export function createSeededRandom(seed: number): () => number {
  let s = seed | 0;
  return function () {
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
