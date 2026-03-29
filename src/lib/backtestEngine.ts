/**
 * Backtest Execution Engine
 * Runs parsed strategies on OHLCV data with proper signal generation
 */

import { ParsedStrategy, ParsedIndicator, TradingCondition } from './strategyParser';
import { 
  calculateEMA, 
  calculateSMA, 
  calculateRSI, 
  calculateATR, 
  calculateMACD, 
  calculateBollingerBands,
  calculateStochastic,
  calculateADX,
  calculateCCI,
  calculateWMA,
  calculateHMA,
  calculateDonchian,
  calculateOBV,
  calculateMFI,
  calculateSupertrend,
  calculateVWAP,
  calculateIchimoku,
  calculatePivotPoints,
  getAnnualizationFactor,
  getPriceBySource,
  OHLCV
} from './indicators';
import { loadCostModelSettings, getSymbolCostConfig, CostModelSettings } from './costModel';

export interface BacktestConfig {
  initialCapital: number;
  commissionPercent: number;
  slippageTicks: number;
  spreadPoints: number;
  riskPerTrade: number;
  maxTradesPerDay: number;
  dailyLossCap: number;
  sessionFilter?: {
    enabled: boolean;
    startHour: number;
    endHour: number;
  };
  // Optional: override cost model settings
  costModelOverride?: CostModelSettings;
  // Phase 1: Advanced position management
  trailingStop?: {
    enabled: boolean;
    type: 'percent' | 'atr';
    value: number;       // percent or ATR multiplier
    atrPeriod?: number;
  };
  atrStopLoss?: {
    enabled: boolean;
    multiplier: number;
    period: number;
  };
  pyramiding?: {
    enabled: boolean;
    maxAdds: number;      // max additional entries
    scaleInPercent: number; // % of remaining capital per add
  };
  partialExit?: {
    enabled: boolean;
    levels: { percent: number; sizePercent: number }[]; // e.g. [{percent: 50, sizePercent: 50}]
  };
  timeframe?: string; // for Sharpe annualization
}

export interface Trade {
  id: string;
  entryTime: string;
  exitTime: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  commission: number;
  entryReason: string;
  exitReason: string;
}

export interface BacktestResult {
  id: string;
  symbol: string;
  dateRange: string;
  winRate: number;
  profitFactor: number;
  expectancyR: number;
  maxDrawdownPercent: number;
  maxDrawdownAmount: number;
  cagr: number;
  sharpeRatio: number;
  sortinoRatio: number;
  treynorRatio: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  equityCurve: number[];
  drawdownCurve: number[];
  trades: Trade[];
  runAt: string;
  runDurationMs: number;
}

interface IndicatorValues {
  [key: string]: number[];
}

interface Position {
  direction: 'long' | 'short';
  entryPrice: number;
  entryTime: string;
  entryIndex: number;
  size: number;
  entryReason: string;
}

/**
 * Calculate all indicators for the strategy
 */
