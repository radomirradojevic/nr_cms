import "dotenv/config";

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertExactTargetDatabaseUrl,
  loadCmsCorePrivilegeManifest,
  resolveCmsCoreTarget,
} from "./core-db-contract.mjs";

const DEFAULT_MASTER_LICENSE_SERVER_URL = "https://ls.nrcms.com";

const CORE_REQUIRED = [
  "CLERK_SECRET_KEY",
  "CRON_SECRET",
  "DATABASE_URL",
  "EMAIL_FROM",
  "EMAIL_PROVIDER",
  "IP_HASH_SALT",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY",
];

const DEPLOYMENT_PROFILES = ["development", "vendor", "client"];
const LICENSE_ENVIRONMENTS = ["development", "staging", "production"];
const ADDON_SOURCE_MODES = ["private_workspace", "registry", "empty"];

const WEBSHOP_REQUIRED_WHEN_ENABLED = [
  "WEBSHOP_CART_TOKEN_SALT",
  "WEBSHOP_CHECKOUT_ENABLED",
  "WEBSHOP_DEPLOYMENT_MODE",
  "WEBSHOP_DOWNLOAD_EVENT_HASH_SECRET",
  "WEBSHOP_DOWNLOAD_TOKEN_SECRET",
  "WEBSHOP_INSTALL_MODE",
  "WEBSHOP_LICENSE_SERVER_SECRET_KEY",
  "WEBSHOP_PAYMENTS_MODE",
  "WEBSHOP_STOREFRONT_ENABLED",
  "WEBSHOP_BUY_URL",
];

const WEBSHOP_REQUIRED_FOR_MANAGED_REDEPLOY = [
  "NR_ADDON_DEPLOYMENT_WORKER_AUTH_KID",
  "NR_ADDON_DEPLOYMENT_WORKER_AUTH_SECRET",
  "NR_ADDON_DEPLOYMENT_WORKER_URL",
  "WEBSHOP_DEPLOYMENT_RESULT_AUTH_KID",
  "WEBSHOP_DEPLOYMENT_RESULT_AUTH_SECRET",
];

const LICENSE_SERVER_REQUIRED_WHEN_ENABLED = [
  "LICENSE_SERVER_CUSTOMER_ENVIRONMENT",
  "LICENSE_SERVER_DEPLOYMENT_MODE",
  "LICENSE_SERVER_INSTALL_MODE",
  "LICENSE_SERVER_SECRET_KEY",
];

