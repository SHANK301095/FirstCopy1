/**
 * Downsampled Line Chart
 * Spec: Performance - downsample data based on viewport width
 */

import { useMemo } from 'react';

// Largest Triangle Three Buckets (LTTB) algorithm for downsampling
export function downsampleLTTB(data: number[], targetPoints: number): number[] {
  if (data.length <= targetPoints || targetPoints <= 2) {
    return data;
  }

  const result: number[] = [];
  const bucketSize = (data.length - 2) / (targetPoints - 2);

  // Always keep first point
  result.push(data[0]);

  let a = 0; // Index of selected point in previous bucket

  for (let i = 0; i < targetPoints - 2; i++) {
    // Calculate bucket range
    const bucketStart = Math.floor((i + 1) * bucketSize) + 1;
    const bucketEnd = Math.floor((i + 2) * bucketSize) + 1;
    const bucketLength = bucketEnd - bucketStart;

    if (bucketLength === 0) continue;

    // Calculate average point in next bucket (for triangle area calculation)
    let avgX = 0;
    let avgY = 0;
    const nextBucketStart = bucketEnd;
    const nextBucketEnd = Math.min(Math.floor((i + 3) * bucketSize) + 1, data.length);
    const nextBucketLength = nextBucketEnd - nextBucketStart;

    if (nextBucketLength > 0) {
      for (let j = nextBucketStart; j < nextBucketEnd; j++) {
        avgX += j;
        avgY += data[j];
      }
      avgX /= nextBucketLength;
      avgY /= nextBucketLength;
    }

    // Find point in current bucket that creates largest triangle area with point A and avg point
    let maxArea = -1;
    let maxAreaIndex = bucketStart;

    for (let j = bucketStart; j < bucketEnd; j++) {
      // Calculate triangle area using cross product
      const area = Math.abs(
        (a - avgX) * (data[j] - data[a]) -
        (a - j) * (avgY - data[a])
      );

      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = j;
      }
    }

    result.push(data[maxAreaIndex]);
    a = maxAreaIndex; // Update A for next iteration
  }

  // Always keep last point
  result.push(data[data.length - 1]);

  return result;
}

// Hook for responsive downsampling
export function useDownsampledData(
  data: number[], 
  containerWidth: number,
  pointsPerPixel: number = 0.5
): number[] {
  return useMemo(() => {
    if (!data.length || !containerWidth) return data;
    
    const targetPoints = Math.max(
      Math.floor(containerWidth * pointsPerPixel),
      50 // Minimum points
    );
    
    return downsampleLTTB(data, targetPoints);
  }, [data, containerWidth, pointsPerPixel]);
}

/**
 * Phase 14: LTTB for XY data pairs (e.g. equity curves with timestamps)
 */
export function downsampleLTTB_XY(
  data: { x: number; y: number }[],
  targetPoints: number
): { x: number; y: number }[] {
  if (data.length <= targetPoints || targetPoints <= 2) return data;

  const result: { x: number; y: number }[] = [data[0]];
  const bucketSize = (data.length - 2) / (targetPoints - 2);

  let a = 0;

  for (let i = 0; i < targetPoints - 2; i++) {
    const bucketStart = Math.floor((i + 1) * bucketSize) + 1;
    const bucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length);
    const nextBucketStart = bucketEnd;
    const nextBucketEnd = Math.min(Math.floor((i + 3) * bucketSize) + 1, data.length);

    let avgX = 0, avgY = 0;
    const nbl = nextBucketEnd - nextBucketStart;
    if (nbl > 0) {
      for (let j = nextBucketStart; j < nextBucketEnd; j++) {
        avgX += data[j].x;
        avgY += data[j].y;
      }
      avgX /= nbl;
      avgY /= nbl;
    }

    let maxArea = -1;
    let maxIdx = bucketStart;
    for (let j = bucketStart; j < bucketEnd; j++) {
      const area = Math.abs(
        (data[a].x - avgX) * (data[j].y - data[a].y) -
        (data[a].x - data[j].x) * (avgY - data[a].y)
      );
      if (area > maxArea) {
        maxArea = area;
        maxIdx = j;
      }
    }

    result.push(data[maxIdx]);
    a = maxIdx;
  }

  result.push(data[data.length - 1]);
  return result;
}

/**
 * Phase 14: Safe streaming processor for 1M+ row data
 * Processes OHLCV data in chunks to prevent browser crashes
 */
export function processInChunks<T, R>(
  data: T[],
  chunkSize: number,
  processor: (chunk: T[], startIndex: number) => R[],
  onProgress?: (pct: number) => void
): R[] {
  const results: R[] = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    results.push(...processor(chunk, i));
    onProgress?.(Math.round((i / data.length) * 100));
  }
  return results;
}
