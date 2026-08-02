import { createHmac } from "node:crypto";

import { getGlobalSettings } from "@/data/global-settings";
import { canonicalizeLicenseDomain } from "@/lib/license-domain";
import { parseWebshopBuyUrl } from "@/lib/webshop-addon/buy-url-contract";

export {
  configuredWebshopVendorAudience,
  parseWebshopBuyUrl,
} from "@/lib/webshop-addon/buy-url-contract";

export function canonicalWebshopActivationDomain(value: string) {
  try {
    return canonicalizeLicenseDomain(value);
  } catch {
    return "unknown";
  }
}

export async function buildWebshopLicenseBuyUrl() {
  return buildWebshopLicenseBuyUrlWithSecret(requiredBuyLinkSecret());
}

export async function tryBuildWebshopLicenseBuyUrl() {
  const secret = optionalBuyLinkSecret();
  if (!secret) return null;
  return buildWebshopLicenseBuyUrlWithSecret(secret);
}

async function buildWebshopLicenseBuyUrlWithSecret(secret: string) {
  const settings = await getGlobalSettings();
  const siteDomain =
    settings.publicSiteUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    "unknown";
  const domain = canonicalWebshopActivationDomain(siteDomain);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();
  const payload = Buffer.from(
    JSON.stringify({ addon: "webshop", domain, expiresAt, v: 1 }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  const configured = process.env.WEBSHOP_BUY_URL;
  if (!configured) throw new Error("WEBSHOP_BUY_URL must be configured.");
  const url = parseWebshopBuyUrl(configured).url;
  url.searchParams.set("addon", "webshop");
  url.searchParams.set("domain", `${payload}.${signature}`);
  return url.toString();
}

function requiredBuyLinkSecret() {
  const secret = optionalBuyLinkSecret();
  if (!secret) throw new Error("WEBSHOP_BUY_LINK_SECRET must be configured.");
  return secret;
}

function optionalBuyLinkSecret() {
  return process.env.WEBSHOP_BUY_LINK_SECRET?.trim() || null;
}
