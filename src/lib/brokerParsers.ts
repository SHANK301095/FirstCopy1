/**
 * Multi-Broker Data Parsers
 * Phase 4: Support for MT4/MT5, cTrader, TradingView, NinjaTrader, Zerodha, IBKR, Alpaca
 * Auto-detects format and normalizes to internal schema
 */

export interface ParsedBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  spread?: number;
  symbol?: string;
}

export interface ParsedTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: number;
  pnl?: number;
  commission?: number;
  currency?: string;
}

export interface ParseResult {
  success: boolean;
  format: BrokerFormat;
  bars: ParsedBar[];
  trades?: ParsedTrade[];
  symbol?: string;
  timeframe?: string;
  errors: string[];
  warnings: string[];
  metadata: {
    firstDate: Date;
    lastDate: Date;
    rowCount: number;
    gapCount: number;
    duplicateCount: number;
  };
}

export type BrokerFormat = 
  | 'mt4_csv' 
  | 'mt5_csv' 
  | 'mt5_hst' 
  | 'ctrader_csv' 
  | 'tradingview_csv' 
  | 'ninjatrader_csv'
  | 'amibroker_csv'
  | 'zerodha_csv'
  | 'ibkr_csv'
  | 'alpaca_csv'
  | 'deriv_csv'
  | 'generic_csv'
  | 'unknown';

interface ColumnMapping {
  date?: number;
  time?: number;
  datetime?: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  spread?: number;
  symbol?: number;
}

interface TradeColumnMapping {
  id?: number;
  symbol: number;
  side: number;
  quantity: number;
  price: number;
  datetime: number;
  pnl?: number;
  commission?: number;
  currency?: number;
}

