/**
 * Phase 3: Sync Retry Queue
 * Queues failed cloud sync operations for automatic retry with exponential backoff
 */

interface SyncQueueItem {
  id: string;
  operation: string;
  payload: unknown;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: number;
  createdAt: number;
  lastError?: string;
}

const QUEUE_KEY = 'mmc-sync-retry-queue';
const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 2000;

function loadQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: SyncQueueItem[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Enqueue a failed sync operation for retry */
export function enqueueSyncRetry(operation: string, payload: unknown, error?: string): void {
  const queue = loadQueue();
  queue.push({
    id: crypto.randomUUID?.() ?? `retry_${Date.now()}`,
    operation,
    payload,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    nextRetryAt: Date.now() + BASE_DELAY_MS,
    createdAt: Date.now(),
    lastError: error,
  });
  saveQueue(queue);
}

/** Process pending retries — call periodically */
export async function processRetryQueue(
  executor: (operation: string, payload: unknown) => Promise<void>
): Promise<{ processed: number; failed: number; remaining: number }> {
  const queue = loadQueue();
  const now = Date.now();
  let processed = 0;
  let failed = 0;

  const remaining: SyncQueueItem[] = [];

  for (const item of queue) {
    if (item.nextRetryAt > now) {
      remaining.push(item);
      continue;
    }

    try {
      await executor(item.operation, item.payload);
      processed++;
    } catch (err) {
      item.attempts++;
      item.lastError = err instanceof Error ? err.message : String(err);

      if (item.attempts >= item.maxAttempts) {
        failed++;
        // Drop after max attempts
      } else {
        // Exponential backoff
        item.nextRetryAt = now + BASE_DELAY_MS * Math.pow(2, item.attempts);
        remaining.push(item);
      }
    }
  }

  saveQueue(remaining);
  return { processed, failed, remaining: remaining.length };
}

/** Clear the retry queue */
export function clearRetryQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

/** Get queue status */
export function getRetryQueueStatus(): { count: number; oldestAge: number } {
  const queue = loadQueue();
  const oldest = queue.length > 0 ? Date.now() - Math.min(...queue.map(q => q.createdAt)) : 0;
  return { count: queue.length, oldestAge: oldest };
}
