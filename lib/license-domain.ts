import { isIP } from "node:net";

export const CANONICAL_DOMAIN_CONTRACT_VERSION = 1;

export type LicenseEnvironment = "development" | "staging" | "production";

export type CanonicalDomainOptions = {
  developmentAllowedDomains?: readonly string[];
  environment?: LicenseEnvironment;
};

const DEFAULT_DEVELOPMENT_ALLOWED_DOMAINS = [
  "vendor.nr.test",
  "client.nr.test",
  "paypal.nr.test",
] as const;

/**
 * Canonical hostname used for license identity. It intentionally excludes the
 * transport scheme and port: https://client.nr.test:3002 is client.nr.test.
 */
export function canonicalizeLicenseDomain(
  value: string,
  options: CanonicalDomainOptions = {},
) {
  const hostname = normalizeLicenseHostname(value);
  const environment = options.environment ?? readLicenseEnvironment();
  const developmentAllowedDomains = new Set(
    (
      options.developmentAllowedDomains ?? DEFAULT_DEVELOPMENT_ALLOWED_DOMAINS
    ).map((domain) => normalizeLicenseHostname(domain)),
  );

  if (hostname.endsWith(".nr.test")) {
    if (
      environment !== "development" ||
      !developmentAllowedDomains.has(hostname)
    ) {
      throw new Error(
        "Canonical development domains must be explicitly allowlisted.",
      );
    }
  }

  return hostname;
}

/** Strict parser shared by every participant before environment policy. */
export function normalizeLicenseHostname(value: string) {
  const raw = value.trim();
  if (!raw || /[\u0000-\u001f\u007f\s]/.test(raw)) {
    throw new Error("Canonical domain is required.");
  }

  const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(raw);
  let url: URL;
  try {
    url = new URL(hasScheme ? raw : `https://${raw}`);
  } catch {
    throw new Error(
      "Canonical domain must be a hostname or absolute HTTP(S) origin.",
    );
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error(
      "Canonical domain must not include credentials, a path, query, or fragment.",
    );
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !hostname ||
    hostname === "localhost" ||
    isIP(hostname) ||
    hostname.length > 253 ||
    hostname
      .split(".")
      .some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
  ) {
    throw new Error("Canonical domain hostname is not allowed.");
  }
  return hostname;
}

function readLicenseEnvironment(): LicenseEnvironment {
  const value = process.env.NR_LICENSE_ENVIRONMENT?.trim().toLowerCase();
  if (
    value === "development" ||
    value === "staging" ||
    value === "production"
  ) {
    return value;
  }
  return "production";
}
