/**
 * Quant Domain Model — Production-grade type definitions
 * Central types for the MMC quant operating system
 * Covers: Data, Strategy, Backtest, Optimization, Walk-Forward, Monte Carlo,
 *         Regime, Paper Trading, Execution, Risk, Portfolio, Incidents, Audit
 */

// ═══════ Core Identifiers ═══════
export type UUID = string;
export type ISOTimestamp = string;

// ═══════════════════════════════════════════════════════════════
// SECTION A — DATA LAYER
// ═══════════════════════════════════════════════════════════════

export interface DatasetRecord {
  id: UUID;
  user_id: UUID;
  name: string;
  symbol: string;
  timeframe: string;
  source_name?: string;
  file_name?: string;
  file_size?: number;
  row_count?: number;
  range_from_ts?: number;
  range_to_ts?: number;
  fingerprint?: string;
  quality_score?: number;
  quality_report?: DatasetQualityReport;
  created_at: ISOTimestamp;
}

export interface DatasetQualityReport {
  scanned_at: ISOTimestamp;
  total_bars: number;
  quality_score: number;          // 0–100
  gaps: number;
  duplicates: number;
  bad_candles: number;
  outliers: number;
  missing_ohlcv: number;
  timezone_drift_detected: boolean;
  detected_timeframe: string;
  expected_timeframe: string;
  recommendations: string[];
  issues_sample: DatasetQualityIssue[];  // first N issues
}

export interface DatasetQualityIssue {
  type: 'gap' | 'duplicate' | 'timezone_drift' | 'outlier' | 'missing_ohlcv' | 'bad_candle' | 'spike' | 'invalid';
  severity: 'low' | 'medium' | 'high';
  timestamp?: number;
  row_index?: number;
  details: string;
  suggestion?: string;
}

export interface SymbolMetadata {
  id: UUID;
  symbol: string;
  display_name: string;
  asset_class: 'forex' | 'indices' | 'commodities' | 'crypto' | 'stocks' | 'futures';
  exchange?: string;
  tick_size: number;
  price_precision: number;
  quantity_precision: number;
  lot_step: number;
  min_quantity: number;
  max_quantity?: number;
  contract_multiplier: number;
  quote_currency: string;
  base_currency?: string;
  leverage_style?: 'margin' | 'full_value';
  trading_timezone: string;
  session_open?: string;   // HH:mm
  session_close?: string;  // HH:mm
  broker_mappings?: Record<string, string>;  // broker_type -> broker_symbol
  status: 'active' | 'inactive' | 'delisted';
  created_at: ISOTimestamp;
}

export interface TradingSessionProfile {
  id: UUID;
  name: string;
  timezone: string;
  market_open: string;   // HH:mm
  market_close: string;  // HH:mm
  pre_market?: string;
  post_market?: string;
  days: number[];         // 0=Sun..6=Sat
  holidays?: string[];    // ISO dates
}

// ═══════════════════════════════════════════════════════════════
// SECTION B — STRATEGY MODEL
// ═══════════════════════════════════════════════════════════════

export type StrategyReadiness =
  | 'experimental'
  | 'research_ready'
  | 'paper_ready'
  | 'deployable'
  | 'review_required'
  | 'quarantined'
  | 'retired';

export const READINESS_LABELS: Record<StrategyReadiness, string> = {
  experimental: 'Experimental',
  research_ready: 'Research Ready',
  paper_ready: 'Paper Ready',
  deployable: 'Deployable',
  review_required: 'Review Required',
  quarantined: 'Quarantined',
  retired: 'Retired',
};

