import { timingSafeEqual } from "node:crypto";

type EnvLike = Record<string, string | undefined>;

export function isCronRequestAuthorized(
  request: Pick<Request, "headers">,
  env: EnvLike = process.env,
): boolean {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) return false;

  return (
    timingSafeTextEqual(
      request.headers.get("authorization"),
      `Bearer ${secret}`,
    ) || timingSafeTextEqual(request.headers.get("x-cron-secret"), secret)
  );
}

function timingSafeTextEqual(
  received: string | null,
  expected: string,
): boolean {
  if (received === null) return false;
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  return (
    receivedBytes.length === expectedBytes.length &&
    timingSafeEqual(receivedBytes, expectedBytes)
  );
}
