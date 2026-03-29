/**
 * Phase 6: Deriv Tick Parser
 * Parses Deriv.com tick data exports into standard OHLCV format
 */

export interface DerivTick {
  epoch: number;
  quote: number;
  symbol: string;
}

export interface AggregatedBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tickCount: number;
}

/** Parse Deriv tick CSV (columns: Date,Time,Epoch,Quote or Epoch,Bid,Ask) */
export function parseDerivTicks(csvText: string): { ticks: DerivTick[]; errors: string[] } {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return { ticks: [], errors: ['Empty file'] };

  const header = lines[0].toLowerCase();
  const ticks: DerivTick[] = [];
  const errors: string[] = [];

  const hasEpoch = header.includes('epoch');
  const hasBidAsk = header.includes('bid') && header.includes('ask');

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    try {
      if (hasEpoch && hasBidAsk) {
        // Format: Epoch,Bid,Ask
        const epoch = parseInt(cols[0]);
        const bid = parseFloat(cols[1]);
        const ask = parseFloat(cols[2]);
        if (isNaN(epoch) || isNaN(bid)) { errors.push(`Row ${i}: invalid data`); continue; }
        ticks.push({ epoch, quote: (bid + ask) / 2, symbol: 'DERIV' });
      } else if (hasEpoch) {
        // Format: Date,Time,Epoch,Quote
        const epochIdx = header.split(',').findIndex(h => h.trim() === 'epoch');
        const quoteIdx = header.split(',').findIndex(h => h.trim() === 'quote' || h.trim() === 'close' || h.trim() === 'price');
        const epoch = parseInt(cols[epochIdx]);
        const quote = parseFloat(cols[quoteIdx >= 0 ? quoteIdx : epochIdx + 1]);
        if (isNaN(epoch) || isNaN(quote)) { errors.push(`Row ${i}: invalid`); continue; }
        ticks.push({ epoch, quote, symbol: 'DERIV' });
      } else {
        // Generic: Date,Quote
        const date = new Date(cols[0]);
        const quote = parseFloat(cols[1]);
        if (isNaN(date.getTime()) || isNaN(quote)) { errors.push(`Row ${i}: invalid`); continue; }
        ticks.push({ epoch: Math.floor(date.getTime() / 1000), quote, symbol: 'DERIV' });
      }
    } catch {
      errors.push(`Row ${i}: parse error`);
    }
  }

  return { ticks, errors };
}

/** Aggregate ticks into OHLCV bars at given interval (seconds) */
export function aggregateTicksToOHLCV(
  ticks: DerivTick[],
  intervalSeconds: number = 60
): AggregatedBar[] {
  if (ticks.length === 0) return [];

  const sorted = [...ticks].sort((a, b) => a.epoch - b.epoch);
  const bars: AggregatedBar[] = [];
  
  let barStart = Math.floor(sorted[0].epoch / intervalSeconds) * intervalSeconds;
  let open = sorted[0].quote;
  let high = sorted[0].quote;
  let low = sorted[0].quote;
  let close = sorted[0].quote;
  let tickCount = 0;

  for (const tick of sorted) {
    const tickBar = Math.floor(tick.epoch / intervalSeconds) * intervalSeconds;
    
    if (tickBar !== barStart) {
      bars.push({ timestamp: barStart * 1000, open, high, low, close, volume: tickCount, tickCount });
      barStart = tickBar;
      open = tick.quote;
      high = tick.quote;
      low = tick.quote;
      close = tick.quote;
      tickCount = 0;
    }

    high = Math.max(high, tick.quote);
    low = Math.min(low, tick.quote);
    close = tick.quote;
    tickCount++;
  }

  // Final bar
  if (tickCount > 0) {
    bars.push({ timestamp: barStart * 1000, open, high, low, close, volume: tickCount, tickCount });
  }

  return bars;
}