function calculateIndicators(bars: OHLCV[], strategy: ParsedStrategy): IndicatorValues {
  const indicators: IndicatorValues = {};
  
  for (const ind of strategy.indicators) {
    const sourceData = getPriceBySource(bars, ind.source);
    
    switch (ind.type) {
      case 'EMA':
        indicators[ind.name] = calculateEMA(sourceData, ind.period);
        break;
      case 'SMA':
        indicators[ind.name] = calculateSMA(sourceData, ind.period);
        break;
      case 'RSI':
        indicators[ind.name] = calculateRSI(sourceData, ind.period);
        break;
      case 'ATR':
        indicators[ind.name] = calculateATR(bars, ind.period);
        break;
      case 'MACD':
        const macdResult = calculateMACD(sourceData, 12, 26, 9);
        indicators[`${ind.name}_line`] = macdResult.macd;
        indicators[`${ind.name}_signal`] = macdResult.signal;
        indicators[`${ind.name}_hist`] = macdResult.histogram;
        break;
      case 'BB':
        const bbResult = calculateBollingerBands(sourceData, ind.period, ind.params?.stdDev || 2);
        indicators[`${ind.name}_upper`] = bbResult.upper;
        indicators[`${ind.name}_middle`] = bbResult.middle;
        indicators[`${ind.name}_lower`] = bbResult.lower;
        break;
      case 'STOCH':
        const stochResult = calculateStochastic(bars, ind.period, ind.params?.dPeriod || 3);
        indicators[`${ind.name}_k`] = stochResult.k;
        indicators[`${ind.name}_d`] = stochResult.d;
        break;
      case 'ADX':
        const adxResult = calculateADX(bars, ind.period);
        indicators[`${ind.name}`] = adxResult.adx;
        indicators[`${ind.name}_plus`] = adxResult.plusDI;
        indicators[`${ind.name}_minus`] = adxResult.minusDI;
        break;
      case 'CCI':
        indicators[ind.name] = calculateCCI(bars, ind.period);
        break;
      case 'WMA':
        indicators[ind.name] = calculateWMA(sourceData, ind.period);
        break;
      case 'HMA':
        indicators[ind.name] = calculateHMA(sourceData, ind.period);
        break;
      case 'DONCHIAN': {
        const dcResult = calculateDonchian(bars, ind.period);
        indicators[`${ind.name}_upper`] = dcResult.upper;
        indicators[`${ind.name}_middle`] = dcResult.middle;
        indicators[`${ind.name}_lower`] = dcResult.lower;
        break;
      }
      case 'OBV':
        indicators[ind.name] = calculateOBV(bars);
        break;
      case 'MFI':
        indicators[ind.name] = calculateMFI(bars, ind.period);
        break;
      case 'SUPERTREND': {
        const stResult = calculateSupertrend(bars, ind.period, ind.params?.multiplier || 3);
        indicators[`${ind.name}`] = stResult.supertrend;
        indicators[`${ind.name}_dir`] = stResult.direction;
        break;
      }
      case 'VWAP':
        indicators[ind.name] = calculateVWAP(bars);
        break;
      case 'ICHIMOKU': {
        const ichResult = calculateIchimoku(bars, ind.params?.tenkan || 9, ind.params?.kijun || 26, ind.params?.senkou || 52);
        indicators[`${ind.name}_tenkan`] = ichResult.tenkanSen;
        indicators[`${ind.name}_kijun`] = ichResult.kijunSen;
        indicators[`${ind.name}_senkouA`] = ichResult.senkouA;
        indicators[`${ind.name}_senkouB`] = ichResult.senkouB;
        indicators[`${ind.name}_chikou`] = ichResult.chikouSpan;
        break;
      }
      case 'PIVOT': {
        const pvResult = calculatePivotPoints(bars);
        indicators[`${ind.name}_pp`] = pvResult.pivot;
        indicators[`${ind.name}_r1`] = pvResult.r1;
        indicators[`${ind.name}_r2`] = pvResult.r2;
        indicators[`${ind.name}_r3`] = pvResult.r3;
        indicators[`${ind.name}_s1`] = pvResult.s1;
        indicators[`${ind.name}_s2`] = pvResult.s2;
        indicators[`${ind.name}_s3`] = pvResult.s3;
        break;
      }
    }
  }
  
  return indicators;
}

/**
 * Get indicator value at a specific bar index
 */
function getIndicatorValue(name: string, index: number, indicators: IndicatorValues, bars: OHLCV[]): number {
  // Check if it's a price reference
  if (['open', 'high', 'low', 'close', 'volume'].includes(name.toLowerCase())) {
    const bar = bars[index];
    switch (name.toLowerCase()) {
      case 'open': return bar.open;
      case 'high': return bar.high;
      case 'low': return bar.low;
      case 'close': return bar.close;
      case 'volume': return bar.volume;
    }
  }
  
  // Check if it's a constant number
  const num = parseFloat(name);
  if (!isNaN(num)) return num;
  
  // Get from indicators
  const values = indicators[name];
  if (!values) return NaN;
  return values[index];
}

