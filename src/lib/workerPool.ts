/**
 * Phase 14: Worker Pool
 * Manages a pool of Web Workers for parallel task execution
 * Prevents browser crashes with 1M+ row datasets
 */

export interface WorkerTask<T = unknown> {
  id: string;
  type: string;
  payload: T;
}

export interface WorkerResult<T = unknown> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
  durationMs: number;
}

interface PooledWorker {
  worker: Worker;
  busy: boolean;
  taskId?: string;
}

export class WorkerPool {
  private workers: PooledWorker[] = [];
  private queue: { task: WorkerTask; resolve: (r: WorkerResult) => void; reject: (e: Error) => void }[] = [];
  private maxWorkers: number;
  private workerFactory: () => Worker;
  private timeout: number;

  constructor(
    workerFactory: () => Worker,
    options: { maxWorkers?: number; timeout?: number } = {}
  ) {
    this.workerFactory = workerFactory;
    this.maxWorkers = options.maxWorkers ?? Math.min(navigator.hardwareConcurrency || 4, 4);
    this.timeout = options.timeout ?? 120_000; // 2 min default
  }

  /** Submit a task to the pool */
  async submit<R = unknown>(task: WorkerTask): Promise<WorkerResult<R>> {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve: resolve as (r: WorkerResult) => void, reject });
      this.processQueue();
    });
  }

  /** Process queued tasks */
  private processQueue(): void {
    while (this.queue.length > 0) {
      const available = this.getOrCreateWorker();
      if (!available) break; // All workers busy, at max capacity

      const item = this.queue.shift()!;
      available.busy = true;
      available.taskId = item.task.id;

      const startTime = Date.now();
      let timer: ReturnType<typeof setTimeout> | undefined;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        available.busy = false;
        available.taskId = undefined;
        available.worker.onmessage = null;
        available.worker.onerror = null;
        this.processQueue(); // Process next
      };

      // Timeout protection
      timer = setTimeout(() => {
        cleanup();
        item.resolve({
          id: item.task.id,
          success: false,
          error: `Worker timeout after ${this.timeout}ms`,
          durationMs: Date.now() - startTime,
        });
      }, this.timeout);

      available.worker.onmessage = (e: MessageEvent) => {
        cleanup();
        item.resolve({
          id: item.task.id,
          success: true,
          data: e.data,
          durationMs: Date.now() - startTime,
        });
      };

      available.worker.onerror = (e: ErrorEvent) => {
        cleanup();
        item.resolve({
          id: item.task.id,
          success: false,
          error: e.message || 'Worker error',
          durationMs: Date.now() - startTime,
        });
      };

      available.worker.postMessage(item.task);
    }
  }

  /** Get an idle worker or create a new one if under limit */
  private getOrCreateWorker(): PooledWorker | null {
    const idle = this.workers.find(w => !w.busy);
    if (idle) return idle;

    if (this.workers.length < this.maxWorkers) {
      const pooled: PooledWorker = {
        worker: this.workerFactory(),
        busy: false,
      };
      this.workers.push(pooled);
      return pooled;
    }

    return null;
  }

  /** Get pool status */
  get status() {
    return {
      total: this.workers.length,
      busy: this.workers.filter(w => w.busy).length,
      idle: this.workers.filter(w => !w.busy).length,
      queued: this.queue.length,
      maxWorkers: this.maxWorkers,
    };
  }

  /** Terminate all workers */
  terminate(): void {
    this.workers.forEach(w => w.worker.terminate());
    this.workers = [];
    this.queue.forEach(q => q.reject(new Error('Pool terminated')));
    this.queue = [];
  }
}
