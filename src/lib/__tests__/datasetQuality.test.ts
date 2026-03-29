/**
 * Dataset Quality Tests
 * Basic tests for quality scan logic
 */

import { describe, it, expect } from 'vitest';

describe('datasetQuality', () => {
  describe('quality scoring', () => {
    it('should calculate quality score between 0 and 100', () => {
      // Quality score calculation logic
      const calculateScore = (gaps: number, duplicates: number, outliers: number): number => {
        const baseScore = 100;
        const gapPenalty = gaps * 0.5;
        const dupPenalty = duplicates * 0.3;
        const outlierPenalty = outliers * 0.2;
        return Math.max(0, Math.min(100, baseScore - gapPenalty - dupPenalty - outlierPenalty));
      };

      expect(calculateScore(0, 0, 0)).toBe(100);
      expect(calculateScore(10, 10, 10)).toBeLessThan(100);
      expect(calculateScore(200, 200, 200)).toBe(0);
    });

    it('should detect gaps in timestamps', () => {
      const detectGaps = (timestamps: number[], expectedInterval: number): number => {
        let gaps = 0;
        for (let i = 1; i < timestamps.length; i++) {
          const diff = timestamps[i] - timestamps[i - 1];
          if (diff > expectedInterval * 1.5) gaps++;
        }
        return gaps;
      };

      const regularData = [1000, 2000, 3000, 4000];
      const gappyData = [1000, 2000, 5000, 6000]; // Gap at 3000-4000
      
      expect(detectGaps(regularData, 1000)).toBe(0);
      expect(detectGaps(gappyData, 1000)).toBe(1);
    });

    it('should detect duplicate timestamps', () => {
      const detectDuplicates = (timestamps: number[]): number => {
        const seen = new Set<number>();
        let dups = 0;
        for (const ts of timestamps) {
          if (seen.has(ts)) dups++;
          seen.add(ts);
        }
        return dups;
      };

      expect(detectDuplicates([1, 2, 3, 4])).toBe(0);
      expect(detectDuplicates([1, 2, 2, 3])).toBe(1);
      expect(detectDuplicates([1, 1, 1, 1])).toBe(3);
    });
  });
});