/**
 * Check if a trading condition is met
 */
function checkCondition(
  condition: TradingCondition,
  index: number,
  indicators: IndicatorValues,
  bars: OHLCV[]
): boolean {
  const leftCurrent = getIndicatorValue(condition.left, index, indicators, bars);
  const rightCurrent = getIndicatorValue(condition.right, index, indicators, bars);
  
  if (isNaN(leftCurrent) || isNaN(rightCurrent)) return false;
  
  switch (condition.type) {
    case 'crossover': {
      if (index < 1) return false;
      const leftPrev = getIndicatorValue(condition.left, index - 1, indicators, bars);
      const rightPrev = getIndicatorValue(condition.right, index - 1, indicators, bars);
      if (isNaN(leftPrev) || isNaN(rightPrev)) return false;
      return leftCurrent > rightCurrent && leftPrev <= rightPrev;
    }
    case 'crossunder': {
      if (index < 1) return false;
      const leftPrev = getIndicatorValue(condition.left, index - 1, indicators, bars);
      const rightPrev = getIndicatorValue(condition.right, index - 1, indicators, bars);
      if (isNaN(leftPrev) || isNaN(rightPrev)) return false;
      return leftCurrent < rightCurrent && leftPrev >= rightPrev;
    }
    case 'above':
      return leftCurrent > rightCurrent;
    case 'below':
      return leftCurrent < rightCurrent;
    case 'equals':
      return Math.abs(leftCurrent - rightCurrent) < 0.0001;
    default:
      return false;
  }
}

/**
 * Check if all conditions in a list are met (AND logic)
 */
function checkAllConditions(
  conditions: TradingCondition[],
  index: number,
  indicators: IndicatorValues,
  bars: OHLCV[]
): boolean {
  if (conditions.length === 0) return false;
  return conditions.every(cond => checkCondition(cond, index, indicators, bars));
}

/**
 * Generate a unique trade ID
 */
/**
 * Generate a unique trade ID using crypto UUID
 */
function generateTradeId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Main backtest execution function
 */