// Detect format from headers
function detectFormat(headers: string[], sampleRow: string[]): { format: BrokerFormat; mapping: ColumnMapping | null; tradeMapping?: TradeColumnMapping | null } {
  const headerLower = headers.map(h => h.toLowerCase().trim());
  
  // Zerodha format: symbol, date, time, open, high, low, close, volume, oi
  if (headerLower.includes('symbol') && headerLower.includes('oi')) {
    const mapping: ColumnMapping = {
      symbol: headerLower.indexOf('symbol'),
      date: headerLower.indexOf('date'),
      time: headerLower.indexOf('time'),
      open: headerLower.indexOf('open'),
      high: headerLower.indexOf('high'),
      low: headerLower.indexOf('low'),
      close: headerLower.indexOf('close'),
      volume: headerLower.indexOf('volume') !== -1 ? headerLower.indexOf('volume') : undefined,
    };
    return { format: 'zerodha_csv', mapping };
  }
  
  // Zerodha trade format: trade_id, order_id, exchange, tradingsymbol, trade_type, quantity, average_price, value
  if (headerLower.includes('tradingsymbol') && headerLower.includes('trade_type')) {
    const tradeMapping: TradeColumnMapping = {
      id: headerLower.indexOf('trade_id'),
      symbol: headerLower.indexOf('tradingsymbol'),
      side: headerLower.indexOf('trade_type'),
      quantity: headerLower.indexOf('quantity'),
      price: headerLower.indexOf('average_price'),
      datetime: headerLower.indexOf('trade_date') !== -1 ? headerLower.indexOf('trade_date') : headerLower.indexOf('order_timestamp'),
    };
    return { format: 'zerodha_csv', mapping: null, tradeMapping };
  }
  
  // IBKR format: Symbol, DateTime, Quantity, TradePrice, C.Price, Proceeds, Comm/Fee, Basis, Realized P/L
  if (headerLower.includes('symbol') && headerLower.includes('realized p/l')) {
    const tradeMapping: TradeColumnMapping = {
      symbol: headerLower.indexOf('symbol'),
      datetime: headerLower.indexOf('datetime') !== -1 ? headerLower.indexOf('datetime') : headerLower.indexOf('date/time'),
      quantity: headerLower.indexOf('quantity'),
      price: headerLower.indexOf('tradeprice') !== -1 ? headerLower.indexOf('tradeprice') : headerLower.indexOf('t. price'),
      side: -1, // Derived from quantity sign
      pnl: headerLower.indexOf('realized p/l'),
      commission: headerLower.indexOf('comm/fee') !== -1 ? headerLower.indexOf('comm/fee') : headerLower.indexOf('comm'),
      currency: headerLower.indexOf('currency'),
    };
    return { format: 'ibkr_csv', mapping: null, tradeMapping };
  }
  
  // IBKR statement format with trades section
  if (headerLower.includes('tradeid') && headerLower.includes('buysell')) {
    const tradeMapping: TradeColumnMapping = {
      id: headerLower.indexOf('tradeid'),
      symbol: headerLower.indexOf('symbol'),
      datetime: headerLower.indexOf('datetime') !== -1 ? headerLower.indexOf('datetime') : headerLower.indexOf('tradedate'),
      quantity: headerLower.indexOf('quantity'),
      price: headerLower.indexOf('tradeprice'),
      side: headerLower.indexOf('buysell'),
      pnl: headerLower.indexOf('fifopnlrealized'),
      commission: headerLower.indexOf('ibcommission'),
      currency: headerLower.indexOf('currency'),
    };
    return { format: 'ibkr_csv', mapping: null, tradeMapping };
  }
  
  // Alpaca format: symbol, qty, side, avg_entry_price, avg_exit_price, realized_pl
  if (headerLower.includes('avg_entry_price') && headerLower.includes('realized_pl')) {
    const tradeMapping: TradeColumnMapping = {
      symbol: headerLower.indexOf('symbol'),
      quantity: headerLower.indexOf('qty'),
      side: headerLower.indexOf('side'),
      price: headerLower.indexOf('avg_entry_price'),
      datetime: headerLower.indexOf('closed_at') !== -1 ? headerLower.indexOf('closed_at') : headerLower.indexOf('created_at'),
      pnl: headerLower.indexOf('realized_pl'),
    };
    return { format: 'alpaca_csv', mapping: null, tradeMapping };
  }
  
  // Alpaca bars format: timestamp, open, high, low, close, volume, trade_count, vwap
  if (headerLower.includes('vwap') && headerLower.includes('trade_count')) {
    const mapping: ColumnMapping = {
      datetime: headerLower.indexOf('timestamp') !== -1 ? headerLower.indexOf('timestamp') : 0,
      open: headerLower.indexOf('open'),
      high: headerLower.indexOf('high'),
      low: headerLower.indexOf('low'),
      close: headerLower.indexOf('close'),
      volume: headerLower.indexOf('volume'),
    };
    return { format: 'alpaca_csv', mapping };
  }
  
  // MT5 format: Date, Time, Open, High, Low, Close, Volume
  if (headerLower.includes('date') && headerLower.includes('time') && 
      headerLower.includes('open') && headerLower.includes('close')) {
    const mapping: ColumnMapping = {
      date: headerLower.indexOf('date'),
      time: headerLower.indexOf('time'),
      open: headerLower.indexOf('open'),
      high: headerLower.indexOf('high'),
      low: headerLower.indexOf('low'),
      close: headerLower.indexOf('close'),
      volume: headerLower.indexOf('volume') !== -1 ? headerLower.indexOf('volume') : 
              headerLower.indexOf('tickvol') !== -1 ? headerLower.indexOf('tickvol') : undefined,
      spread: headerLower.indexOf('spread') !== -1 ? headerLower.indexOf('spread') : undefined
    };
    return { format: 'mt5_csv', mapping };
  }
  
  // TradingView format: time, open, high, low, close (unix timestamp or ISO date)
  if (headerLower[0] === 'time' && headerLower.includes('open')) {
    const mapping: ColumnMapping = {
      datetime: 0,
      open: headerLower.indexOf('open'),
      high: headerLower.indexOf('high'),
      low: headerLower.indexOf('low'),
      close: headerLower.indexOf('close'),
      volume: headerLower.indexOf('volume') !== -1 ? headerLower.indexOf('volume') : undefined
    };
    return { format: 'tradingview_csv', mapping };
  }
  
  // cTrader format: Date/Time, Open, High, Low, Close, Volume
  if ((headerLower.includes('date/time') || headerLower.includes('datetime')) && 
      headerLower.includes('open')) {
    const dtIdx = headerLower.indexOf('date/time') !== -1 ? 
                  headerLower.indexOf('date/time') : headerLower.indexOf('datetime');
    const mapping: ColumnMapping = {
      datetime: dtIdx,
      open: headerLower.indexOf('open'),
      high: headerLower.indexOf('high'),
      low: headerLower.indexOf('low'),
      close: headerLower.indexOf('close'),
      volume: headerLower.indexOf('volume') !== -1 ? headerLower.indexOf('volume') : undefined
    };
    return { format: 'ctrader_csv', mapping };
  }
  
  // NinjaTrader format: Date;Time;Open;High;Low;Close;Volume
  if (headerLower.includes('date') && headers.join('').includes(';')) {
    const mapping: ColumnMapping = {
      date: headerLower.indexOf('date'),
      time: headerLower.indexOf('time'),
      open: headerLower.indexOf('open'),
      high: headerLower.indexOf('high'),
      low: headerLower.indexOf('low'),
      close: headerLower.indexOf('close'),
      volume: headerLower.indexOf('volume') !== -1 ? headerLower.indexOf('volume') : undefined
    };
    return { format: 'ninjatrader_csv', mapping };
  }
  
  // AmiBroker format: Ticker, Date, Open, High, Low, Close, Volume
  if (headerLower.includes('ticker') && headerLower.includes('open')) {
    const mapping: ColumnMapping = {
      symbol: headerLower.indexOf('ticker'),
      date: headerLower.indexOf('date'),
      open: headerLower.indexOf('open'),
      high: headerLower.indexOf('high'),
      low: headerLower.indexOf('low'),
      close: headerLower.indexOf('close'),
      volume: headerLower.indexOf('volume') !== -1 ? headerLower.indexOf('volume') : undefined
    };
    return { format: 'amibroker_csv', mapping };
  }
  
  // Generic CSV - try to auto-detect columns
  const genericMapping = detectGenericColumns(headers, sampleRow);
  if (genericMapping) {
    return { format: 'generic_csv', mapping: genericMapping };
  }
  
  return { format: 'unknown', mapping: null };
}

