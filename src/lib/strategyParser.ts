/**
 * Strategy Parser - Extracts trading logic from MQL4/5, PineScript, and custom DSL
 * Converts strategy code into executable trading rules
 */

export interface ParsedIndicator {
  name: string;
  type: 'EMA' | 'SMA' | 'RSI' | 'MACD' | 'ATR' | 'BB' | 'STOCH' | 'CCI' | 'ADX' | 'WMA' | 'HMA' | 'DONCHIAN' | 'OBV' | 'MFI' | 'SUPERTREND' | 'VWAP' | 'ICHIMOKU' | 'PIVOT' | 'CUSTOM';
  period: number;
  source: 'open' | 'high' | 'low' | 'close' | 'volume' | 'hl2' | 'hlc3';
  params?: Record<string, number>;
}

export interface TradingCondition {
  type: 'crossover' | 'crossunder' | 'above' | 'below' | 'equals' | 'custom';
  left: string;  // Indicator or price reference
  right: string; // Indicator, price, or constant
  lookback?: number;
}

export interface ParsedStrategy {
  name: string;
  indicators: ParsedIndicator[];
  entryLong: TradingCondition[];
  entryShort: TradingCondition[];
  exitLong: TradingCondition[];
  exitShort: TradingCondition[];
  stopLoss?: { type: 'fixed' | 'atr' | 'percent'; value: number };
  takeProfit?: { type: 'fixed' | 'atr' | 'percent'; value: number };
  parameters: Record<string, { value: number; min?: number; max?: number }>;
  confidence: number;
  warnings: string[];
}

