/**
 * Replay Engine — Bar-by-bar historical data replay for paper trading
 * Supports pause/resume, speed control, and deterministic replay
 */

export interface OHLCV {
  ts: number;  // unix ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ReplayState {
  status: 'idle' | 'playing' | 'paused' | 'finished';
  currentIndex: number;
  totalBars: number;
  currentBar: OHLCV | null;
  previousBar: OHLCV | null;
  speed: number;            // 1x, 2x, 5x, 10x
  elapsedBars: number;
  progressPct: number;
}

export interface ReplayCallbacks {
  onBar: (bar: OHLCV, index: number) => void;
  onFinished?: () => void;
  onError?: (error: string) => void;
}

export class ReplayEngine {
  private data: OHLCV[] = [];
  private currentIndex = 0;
  private speed = 1;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private status: ReplayState['status'] = 'idle';
  private callbacks: ReplayCallbacks | null = null;

  /**
   * Load OHLCV dataset for replay
   */
  loadData(data: OHLCV[]): void {
    if (!data.length) throw new Error('Empty dataset');
    // Sort by timestamp
    this.data = [...data].sort((a, b) => a.ts - b.ts);
    this.currentIndex = 0;
    this.status = 'idle';
    this.stop();
  }

  /**
   * Set replay callbacks
   */
  setCallbacks(callbacks: ReplayCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Start or resume replay
   */
  play(speed?: number): void {
    if (this.data.length === 0) return;
    if (speed !== undefined) this.speed = speed;
    if (this.currentIndex >= this.data.length) {
      this.currentIndex = 0; // restart
    }
    this.status = 'playing';
    this.startInterval();
  }

  /**
   * Pause replay
   */
  pause(): void {
    this.status = 'paused';
    this.clearInterval();
  }

  /**
   * Stop replay and reset
   */
  stop(): void {
    this.status = 'idle';
    this.currentIndex = 0;
    this.clearInterval();
  }

  /**
   * Step forward one bar manually
   */
  stepForward(): void {
    if (this.data.length === 0) return;
    if (this.currentIndex < this.data.length) {
      this.emitBar();
    }
  }

  /**
   * Jump to a specific bar index
   */
  seekTo(index: number): void {
    if (index >= 0 && index < this.data.length) {
      this.currentIndex = index;
    }
  }

  /**
   * Set replay speed
   */
  setSpeed(speed: number): void {
    this.speed = speed;
    if (this.status === 'playing') {
      this.clearInterval();
      this.startInterval();
    }
  }

  /**
   * Get current state
   */
  getState(): ReplayState {
    return {
      status: this.status,
      currentIndex: this.currentIndex,
      totalBars: this.data.length,
      currentBar: this.currentIndex > 0 ? this.data[this.currentIndex - 1] : null,
      previousBar: this.currentIndex > 1 ? this.data[this.currentIndex - 2] : null,
      speed: this.speed,
      elapsedBars: this.currentIndex,
      progressPct: this.data.length > 0 ? (this.currentIndex / this.data.length) * 100 : 0,
    };
  }

  /**
   * Get all data up to current index (for charting)
   */
  getVisibleData(): OHLCV[] {
    return this.data.slice(0, this.currentIndex);
  }

  /**
   * Get remaining bars
   */
  getRemainingBars(): number {
    return Math.max(0, this.data.length - this.currentIndex);
  }

  private startInterval(): void {
    this.clearInterval();
    // Base interval: 500ms per bar at 1x
    const interval = Math.max(50, 500 / this.speed);
    this.intervalId = setInterval(() => {
      if (this.currentIndex >= this.data.length) {
        this.status = 'finished';
        this.clearInterval();
        this.callbacks?.onFinished?.();
        return;
      }
      this.emitBar();
    }, interval);
  }

  private emitBar(): void {
    if (this.currentIndex >= this.data.length) return;
    const bar = this.data[this.currentIndex];
    this.currentIndex++;
    try {
      this.callbacks?.onBar(bar, this.currentIndex - 1);
    } catch (err) {
      this.callbacks?.onError?.(String(err));
    }
  }

  private clearInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  destroy(): void {
    this.clearInterval();
    this.data = [];
    this.callbacks = null;
  }
}