// Try to detect columns for generic CSV
function detectGenericColumns(headers: string[], sampleRow: string[]): ColumnMapping | null {
  const headerLower = headers.map(h => h.toLowerCase().trim());
  
  // Look for OHLC patterns
  const openIdx = headerLower.findIndex(h => h.includes('open') || h === 'o');
  const highIdx = headerLower.findIndex(h => h.includes('high') || h === 'h');
  const lowIdx = headerLower.findIndex(h => h.includes('low') || h === 'l');
  const closeIdx = headerLower.findIndex(h => (h.includes('close') || h === 'c') && !h.includes('adj'));
  
  if (openIdx === -1 || highIdx === -1 || lowIdx === -1 || closeIdx === -1) {
    // Try positional detection for headerless data
    if (sampleRow.length >= 5) {
      // Assume: datetime, open, high, low, close, [volume]
      const firstCell = sampleRow[0];
      if (isDateLike(firstCell)) {
        return {
          datetime: 0,
          open: 1,
          high: 2,
          low: 3,
          close: 4,
          volume: sampleRow.length > 5 ? 5 : undefined
        };
      }
    }
    return null;
  }
  
  // Find datetime column
  let datetimeIdx = headerLower.findIndex(h => 
    h.includes('date') || h.includes('time') || h === 'timestamp' || h === 'ts'
  );
  
  if (datetimeIdx === -1) {
    // Check first column for date-like values
    if (isDateLike(sampleRow[0])) {
      datetimeIdx = 0;
    } else {
      return null; // Can't find datetime
    }
  }
  
  const volumeIdx = headerLower.findIndex(h => h.includes('volume') || h === 'v' || h === 'vol');
  
  return {
    datetime: datetimeIdx,
    open: openIdx,
    high: highIdx,
    low: lowIdx,
    close: closeIdx,
    volume: volumeIdx !== -1 ? volumeIdx : undefined
  };
}

// Check if string looks like a date
function isDateLike(str: string): boolean {
  // Unix timestamp
  if (/^\d{10,13}$/.test(str)) return true;
  // ISO date
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return true;
  // Common date formats
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(str)) return true;
  // With time
  if (/^\d{4}\.\d{2}\.\d{2}/.test(str)) return true;
  return false;
}

