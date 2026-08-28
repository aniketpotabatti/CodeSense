interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

const CAPACITY = 30;
const REFILL_PER_MS = 30 / 60_000; // 30 requests per minute

export function checkRateLimit(key: string): {
  allowed: boolean;
  retryAfterMs: number;
} {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: CAPACITY - 1, lastRefill: now };
    buckets.set(key, bucket);
    return { allowed: true, retryAfterMs: 0 };
  }

  const elapsed = now - bucket.lastRefill;
  bucket.tokens = Math.min(CAPACITY, bucket.tokens + elapsed * REFILL_PER_MS);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    const retryAfterMs = Math.ceil((1 - bucket.tokens) / REFILL_PER_MS);
    return { allowed: false, retryAfterMs };
  }

  bucket.tokens -= 1;
  return { allowed: true, retryAfterMs: 0 };
}