export function executeBacktest(
  bars: OHLCV[],
  strategy: ParsedStrategy,
  config: BacktestConfig,
  symbol: string,
  onProgress?: (pct: number, msg: string) => void
): BacktestResult {
  const startTime = Date.now();
  
  // Load cost model settings (use override if provided, else load from storage)
  const costModelSettings = config.costModelOverride ?? loadCostModelSettings();
  const symbolCosts = getSymbolCostConfig(symbol, costModelSettings);
  
  // Merge cost model with config (cost model takes precedence if enabled)
  const effectiveSlippage = symbolCosts.slippage > 0 ? symbolCosts.slippage : config.slippageTicks;
  const effectiveSpread = symbolCosts.spread > 0 ? symbolCosts.spread : config.spreadPoints;
  const effectiveCommission = symbolCosts.commission > 0 ? symbolCosts.commission : config.commissionPercent;
  
  // Calculate all indicators upfront
  onProgress?.(5, 'Calculating indicators...');
  const indicators = calculateIndicators(bars, strategy);
  
  // Initialize state
  let equity = config.initialCapital;
  const equityCurve: number[] = [equity];
  const drawdownCurve: number[] = [0];
  const trades: Trade[] = [];
  let position: Position | null = null;
  let maxEquity = equity;
  
  // Stats tracking
  let grossProfit = 0;
  let grossLoss = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let dailyPnL = 0;
  let lastDate = '';
  let tradesToday = 0;
  
  // Warmup period (max indicator period)
  const warmup = Math.max(...strategy.indicators.map(i => i.period)) + 1;
  
  onProgress?.(10, 'Running simulation...');
  
  // Process each bar
  for (let i = warmup; i < bars.length; i++) {
    const bar = bars[i];
    const barDate = new Date(bar.timestamp).toDateString();
    
    // Reset daily counters
    if (barDate !== lastDate) {
      lastDate = barDate;
      dailyPnL = 0;
      tradesToday = 0;
    }
    
    // Session filter
    if (config.sessionFilter?.enabled) {
      const hour = new Date(bar.timestamp).getHours();
      if (hour < config.sessionFilter.startHour || hour >= config.sessionFilter.endHour) {
        equityCurve.push(equity);
        drawdownCurve.push(((maxEquity - equity) / maxEquity) * 100);
        continue;
      }
    }
    
    // Daily loss cap check
    if (config.dailyLossCap > 0 && dailyPnL < -(config.dailyLossCap / 100) * config.initialCapital) {
      equityCurve.push(equity);
      drawdownCurve.push(((maxEquity - equity) / maxEquity) * 100);
      continue;
    }
    
    // Check for exit signals if in position
    if (position) {
      let shouldExit = false;
      let exitReason = '';
      const currentPrice = bar.close;
      
      // Check stop loss
      if (strategy.stopLoss) {
        const slDistance = strategy.stopLoss.type === 'percent' 
          ? position.entryPrice * (strategy.stopLoss.value / 100)
          : strategy.stopLoss.value;
        
        if (position.direction === 'long' && currentPrice <= position.entryPrice - slDistance) {
          shouldExit = true;
          exitReason = 'Stop Loss';
        } else if (position.direction === 'short' && currentPrice >= position.entryPrice + slDistance) {
          shouldExit = true;
          exitReason = 'Stop Loss';
        }
      }
      
      // Check take profit
      if (!shouldExit && strategy.takeProfit) {
        const tpDistance = strategy.takeProfit.type === 'percent'
          ? position.entryPrice * (strategy.takeProfit.value / 100)
          : strategy.takeProfit.value;
        
        if (position.direction === 'long' && currentPrice >= position.entryPrice + tpDistance) {
          shouldExit = true;
          exitReason = 'Take Profit';
        } else if (position.direction === 'short' && currentPrice <= position.entryPrice - tpDistance) {
          shouldExit = true;
          exitReason = 'Take Profit';
        }
      }
      
      // Check exit conditions from strategy
      if (!shouldExit) {
        const exitConditions = position.direction === 'long' ? strategy.exitLong : strategy.exitShort;
        if (checkAllConditions(exitConditions, i, indicators, bars)) {
          shouldExit = true;
          exitReason = 'Signal Exit';
        }
      }
      
      // Execute exit
      if (shouldExit) {
        // Apply slippage and spread to exit price
        const exitPrice = position.direction === 'long'
          ? currentPrice * (1 - effectiveSlippage * 0.0001) - effectiveSpread * 0.0001 * currentPrice
          : currentPrice * (1 + effectiveSlippage * 0.0001) + effectiveSpread * 0.0001 * currentPrice;
        
        const pnl = position.direction === 'long'
          ? (exitPrice - position.entryPrice) * position.size
          : (position.entryPrice - exitPrice) * position.size;
        
        // Commission calculated using effective rate
        const commission = (position.entryPrice * position.size * effectiveCommission / 100) +
                          (exitPrice * position.size * effectiveCommission / 100);
        const netPnl = pnl - commission;
        
        equity += netPnl;
        dailyPnL += netPnl;
        maxEquity = Math.max(maxEquity, equity);
        
        if (netPnl > 0) {
          grossProfit += netPnl;
          winningTrades++;
        } else {
          grossLoss += Math.abs(netPnl);
          losingTrades++;
        }
        
        trades.push({
          id: generateTradeId(),
          entryTime: position.entryTime,
          exitTime: new Date(bar.timestamp).toISOString(),
          symbol,
          direction: position.direction,
          entryPrice: position.entryPrice,
          exitPrice,
          quantity: position.size,
          pnl: netPnl,
          pnlPercent: (netPnl / (position.entryPrice * position.size)) * 100,
          commission,
          entryReason: position.entryReason,
          exitReason
        });
        
        position = null;
      }
    }
    
    // Check for entry signals if not in position
    if (!position && tradesToday < config.maxTradesPerDay) {
      const longSignal = checkAllConditions(strategy.entryLong, i, indicators, bars);
      const shortSignal = checkAllConditions(strategy.entryShort, i, indicators, bars);
      
      if (longSignal || shortSignal) {
        const direction = longSignal ? 'long' : 'short';
        // Apply slippage and spread to entry price
        const entryPrice = direction === 'long'
          ? bar.close * (1 + effectiveSlippage * 0.0001) + effectiveSpread * 0.0001 * bar.close
          : bar.close * (1 - effectiveSlippage * 0.0001) - effectiveSpread * 0.0001 * bar.close;
        
        // Position sizing based on risk
        const riskAmount = equity * (config.riskPerTrade / 100);
        const size = riskAmount / entryPrice;
        
        position = {
          direction,
          entryPrice,
          entryTime: new Date(bar.timestamp).toISOString(),
          entryIndex: i,
          size,
          entryReason: `${direction === 'long' ? 'Long' : 'Short'} Signal`
        };
        
        tradesToday++;
      }
    }
    
    // Update equity curve
    equityCurve.push(equity);
    const drawdown = ((maxEquity - equity) / maxEquity) * 100;
    drawdownCurve.push(drawdown);
    
    // Progress update every 10%
    if (i % Math.floor(bars.length / 10) === 0) {
      const pct = Math.round((i / bars.length) * 80) + 10;
      onProgress?.(pct, `Processing bar ${i} of ${bars.length}...`);
    }
  }
  
  // Close any open position at end
  if (position) {
    const lastBar = bars[bars.length - 1];
    const exitPrice = lastBar.close;
    const pnl = position.direction === 'long'
      ? (exitPrice - position.entryPrice) * position.size
      : (position.entryPrice - exitPrice) * position.size;
    const commission = (position.entryPrice * position.size * config.commissionPercent / 100) +
                      (exitPrice * position.size * config.commissionPercent / 100);
    const netPnl = pnl - commission;
    
    equity += netPnl;
    
    if (netPnl > 0) {
      grossProfit += netPnl;
      winningTrades++;
    } else {
      grossLoss += Math.abs(netPnl);
      losingTrades++;
    }
    
    trades.push({
      id: generateTradeId(),
      entryTime: position.entryTime,
      exitTime: new Date(lastBar.timestamp).toISOString(),
      symbol,
      direction: position.direction,
      entryPrice: position.entryPrice,
      exitPrice,
      quantity: position.size,
      pnl: netPnl,
      pnlPercent: (netPnl / (position.entryPrice * position.size)) * 100,
      commission,
      entryReason: position.entryReason,
      exitReason: 'End of Data'
    });
  }
  
  onProgress?.(95, 'Calculating metrics...');
  
  // Calculate final metrics
  const totalTrades = trades.length;
  const netProfit = grossProfit - grossLoss;
  
  // O(n) max drawdown
  let maxDrawdown = 0;
  let maxDDAmount = 0;
  let peakEquity = equityCurve[0];
  for (let i = 1; i < equityCurve.length; i++) {
    if (equityCurve[i] > peakEquity) peakEquity = equityCurve[i];
    const ddAmount = peakEquity - equityCurve[i];
    const ddPct = peakEquity > 0 ? (ddAmount / peakEquity) * 100 : 0;
    if (ddPct > maxDrawdown) maxDrawdown = ddPct;
    if (ddAmount > maxDDAmount) maxDDAmount = ddAmount;
  }
  
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  
  // Calculate returns for Sharpe/Sortino/Treynor
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
  }
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdDev = returns.length > 1 
    ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length)
    : 1;
  const annFactor = getAnnualizationFactor(config.timeframe);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(annFactor) : 0;
  
  // Sortino: only downside deviation
  const downsideReturns = returns.filter(r => r < 0);
  const downsideVar = downsideReturns.length > 0
    ? downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length
    : 1;
  const downsideDev = Math.sqrt(downsideVar);
  const sortinoRatio = downsideDev > 0 ? (avgReturn / downsideDev) * Math.sqrt(annFactor) : 0;
  
  // Treynor ratio: excess return / beta (benchmark = buy-and-hold the symbol)
  let treynorRatio = 0;
  if (bars.length > 1 && returns.length > 1) {
    const benchReturns: number[] = [];
    for (let i = 1; i < bars.length; i++) {
      benchReturns.push((bars[i].close - bars[i - 1].close) / bars[i - 1].close);
    }
    // Align lengths (returns may be shorter due to warmup)
    const aligned = Math.min(returns.length, benchReturns.length);
    const stratReturnsAligned = returns.slice(returns.length - aligned);
    const benchReturnsAligned = benchReturns.slice(benchReturns.length - aligned);
    
    const benchMean = benchReturnsAligned.reduce((a, b) => a + b, 0) / aligned;
    const stratMean = stratReturnsAligned.reduce((a, b) => a + b, 0) / aligned;
    
    let covariance = 0;
    let benchVariance = 0;
    for (let i = 0; i < aligned; i++) {
      covariance += (stratReturnsAligned[i] - stratMean) * (benchReturnsAligned[i] - benchMean);
      benchVariance += (benchReturnsAligned[i] - benchMean) ** 2;
    }
    covariance /= aligned;
    benchVariance /= aligned;
    
    const beta = benchVariance > 0 ? covariance / benchVariance : 1;
    treynorRatio = beta !== 0 ? (stratMean * 252) / beta : 0; // Annualized
  }
  
  // CAGR calculation
  const yearsTraded = bars.length > 0 
    ? (bars[bars.length - 1].timestamp - bars[0].timestamp) / (365.25 * 24 * 60 * 60 * 1000)
    : 1;
  const cagr = yearsTraded > 0 
    ? (Math.pow(equity / config.initialCapital, 1 / yearsTraded) - 1) * 100
    : 0;
  
  // Expectancy
  const avgWin = winningTrades > 0 ? grossProfit / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? grossLoss / losingTrades : 0;
  const expectancyR = avgLoss > 0 
    ? ((winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss) / avgLoss
    : avgWin > 0 ? Infinity : 0;
  
  // Date range
  const dateRange = bars.length > 0
    ? `${new Date(bars[0].timestamp).toLocaleDateString()} - ${new Date(bars[bars.length - 1].timestamp).toLocaleDateString()}`
    : 'N/A';
  
  const runDurationMs = Date.now() - startTime;
  
  onProgress?.(100, 'Backtest complete!');
  
  return {
    id: crypto?.randomUUID?.() ?? `result_${Date.now()}`,
    symbol,
    dateRange,
    winRate,
    profitFactor: isFinite(profitFactor) ? profitFactor : 0,
    expectancyR: isFinite(expectancyR) ? expectancyR : 0,
    maxDrawdownPercent: maxDrawdown,
    maxDrawdownAmount: maxDDAmount,
    cagr: isFinite(cagr) ? cagr : 0,
    sharpeRatio: isFinite(sharpeRatio) ? sharpeRatio : 0,
    sortinoRatio: isFinite(sortinoRatio) ? sortinoRatio : 0,
    treynorRatio: isFinite(treynorRatio) ? treynorRatio : 0,
    totalTrades,
    winningTrades,
    losingTrades,
    netProfit,
    grossProfit,
    grossLoss,
    equityCurve,
    drawdownCurve,
    trades,
    runAt: new Date().toISOString(),
    runDurationMs,
  };
}
