/**
 * Phase 12: Force Close Test
 * Tests that positions are correctly force-closed under various conditions
 */

import { describe, it, expect } from 'vitest';

// Simulated position types
interface Position {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  isOpen: boolean;
}

interface ForceCloseResult {
  positionId: string;
  exitPrice: number;
  pnl: number;
  reason: string;
  closedAt: number;
}

// Force close logic
function forceClosePosition(
  position: Position,
  currentPrice: number,
  reason: string
): ForceCloseResult {
  if (!position.isOpen) {
    throw new Error(`Position ${position.id} is already closed`);
  }

  const pnl = position.direction === 'long'
    ? (currentPrice - position.entryPrice) * position.quantity
    : (position.entryPrice - currentPrice) * position.quantity;

  return {
    positionId: position.id,
    exitPrice: currentPrice,
    pnl,
    reason,
    closedAt: Date.now(),
  };
}

// Force close all positions
function forceCloseAll(
  positions: Position[],
  currentPrices: Map<string, number>,
  reason: string
): ForceCloseResult[] {
  const results: ForceCloseResult[] = [];
  for (const pos of positions) {
    if (!pos.isOpen) continue;
    const price = currentPrices.get(pos.symbol);
    if (!price) continue;
    results.push(forceClosePosition(pos, price, reason));
  }
  return results;
}

// Check if position should be force-closed based on risk rules
function shouldForceClose(
  position: Position,
  currentPrice: number,
  maxLossPct: number,
  accountEquity: number
): { shouldClose: boolean; reason: string } {
  const unrealizedPnl = position.direction === 'long'
    ? (currentPrice - position.entryPrice) * position.quantity
    : (position.entryPrice - currentPrice) * position.quantity;

  const lossPct = Math.abs(unrealizedPnl) / accountEquity * 100;

  // Stop loss hit
  if (position.stopLoss) {
    if (position.direction === 'long' && currentPrice <= position.stopLoss) {
      return { shouldClose: true, reason: 'stop_loss_hit' };
    }
    if (position.direction === 'short' && currentPrice >= position.stopLoss) {
      return { shouldClose: true, reason: 'stop_loss_hit' };
    }
  }

  // Take profit hit
  if (position.takeProfit) {
    if (position.direction === 'long' && currentPrice >= position.takeProfit) {
      return { shouldClose: true, reason: 'take_profit_hit' };
    }
    if (position.direction === 'short' && currentPrice <= position.takeProfit) {
      return { shouldClose: true, reason: 'take_profit_hit' };
    }
  }

  // Max loss breached
  if (unrealizedPnl < 0 && lossPct >= maxLossPct) {
    return { shouldClose: true, reason: `max_loss_${maxLossPct}pct_breached` };
  }

  return { shouldClose: false, reason: '' };
}

describe('Force Close Tests', () => {
  const longPosition: Position = {
    id: 'pos-1',
    symbol: 'EURUSD',
    direction: 'long',
    entryPrice: 1.1000,
    quantity: 10000,
    stopLoss: 1.0950,
    takeProfit: 1.1100,
    isOpen: true,
  };

  const shortPosition: Position = {
    id: 'pos-2',
    symbol: 'GBPUSD',
    direction: 'short',
    entryPrice: 1.2500,
    quantity: 5000,
    stopLoss: 1.2550,
    takeProfit: 1.2400,
    isOpen: true,
  };

  it('should force close long position with correct P&L', () => {
    const result = forceClosePosition(longPosition, 1.1050, 'manual');
    expect(result.pnl).toBeCloseTo(50, 1); // (1.1050 - 1.1000) * 10000
    expect(result.reason).toBe('manual');
  });

  it('should force close short position with correct P&L', () => {
    const result = forceClosePosition(shortPosition, 1.2450, 'manual');
    expect(result.pnl).toBeCloseTo(25, 1); // (1.2500 - 1.2450) * 5000
  });

  it('should throw when closing already closed position', () => {
    const closed = { ...longPosition, isOpen: false };
    expect(() => forceClosePosition(closed, 1.1050, 'test')).toThrow('already closed');
  });

  it('should force close all open positions', () => {
    const positions = [longPosition, shortPosition, { ...longPosition, id: 'pos-3', isOpen: false }];
    const prices = new Map([['EURUSD', 1.1050], ['GBPUSD', 1.2450]]);
    const results = forceCloseAll(positions, prices, 'kill_switch');
    expect(results).toHaveLength(2);
    expect(results.every(r => r.reason === 'kill_switch')).toBe(true);
  });

  it('should detect stop loss hit for long', () => {
    const { shouldClose, reason } = shouldForceClose(longPosition, 1.0940, 5, 10000);
    expect(shouldClose).toBe(true);
    expect(reason).toBe('stop_loss_hit');
  });

  it('should detect stop loss hit for short', () => {
    const { shouldClose, reason } = shouldForceClose(shortPosition, 1.2560, 5, 10000);
    expect(shouldClose).toBe(true);
    expect(reason).toBe('stop_loss_hit');
  });

  it('should detect take profit hit for long', () => {
    const { shouldClose, reason } = shouldForceClose(longPosition, 1.1110, 5, 10000);
    expect(shouldClose).toBe(true);
    expect(reason).toBe('take_profit_hit');
  });

  it('should detect max loss breach', () => {
    const posNoSL = { ...longPosition, stopLoss: undefined };
    const { shouldClose, reason } = shouldForceClose(posNoSL, 1.0500, 5, 10000);
    expect(shouldClose).toBe(true);
    expect(reason).toContain('max_loss');
  });

  it('should not force close when within limits', () => {
    const { shouldClose } = shouldForceClose(longPosition, 1.1010, 5, 10000);
    expect(shouldClose).toBe(false);
  });

  it('should handle negative P&L for losing long', () => {
    const result = forceClosePosition(longPosition, 1.0950, 'stop_loss');
    expect(result.pnl).toBeCloseTo(-50, 1);
  });

  it('should handle negative P&L for losing short', () => {
    const result = forceClosePosition(shortPosition, 1.2550, 'stop_loss');
    expect(result.pnl).toBeCloseTo(-25, 1);
  });
});
