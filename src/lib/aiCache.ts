/**
 * Phase 4: AI Response Cache
 * In-memory TTL cache for AI copilot responses to reduce redundant API calls
 */

interface CacheEntry {
  response: string;
  timestamp: number;
  tokens?: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;
const MAX_TOKEN_CAP = 50_000;

class AICache {
  private cache = new Map<string, CacheEntry>();
  private ttl: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttl = ttlMs;
  }

  /** Generate a cache key from the prompt */
  private hashKey(prompt: string, context?: string): string {
    const raw = `${prompt}::${context ?? ''}`.toLowerCase().trim();
    // Simple hash
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `ai_${hash}`;
  }

  /** Get cached response if valid */
  get(prompt: string, context?: string): string | null {
    const key = this.hashKey(prompt, context);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.response;
  }

  /** Cache a response */
  set(prompt: string, response: string, context?: string, tokens?: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldest = [...this.cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) this.cache.delete(oldest[0]);
    }

    const key = this.hashKey(prompt, context);
    this.cache.set(key, { response, timestamp: Date.now(), tokens });
  }

  /** Clear all cached responses */
  clear(): void {
    this.cache.clear();
  }

  /** Get cache stats */
  stats(): { size: number; maxSize: number; ttlMs: number } {
    return { size: this.cache.size, maxSize: MAX_CACHE_SIZE, ttlMs: this.ttl };
  }
}

export const aiCache = new AICache();

/**
 * Phase 4: Token Guard — truncate context to stay under token cap
 */
export function truncateContext(text: string, maxTokens: number = MAX_TOKEN_CAP): string {
  // Rough token estimate: 1 token ≈ 4 chars
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  
  // Keep beginning and end, truncate middle
  const keepChars = Math.floor(maxChars / 2);
  return text.slice(0, keepChars) + '\n\n[... context truncated ...]\n\n' + text.slice(-keepChars);
}

/**
 * Check if prompt is within token budget
 */
export function isWithinTokenBudget(prompt: string, context?: string): boolean {
  const totalChars = prompt.length + (context?.length ?? 0);
  return totalChars <= MAX_TOKEN_CAP * 4;
}
