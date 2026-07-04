import { headers } from "next/headers";
import Script from "next/script";

import { PaddleCheckoutClient } from "./paddle-checkout-client";

export const dynamic = "force-dynamic";

type PaddleCheckoutPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaddleCheckoutPage({
  searchParams,
}: PaddleCheckoutPageProps) {
  const params = await searchParams;
  const requestHeaders = await headers();
  const origin = requestOrigin(requestHeaders);
  const transactionId =
    firstSearchParam(params._ptxn) ?? firstSearchParam(params.transactionId);
  const successUrl = sameOriginUrl(
    firstSearchParam(params.successUrl),
    origin,
    "/",
  );
  const cancelUrl = sameOriginUrl(
    firstSearchParam(params.cancelUrl),
    origin,
    successUrl,
  );
  const mode =
    process.env.WEBSHOP_PAYMENTS_MODE?.trim().toLowerCase() === "live"
      ? "live"
      : "test";

  return (
    <>
      <Script
        id="paddle-js-v2"
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
      />
      <PaddleCheckoutClient
        cancelUrl={cancelUrl}
        clientToken={process.env.WEBSHOP_PADDLE_CLIENT_TOKEN?.trim() ?? ""}
        mode={mode}
        successUrl={successUrl}
        transactionId={transactionId}
      />
    </>
  );
}

function firstSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function requestOrigin(requestHeaders: Headers) {
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

function sameOriginUrl(value: string | null, origin: string, fallback: string) {
  const originUrl = new URL(origin);
  const fallbackUrl = new URL(fallback, originUrl);
  try {
    const url = new URL(value ?? fallback, originUrl);
    return url.origin === originUrl.origin
      ? url.toString()
      : fallbackUrl.toString();
  } catch {
    return fallbackUrl.toString();
  }
}
