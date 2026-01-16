const buckets = new Map<string, { count: number; start: number }>();

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export function rateLimit(key: string, { limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { count: 0, start: now };
  if (now - bucket.start > windowMs) {
    bucket.count = 0;
    bucket.start = now;
  }
  bucket.count += 1;
  buckets.set(key, bucket);
  if (bucket.count > limit) {
    const error = new Error("Too Many Requests");
    (error as Error & { status?: number }).status = 429;
    throw error;
  }
}