// Regex patterns for MQL parsing
const MQL_PATTERNS = {
  input: /input\s+(?:int|double|float|bool)\s+(\w+)\s*=\s*([^;]+);/gi,
  iMA: /iMA\s*\(\s*[^,]+,\s*[^,]+,\s*(\d+)\s*,\s*\d+\s*,\s*MODE_(EMA|SMA)/gi,
  iRSI: /iRSI\s*\(\s*[^,]+,\s*[^,]+,\s*(\d+)/gi,
  iATR: /iATR\s*\(\s*[^,]+,\s*[^,]+,\s*(\d+)/gi,
  iMACD: /iMACD\s*\(\s*[^,]+,\s*[^,]+,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi,
  iBB: /iBands\s*\(\s*[^,]+,\s*[^,]+,\s*(\d+)\s*,\s*([0-9.]+)/gi,
  iStoch: /iStochastic\s*\(\s*[^,]+,\s*[^,]+,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi,
  crossover: /(\w+)\s*>\s*(\w+)\s*&&\s*\1\s*\[\s*1\s*\]\s*<=\s*\2\s*\[\s*1\s*\]/gi,
  crossunder: /(\w+)\s*<\s*(\w+)\s*&&\s*\1\s*\[\s*1\s*\]\s*>=\s*\2\s*\[\s*1\s*\]/gi,
  // Tightened: require OrderSend/OrderOpen for MQL buy/sell detection (avoid false positives on comments/variable names)
  buySignal: /(?:OrderSend\s*\([^)]*OP_BUY|OrderOpen\s*\([^)]*ORDER_TYPE_BUY|signal\s*=\s*1\b)/gi,
  sellSignal: /(?:OrderSend\s*\([^)]*OP_SELL|OrderOpen\s*\([^)]*ORDER_TYPE_SELL|signal\s*=\s*-1\b)/gi,
  stopLoss: /(?:StopLoss|sl|stop_loss)\s*[=:]\s*(\d+)/gi,
  takeProfit: /(?:TakeProfit|tp|take_profit)\s*[=:]\s*(\d+)/gi,
};

// PineScript patterns
const PINE_PATTERNS = {
  indicator: /(\w+)\s*=\s*ta\.(ema|sma|rsi|atr|macd|bb|stoch)\s*\([^)]+,\s*(\d+)/gi,
  crossover: /ta\.crossover\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/gi,
  crossunder: /ta\.crossunder\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/gi,
  entryLong: /strategy\.entry\s*\(\s*["'](?:long|buy)["']/gi,
  entryShort: /strategy\.entry\s*\(\s*["'](?:short|sell)["']/gi,
  input: /(\w+)\s*=\s*input(?:\.int|\.float)?\s*\(\s*(\d+)/gi,
};

/**
 * Parse MQL4/5 Expert Advisor code
 */
function parseMQL(code: string): Partial<ParsedStrategy> {
  const indicators: ParsedIndicator[] = [];
  const parameters: Record<string, { value: number; min?: number; max?: number }> = {};
  const warnings: string[] = [];
  const entryLong: TradingCondition[] = [];
  const entryShort: TradingCondition[] = [];

  // Extract input parameters
  let match;
  const inputRegex = /input\s+(?:int|double|float)\s+(\w+)\s*=\s*(\d+)/gi;
  while ((match = inputRegex.exec(code)) !== null) {
    const [, name, value] = match;
    parameters[name] = { value: parseFloat(value) };
  }

  // Extract EMA indicators
  const emaRegex = /iMA\s*\(\s*[^,]+,\s*[^,]+,\s*(\d+)\s*,\s*\d+\s*,\s*MODE_EMA/gi;
  let emaCount = 0;
  while ((match = emaRegex.exec(code)) !== null) {
    emaCount++;
    indicators.push({
      name: `ema_${emaCount}`,
      type: 'EMA',
      period: parseInt(match[1]),
      source: 'close'
    });
  }

  // Extract SMA indicators
  const smaRegex = /iMA\s*\(\s*[^,]+,\s*[^,]+,\s*(\d+)\s*,\s*\d+\s*,\s*MODE_SMA/gi;
  let smaCount = 0;
  while ((match = smaRegex.exec(code)) !== null) {
    smaCount++;
    indicators.push({
      name: `sma_${smaCount}`,
      type: 'SMA',
      period: parseInt(match[1]),
      source: 'close'
    });
  }

  // Extract RSI
  const rsiRegex = /iRSI\s*\(\s*[^,]+,\s*[^,]+,\s*(\d+)/gi;
  while ((match = rsiRegex.exec(code)) !== null) {
    indicators.push({
      name: 'rsi',
      type: 'RSI',
      period: parseInt(match[1]),
      source: 'close'
    });
  }

  // Extract ATR
  const atrRegex = /iATR\s*\(\s*[^,]+,\s*[^,]+,\s*(\d+)/gi;
  while ((match = atrRegex.exec(code)) !== null) {
    indicators.push({
      name: 'atr',
      type: 'ATR',
      period: parseInt(match[1]),
      source: 'close'
    });
  }

  // Detect crossover patterns for entry
  const codeLines = code.split('\n');
  for (const line of codeLines) {
    // Tightened: require explicit array index [1] pattern for crossover detection
    if (/\w+\s*>\s*\w+\s*&&\s*\w+\s*\[\s*1\s*\]\s*<=\s*\w+\s*\[\s*1\s*\]/i.test(line)) {
      entryLong.push({
        type: 'crossover',
        left: indicators.length >= 2 ? indicators[0].name : 'ema_fast',
        right: indicators.length >= 2 ? indicators[1].name : 'ema_slow'
      });
    }
    if (/\w+\s*<\s*\w+\s*&&\s*\w+\s*\[\s*1\s*\]\s*>=\s*\w+\s*\[\s*1\s*\]/i.test(line)) {
      entryShort.push({
        type: 'crossunder',
        left: indicators.length >= 2 ? indicators[0].name : 'ema_fast',
        right: indicators.length >= 2 ? indicators[1].name : 'ema_slow'
      });
    }
  }

  // Extract stop loss and take profit
  let stopLoss: ParsedStrategy['stopLoss'] | undefined;
  let takeProfit: ParsedStrategy['takeProfit'] | undefined;
  
  const slMatch = /(?:StopLoss|SL)\s*[=:]\s*(\d+)/i.exec(code);
  if (slMatch) {
    stopLoss = { type: 'fixed', value: parseInt(slMatch[1]) };
  }
  
  const tpMatch = /(?:TakeProfit|TP)\s*[=:]\s*(\d+)/i.exec(code);
  if (tpMatch) {
    takeProfit = { type: 'fixed', value: parseInt(tpMatch[1]) };
  }

  // Calculate confidence based on what we found
  let confidence = 0.5;
  if (indicators.length >= 2) confidence += 0.2;
  if (entryLong.length > 0 || entryShort.length > 0) confidence += 0.2;
  if (stopLoss || takeProfit) confidence += 0.1;

  if (indicators.length === 0) {
    warnings.push('No indicators detected - using default EMA crossover');
    indicators.push(
      { name: 'ema_fast', type: 'EMA', period: 12, source: 'close' },
      { name: 'ema_slow', type: 'EMA', period: 26, source: 'close' }
    );
    entryLong.push({ type: 'crossover', left: 'ema_fast', right: 'ema_slow' });
    entryShort.push({ type: 'crossunder', left: 'ema_fast', right: 'ema_slow' });
  }

  return {
    indicators,
    parameters,
    entryLong,
    entryShort,
    exitLong: entryShort, // Default: exit long on short signal
    exitShort: entryLong, // Default: exit short on long signal
    stopLoss,
    takeProfit,
    confidence,
    warnings
  };
}

/**
 * Parse PineScript strategy code
 */
function parsePineScript(code: string): Partial<ParsedStrategy> {
  const indicators: ParsedIndicator[] = [];
  const parameters: Record<string, { value: number }> = {};
  const warnings: string[] = [];
  const entryLong: TradingCondition[] = [];
  const entryShort: TradingCondition[] = [];

  // Extract indicators
  const indicatorRegex = /(\w+)\s*=\s*ta\.(ema|sma|rsi|atr)\s*\([^,]+,\s*(\d+)\)/gi;
  let match;
  while ((match = indicatorRegex.exec(code)) !== null) {
    const [, name, type, period] = match;
    indicators.push({
      name,
      type: type.toUpperCase() as ParsedIndicator['type'],
      period: parseInt(period),
      source: 'close'
    });
  }

  // Extract crossover conditions
  const crossoverRegex = /ta\.crossover\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/gi;
  while ((match = crossoverRegex.exec(code)) !== null) {
    entryLong.push({
      type: 'crossover',
      left: match[1],
      right: match[2]
    });
  }

  // Extract crossunder conditions
  const crossunderRegex = /ta\.crossunder\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/gi;
  while ((match = crossunderRegex.exec(code)) !== null) {
    entryShort.push({
      type: 'crossunder',
      left: match[1],
      right: match[2]
    });
  }

  // Extract input parameters
  const inputRegex = /(\w+)\s*=\s*input(?:\.int|\.float)?\s*\(\s*(\d+)/gi;
  while ((match = inputRegex.exec(code)) !== null) {
    parameters[match[1]] = { value: parseFloat(match[2]) };
  }

  let confidence = 0.5;
  if (indicators.length > 0) confidence += 0.2;
  if (entryLong.length > 0) confidence += 0.15;
  if (entryShort.length > 0) confidence += 0.15;

  if (indicators.length === 0) {
    warnings.push('No indicators detected - using default EMA crossover');
    indicators.push(
      { name: 'ema_fast', type: 'EMA', period: 12, source: 'close' },
      { name: 'ema_slow', type: 'EMA', period: 26, source: 'close' }
    );
    entryLong.push({ type: 'crossover', left: 'ema_fast', right: 'ema_slow' });
    entryShort.push({ type: 'crossunder', left: 'ema_fast', right: 'ema_slow' });
  }

  return {
    indicators,
    parameters,
    entryLong,
    entryShort,
    exitLong: entryShort,
    exitShort: entryLong,
    confidence,
    warnings
  };
}

/**
 * Parse pseudocode/plain English rules
 */
function parsePseudocode(code: string): Partial<ParsedStrategy> {
  const indicators: ParsedIndicator[] = [];
  const warnings: string[] = [];
  const entryLong: TradingCondition[] = [];
  const entryShort: TradingCondition[] = [];

  const lowerCode = code.toLowerCase();

  // Detect EMA references
  const emaMatches = lowerCode.match(/ema\s*\(?(\d+)\)?/gi) || [];
  emaMatches.forEach((match, i) => {
    const period = parseInt(match.match(/\d+/)?.[0] || '12');
    indicators.push({
      name: `ema_${i + 1}`,
      type: 'EMA',
      period,
      source: 'close'
    });
  });

  // Detect RSI references
  if (/rsi/i.test(code)) {
    const rsiPeriod = parseInt(code.match(/rsi\s*\(?(\d+)\)?/i)?.[1] || '14');
    indicators.push({ name: 'rsi', type: 'RSI', period: rsiPeriod, source: 'close' });
    
    // RSI conditions
    if (/rsi.*<\s*30|oversold/i.test(code)) {
      entryLong.push({ type: 'below', left: 'rsi', right: '30' });
    }
    if (/rsi.*>\s*70|overbought/i.test(code)) {
      entryShort.push({ type: 'above', left: 'rsi', right: '70' });
    }
  }

  // Detect crossover conditions
  if (/cross.*above|cross.*over|crosses.*above/i.test(code)) {
    entryLong.push({
      type: 'crossover',
      left: indicators[0]?.name || 'ema_fast',
      right: indicators[1]?.name || 'ema_slow'
    });
  }
  if (/cross.*below|cross.*under|crosses.*below/i.test(code)) {
    entryShort.push({
      type: 'crossunder',
      left: indicators[0]?.name || 'ema_fast',
      right: indicators[1]?.name || 'ema_slow'
    });
  }

  // Buy/Sell keywords
  if (/buy\s*when|go\s*long|enter\s*long/i.test(code) && entryLong.length === 0) {
    warnings.push('Buy condition detected but specific rules unclear');
  }
  if (/sell\s*when|go\s*short|enter\s*short/i.test(code) && entryShort.length === 0) {
    warnings.push('Sell condition detected but specific rules unclear');
  }

  // Default to EMA crossover if nothing detected
  if (indicators.length === 0) {
    warnings.push('No clear indicators - using EMA(12) vs EMA(26) crossover');
    indicators.push(
      { name: 'ema_fast', type: 'EMA', period: 12, source: 'close' },
      { name: 'ema_slow', type: 'EMA', period: 26, source: 'close' }
    );
    entryLong.push({ type: 'crossover', left: 'ema_fast', right: 'ema_slow' });
    entryShort.push({ type: 'crossunder', left: 'ema_fast', right: 'ema_slow' });
  }

  return {
    indicators,
    entryLong,
    entryShort,
    exitLong: entryShort,
    exitShort: entryLong,
    confidence: 0.6,
    warnings,
    parameters: {}
  };
}

/**
 * Detect the language/format of the strategy code
 */
export function detectLanguage(code: string): 'MQL4' | 'MQL5' | 'PineScript' | 'Pseudocode' {
  if (/OnTick|OnInit|#property|CopyBuffer|iMA\s*\(/i.test(code)) {
    return /PERIOD_|CopyBuffer/.test(code) ? 'MQL5' : 'MQL4';
  }
  if (/\/\/@version|strategy\(|ta\.|indicator\(/i.test(code)) {
    return 'PineScript';
  }
  return 'Pseudocode';
}

/**
 * Main parser function - parses any strategy format
 */
export function parseStrategy(code: string, language?: 'MQL4' | 'MQL5' | 'PineScript' | 'Pseudocode'): ParsedStrategy {
  const detectedLang = language || detectLanguage(code);
  
  let parsed: Partial<ParsedStrategy>;
  
  switch (detectedLang) {
    case 'MQL4':
    case 'MQL5':
      parsed = parseMQL(code);
      break;
    case 'PineScript':
      parsed = parsePineScript(code);
      break;
    default:
      parsed = parsePseudocode(code);
  }

  // Extract strategy name from comments or code
  const nameMatch = code.match(/(?:Strategy|EA|Expert)[\s:=]*["']?([^"'\n]+)/i) ||
                    code.match(/\/\/\s*(.+)/);
  const name = nameMatch ? nameMatch[1].trim().substring(0, 50) : 'Parsed Strategy';

  return {
    name,
    indicators: parsed.indicators || [],
    entryLong: parsed.entryLong || [],
    entryShort: parsed.entryShort || [],
    exitLong: parsed.exitLong || [],
    exitShort: parsed.exitShort || [],
    stopLoss: parsed.stopLoss,
    takeProfit: parsed.takeProfit,
    parameters: parsed.parameters || {},
    confidence: parsed.confidence || 0.5,
    warnings: parsed.warnings || []
  };
}

/**
 * Validate parsed strategy for completeness
 */
export function validateStrategy(strategy: ParsedStrategy): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (strategy.indicators.length === 0) {
    errors.push('No indicators defined - at least one indicator is required');
  }

  if (strategy.entryLong.length === 0 && strategy.entryShort.length === 0) {
    errors.push('No entry conditions defined');
  }

  for (const ind of strategy.indicators) {
    if (ind.period <= 0) {
      errors.push(`Invalid period for indicator ${ind.name}: ${ind.period}`);
    }
    if (ind.period > 500) {
      errors.push(`Period too large for indicator ${ind.name}: ${ind.period}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
