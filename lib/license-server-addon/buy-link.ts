import { createHmac } from "node:crypto";

import { getGlobalSettings } from "@/data/global-settings";
import { canonicalWebshopActivationDomain } from "@/lib/webshop-addon/buy-link";

const DEFAULT_LICENSE_SERVER_BUY_URL = "https://www.nrcms.com/license-server";

export async function buildLicenseServerLicenseBuyUrl() {
  const settings = await getGlobalSettings();
  const siteDomain =
    settings.publicSiteUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    "unknown";
  const domain = canonicalWebshopActivationDomain(siteDomain);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();
  const payload = Buffer.from(
    JSON.stringify({ addon: "license-server", domain, expiresAt, v: 1 }),
  ).toString("base64url");
  const secret =
    process.env.LICENSE_SERVER_BUY_LINK_SECRET ??
    process.env.AUTH_SECRET ??
    "development-license-server-buy-link-secret";
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  const url = new URL(
    process.env.LICENSE_SERVER_BUY_URL ?? DEFAULT_LICENSE_SERVER_BUY_URL,
  );
  url.searchParams.set("addon", "license-server");
  url.searchParams.set("domain", `${payload}.${signature}`);
  return url.toString();
}
