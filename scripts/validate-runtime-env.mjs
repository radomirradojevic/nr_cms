import "dotenv/config";

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const localContractKeyCount = assertLocalEnvContractParity();

const REQUIRED = [
  "CLERK_SECRET_KEY",
  "CRON_SECRET",
  "DATABASE_URL",
  "EMAIL_FROM",
  "EMAIL_PROVIDER",
  "IP_HASH_SALT",
  "LICENSE_SERVER_CUSTOMER_ENVIRONMENT",
  "LICENSE_SERVER_DEPLOYMENT_MODE",
  "LICENSE_SERVER_ENABLED",
  "LICENSE_SERVER_INSTALL_MODE",
  "LICENSE_SERVER_SECRET_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "NR_ADDON_INSTALLATION_ENCRYPTION_KEY",
  "NR_ALLOW_INSECURE_LOOPBACK_HTTP",
  "NR_MASTER_LICENSE_URL",
  "TURNSTILE_SECRET_KEY",
  "WEBSHOP_CART_TOKEN_SALT",
  "WEBSHOP_CHECKOUT_ENABLED",
  "WEBSHOP_DEPLOYMENT_MODE",
  "WEBSHOP_DOWNLOAD_EVENT_HASH_SECRET",
  "WEBSHOP_DOWNLOAD_TOKEN_SECRET",
  "WEBSHOP_ENABLED",
  "WEBSHOP_INSTALL_MODE",
  "WEBSHOP_LICENSE_SERVER_SECRET_KEY",
  "WEBSHOP_PAYMENTS_MODE",
  "WEBSHOP_STOREFRONT_ENABLED",
];

const FORBIDDEN = [
  "LICENSE_SERVER_ALLOW_LOCAL_DEV_INSTALL",
  "LICENSE_SERVER_LICENSE_API_URL",
  "LICENSE_SERVER_LICENSE_KEY",
  "LICENSE_SERVER_PACKAGE_TOKEN",
  "LICENSE_SERVER_SELF_HOSTED_SITE_ID",
  "NR_ADDON_RELEASE_PUBLIC_KEYS_FILE",
  "NR_ADDONS_REGISTRY_FILE",
  "NR_VENDOR_ENTITLEMENT_PUBLIC_KEYS_JSON",
  "VENDOR_SIGNED_ENTITLEMENTS_V1",
  "WEBSHOP_ALLOW_LOCAL_DEV_INSTALL",
  "WEBSHOP_LICENSE_API_URL",
  "WEBSHOP_LICENSE_KEY",
  "WEBSHOP_LICENSE_PUBLIC_KEY",
  "WEBSHOP_PACKAGE_TOKEN",
  "WEBSHOP_SELF_HOSTED_SITE_ID",
];

const BOOLEAN_KEYS = [
  "LICENSE_SERVER_ENABLED",
  "NR_ALLOW_INSECURE_LOOPBACK_HTTP",
  "WEBSHOP_CHECKOUT_ENABLED",
  "WEBSHOP_ENABLED",
  "WEBSHOP_STOREFRONT_ENABLED",
];

const SECRET_KEYS = [
  "CRON_SECRET",
  "IP_HASH_SALT",
  "LICENSE_SERVER_SECRET_KEY",
  "NR_ADDON_INSTALLATION_ENCRYPTION_KEY",
  "WEBSHOP_CART_TOKEN_SALT",
  "WEBSHOP_DOWNLOAD_EVENT_HASH_SECRET",
  "WEBSHOP_DOWNLOAD_TOKEN_SECRET",
  "WEBSHOP_LICENSE_SERVER_SECRET_KEY",
];

const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
if (missing.length) {
  fail(`missing required variables: ${missing.join(", ")}`);
}

const forbidden = FORBIDDEN.filter((key) => process.env[key] !== undefined);
if (forbidden.length) {
  fail(`obsolete/local-only variables are forbidden: ${forbidden.join(", ")}`);
}

for (const key of BOOLEAN_KEYS) {
  if (!["true", "false"].includes(process.env[key].trim().toLowerCase())) {
    fail(`${key} must be explicitly true or false`);
  }
}

for (const key of SECRET_KEYS) {
  if (process.env[key].trim().length < 32) {
    fail(`${key} must contain at least 32 characters`);
  }
}