// Parse datetime from various formats
function parseDateTime(dateStr: string, timeStr?: string, format?: BrokerFormat): number {
  let timestamp: number;
  
  // Unix timestamp (seconds or milliseconds)
  if (/^\d{10}$/.test(dateStr)) {
    return parseInt(dateStr) * 1000;
  }
  if (/^\d{13}$/.test(dateStr)) {
    return parseInt(dateStr);
  }
  
  // Combine date and time if separate
  const fullStr = timeStr ? `${dateStr} ${timeStr}` : dateStr;
  
  // MT5 format: YYYY.MM.DD HH:MM:SS or YYYY.MM.DD HH:MM
  if (/^\d{4}\.\d{2}\.\d{2}/.test(fullStr)) {
    const normalized = fullStr.replace(/\./g, '-');
    timestamp = new Date(normalized).getTime();
    if (!isNaN(timestamp)) return timestamp;
  }
  
  // ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
  if (/^\d{4}-\d{2}-\d{2}/.test(fullStr)) {
    timestamp = new Date(fullStr).getTime();
    if (!isNaN(timestamp)) return timestamp;
  }
  
  // US format: MM/DD/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(fullStr)) {
    const [datePart, timePart] = fullStr.split(' ');
    const [month, day, year] = datePart.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    if (timePart) {
      const [h, m, s] = timePart.split(':').map(Number);
      date.setHours(h || 0, m || 0, s || 0);
    }
    return date.getTime();
  }
  
  // European format: DD.MM.YYYY
  if (/^\d{1,2}\.\d{1,2}\.\d{4}/.test(fullStr)) {
    const [datePart, timePart] = fullStr.split(' ');
    const [day, month, year] = datePart.split('.').map(Number);
    const date = new Date(year, month - 1, day);
    if (timePart) {
      const [h, m, s] = timePart.split(':').map(Number);
      date.setHours(h || 0, m || 0, s || 0);
    }
    return date.getTime();
  }
  
  // Zerodha format: DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}/.test(fullStr)) {
    const [datePart, timePart] = fullStr.split(' ');
    const [day, month, year] = datePart.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (timePart) {
      const [h, m, s] = timePart.split(':').map(Number);
      date.setHours(h || 0, m || 0, s || 0);
    }
    return date.getTime();
  }
  
  // Fallback to Date.parse
  timestamp = Date.parse(fullStr);
  if (!isNaN(timestamp)) return timestamp;
  
  throw new Error(`Cannot parse date: ${fullStr}`);
}

// Parse trades from broker CSV
export function parseBrokerTrades(
  csvContent: string,
  options: {
    delimiter?: string;
    skipRows?: number;
    broker?: 'zerodha' | 'ibkr' | 'alpaca' | 'auto';
  } = {}
): { success: boolean; trades: ParsedTrade[]; format: BrokerFormat; errors: string[]; warnings: string[] } {
  const { delimiter = ',', skipRows = 0, broker = 'auto' } = options;
  const errors: string[] = [];
  const warnings: string[] = [];
  const trades: ParsedTrade[] = [];
  
  try {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      return { success: false, trades: [], format: 'unknown', errors: ['Insufficient data'], warnings: [] };
    }
    
    const dataLines = lines.slice(skipRows);
    const actualDelimiter = dataLines[0].includes(';') && !dataLines[0].includes(',') ? ';' : delimiter;
    const headers = dataLines[0].split(actualDelimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    const sampleRow = dataLines[1]?.split(actualDelimiter).map(c => c.trim().replace(/^"|"$/g, '')) || [];
    
    const { format, tradeMapping } = detectFormat(headers, sampleRow);
    
    if (!tradeMapping) {
      return { success: false, trades: [], format, errors: ['Could not detect trade columns'], warnings: [] };
    }
    
    for (let i = 1; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;
      
      try {
        const cells = line.split(actualDelimiter).map(c => c.trim().replace(/^"|"$/g, ''));
        
        const timestamp = parseDateTime(cells[tradeMapping.datetime]);
        const symbol = cells[tradeMapping.symbol];
        const quantity = Math.abs(parseFloat(cells[tradeMapping.quantity]));
        const price = parseFloat(cells[tradeMapping.price]);
        
        let side: 'buy' | 'sell';
        if (tradeMapping.side === -1) {
          // Derive from quantity sign (IBKR style)
          side = parseFloat(cells[tradeMapping.quantity]) >= 0 ? 'buy' : 'sell';
        } else {
          const sideStr = cells[tradeMapping.side]?.toLowerCase() || '';
          side = sideStr.includes('buy') || sideStr === 'b' || sideStr === 'long' ? 'buy' : 'sell';
        }
        
        const trade: ParsedTrade = {
          id: tradeMapping.id !== undefined ? cells[tradeMapping.id] : `trade_${i}`,
          symbol,
          side,
          quantity,
          price,
          timestamp,
          pnl: tradeMapping.pnl !== undefined ? parseFloat(cells[tradeMapping.pnl]) || 0 : undefined,
          commission: tradeMapping.commission !== undefined ? parseFloat(cells[tradeMapping.commission]) || 0 : undefined,
          currency: tradeMapping.currency !== undefined ? cells[tradeMapping.currency] : undefined,
        };
        
        if (isNaN(quantity) || isNaN(price)) {
          errors.push(`Row ${i + 1}: Invalid quantity or price`);
          continue;
        }
        
        trades.push(trade);
      } catch (e) {
        errors.push(`Row ${i + 1}: ${e instanceof Error ? e.message : 'Parse error'}`);
      }
    }
    
    trades.sort((a, b) => a.timestamp - b.timestamp);
    
    return { success: trades.length > 0, trades, format, errors, warnings };
  } catch (e) {
    return { 
      success: false, 
      trades: [], 
      format: 'unknown', 
      errors: [e instanceof Error ? e.message : 'Unknown error'], 
      warnings: [] 
    };
  }
}

