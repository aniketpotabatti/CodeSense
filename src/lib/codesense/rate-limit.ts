const WINDOW_MS = 60_000;
const MAX_REQ = 12;

type Bucket = number[];

const buckets = new Map<string, Bucket>();

function prune(now: number, stamps: Bucket): Bucket {
  return stamps.filter((t) => now - t < WINDOW_MS);
}

export function checkRateLimit(key: string): {
  ok: boolean;
  remaining: number;
  retryAfter: number;
} {
  const now = Date.now();
  const next = prune(now, buckets.get(key) ?? []);
  if (next.length >= MAX_REQ) {
    const oldest = next[0] ?? now;
    const retryAfter = Math.max(250, WINDOW_MS - (now - oldest));
    buckets.set(key, next);
    return { ok: false, remaining: 0, retryAfter };
  }
  next.push(now);
  buckets.set(key, next);
  return { ok: true, remaining: MAX_REQ - next.length, retryAfter: 0 };
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "anon";
}
