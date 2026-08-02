export const WEBSHOP_BUY_PATH = "/licenses/purchase-intents/accept";

export type ParsedWebshopBuyUrl = {
  url: URL;
  vendorAudience: string;
};

/** Trusted startup configuration only; browser input is never accepted here. */
export function parseWebshopBuyUrl(value: string): ParsedWebshopBuyUrl {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("WEBSHOP_BUY_URL must be an absolute HTTPS URL.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== WEBSHOP_BUY_PATH ||
    (url.port && url.port !== "443")
  ) {
    throw new Error(
      `WEBSHOP_BUY_URL must be HTTPS with exact ${WEBSHOP_BUY_PATH} path and no credentials, query, fragment, or unexpected port.`,
    );
  }
  return { url, vendorAudience: url.origin };
}

export function configuredWebshopVendorAudience(
  env: Record<string, string | undefined> = process.env,
) {
  const value = env.WEBSHOP_BUY_URL?.trim();
  if (!value) throw new Error("WEBSHOP_BUY_URL must be configured.");
  return parseWebshopBuyUrl(value).vendorAudience;
}