// Main parsing function
export function parseBrokerData(
  csvContent: string, 
  options: {
    delimiter?: string;
    skipRows?: number;
    symbol?: string;
    timeframe?: string;
    timezone?: string;
  } = {}
): ParseResult {
  const { 
    delimiter = ',', 
    skipRows = 0,
    symbol,
    timeframe
  } = options;
  
  const errors: string[] = [];
  const warnings: string[] = [];
  const bars: ParsedBar[] = [];
  
  try {
    // Split lines and handle different line endings
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) {
      return {
        success: false,
        format: 'unknown',
        bars: [],
        errors: ['File has insufficient data (need at least header + 1 row)'],
        warnings: [],
        metadata: { firstDate: new Date(), lastDate: new Date(), rowCount: 0, gapCount: 0, duplicateCount: 0 }
      };
    }
    
    // Skip rows if needed
    const dataLines = lines.slice(skipRows);
    
    // Detect delimiter if auto
    const actualDelimiter = dataLines[0].includes(';') && !dataLines[0].includes(',') ? ';' : delimiter;
    
    // Parse headers
    const headers = dataLines[0].split(actualDelimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    const sampleRow = dataLines[1]?.split(actualDelimiter).map(c => c.trim().replace(/^"|"$/g, '')) || [];
    
    // Detect format
    const { format, mapping } = detectFormat(headers, sampleRow);
    
    if (!mapping) {
      return {
        success: false,
        format: 'unknown',
        bars: [],
        errors: ['Could not detect column mapping. Please ensure OHLC columns are present.'],
        warnings: [],
        metadata: { firstDate: new Date(), lastDate: new Date(), rowCount: 0, gapCount: 0, duplicateCount: 0 }
      };
    }
    
    let detectedSymbol = symbol;
    const seenTimestamps = new Set<number>();
    let duplicateCount = 0;
    
    // Parse data rows
    for (let i = 1; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;
      
      try {
        const cells = line.split(actualDelimiter).map(c => c.trim().replace(/^"|"$/g, ''));
        
        // Parse timestamp
        let timestamp: number;
        if (mapping.datetime !== undefined) {
          timestamp = parseDateTime(cells[mapping.datetime], undefined, format);
        } else if (mapping.date !== undefined) {
          timestamp = parseDateTime(
            cells[mapping.date], 
            mapping.time !== undefined ? cells[mapping.time] : undefined,
            format
          );
        } else {
          errors.push(`Row ${i + 1}: Cannot find datetime`);
          continue;
        }
        
        // Check for duplicates
        if (seenTimestamps.has(timestamp)) {
          duplicateCount++;
          warnings.push(`Row ${i + 1}: Duplicate timestamp detected`);
          continue;
        }
        seenTimestamps.add(timestamp);
        
        // Parse OHLCV
        const open = parseFloat(cells[mapping.open]);
        const high = parseFloat(cells[mapping.high]);
        const low = parseFloat(cells[mapping.low]);
        const close = parseFloat(cells[mapping.close]);
        const volume = mapping.volume !== undefined ? parseFloat(cells[mapping.volume]) || 0 : 0;
        const spread = mapping.spread !== undefined ? parseFloat(cells[mapping.spread]) || 0 : undefined;
        
        // Validate OHLC
        if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
          errors.push(`Row ${i + 1}: Invalid OHLC values`);
          continue;
        }
        
        if (high < Math.max(open, close) || low > Math.min(open, close)) {
          warnings.push(`Row ${i + 1}: OHLC inconsistency (H/L doesn't contain O/C)`);
        }
        
        // Extract symbol if present
        if (mapping.symbol !== undefined && !detectedSymbol) {
          detectedSymbol = cells[mapping.symbol];
        }
        
        bars.push({
          timestamp,
          open,
          high,
          low,
          close,
          volume,
          spread,
          symbol: detectedSymbol
        });
        
      } catch (e) {
        errors.push(`Row ${i + 1}: ${e instanceof Error ? e.message : 'Parse error'}`);
      }
    }
    
    // Sort by timestamp
    bars.sort((a, b) => a.timestamp - b.timestamp);
    
    // Detect gaps
    let gapCount = 0;
    if (bars.length > 1) {
      const avgInterval = (bars[bars.length - 1].timestamp - bars[0].timestamp) / (bars.length - 1);
      for (let i = 1; i < bars.length; i++) {
        const interval = bars[i].timestamp - bars[i - 1].timestamp;
        if (interval > avgInterval * 2.5) {
          gapCount++;
        }
      }
    }
    
    return {
      success: bars.length > 0,
      format,
      bars,
      symbol: detectedSymbol,
      timeframe,
      errors,
      warnings,
      metadata: {
        firstDate: bars.length > 0 ? new Date(bars[0].timestamp) : new Date(),
        lastDate: bars.length > 0 ? new Date(bars[bars.length - 1].timestamp) : new Date(),
        rowCount: bars.length,
        gapCount,
        duplicateCount
      }
    };
    
  } catch (e) {
    return {
      success: false,
      format: 'unknown',
      bars: [],
      errors: [e instanceof Error ? e.message : 'Unknown parsing error'],
      warnings: [],
      metadata: { firstDate: new Date(), lastDate: new Date(), rowCount: 0, gapCount: 0, duplicateCount: 0 }
    };
  }
}

