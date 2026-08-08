import { timingSafeEqual } from "node:crypto";

/** Dedicated worker credential. CRON_SECRET is intentionally never accepted. */
export function isWebshopDeliveryWorkerAuthorized(
  request: Pick<Request, "headers">,
  env: Record<string, string | undefined> = process.env,
) {
  const secret = env.WEBSHOP_DELIVERY_WORKER_SECRET?.trim();
  if (!secret) return false;
  return timingSafeTextEqual(
    request.headers.get("authorization"),
    `Bearer ${secret}`,
  );
}

function timingSafeTextEqual(received: string | null, expected: string) {
  if (received === null) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
