import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { comments } from "@/db/schema";

/**
 * Resolve the client IP from the request headers. Returns `null` when no
 * trustworthy header is present. We use the leftmost value of
 * `x-forwarded-for` and never trust client-supplied body fields.
 */
export async function getClientIp(): Promise<string | null> {
  try {
    const h = await headers();
    const xff = h.get("x-forwarded-for");
    if (xff) {
      const first = xff.split(",")[0]?.trim();
      if (first) return first;
    }
    return h.get("x-real-ip");
  } catch {
    return null;
  }
}

/**
 * Hash an IP with the configured salt. We never store raw IPs.
 */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT ?? "";
  if (!salt) {
    console.warn("[rate-limit] IP_HASH_SALT is not set");
  }
  return createHash("sha256")
    .update(ip + salt)
    .digest("hex");
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: string };

const SHORT_WINDOW_MS = 10 * 60 * 1000; // 10 min
const SHORT_WINDOW_MAX = 5;
const DAY_WINDOW_MS = 24 * 60 * 60 * 1000;
const DAY_WINDOW_MAX = 20;
const DEDUPE_WINDOW_MS = 60 * 1000;

/**
 * Enforce per-IP rate limits and a dedupe window for identical bodies. All
 * checks are best-effort and rely on the `comments_ip_hash_idx` index.
 */
export async function checkCommentRateLimit(args: {
  ipHash: string | null;
  authorId: string | null;
  body: string;
}): Promise<RateLimitResult> {
  const { ipHash, authorId, body } = args;
  const now = Date.now();

  if (ipHash) {
    const since10m = new Date(now - SHORT_WINDOW_MS);
    const since24h = new Date(now - DAY_WINDOW_MS);

    const [{ c10 } = { c10: 0 }] = await db
      .select({ c10: sql<number>`count(*)::int` })
      .from(comments)
      .where(
        and(eq(comments.ipHash, ipHash), gte(comments.createdAt, since10m)),
      );
    if (c10 >= SHORT_WINDOW_MAX) {
      return {
        allowed: false,
        reason: "Too many comments. Please wait a few minutes and try again.",
      };
    }

    const [{ c24 } = { c24: 0 }] = await db
      .select({ c24: sql<number>`count(*)::int` })
      .from(comments)
      .where(
        and(eq(comments.ipHash, ipHash), gte(comments.createdAt, since24h)),
      );
    if (c24 >= DAY_WINDOW_MAX) {
      return {
        allowed: false,
        reason: "Daily comment limit reached. Try again tomorrow.",
      };
    }
  }

  // Dedupe: same author/body within DEDUPE_WINDOW_MS
  const sinceDedupe = new Date(now - DEDUPE_WINDOW_MS);
  const dedupeConds = [
    gte(comments.createdAt, sinceDedupe),
    eq(comments.body, body),
  ];
  if (authorId) dedupeConds.push(eq(comments.authorId, authorId));
  else if (ipHash) dedupeConds.push(eq(comments.ipHash, ipHash));
  else return { allowed: true };

  const [{ d } = { d: 0 }] = await db
    .select({ d: sql<number>`count(*)::int` })
    .from(comments)
    .where(and(...dedupeConds));
  if (d > 0) {
    return { allowed: false, reason: "Duplicate comment detected." };
  }

  return { allowed: true };
}
