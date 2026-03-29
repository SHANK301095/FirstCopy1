/**
 * Reproducibility Hash Generator
 * Creates deterministic hash for backtest runs to ensure reproducibility
 */

// Engine version - increment when backtest logic changes
export const ENGINE_VERSION = '1.0.0';

export interface ReproHashInput {
  datasetFingerprint: string;
  strategyVersion: string;
  strategyCode: string;
  params: Record<string, unknown>;
  costModel: {
    slippage: number;
    commission: number;
    spread: number;
  };
  engineVersion?: string;
}

export interface ReproHashResult {
  hash: string;
  shortHash: string; // First 8 chars for display
  components: {
    dataset: string;
    strategy: string;
    params: string;
    costs: string;
    engine: string;
  };
  createdAt: number;
}

/**
 * Simple hash function (djb2)
 */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Create a stable string representation of an object
 */
function stableStringify(obj: unknown): string {
  if (obj === null || obj === undefined) return '';
  if (typeof obj !== 'object') return String(obj);
  
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return '{' + keys.map(k => `${k}:${stableStringify((obj as Record<string, unknown>)[k])}`).join(',') + '}';
}

/**
 * Generate reproducibility hash for a backtest run
 */
export function generateReproHash(input: ReproHashInput): ReproHashResult {
  const engineVersion = input.engineVersion || ENGINE_VERSION;
  
  // Hash each component separately for debugging
  const datasetHash = hashString(input.datasetFingerprint || 'unknown');
  const strategyHash = hashString(`${input.strategyVersion}:${input.strategyCode || ''}`);
  const paramsHash = hashString(stableStringify(input.params));
  const costsHash = hashString(stableStringify(input.costModel));
  const engineHash = hashString(engineVersion);
  
  // Combine all hashes
  const combinedInput = `${datasetHash}:${strategyHash}:${paramsHash}:${costsHash}:${engineHash}`;
  const fullHash = hashString(combinedInput);
  
  // Create a longer hash by combining components
  const extendedHash = `${fullHash}${datasetHash.slice(0, 4)}${strategyHash.slice(0, 4)}${paramsHash.slice(0, 4)}`;
  
  return {
    hash: extendedHash,
    shortHash: extendedHash.slice(0, 8).toUpperCase(),
    components: {
      dataset: datasetHash,
      strategy: strategyHash,
      params: paramsHash,
      costs: costsHash,
      engine: engineHash,
    },
    createdAt: Date.now(),
  };
}

/**
 * Verify if two runs have matching reproducibility hashes
 */
export function verifyReproHash(hash1: string, hash2: string): boolean {
  return hash1.toLowerCase() === hash2.toLowerCase();
}

/**
 * Generate fingerprint for a dataset
 */
export function generateDatasetFingerprint(
  firstTs: number,
  lastTs: number,
  rowCount: number,
  symbol: string
): string {
  const input = `${symbol}:${firstTs}:${lastTs}:${rowCount}`;
  return hashString(input);
}

/**
 * Parse repro hash components for display
 */
export function parseReproHashDisplay(result: ReproHashResult): {
  label: string;
  value: string;
}[] {
  return [
    { label: 'Full Hash', value: result.hash },
    { label: 'Dataset', value: result.components.dataset },
    { label: 'Strategy', value: result.components.strategy },
    { label: 'Parameters', value: result.components.params },
    { label: 'Costs', value: result.components.costs },
    { label: 'Engine', value: result.components.engine },
  ];
}
