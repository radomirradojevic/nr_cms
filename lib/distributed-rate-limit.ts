import "server-only";

import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export type DistributedRateLimitResult = { allowed: true; remaining: number; resetAt: Date } | { allowed: false; reason: string; resetAt: Date };

export async function checkDistributedRateLimit(input: { key: string; limit: number; namespace: string; reason: string; windowMs: number }): Promise<DistributedRateLimitResult> {
  const now = Date.now(); const reset = new Date(now + input.windowMs);
  const bucket = createHash("sha256").update(`${input.namespace}:${input.key.slice(0, 512)}:${input.windowMs}`).digest("hex");
  try {
    const result = await db.execute(sql`
      INSERT INTO security_rate_limit_buckets (bucket_hash, count, reset_at, updated_at)
      VALUES (${bucket}, 1, ${reset}, now())
      ON CONFLICT (bucket_hash) DO UPDATE SET
        count = CASE WHEN security_rate_limit_buckets.reset_at <= now() THEN 1 ELSE security_rate_limit_buckets.count + 1 END,
        reset_at = CASE WHEN security_rate_limit_buckets.reset_at <= now() THEN ${reset} ELSE security_rate_limit_buckets.reset_at END,
        updated_at = now()
      RETURNING count, reset_at
    `);
    const row = result.rows[0] as { count: number; reset_at: Date } | undefined;
    if (!row || row.count <= input.limit) return { allowed: true, remaining: Math.max(0, input.limit - (row?.count ?? 1)), resetAt: new Date(row?.reset_at ?? reset) };
    return { allowed: false, reason: input.reason, resetAt: new Date(row.reset_at) };
  } catch {
    // Checkout/download abuse controls fail closed in production when shared state is unavailable.
    return process.env.NODE_ENV === "production" ? { allowed: false, reason: input.reason, resetAt: new Date(now + 60_000) } : { allowed: true, remaining: input.limit - 1, resetAt: reset };
  }
}