assertHttpOrigin("NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL);

assertLicenseServerUrl(
  "NR_MASTER_LICENSE_URL",
  process.env.NR_MASTER_LICENSE_URL,
);

for (const key of [
  "LICENSE_SERVER_DEPLOYMENT_MODE",
  "WEBSHOP_DEPLOYMENT_MODE",
]) {
  if (!["self_hosted", "vercel"].includes(process.env[key])) {
    fail(`${key} must be self_hosted or vercel`);
  }
}

if (
  !["development", "staging", "production"].includes(
    process.env.LICENSE_SERVER_CUSTOMER_ENVIRONMENT,
  )
) {
  fail(
    "LICENSE_SERVER_CUSTOMER_ENVIRONMENT must be development, staging, or production",
  );
}

if (
  !["disabled", "managed_redeploy"].includes(process.env.WEBSHOP_INSTALL_MODE)
) {
  fail("WEBSHOP_INSTALL_MODE must be disabled or managed_redeploy");
}
if (
  !["disabled", "managed_redeploy"].includes(
    process.env.LICENSE_SERVER_INSTALL_MODE,
  )
) {
  fail("LICENSE_SERVER_INSTALL_MODE must be disabled or managed_redeploy");
}
if (!["live", "test"].includes(process.env.WEBSHOP_PAYMENTS_MODE)) {
  fail("WEBSHOP_PAYMENTS_MODE must be live or test");
}

console.log(
  `CMS runtime environment contract is valid${
    localContractKeyCount === null
      ? ""
      : ` (${localContractKeyCount} local/production keys)`
  }.`,
);

function assertLocalEnvContractParity() {
  const localPath = resolve(process.cwd(), ".env");
  const publicContractPath = resolve(process.cwd(), ".env.example");
  const vendorContractPath = resolve(process.cwd(), ".env.example.vendor");
  const contractPath = existsSync(vendorContractPath)
    ? vendorContractPath
    : publicContractPath;
  if (!existsSync(localPath) || !existsSync(contractPath)) return null;

  const local = readEnvKeys(localPath);
  const contract = readEnvKeys(contractPath);
  const optional = readDocumentedOptionalEnvKeys(contractPath);
  const localOnly = [...local]
    .filter((key) => !contract.has(key) && !optional.has(key))
    .sort();
  const contractOnly = [...contract].filter((key) => !local.has(key)).sort();
  if (localOnly.length || contractOnly.length) {
    fail(
      [
        "local .env must contain every required production key and no undocumented keys",
        contractPath === vendorContractPath
          ? "contract: .env.example.vendor"
          : "contract: .env.example",
        localOnly.length
          ? `undocumented locally: ${localOnly.join(", ")}`
          : null,
        contractOnly.length
          ? `missing locally: ${contractOnly.join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("; "),
    );
  }
  return contract.size;
}

function readDocumentedOptionalEnvKeys(path) {
  const keys = [];
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(
      /^\s*#\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/,
    );
    if (match) keys.push(match[1]);
  }
  return new Set(keys);
}

function readEnvKeys(path) {
  const keys = [];
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) keys.push(match[1]);
  }
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  if (duplicates.length) {
    fail(
      `${path} contains duplicate variables: ${[...new Set(duplicates)].join(", ")}`,
    );
  }
  return new Set(keys);
}

function assertHttpOrigin(key, value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${key} must be an absolute URL`);
  }
  if (!["http:", "https:"].includes(url.protocol) || url.pathname !== "/") {
    fail(`${key} must be an HTTP(S) origin without a path`);
  }
}

function assertLicenseServerUrl(key, value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${key} must be an absolute URL`);
  }
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(
    url.hostname.replace(/^\[|\]$/g, "").toLowerCase(),
  );
  const insecureAllowed =
    process.env.NR_ALLOW_INSECURE_LOOPBACK_HTTP.trim().toLowerCase() === "true";
  if (url.protocol === "http:" && !(loopback && insecureAllowed)) {
    fail(`${key} may use HTTP only for an explicitly allowed loopback origin`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    fail(`${key} must use HTTP or HTTPS`);
  }
  if (!loopback && insecureAllowed) {
    fail(
      "NR_ALLOW_INSECURE_LOOPBACK_HTTP must be false outside a loopback runtime",
    );
  }
}

function fail(message) {
  console.error(`[runtime-env] ${message}`);
  process.exit(1);
}