const ADDON_SHARED_REQUIRED = [
  "NEXT_PUBLIC_APP_URL",
  "NR_ADDON_INSTALLATION_ENCRYPTION_KEY",
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

const CORE_SECRET_KEYS = ["CRON_SECRET", "IP_HASH_SALT"];

const WEBSHOP_SECRET_KEYS = [
  "WEBSHOP_CART_TOKEN_SALT",
  "WEBSHOP_DOWNLOAD_EVENT_HASH_SECRET",
  "WEBSHOP_DOWNLOAD_TOKEN_SECRET",
  "WEBSHOP_LICENSE_SERVER_SECRET_KEY",
];

const LICENSE_SERVER_SECRET_KEYS = ["LICENSE_SERVER_SECRET_KEY"];

export function validateRuntimeEnv(env = process.env) {
  const deploymentProfile = readRequiredEnum(
    env,
    "NR_CMS_DEPLOYMENT_PROFILE",
    DEPLOYMENT_PROFILES,
  );
  const licenseEnvironment = readRequiredEnum(
    env,
    "NR_LICENSE_ENVIRONMENT",
    LICENSE_ENVIRONMENTS,
  );
  const addonSourceMode = readRequiredEnum(
    env,
    "NR_ADDON_SOURCE_MODE",
    ADDON_SOURCE_MODES,
  );
  assertProfileSourceMode(deploymentProfile, addonSourceMode);
  const webshopEnabled = readBoolean(env, "WEBSHOP_ENABLED", false);
  const licenseServerEnabled = readBoolean(
    env,
    "LICENSE_SERVER_ENABLED",
    false,
  );
  const allowInsecureLoopbackHttp = readBoolean(
    env,
    "NR_ALLOW_INSECURE_LOOPBACK_HTTP",
    false,
  );
  const addonEnabled = webshopEnabled || licenseServerEnabled;
  const webshopManagedRedeploy =
    webshopEnabled && env.WEBSHOP_INSTALL_MODE?.trim() === "managed_redeploy";
  if (addonSourceMode === "empty" && addonEnabled) {
    fail(
      "NR_ADDON_SOURCE_MODE=empty requires every paid add-on to be disabled",
    );
  }

  const required = [
    ...CORE_REQUIRED,
    ...(webshopEnabled ? WEBSHOP_REQUIRED_WHEN_ENABLED : []),
    ...(webshopManagedRedeploy
      ? WEBSHOP_REQUIRED_FOR_MANAGED_REDEPLOY
      : []),
    ...(licenseServerEnabled ? LICENSE_SERVER_REQUIRED_WHEN_ENABLED : []),
    ...(addonEnabled ? ADDON_SHARED_REQUIRED : []),
  ];
  const missing = required.filter((key) => !env[key]?.trim());
  if (missing.length) {
    fail(`missing required variables: ${missing.join(", ")}`);
  }

  if (deploymentProfile === "vendor" || deploymentProfile === "client") {
    const target = resolveCmsCoreTarget(
      deploymentProfile,
      loadCmsCorePrivilegeManifest(),
    );
    assertExactTargetDatabaseUrl(env.DATABASE_URL, target, target.roles.runtime);
  }

  const forbidden = FORBIDDEN.filter((key) => env[key] !== undefined);
  if (forbidden.length) {
    fail(
      `obsolete/local-only variables are forbidden: ${forbidden.join(", ")}`,
    );
  }

  // Keep malformed supplied values from silently changing a rollout, while an
  // omitted add-on switch remains fail-closed for first CMS deployments.
  readBoolean(env, "WEBSHOP_CHECKOUT_ENABLED", false);
  readBoolean(env, "WEBSHOP_STOREFRONT_ENABLED", false);

  assertOptionalEnum(env, "WEBSHOP_DEPLOYMENT_MODE", ["self_hosted", "vercel"]);
  assertOptionalEnum(env, "LICENSE_SERVER_DEPLOYMENT_MODE", [
    "self_hosted",
    "vercel",
  ]);
  assertOptionalEnum(env, "LICENSE_SERVER_CUSTOMER_ENVIRONMENT", [
    "development",
    "staging",
    "production",
  ]);
  assertOptionalEnum(env, "WEBSHOP_INSTALL_MODE", [
    "disabled",
    "managed_redeploy",
  ]);
  assertOptionalEnum(env, "LICENSE_SERVER_INSTALL_MODE", [
    "disabled",
    "managed_redeploy",
  ]);
  assertOptionalEnum(env, "WEBSHOP_PAYMENTS_MODE", ["live", "test"]);
  assertOptionalEnum(env, "WEBSHOP_DELIVERY_EMAIL_PROVIDER", ["fixture"]);

  for (const key of CORE_SECRET_KEYS) assertSecret(env, key);
  if (webshopEnabled) {
    for (const key of WEBSHOP_SECRET_KEYS) assertSecret(env, key);
    assertOptionalPostIssueDeliveryContract(env);
  }
  if (licenseServerEnabled) {
    for (const key of LICENSE_SERVER_SECRET_KEYS) assertSecret(env, key);
  }
  if (addonEnabled) {
    assertAddonInstallationEncryptionKey(env);
  }

  if (addonEnabled) {
    assertHttpOrigin("NEXT_PUBLIC_APP_URL", env.NEXT_PUBLIC_APP_URL);
  }
  if (addonEnabled || env.NR_MASTER_LICENSE_URL?.trim()) {
    const masterLicenseUrl =
      env.NR_MASTER_LICENSE_URL?.trim() || DEFAULT_MASTER_LICENSE_SERVER_URL;
    assertLicenseServerUrl(
      "NR_MASTER_LICENSE_URL",
      masterLicenseUrl,
      allowInsecureLoopbackHttp,
    );
    assertLocalCaddyNodeTrust(env, masterLicenseUrl);
  }
  if (webshopEnabled) assertWebshopBuyUrl(env.WEBSHOP_BUY_URL);
  if (webshopManagedRedeploy) {
    assertManagedRedeployTransport(env, deploymentProfile, licenseEnvironment);
  }

  return {
    addonSourceMode,
    allowInsecureLoopbackHttp,
    deploymentProfile,
    licenseEnvironment,
    licenseServerEnabled,
    webshopEnabled,
  };
}

function assertOptionalPostIssueDeliveryContract(env) {
  const key = env.WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KEY?.trim();
  const kid = env.WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KID?.trim();
  if (Boolean(key) !== Boolean(kid)) {
    fail("WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KEY and _KID must be configured together");
  }
  if (key) {
    if (Buffer.from(key, "base64url").length !== 32) {
      fail("WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KEY must be a 32-byte base64url value");
    }
    if (key === env.WEBSHOP_LICENSE_SERVER_SECRET_KEY?.trim()) {
      fail("WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KEY must differ from WEBSHOP_LICENSE_SERVER_SECRET_KEY");
    }
  }
  if (kid && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(kid)) {
    fail("WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KID is invalid");
  }
  const maxAge = env.WEBSHOP_POST_ISSUE_LICENSE_STATUS_MAX_AGE_SECONDS?.trim();
  if (maxAge && (!/^\d+$/.test(maxAge) || Number(maxAge) < 15 || Number(maxAge) > 300)) {
    fail("WEBSHOP_POST_ISSUE_LICENSE_STATUS_MAX_AGE_SECONDS must be 15..300");
  }
  const workerSecret = env.WEBSHOP_DELIVERY_WORKER_SECRET?.trim();
  if (workerSecret && workerSecret.length < 32) {
    fail("WEBSHOP_DELIVERY_WORKER_SECRET must contain at least 32 characters");
  }
  const entitlementWorkerSecret = env.WEBSHOP_ENTITLEMENT_REVALIDATION_WORKER_SECRET?.trim();
  if (entitlementWorkerSecret && entitlementWorkerSecret.length < 32) {
    fail("WEBSHOP_ENTITLEMENT_REVALIDATION_WORKER_SECRET must contain at least 32 characters");
  }
  const transferSecret = env.NR_ADDON_TRANSFER_APPROVAL_SECRET?.trim();
  const transferKid = env.NR_ADDON_TRANSFER_APPROVAL_KID?.trim();
  if (Boolean(transferSecret) !== Boolean(transferKid)) {
    fail("NR_ADDON_TRANSFER_APPROVAL_SECRET and NR_ADDON_TRANSFER_APPROVAL_KID must be configured together");
  }
  if (transferSecret && transferSecret.length < 32) {
    fail("NR_ADDON_TRANSFER_APPROVAL_SECRET must contain at least 32 characters");
  }
  if (transferKid && !/^[A-Za-z0-9._-]{1,100}$/.test(transferKid)) {
    fail("NR_ADDON_TRANSFER_APPROVAL_KID must match the lifecycle transfer KID contract");
  }
}

function assertLocalEnvContractParity(deploymentProfile) {
  const localPath = resolve(process.cwd(), ".env");
  const publicContractPath = resolve(process.cwd(), ".env.example");
  const vendorContractPath = resolve(process.cwd(), ".env.example.vendor");
  const contractPath =
    ["development", "vendor"].includes(deploymentProfile) &&
    existsSync(vendorContractPath)
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
        `contract: ${contractPath === vendorContractPath ? ".env.example.vendor" : ".env.example"}`,
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

function readBoolean(env, key, defaultValue) {
  const value = env[key]?.trim().toLowerCase();
  if (!value) return defaultValue;
  if (value === "true") return true;
  if (value === "false") return false;
  fail(`${key} must be explicitly true or false`);
}

function assertOptionalEnum(env, key, allowedValues) {
  const value = env[key]?.trim();
  if (!value) return;
  if (!allowedValues.includes(value)) {
    fail(`${key} must be ${allowedValues.join(" or ")}`);
  }
}

function readRequiredEnum(env, key, allowedValues) {
  const value = env[key]?.trim().toLowerCase();
  if (!value || !allowedValues.includes(value)) {
    fail(`${key} must be explicitly set to ${allowedValues.join(", ")}`);
  }
  return value;
}

function assertProfileSourceMode(profile, sourceMode) {
  const allowed = {
    development: new Set(["private_workspace", "empty"]),
    vendor: new Set(["registry", "empty"]),
    client: new Set(["registry", "empty"]),
  };
  if (!allowed[profile].has(sourceMode)) {
    fail(
      `NR_ADDON_SOURCE_MODE=${sourceMode} is not allowed for NR_CMS_DEPLOYMENT_PROFILE=${profile}`,
    );
  }
}

function assertSecret(env, key) {
  if ((env[key]?.trim().length ?? 0) < 32) {
    fail(`${key} must contain at least 32 characters`);
  }
}

function assertAddonInstallationEncryptionKey(env) {
  const value = env.NR_ADDON_INSTALLATION_ENCRYPTION_KEY?.trim() ?? "";
  if (Buffer.from(value, "base64url").length !== 32) {
    fail(
      "NR_ADDON_INSTALLATION_ENCRYPTION_KEY must be a 32-byte base64url value",
    );
  }
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

function assertLicenseServerUrl(key, value, insecureAllowed) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${key} must be an absolute URL`);
  }
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(
    url.hostname.replace(/^\[|\]$/g, "").toLowerCase(),
  );
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

function assertWebshopBuyUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("WEBSHOP_BUY_URL must be an absolute HTTPS URL");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/licenses/purchase-intents/accept" ||
    (url.port && url.port !== "443")
  ) {
    fail(
      "WEBSHOP_BUY_URL must be HTTPS with exact /licenses/purchase-intents/accept path and no credentials, query, fragment, or unexpected port",
    );
  }
}

function assertManagedRedeployTransport(
  env,
  deploymentProfile,
  licenseEnvironment,
) {
  if (deploymentProfile !== "vendor" && deploymentProfile !== "client") {
    fail("managed redeploy requires the vendor or client deployment profile");
  }
  const workerUrl = parseExactHttpsOrigin(
    "NR_ADDON_DEPLOYMENT_WORKER_URL",
    env.NR_ADDON_DEPLOYMENT_WORKER_URL,
  );
  for (const key of [
    "NR_ADDON_DEPLOYMENT_WORKER_AUTH_KID",
    "WEBSHOP_DEPLOYMENT_RESULT_AUTH_KID",
  ]) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,199}$/.test(env[key]?.trim() ?? "")) {
      fail(`${key} must match the managed deployment KID contract`);
    }
  }
  for (const key of [
    "NR_ADDON_DEPLOYMENT_WORKER_AUTH_SECRET",
    "WEBSHOP_DEPLOYMENT_RESULT_AUTH_SECRET",
  ]) {
    assertSecret(env, key);
  }
  assertLocalCaddyNodeTrust(env, workerUrl.toString());
  if (workerUrl.hostname.toLowerCase().endsWith(".nr.test")) {
    if (licenseEnvironment !== "development") {
      fail("local .nr.test deployment worker is allowed only in development");
    }
    if (readBoolean(env, "NRLS_ALLOW_SELF_HOSTED_OUTBOUND", false) !== true) {
      fail("local deployment worker requires NRLS_ALLOW_SELF_HOSTED_OUTBOUND=true");
    }
    const allowedHosts = new Set(
      (env.NRLS_ALLOWED_OUTBOUND_HOSTS ?? "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    );
    if (!allowedHosts.has(workerUrl.hostname.toLowerCase())) {
      fail("NRLS_ALLOWED_OUTBOUND_HOSTS must include the deployment worker host");
    }
  }
}

function parseExactHttpsOrigin(key, value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${key} must be an absolute HTTPS origin`);
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (url.port && url.port !== "443")
  ) {
    fail(`${key} must be an exact HTTPS origin`);
  }
  return url;
}

function assertLocalCaddyNodeTrust(env, rawUrl) {
  if (env.NODE_TLS_REJECT_UNAUTHORIZED?.trim() === "0") {
    fail("NODE_TLS_REJECT_UNAUTHORIZED=0 is never permitted");
  }
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return;
  }
  if (!url.hostname.toLowerCase().endsWith(".nr.test")) return;
  if (
    env.NODE_USE_SYSTEM_CA?.trim() !== "1" &&
    !env.NODE_EXTRA_CA_CERTS?.trim()
  ) {
    fail(
      "local Caddy HTTPS requires NODE_USE_SYSTEM_CA=1 or NODE_EXTRA_CA_CERTS in the Node process environment",
    );
  }
}

function fail(message) {
  throw new Error(`[runtime-env] ${message}`);
}

function main() {
  try {
    const runtime = validateRuntimeEnv();
    const localContractKeyCount = assertLocalEnvContractParity(
      runtime.deploymentProfile,
    );
    console.log(
      `CMS runtime environment contract is valid${
        localContractKeyCount === null
          ? ""
          : ` (${localContractKeyCount} local/production keys)`
      }.`,
    );
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "[runtime-env] runtime environment validation failed.",
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
