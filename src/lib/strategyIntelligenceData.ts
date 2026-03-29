/**
 * Strategy Intelligence Data Service
 * Provides real DB-backed strategy data with proper empty state fallback
 * REPLACES the old random mock generator
 */

// This module no longer exports MOCK_STRATEGIES as a random-generated array.
// All consumers should use the useStrategyIntelligence() hook instead.
// This file is kept for backward compatibility during migration.

import type { StrategyIntelligence } from '@/types/strategyIntelligence';

/**
 * @deprecated Use useStrategyIntelligence() hook instead.
 * This empty array replaces the old random generator.
 * Pages should show proper empty states when no strategies exist.
 */
export const MOCK_STRATEGIES: StrategyIntelligence[] = [];

/**
 * @deprecated Use fetchStrategyIntelligence() from services instead.
 */
export function generateStrategyIntelligenceData(): StrategyIntelligence[] {
  console.warn('[MMC] generateStrategyIntelligenceData() is deprecated. Use useStrategyIntelligence() hook.');
  return [];
}