export const READINESS_COLORS: Record<StrategyReadiness, string> = {
  experimental: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  research_ready: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  paper_ready: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  deployable: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  review_required: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  quarantined: 'bg-red-500/15 text-red-400 border-red-500/30',
  retired: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

export interface StrategyParameterDef {
  name: string;
  type: 'int' | 'float' | 'bool' | 'enum';
  min?: number;
  max?: number;
  step?: number;
  default_value?: number | boolean | string;
  enum_values?: string[];
  group?: string;
  depends_on?: string;          // parameter dependency
  mutually_exclusive_with?: string;
  description?: string;
}

export interface StrategyParameterSchema {
  parameters: StrategyParameterDef[];
  validation_rules?: Array<{
    type: 'less_than' | 'greater_than' | 'sum_max' | 'custom';
    params: string[];
    value?: number;
    message: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// SECTION C — BACKTEST
// ═══════════════════════════════════════════════════════════════

export interface BacktestRunRecord {
  id: UUID;
  user_id: UUID;
  strategy_id?: UUID;
  strategy_version_id?: UUID;
  dataset_id?: UUID;
  config: BacktestRunConfig;
  metrics?: BacktestMetrics;
  trade_count: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  run_duration_ms?: number;
  started_at?: ISOTimestamp;
  completed_at?: ISOTimestamp;
  created_at: ISOTimestamp;
}

export interface BacktestRunConfig {
  initial_capital: number;
  commission_pct: number;
  slippage_ticks: number;
  spread_points: number;
  risk_per_trade: number;
  max_trades_per_day: number;
  daily_loss_cap: number;
  symbol: string;
  timeframe: string;
  date_from?: ISOTimestamp;
  date_to?: ISOTimestamp;
  parameters: Record<string, number>;
}

export interface BacktestMetrics {
  net_profit: number;
  cagr: number;
  annualized_return: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  max_drawdown: number;
  max_drawdown_duration_days: number;
  profit_factor: number;
  win_rate: number;
  payoff_ratio: number;
  expectancy: number;
  exposure: number;
  turnover: number;
  avg_trade: number;
  avg_hold_time_hours: number;
  gross_profit: number;
  gross_loss: number;
  fee_drag: number;
  slippage_drag: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
}

export interface BacktestTradeRecord {
  id: UUID;
  run_id: UUID;
  symbol: string;
  direction: 'long' | 'short';
  entry_time: ISOTimestamp;
  exit_time: ISOTimestamp;
  entry_price: number;
  exit_price: number;
  quantity: number;
  pnl: number;
  pnl_pct: number;
  fees: number;
  slippage: number;
  mae: number;  // max adverse excursion
  mfe: number;  // max favorable excursion
}

// ═══════════════════════════════════════════════════════════════
// SECTION D — OPTIMIZATION
// ═══════════════════════════════════════════════════════════════

export type OptimizerAlgorithm = 'genetic' | 'pso' | 'bayesian' | 'grid' | 'random';
export type OptimizationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'canceled';

export interface OptimizationObjective {
  metric: string;
  direction: 'maximize' | 'minimize';
  weight: number;
}

export interface OptimizationCandidate {
  params: Record<string, number>;
  fitness: number;
  metrics: Record<string, number>;
  rank?: number;
  neighborhood_stability?: number;   // 0–1, how stable the fitness is around this point
}

export interface OptimizationRunConfig {
  algorithm: OptimizerAlgorithm;
  objectives: OptimizationObjective[];
  paramRanges: Array<{
    name: string;
    min: number;
    max: number;
    step: number;
    type: 'int' | 'float';
  }>;
  constraints: {
    minTrades: number;
    maxDrawdown: number;
    maxRuntime: number; // seconds
    searchBudget: number; // max evaluations
  };
  algorithmConfig: Record<string, number>;
  seed?: number;
}

export interface OptimizationRunRecord {
  id: UUID;
  user_id: UUID;
  strategy_id?: UUID;
  dataset_id?: UUID;
  config: OptimizationRunConfig;
  status: OptimizationStatus;
  progress: number;
  best_candidate?: OptimizationCandidate;
  candidates: OptimizationCandidate[];
  convergence: Array<{ gen: number; best: number; avg: number }>;
  pareto_front?: OptimizationCandidate[];   // multi-objective
  started_at?: ISOTimestamp;
  completed_at?: ISOTimestamp;
  error?: string;
  created_at: ISOTimestamp;
}

// ═══════════════════════════════════════════════════════════════
// SECTION E — WALK-FORWARD
// ═══════════════════════════════════════════════════════════════

export interface WalkForwardRunRecord {
  id: UUID;
  user_id: UUID;
  strategy_id?: UUID;
  dataset_id?: UUID;
  config: WalkForwardConfig;
  windows: WalkForwardWindowRecord[];
  diagnostics?: WalkForwardDiagnostics;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  created_at: ISOTimestamp;
}

export interface WalkForwardConfig {
  train_ratio: number;
  window_size: number;          // bars
  step_size: number;            // bars
  num_windows: number;
  split_mode: 'rolling' | 'anchored';
  min_trades_per_window: number;
  optimizer_algorithm: OptimizerAlgorithm;
  objective: string;
}

export interface WalkForwardWindowRecord {
  window_index: number;
  train_start: ISOTimestamp;
  train_end: ISOTimestamp;
  test_start: ISOTimestamp;
  test_end: ISOTimestamp;
  train_metrics: WalkForwardWindowMetrics;
  test_metrics: WalkForwardWindowMetrics;
  best_params: Record<string, number>;
  train_trade_count: number;
  test_trade_count: number;
  status: 'pending' | 'training' | 'testing' | 'done' | 'skipped' | 'error';
  skip_reason?: string;
  parameter_drift?: number;   // distance from previous window's best params
}

export interface WalkForwardWindowMetrics {
  net_profit: number;
  sharpe: number;
  sortino: number;
  max_dd: number;
  profit_factor: number;
  win_rate: number;
  expectancy: number;
  trade_count: number;
}

export interface WalkForwardDiagnostics {
  oos_sharpe: number;
  oos_max_dd: number;
  oos_net_profit: number;
  avg_train_sharpe: number;
  avg_test_sharpe: number;
  degradation_ratio: number;      // test_sharpe / train_sharpe
  consistency_score: number;       // 0–100
  parameter_drift_score: number;   // 0–100, lower = more stable
  overfit_risk_score: number;      // 0–100
  walk_forward_efficiency: number; // OOS equity / IS equity ratio
  recommendation: 'robust' | 'acceptable' | 'overfitting' | 'insufficient_data';
  deployment_suitable: boolean;
}

// ═══════════════════════════════════════════════════════════════
// SECTION F — MONTE CARLO
// ═══════════════════════════════════════════════════════════════

export interface MonteCarloRunRecord {
  id: UUID;
  user_id: UUID;
  strategy_id?: UUID;
  backtest_run_id?: UUID;
  source_type: 'backtest_trades' | 'return_series' | 'equity_curve';
  config: MonteCarloConfig;
  results?: MonteCarloResults;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  created_at: ISOTimestamp;
}

export interface MonteCarloConfig {
  num_simulations: number;
  method: 'shuffle' | 'bootstrap' | 'block_bootstrap';
  block_size?: number;
  fee_perturbation_pct?: number;
  slippage_perturbation_pct?: number;
  initial_capital?: number;
}

export interface MonteCarloResults {
  final_equity_percentiles: {
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
  max_drawdown_percentiles: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  ruin_probability: number;        // probability of losing > X%
  ruin_threshold_pct: number;      // the X% threshold
  sharpe_percentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
  confidence_bands: Array<{
    bar_index: number;
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// SECTION G — PAPER TRADING
// ═══════════════════════════════════════════════════════════════

export type PaperMode = 'replay' | 'live_paper';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'bracket';
export type OrderStatus = 'created' | 'accepted' | 'working' | 'partially_filled' | 'filled' | 'canceled' | 'rejected' | 'expired';
export type OrderSide = 'buy' | 'sell';

export interface PaperAccount {
  id: UUID;
  user_id: UUID;
  name: string;
  mode: PaperMode;
  initial_balance: number;
  balance: number;
  equity: number;
  used_margin: number;
  free_margin: number;
  realized_pnl: number;
  unrealized_pnl: number;
  total_fees: number;
  exposure_by_symbol: Record<string, number>;
  exposure_by_strategy: Record<string, number>;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

export interface PaperOrder {
  id: UUID;
  account_id: UUID;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;        // limit/stop price
  stop_price?: number;   // stop-limit trigger
  stop_loss?: number;
  take_profit?: number;
  trailing_stop?: number;
  break_even_trigger?: number;
  status: OrderStatus;
  filled_quantity: number;
  avg_fill_price?: number;
  fees: number;
  slippage: number;
  strategy_id?: UUID;
  reject_reason?: string;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

export interface PaperPosition {
  id: UUID;
  account_id: UUID;
  symbol: string;
  side: OrderSide;
  quantity: number;
  avg_entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  realized_pnl: number;
  stop_loss?: number;
  take_profit?: number;
  trailing_stop?: number;
  strategy_id?: UUID;
  opened_at: ISOTimestamp;
}

export interface PaperFill {
  id: UUID;
  order_id: UUID;
  account_id: UUID;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  fees: number;
  slippage: number;
  fill_model: FillModelType;
  filled_at: ISOTimestamp;
}

export type FillModelType = 'optimistic' | 'realistic' | 'conservative';

export interface FillModelConfig {
  type: FillModelType;
  spread_multiplier: number;
  slippage_ticks: number;
  commission_per_lot: number;
  reject_on_session_closed: boolean;
  gap_handling: 'fill_at_open' | 'reject' | 'skip';
}

export interface ReplaySession {
  id: UUID;
  account_id: UUID;
  dataset_id: UUID;
  strategy_id?: UUID;
  speed_multiplier: number;
  current_bar_index: number;
  total_bars: number;
  status: 'playing' | 'paused' | 'stopped' | 'completed';
  fill_model: FillModelConfig;
  started_at: ISOTimestamp;
  completed_at?: ISOTimestamp;
}

// ═══════════════════════════════════════════════════════════════
// SECTION H — EXECUTION BRIDGE & DEPLOYMENTS
// ═══════════════════════════════════════════════════════════════

export type DeploymentStatus = 'pending_approval' | 'active' | 'paused' | 'stopped' | 'error' | 'emergency_stopped';

export interface DeploymentRecord {
  id: UUID;
  user_id: UUID;
  strategy_version_id?: UUID;
  strategy_name: string;
  account_id?: UUID;
  broker_type: string;
  symbol: string;
  timeframe: string;
  status: DeploymentStatus;
  risk_policy_id?: UUID;
  runtime_config: Record<string, unknown>;
  last_heartbeat?: ISOTimestamp;
  last_signal_at?: ISOTimestamp;
  last_order_at?: ISOTimestamp;
  last_fill_at?: ISOTimestamp;
  pause_reason?: string;
  trades_executed: number;
  current_pnl: number;
  idempotency_key?: string;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

export interface BrokerConnectionRecord {
  id: UUID;
  user_id: UUID;
  broker_type: string;
  display_name?: string;
  status: 'connected' | 'disconnected' | 'error' | 'expired';
  account_id?: string;
  last_sync_at?: ISOTimestamp;
  last_heartbeat?: ISOTimestamp;
  token_expiry?: ISOTimestamp;
  metadata?: Record<string, unknown>;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

export interface AccountSnapshot {
  id: UUID;
  broker_connection_id: UUID;
  balance: number;
  equity: number;
  used_margin: number;
  free_margin: number;
  floating_pnl: number;
  positions_count: number;
  orders_count: number;
  snapshot_at: ISOTimestamp;
}

export interface ExecutionEvent {
  id: UUID;
  deployment_id: UUID;
  event_type: 'signal' | 'order_created' | 'order_submitted' | 'order_filled' | 'order_rejected' | 'order_canceled' | 'position_opened' | 'position_closed' | 'heartbeat' | 'error';
  detail: string;
  metadata?: Record<string, unknown>;
  created_at: ISOTimestamp;
}

export interface ReconciliationReport {
  id: UUID;
  deployment_id?: UUID;
  broker_connection_id: UUID;
  platform_positions: number;
  broker_positions: number;
  mismatches: Array<{
    type: 'orphan_platform' | 'orphan_broker' | 'quantity_mismatch' | 'pnl_mismatch';
    symbol: string;
    detail: string;
  }>;
  severity: 'clean' | 'minor' | 'major' | 'critical';
  reconciled_at: ISOTimestamp;
}

// ═══════════════════════════════════════════════════════════════
// SECTION I — REGIME DETECTION
// ═══════════════════════════════════════════════════════════════

export type RegimeLabel = 'trending' | 'ranging' | 'choppy' | 'volatile' | 'low_volatility' | 'breakout';

export interface RegimeSnapshot {
  id: UUID;
  user_id: UUID;
  symbol: string;
  timeframe: string;
  regime: RegimeLabel;
  confidence: number;
  features: RegimeFeatures;
  computed_at: ISOTimestamp;
}

export interface RegimeFeatures {
  atr_percentile: number;
  realized_volatility: number;
  trend_slope: number;
  adx: number;
  range_compression: number;
  choppiness: number;
  ma_slope_50?: number;
  breakout_frequency?: number;
  return_dispersion?: number;
}

export interface RegimeTransition {
  id: UUID;
  symbol: string;
  timeframe: string;
  from_regime: RegimeLabel;
  to_regime: RegimeLabel;
  confidence: number;
  transitioned_at: ISOTimestamp;
}

export interface StrategyRegimeCompatibility {
  strategy_id: UUID;
  regime: RegimeLabel;
  win_rate: number;
  expectancy: number;
  max_drawdown: number;
  trade_count: number;
  deployable: boolean;
  computed_at: ISOTimestamp;
}

// ═══════════════════════════════════════════════════════════════
// SECTION J — STRATEGY INTELLIGENCE
// ═══════════════════════════════════════════════════════════════

export interface StrategyIntelligenceRecord {
  id: UUID;
  user_id: UUID;
  strategy_id?: UUID;
  name: string;
  strategy_type: string;
  description: string;
  methodology: string;
  status: string;
  readiness: StrategyReadiness;
  // Performance (from backtests)
  win_rate: number;
  profit_factor: number;
  expectancy: number;
  cagr: number;
  max_drawdown: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  // Research (from validation)
  walk_forward_stability: number;
  oos_performance: number;
  parameter_robustness: number;
  recovery_efficiency: number;
  mmc_composite_score: number;
  execution_realism_score: number;
  // Regime dependence
  regime_dependence_score: number;
  // Capital efficiency
  capital_efficiency_score: number;
  // Monte Carlo tail risk
  mc_ruin_probability?: number;
  mc_max_dd_95?: number;
  // Compatibility
  markets: string[];
  assets: string[];
  timeframes: string[];
  regime_suitability: string[];
  session_dependency: string;
  // Tags
  tags: string[];
  // Evidence links
  backtest_count: number;
  last_backtest_at?: ISOTimestamp;
  last_wf_at?: ISOTimestamp;
  last_mc_at?: ISOTimestamp;
  last_paper_at?: ISOTimestamp;
  last_live_at?: ISOTimestamp;
  // Quarantine
  quarantine_reason?: string;
  quarantined_at?: ISOTimestamp;
  // Meta
  notes: string;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

export interface StrategyHealthSnapshot {
  id: UUID;
  strategy_id: UUID;
  robustness_score: number;        // 0–100
  risk_quality_score: number;      // 0–100
  consistency_score: number;       // 0–100
  execution_reality_score: number; // 0–100
  overall_score: number;           // weighted composite
  grade: 'healthy' | 'medium' | 'risky';
  reasons: string[];
  warnings: string[];
  computed_at: ISOTimestamp;
}

// ═══════════════════════════════════════════════════════════════
// SECTION K — AUTO-SELECTION & REPLACEMENT
// ═══════════════════════════════════════════════════════════════

export interface StrategySelectionRun {
  id: UUID;
  user_id: UUID;
  portfolio_id?: UUID;
  regime_snapshot_id?: UUID;
  risk_budget: number;
  capital: number;
  selected: StrategySelectionDecision[];
  rejected: StrategySelectionDecision[];
  status: 'completed' | 'failed';
  created_at: ISOTimestamp;
}

export interface StrategySelectionDecision {
  strategy_id: UUID;
  strategy_name: string;
  action: 'selected' | 'rejected';
  reason: string;
  score: number;
  regime_fit: boolean;
  correlation_conflict: boolean;
  evidence_sufficient: boolean;
}

export interface StrategyReplacementEvent {
  id: UUID;
  deployment_id: UUID;
  outgoing_strategy_id: UUID;
  incoming_strategy_id?: UUID;
  trigger: 'degradation' | 'regime_change' | 'risk_breach' | 'manual' | 'kill_switch';
  reason: string;
  auto_approved: boolean;
  approved_at?: ISOTimestamp;
  created_at: ISOTimestamp;
}

// ═══════════════════════════════════════════════════════════════
// SECTION M — PORTFOLIO
// ═══════════════════════════════════════════════════════════════

export type AllocationMethod = 'equal_weight' | 'score_weighted' | 'volatility_targeted' | 'risk_parity' | 'mean_variance';

export interface PortfolioDefinition {
  id: UUID;
  user_id: UUID;
  name: string;
  allocation_method: AllocationMethod;
  max_strategies: number;
  risk_budget_pct: number;
  constraints: PortfolioConstraints;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

export interface PortfolioConstraints {
  max_per_strategy_pct: number;
  max_per_symbol_pct: number;
  max_per_family_pct: number;
  max_concentration_pct: number;
  max_correlation: number;
  max_turnover_pct: number;
  max_drawdown_budget_pct: number;
}

export interface PortfolioAllocation {
  strategy_id: UUID;
  strategy_name: string;
  weight_pct: number;
  role: 'champion' | 'challenger' | 'reserve';
  symbol: string;
  expected_return: number;
  expected_drawdown: number;
  correlation_with_portfolio: number;
}

export interface RebalanceRun {
  id: UUID;
  portfolio_id: UUID;
  trigger: 'scheduled' | 'drift' | 'replacement' | 'manual';
  before_allocations: PortfolioAllocation[];
  proposed_allocations: PortfolioAllocation[];
  diffs: Array<{
    strategy_id: UUID;
    from_pct: number;
    to_pct: number;
    action: 'increase' | 'decrease' | 'add' | 'remove' | 'unchanged';
  }>;
  status: 'proposed' | 'approved' | 'executed' | 'rejected';
  approved_at?: ISOTimestamp;
  executed_at?: ISOTimestamp;
  created_at: ISOTimestamp;
}

// ═══════════════════════════════════════════════════════════════
// SECTION N — RISK ENFORCEMENT
// ═══════════════════════════════════════════════════════════════

export type RiskScope = 'account' | 'portfolio' | 'deployment' | 'strategy' | 'symbol';

export interface RiskPolicy {
  id: UUID;
  user_id: UUID;
  name: string;
  scope: RiskScope;
  scope_id?: UUID;
  rules: RiskRule[];
  enabled: boolean;
  version: number;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

export interface RiskRule {
  type: 'max_daily_loss' | 'max_drawdown' | 'max_positions' | 'max_symbol_exposure' | 'max_strategy_exposure' | 'max_leverage' | 'max_notional' | 'spread_guard' | 'slippage_guard' | 'session_guard' | 'market_closed' | 'cooldown' | 'kill_switch';
  limit: number;
  unit: string;
  action: 'block' | 'pause' | 'stop' | 'alert';
  cooldown_minutes?: number;
}

export interface RiskBreach {
  id: UUID;
  policy_id: UUID;
  rule_type: string;
  current_value: number;
  limit_value: number;
  action_taken: string;
  deployment_id?: UUID;
  order_id?: UUID;
  acknowledged: boolean;
  acknowledged_at?: ISOTimestamp;
  acknowledged_by?: UUID;
  created_at: ISOTimestamp;
}

export type RiskCheckPoint = 'pre_signal' | 'pre_order' | 'pre_submit' | 'post_fill' | 'on_rebalance' | 'on_monitor';

export interface RiskCheckResult {
  passed: boolean;
  checkpoint: RiskCheckPoint;
  breaches: RiskBreach[];
  timestamp: ISOTimestamp;
}

// ═══════════════════════════════════════════════════════════════
// SECTION O — OBSERVABILITY & INCIDENTS
// ═══════════════════════════════════════════════════════════════

export type IncidentSeverity = 'info' | 'warning' | 'elevated' | 'critical';
export type IncidentStatus = 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'suppressed';

export interface IncidentEvent {
  id: UUID;
  user_id: UUID;
  type: 'stale_data' | 'stale_signal' | 'broker_disconnect' | 'reconciliation_mismatch' | 'order_rejection' | 'abnormal_slippage' | 'risk_breach' | 'deployment_crash' | 'regime_incompatible' | 'portfolio_drift' | 'heartbeat_miss' | 'custom';
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  detail: string;
  deployment_id?: UUID;
  strategy_id?: UUID;
  metadata?: Record<string, unknown>;
  acknowledged_at?: ISOTimestamp;
  acknowledged_by?: UUID;
  resolved_at?: ISOTimestamp;
  resolved_by?: UUID;
  resolution_notes?: string;
  created_at: ISOTimestamp;
}

export interface HeartbeatStatus {
  entity_type: 'strategy' | 'broker' | 'data_feed' | 'job' | 'deployment';
  entity_id: UUID;
  last_heartbeat: ISOTimestamp;
  is_stale: boolean;
  staleness_threshold_minutes: number;
}

export interface QuantAuditEvent {
  id: UUID;
  user_id: UUID;
  action: string;
  entity_type: string;
  entity_id?: UUID;
  detail: string;
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at: ISOTimestamp;
}

// ═══════════════════════════════════════════════════════════════
// SECTION L — BATCH ORCHESTRATION
// ═══════════════════════════════════════════════════════════════

export type BatchJobType = 'backtest' | 'optimization' | 'walk_forward' | 'monte_carlo' | 'scoring_refresh' | 'portfolio_build' | 'regime_compute';
export type BatchJobStatus = 'queued' | 'reserved' | 'running' | 'paused' | 'retried' | 'failed' | 'canceled' | 'completed';

export interface BatchJobRecord {
  id: UUID;
  user_id: UUID;
  cycle_id?: UUID;
  job_type: BatchJobType;
  config: Record<string, unknown>;
  status: BatchJobStatus;
  progress: number;
  priority: number;
  retry_count: number;
  max_retries: number;
  error?: string;
  output_summary?: Record<string, unknown>;
  started_at?: ISOTimestamp;
  completed_at?: ISOTimestamp;
  created_at: ISOTimestamp;
}
