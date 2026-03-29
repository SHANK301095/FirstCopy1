/**
 * Strategy Templates Library V3.0
 * Pre-built strategy templates
 */

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'trend' | 'meanreversion' | 'breakout' | 'momentum' | 'volatility';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  codeType: 'mql5' | 'yaml' | 'javascript';
  code: string;
  parameters: {
    name: string;
    type: 'number' | 'boolean' | 'select';
    default: number | boolean | string;
    min?: number;
    max?: number;
    options?: string[];
    description: string;
  }[];
  performance?: {
    expectedWinRate: string;
    expectedPF: string;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: 'ema-crossover',
    name: 'EMA Crossover',
    description: 'Classic dual exponential moving average crossover strategy. Goes long when fast EMA crosses above slow EMA, short when it crosses below.',
    category: 'trend',
    difficulty: 'beginner',
    codeType: 'yaml',
    code: `strategy:
  name: EMA Crossover
  version: "1.0"

parameters:
  fast_period: 9
  slow_period: 21
  
indicators:
  - name: fast_ema
    type: EMA
    source: close
    period: \${fast_period}
  - name: slow_ema
    type: EMA
    source: close
    period: \${slow_period}

signals:
  long_entry:
    condition: fast_ema crosses_above slow_ema
  long_exit:
    condition: fast_ema crosses_below slow_ema
  short_entry:
    condition: fast_ema crosses_below slow_ema
  short_exit:
    condition: fast_ema crosses_above slow_ema

risk:
  stop_loss: 2%
  take_profit: 4%
  max_position_size: 1`,
    parameters: [
      { name: 'fast_period', type: 'number', default: 9, min: 3, max: 50, description: 'Fast EMA period' },
      { name: 'slow_period', type: 'number', default: 21, min: 10, max: 200, description: 'Slow EMA period' },
    ],
    performance: {
      expectedWinRate: '40-50%',
      expectedPF: '1.3-1.8',
      riskLevel: 'medium',
    },
  },
  {
    id: 'rsi-mean-reversion',
    name: 'RSI Mean Reversion',
    description: 'Buys oversold conditions (RSI < 30) and sells overbought conditions (RSI > 70). Works best in ranging markets.',
    category: 'meanreversion',
    difficulty: 'beginner',
    codeType: 'yaml',
    code: `strategy:
  name: RSI Mean Reversion
  version: "1.0"

parameters:
  rsi_period: 14
  oversold: 30
  overbought: 70
  exit_level: 50
  
indicators:
  - name: rsi
    type: RSI
    source: close
    period: \${rsi_period}

signals:
  long_entry:
    condition: rsi < \${oversold}
  long_exit:
    condition: rsi > \${exit_level}
  short_entry:
    condition: rsi > \${overbought}
  short_exit:
    condition: rsi < \${exit_level}

risk:
  stop_loss: 1.5%
  take_profit: 3%`,
    parameters: [
      { name: 'rsi_period', type: 'number', default: 14, min: 5, max: 30, description: 'RSI period' },
      { name: 'oversold', type: 'number', default: 30, min: 10, max: 40, description: 'Oversold threshold' },
      { name: 'overbought', type: 'number', default: 70, min: 60, max: 90, description: 'Overbought threshold' },
    ],
    performance: {
      expectedWinRate: '55-65%',
      expectedPF: '1.2-1.5',
      riskLevel: 'low',
    },
  },
  {
    id: 'bollinger-breakout',
    name: 'Bollinger Band Breakout',
    description: 'Trades breakouts from Bollinger Bands. Enters when price closes outside bands with volume confirmation.',
    category: 'breakout',
    difficulty: 'intermediate',
    codeType: 'yaml',
    code: `strategy:
  name: Bollinger Breakout
  version: "1.0"

parameters:
  bb_period: 20
  bb_stddev: 2.0
  volume_mult: 1.5
  
indicators:
  - name: bb
    type: BollingerBands
    source: close
    period: \${bb_period}
    stddev: \${bb_stddev}
  - name: vol_sma
    type: SMA
    source: volume
    period: 20

signals:
  long_entry:
    condition: close > bb.upper AND volume > vol_sma * \${volume_mult}
  long_exit:
    condition: close < bb.middle OR stop_hit
  short_entry:
    condition: close < bb.lower AND volume > vol_sma * \${volume_mult}
  short_exit:
    condition: close > bb.middle OR stop_hit

risk:
  stop_loss: 2.5%
  take_profit: 5%
  trailing_stop: 1.5%`,
    parameters: [
      { name: 'bb_period', type: 'number', default: 20, min: 10, max: 50, description: 'Bollinger period' },
      { name: 'bb_stddev', type: 'number', default: 2.0, min: 1.0, max: 3.0, description: 'Standard deviations' },
      { name: 'volume_mult', type: 'number', default: 1.5, min: 1.0, max: 3.0, description: 'Volume multiplier' },
    ],
    performance: {
      expectedWinRate: '35-45%',
      expectedPF: '1.5-2.0',
      riskLevel: 'high',
    },
  },
  {
    id: 'macd-momentum',
    name: 'MACD Momentum',
    description: 'Uses MACD histogram for momentum entries. Filters with EMA for trend direction.',
    category: 'momentum',
    difficulty: 'intermediate',
    codeType: 'yaml',
    code: `strategy:
  name: MACD Momentum
  version: "1.0"

parameters:
  macd_fast: 12
  macd_slow: 26
  macd_signal: 9
  trend_ema: 100
  
indicators:
  - name: macd
    type: MACD
    source: close
    fast: \${macd_fast}
    slow: \${macd_slow}
    signal: \${macd_signal}
  - name: trend_filter
    type: EMA
    source: close
    period: \${trend_ema}

signals:
  long_entry:
    condition: macd.histogram crosses_above 0 AND close > trend_filter
  long_exit:
    condition: macd.histogram crosses_below 0
  short_entry:
    condition: macd.histogram crosses_below 0 AND close < trend_filter
  short_exit:
    condition: macd.histogram crosses_above 0

risk:
  stop_loss: 2%
  take_profit: 6%`,
    parameters: [
      { name: 'macd_fast', type: 'number', default: 12, min: 5, max: 20, description: 'MACD fast period' },
      { name: 'macd_slow', type: 'number', default: 26, min: 15, max: 50, description: 'MACD slow period' },
      { name: 'trend_ema', type: 'number', default: 100, min: 50, max: 200, description: 'Trend EMA period' },
    ],
    performance: {
      expectedWinRate: '45-55%',
      expectedPF: '1.4-1.8',
      riskLevel: 'medium',
    },
  },
  {
    id: 'atr-volatility',
    name: 'ATR Volatility Breakout',
    description: 'Uses ATR to identify low volatility contractions, then trades the expansion breakout.',
    category: 'volatility',
    difficulty: 'advanced',
    codeType: 'yaml',
    code: `strategy:
  name: ATR Volatility Breakout
  version: "1.0"

parameters:
  atr_period: 14
  lookback: 20
  contraction_pct: 0.5
  expansion_mult: 1.5
  
indicators:
  - name: atr
    type: ATR
    period: \${atr_period}
  - name: atr_ma
    type: SMA
    source: atr
    period: \${lookback}
  - name: high_channel
    type: Highest
    source: high
    period: \${lookback}
  - name: low_channel
    type: Lowest
    source: low
    period: \${lookback}

conditions:
  volatility_low:
    expression: atr < atr_ma * \${contraction_pct}
  volatility_expanding:
    expression: atr > atr_ma * \${expansion_mult}

signals:
  long_entry:
    condition: volatility_low[1] AND close > high_channel[1]
  long_exit:
    condition: close < low_channel[1] OR trailing_stop
  short_entry:
    condition: volatility_low[1] AND close < low_channel[1]
  short_exit:
    condition: close > high_channel[1] OR trailing_stop

risk:
  stop_loss_atr_mult: 2
  take_profit_atr_mult: 4
  trailing_stop_atr_mult: 1.5`,
    parameters: [
      { name: 'atr_period', type: 'number', default: 14, min: 7, max: 30, description: 'ATR period' },
      { name: 'lookback', type: 'number', default: 20, min: 10, max: 50, description: 'Channel lookback' },
      { name: 'contraction_pct', type: 'number', default: 0.5, min: 0.3, max: 0.8, description: 'Contraction threshold' },
    ],
    performance: {
      expectedWinRate: '30-40%',
      expectedPF: '1.8-2.5',
      riskLevel: 'high',
    },
  },
  {
    id: 'supertrend',
    name: 'SuperTrend Strategy',
    description: 'Uses SuperTrend indicator for trend following with ATR-based dynamic stops.',
    category: 'trend',
    difficulty: 'intermediate',
    codeType: 'yaml',
    code: `strategy:
  name: SuperTrend
  version: "1.0"

parameters:
  atr_period: 10
  multiplier: 3.0
  
indicators:
  - name: supertrend
    type: SuperTrend
    atr_period: \${atr_period}
    multiplier: \${multiplier}

signals:
  long_entry:
    condition: supertrend.direction changes_to 1
  long_exit:
    condition: supertrend.direction changes_to -1
  short_entry:
    condition: supertrend.direction changes_to -1
  short_exit:
    condition: supertrend.direction changes_to 1

risk:
  stop_loss: supertrend.value
  position_size: 1`,
    parameters: [
      { name: 'atr_period', type: 'number', default: 10, min: 5, max: 30, description: 'ATR period for SuperTrend' },
      { name: 'multiplier', type: 'number', default: 3.0, min: 1.0, max: 5.0, description: 'ATR multiplier' },
    ],
    performance: {
      expectedWinRate: '40-50%',
      expectedPF: '1.5-2.0',
      riskLevel: 'medium',
    },
  },
];

export function getTemplatesByCategory(category?: string): StrategyTemplate[] {
  if (!category) return STRATEGY_TEMPLATES;
  return STRATEGY_TEMPLATES.filter(t => t.category === category);
}

export function getTemplatesByDifficulty(difficulty: string): StrategyTemplate[] {
  return STRATEGY_TEMPLATES.filter(t => t.difficulty === difficulty);
}

export function getTemplateById(id: string): StrategyTemplate | undefined {
  return STRATEGY_TEMPLATES.find(t => t.id === id);
}

export const TEMPLATE_CATEGORIES = [
  { value: 'trend', label: 'Trend Following', icon: 'TrendingUp' },
  { value: 'meanreversion', label: 'Mean Reversion', icon: 'RefreshCw' },
  { value: 'breakout', label: 'Breakout', icon: 'Zap' },
  { value: 'momentum', label: 'Momentum', icon: 'Activity' },
  { value: 'volatility', label: 'Volatility', icon: 'BarChart3' },
];
