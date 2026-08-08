import { timingSafeEqual } from "node:crypto";

/** Dedicated revalidation worker credential; CRON_SECRET is never a fallback. */
export function isWebshopEntitlementWorkerAuthorized(
  request: Pick<Request, "headers">,
  env: Record<string, string | undefined> = process.env,
) {
  const secret = env.WEBSHOP_ENTITLEMENT_REVALIDATION_WORKER_SECRET?.trim();
  if (!secret) return false;
  const received = request.headers.get("authorization");
  const expected = `Bearer ${secret}`;
  if (received === null) return false;
  const left = Buffer.from(received, "utf8");
  const right = Buffer.from(expected, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}
