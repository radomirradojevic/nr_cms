export type InMemoryRateLimitResult =
  | { allowed: true; remaining: number; resetAt: Date }
  | { allowed: false; reason: string; resetAt: Date };

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
let lastSweepAt = 0;

function sweepExpiredBuckets(now: number) {
  if (now - lastSweepAt < 60_000) return;
  lastSweepAt = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkInMemoryRateLimit(input: {
  key: string;
  limit: number;
  namespace: string;
  now?: number;
  reason: string;
  windowMs: number;
}): InMemoryRateLimitResult {
  const now = input.now ?? Date.now();
  sweepExpiredBuckets(now);

  const bucketKey = `${input.namespace}:${input.key}`;
  const existing = buckets.get(bucketKey);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + input.windowMs };

  if (bucket.count >= input.limit) {
    buckets.set(bucketKey, bucket);
    return {
      allowed: false,
      reason: input.reason,
      resetAt: new Date(bucket.resetAt),
    };
  }

  bucket.count += 1;
  buckets.set(bucketKey, bucket);
  return {
    allowed: true,
    remaining: Math.max(0, input.limit - bucket.count),
    resetAt: new Date(bucket.resetAt),
  };
}

export function resetInMemoryRateLimits(): void {
  buckets.clear();
  lastSweepAt = 0;
}
