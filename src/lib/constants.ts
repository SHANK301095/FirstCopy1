/**
 * Phase 8: Named Constants
 * Single source of truth for magic numbers and configuration values
 */

// ═══════ Trading ═══════
export const DEFAULT_RISK_FREE_RATE = 0;
export const DEFAULT_CONFIDENCE_LEVEL = 0.95;
export const DEFAULT_ATR_PERIOD = 14;
export const DEFAULT_RSI_PERIOD = 14;
export const DEFAULT_MACD_FAST = 12;
export const DEFAULT_MACD_SLOW = 26;
export const DEFAULT_MACD_SIGNAL = 9;
export const DEFAULT_BB_PERIOD = 20;
export const DEFAULT_BB_STDDEV = 2;
export const DEFAULT_STOCH_K = 14;
export const DEFAULT_STOCH_D = 3;
export const DEFAULT_CCI_PERIOD = 20;
export const DEFAULT_SUPERTREND_PERIOD = 10;
export const DEFAULT_SUPERTREND_MULTIPLIER = 3;

// ═══════ Backtest Engine ═══════
export const DEFAULT_INITIAL_CAPITAL = 100000;
export const DEFAULT_COMMISSION_PCT = 0.1;
export const DEFAULT_SLIPPAGE_TICKS = 1;
export const DEFAULT_SPREAD_POINTS = 0;
export const DEFAULT_RISK_PER_TRADE = 2;
export const DEFAULT_MAX_TRADES_PER_DAY = 10;
export const DEFAULT_DAILY_LOSS_CAP = 5;

// ═══════ Annualization Factors ═══════
export const ANNUALIZE_DAILY = 252;
export const ANNUALIZE_WEEKLY = 52;
export const ANNUALIZE_MONTHLY = 12;

// ═══════ Data Quality ═══════
export const MIN_SAMPLE_SIZE = 5;
export const MIN_TRADES_FOR_HEALTH = 10;
export const MAX_OHLCV_ROWS = 5_000_000;

// ═══════ Optimization ═══════
export const DEFAULT_GA_POPULATION = 50;
export const DEFAULT_GA_GENERATIONS = 100;
export const DEFAULT_GA_MUTATION_RATE = 0.1;
export const DEFAULT_GA_CROSSOVER_RATE = 0.7;
export const DEFAULT_PSO_SWARM_SIZE = 30;
export const DEFAULT_PSO_ITERATIONS = 50;
export const DEFAULT_MONTE_CARLO_SIMS = 1000;
export const DEFAULT_MONTE_CARLO_BLOCK_SIZE = 20;
export const DEFAULT_RUIN_THRESHOLD = 0.5;

// ═══════ AI ═══════
export const AI_MAX_TOKEN_CAP = 50_000;
export const AI_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
export const AI_MAX_CACHE_SIZE = 100;

// ═══════ Sync ═══════
export const SYNC_PAGE_SIZE = 100;
export const SYNC_MAX_RETRY_ATTEMPTS = 5;
export const SYNC_BASE_DELAY_MS = 2000;

// ═══════ UI ═══════
export const CHART_MIN_POINTS = 50;
export const CHART_POINTS_PER_PIXEL = 0.5;
export const SKELETON_ANIMATION_DURATION = '1.5s';
export const TOAST_DURATION_MS = 4000;

// ═══════ Worker ═══════
export const WORKER_TIMEOUT_MS = 300_000; // 5 min
export const WORKER_MAX_SIGNALS = 1000;
export const BACKTEST_CHUNK_SIZE = 10_000;
