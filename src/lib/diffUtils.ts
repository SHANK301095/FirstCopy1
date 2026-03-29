/**
 * Simple Diff Utility
 * Compares two strings line by line and returns diff information
 */

export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  lineNumber: number;
}

export interface DiffResult {
  left: DiffLine[];
  right: DiffLine[];
  stats: {
    added: number;
    removed: number;
    unchanged: number;
  };
}

/**
 * Simple LCS-based diff algorithm
 * Computes the longest common subsequence to find differences
 */
export function computeDiff(oldText: string, newText: string): DiffResult {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  
  // Build LCS table
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // Backtrack to find the diff
  const leftResult: DiffLine[] = [];
  const rightResult: DiffLine[] = [];
  
  let i = m;
  let j = n;
  const tempLeft: DiffLine[] = [];
  const tempRight: DiffLine[] = [];
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      // Lines are the same
      tempLeft.unshift({ type: 'unchanged', content: oldLines[i - 1], lineNumber: i });
      tempRight.unshift({ type: 'unchanged', content: newLines[j - 1], lineNumber: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      // Line was added in new
      tempRight.unshift({ type: 'added', content: newLines[j - 1], lineNumber: j });
      j--;
    } else if (i > 0) {
      // Line was removed from old
      tempLeft.unshift({ type: 'removed', content: oldLines[i - 1], lineNumber: i });
      i--;
    }
  }
  
  // Align the results for side-by-side display
  let leftIdx = 0;
  let rightIdx = 0;
  
  while (leftIdx < tempLeft.length || rightIdx < tempRight.length) {
    const leftLine = tempLeft[leftIdx];
    const rightLine = tempRight[rightIdx];
    
    if (leftLine?.type === 'unchanged' && rightLine?.type === 'unchanged') {
      leftResult.push(leftLine);
      rightResult.push(rightLine);
      leftIdx++;
      rightIdx++;
    } else if (leftLine?.type === 'removed') {
      leftResult.push(leftLine);
      rightResult.push({ type: 'unchanged', content: '', lineNumber: -1 }); // placeholder
      leftIdx++;
    } else if (rightLine?.type === 'added') {
      leftResult.push({ type: 'unchanged', content: '', lineNumber: -1 }); // placeholder
      rightResult.push(rightLine);
      rightIdx++;
    } else {
      // Should not happen, but handle edge case
      if (leftLine) {
        leftResult.push(leftLine);
        leftIdx++;
      }
      if (rightLine) {
        rightResult.push(rightLine);
        rightIdx++;
      }
    }
  }
  
  // Calculate stats
  const stats = {
    added: tempRight.filter(l => l.type === 'added').length,
    removed: tempLeft.filter(l => l.type === 'removed').length,
    unchanged: tempLeft.filter(l => l.type === 'unchanged').length,
  };
  
  return { left: leftResult, right: rightResult, stats };
}

/**
 * Unified diff format (single column with +/- prefixes)
 */
export function computeUnifiedDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  const result: DiffLine[] = [];
  let i = m;
  let j = n;
  const temp: DiffLine[] = [];
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      temp.unshift({ type: 'unchanged', content: oldLines[i - 1], lineNumber: i });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      temp.unshift({ type: 'added', content: newLines[j - 1], lineNumber: j });
      j--;
    } else if (i > 0) {
      temp.unshift({ type: 'removed', content: oldLines[i - 1], lineNumber: i });
      i--;
    }
  }
  
  return temp;
}