// Detect format from file content without parsing
export function detectBrokerFormat(csvContent: string): { format: BrokerFormat; confidence: number; type: 'bars' | 'trades' | 'unknown' } {
  const lines = csvContent.split(/\r?\n/).slice(0, 5);
  if (lines.length < 2) return { format: 'unknown', confidence: 0, type: 'unknown' };
  
  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map(h => h.toLowerCase().trim());
  const sampleRow = lines[1]?.split(delimiter) || [];
  
  const { format, mapping, tradeMapping } = detectFormat(headers, sampleRow);
  
  const confidence = format === 'unknown' ? 0 : 
                     format === 'generic_csv' ? 0.6 : 0.9;
  
  const type = tradeMapping ? 'trades' : mapping ? 'bars' : 'unknown';
  
  return { format, confidence, type };
}

// Get broker display info
export function getBrokerInfo(format: BrokerFormat): { name: string; icon: string; description: string } {
  const brokers: Record<BrokerFormat, { name: string; icon: string; description: string }> = {
    mt4_csv: { name: 'MetaTrader 4', icon: '📊', description: 'MT4 history export' },
    mt5_csv: { name: 'MetaTrader 5', icon: '📊', description: 'MT5 history export' },
    mt5_hst: { name: 'MetaTrader 5 HST', icon: '📊', description: 'MT5 binary history' },
    ctrader_csv: { name: 'cTrader', icon: '📈', description: 'cTrader data export' },
    tradingview_csv: { name: 'TradingView', icon: '📺', description: 'TradingView chart export' },
    ninjatrader_csv: { name: 'NinjaTrader', icon: '🥷', description: 'NinjaTrader data' },
    amibroker_csv: { name: 'AmiBroker', icon: '📉', description: 'AmiBroker data' },
    zerodha_csv: { name: 'Zerodha', icon: '🇮🇳', description: 'Zerodha Kite export' },
    ibkr_csv: { name: 'Interactive Brokers', icon: '🏦', description: 'IBKR statement' },
    alpaca_csv: { name: 'Alpaca', icon: '🦙', description: 'Alpaca Markets data' },
    deriv_csv: { name: 'Deriv', icon: '🔄', description: 'Deriv.com tick/candle export' },
    generic_csv: { name: 'Generic CSV', icon: '📄', description: 'Auto-detected columns' },
    unknown: { name: 'Unknown', icon: '❓', description: 'Format not recognized' },
  };
  
  return brokers[format] || brokers.unknown;
}
