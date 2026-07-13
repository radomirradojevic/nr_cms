import { createHmac } from "node:crypto";

import { getGlobalSettings } from "@/data/global-settings";

const DEFAULT_WEBSHOP_BUY_URL = "https://www.nrcms.com/webshop";

export function canonicalWebshopActivationDomain(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "unknown") return "unknown";
  try {
    const parsed = new URL(
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`,
    );
    return parsed.hostname.toLowerCase();
  } catch {
    return trimmed.toLowerCase().replace(/^https?:\/\//, "").split("/")[0] || "unknown";
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
    process.env.APP_URL ??
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
  const url = new URL(process.env.WEBSHOP_BUY_URL ?? DEFAULT_WEBSHOP_BUY_URL);
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
