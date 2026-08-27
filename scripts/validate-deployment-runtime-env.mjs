import "dotenv/config";

const env = process.env;
const profile = required("NR_CMS_DEPLOYMENT_PROFILE");
if (profile !== "vendor" && profile !== "client") fail("deployment_profile_invalid");
if (required("NR_ADDON_SOURCE_MODE") !== "registry") fail("addon_source_mode_invalid");
if (required("NR_CMS_PREINSTALL_POLICY") !== "strict") fail("preinstall_policy_invalid");
if (required("NR_LICENSE_ENVIRONMENT") !== "production") fail("license_environment_invalid");
if (required("NR_CMS_ENV_PHASE") !== "build") fail("cms_env_phase_invalid");

const app = exactHttpsOrigin("NEXT_PUBLIC_APP_URL");
if (app.hostname !== required("NR_CMS_EXPECTED_HOSTNAME").toLowerCase()) {
  fail("cms_expected_hostname_mismatch");
}
for (const name of [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY",
  "IP_HASH_SALT",
  "CRON_SECRET",
  "NR_GITHUB_PACKAGES_READ_TOKEN",
  "NR_ADDON_RELEASE_PUBLIC_KEYS_SHA256",
  "NR_ADDON_MIGRATION_BACKUP_REFERENCE",
]) {
  required(name);
}
hexSha("NR_ADDON_RELEASE_PUBLIC_KEYS_SHA256");
exactSemver("NR_CMS_PREINSTALL_WEBSHOP_VERSION");
if (profile === "client") exactSemver("NR_CMS_PREINSTALL_LICENSE_SERVER_VERSION");
const gitSha =
  env.NR_CMS_RELEASE_SHA?.trim() ||
  env.VERCEL_GIT_COMMIT_SHA?.trim() ||
  env.GITHUB_SHA?.trim();
if (!/^[a-f0-9]{40}$/.test(gitSha ?? "")) fail("cms_release_sha_invalid");
if (env.NR_ADDON_MIGRATION_BACKUP_CONFIRMED !== "true") {
  fail("addon_migration_backup_not_confirmed");
}

const runtimeDb = postgresUrl("DATABASE_URL");
const coreDb = postgresUrl("NR_CORE_MIGRATOR_DATABASE_URL");
const addonDb = postgresUrl("NR_ADDON_MIGRATOR_DATABASE_URL");
for (const value of [coreDb, addonDb]) {
  if (value.hostname !== runtimeDb.hostname || value.pathname !== runtimeDb.pathname) {
    fail("database_role_targets_do_not_match");
  }
}
if (
  new Set([runtimeDb.username, coreDb.username, addonDb.username]).size !== 3
) {
  fail("database_roles_must_be_distinct");
}
if (
  env.NR_MIGRATION_TARGET !== "production" ||
  env.NR_MIGRATION_SERVICE !== "cms" ||
  required("NR_MIGRATION_EXPECTED_HOST").toLowerCase() !== runtimeDb.hostname ||
  required("NR_MIGRATION_EXPECTED_DATABASE") !==
    decodeURIComponent(runtimeDb.pathname).replace(/^\/+/, "") ||
  required("NR_MIGRATION_EXPECTED_PROVIDER_RESOURCE_ID") !==
    required("NR_MIGRATION_PROVIDER_RESOURCE_ID")
) {
  fail("production_migration_target_invalid");
}
key32("NR_ADDON_INSTALLATION_ENCRYPTION_KEY", "base64url");
required("NR_ADDON_INSTALLATION_ENCRYPTION_KID");
if (env.STORAGE_PROVIDER === "vercel-blob") required("BLOB_READ_WRITE_TOKEN");

if (
  env.WEBSHOP_ENABLED !== "true" ||
  env.WEBSHOP_INSTALL_MODE !== "preinstalled" ||
  !["vercel", "self_hosted"].includes(required("WEBSHOP_DEPLOYMENT_MODE"))
) {
  fail("webshop_preinstalled_runtime_invalid");
}
if (
  env.WEBSHOP_DEPLOYMENT_MODE === "vercel" ||
  env.LICENSE_SERVER_DEPLOYMENT_MODE === "vercel"
) {
  const projectId =
    env.NR_VERCEL_PROJECT_ID?.trim() || env.VERCEL_PROJECT_ID?.trim();
  if (!/^[A-Za-z0-9_-]{3,160}$/.test(projectId ?? "")) {
    fail("vercel_project_identity_invalid");
  }
}
for (const name of [
  "WEBSHOP_CART_TOKEN_SALT",
  "WEBSHOP_DOWNLOAD_TOKEN_SECRET",
  "WEBSHOP_DOWNLOAD_EVENT_HASH_SECRET",
  "WEBSHOP_PURCHASE_INTENT_SESSION_SECRET",
  "WEBSHOP_DELIVERY_WORKER_SECRET",
  "WEBSHOP_ENTITLEMENT_REVALIDATION_WORKER_SECRET",
  "NR_ADDON_TRANSFER_APPROVAL_SECRET",
  "NR_ADDON_TRANSFER_APPROVAL_KID",
]) {
  minSecret(name);
}
const webshopKeys = [
  "WEBSHOP_LICENSE_SERVER_SECRET_KEY",
  "WEBSHOP_LICENSE_KEY_ENCRYPTION_KEY",
  "WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KEY",
  "WEBSHOP_PAYMENT_INBOX_ENCRYPTION_KEY",
].map((name) => key32(name));
if (new Set(webshopKeys.map((key) => key.toString("hex"))).size !== webshopKeys.length) {
  fail("webshop_encryption_keys_must_be_distinct");
}
for (const name of [
  "WEBSHOP_LICENSE_KEY_ENCRYPTION_KID",
  "WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KID",
  "WEBSHOP_PAYMENT_INBOX_ENCRYPTION_KID",
]) {
  required(name);
}
jsonObject("WEBSHOP_ISSUED_LICENSE_KEY_DECRYPTION_KEYS_JSON");
if (
  exactHttpsEndpoint(
    "WEBSHOP_BUY_URL",
    "/licenses/purchase-intents/accept",
  ).hostname !== "vendor.nrcms.com"
) {
  fail("vendor_buy_url_invalid");
}
if (required("WEBSHOP_BUY_OFFER_KEY") !== "nr-cms-webshop-license") {
  fail("webshop_offer_key_invalid");
}
if (required("LICENSE_SERVER_BUY_OFFER_KEY") !== "nr-cms-license-server-license") {
  fail("license_server_offer_key_invalid");
}

if (profile === "vendor") {
  if (
    env.WEBSHOP_CHECKOUT_ENABLED !== "true" ||
    env.WEBSHOP_STOREFRONT_ENABLED !== "true" ||
    env.WEBSHOP_PAYMENTS_MODE !== "test" ||
    required("WEBSHOP_PAYPAL_API_BASE_URL") !==
      "https://api-m.sandbox.paypal.com"
  ) {
    fail("vendor_paypal_sandbox_mode_invalid");
  }
  for (const name of [
    "WEBSHOP_PAYPAL_CLIENT_ID",
    "WEBSHOP_PAYPAL_CLIENT_SECRET",
    "WEBSHOP_PAYPAL_WEBHOOK_ID",
    "RESEND_API_KEY",
    "EMAIL_FROM",
    "WEBSHOP_DELIVERY_EMAIL_FROM",
  ]) {
    required(name);
  }
  if (env.WEBSHOP_DELIVERY_EMAIL_PROVIDER !== "resend") {
    fail("vendor_delivery_email_provider_invalid");
  }
  if (
    env.LICENSE_SERVER_ENABLED !== "false" ||
    env.LICENSE_SERVER_INSTALL_MODE !== "disabled"
  ) {
    fail("vendor_embedded_license_server_must_be_disabled");
  }
} else {
  if (
    env.LICENSE_SERVER_ENABLED !== "true" ||
    env.LICENSE_SERVER_INSTALL_MODE !== "preinstalled" ||
    !["vercel", "self_hosted"].includes(
      required("LICENSE_SERVER_DEPLOYMENT_MODE"),
    ) ||
    env.LICENSE_SERVER_CUSTOMER_ENVIRONMENT !== "production"
  ) {
    fail("client_license_server_preinstalled_runtime_invalid");
  }
  const activeKid = required("LICENSE_SERVER_ACTIVE_ENCRYPTION_KEY_ID");
  const keyring = jsonObject("LICENSE_SERVER_ENCRYPTION_KEYS_JSON");
  if (typeof keyring[activeKid] !== "string") fail("license_server_active_key_missing");
  decode32(keyring[activeKid], "LICENSE_SERVER_ENCRYPTION_KEYS_JSON active key");
  minSecret("LICENSE_SERVER_RUNTIME_HASH_SECRET");
  minSecret("LICENSE_SERVER_BUY_LINK_SECRET");
}

console.log(`[deployment-env] ${profile} production environment is valid`);

function required(name) {
  const value = env[name]?.trim();
  if (!value) fail(`${name}_missing`);
  return value;
}
function minSecret(name) {
  const value = required(name);
  if (Buffer.byteLength(value, "utf8") < 32) fail(`${name}_too_short`);
  return value;
}
function exactSemver(name) {
  const value = required(name);
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) {
    fail(`${name}_invalid`);
  }
}
function hexSha(name) {
  if (!/^[a-f0-9]{64}$/.test(required(name))) fail(`${name}_invalid`);
}
function exactHttpsOrigin(name) {
  const url = new URL(required(name));
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    fail(`${name}_invalid`);
  }
  return url;
}
function exactHttpsEndpoint(name, pathname) {
  const url = new URL(required(name));
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    url.pathname !== pathname ||
    url.search ||
    url.hash
  ) {
    fail(`${name}_invalid`);
  }
  return url;
}
function postgresUrl(name) {
  const url = new URL(required(name));
  if (!/^postgres(?:ql)?:$/.test(url.protocol) || !url.username || !url.pathname) {
    fail(`${name}_invalid`);
  }
  return url;
}
function key32(name, encoding) {
  return decode32(required(name), name, encoding);
}
function decode32(value, name, preferred) {
  const candidates = preferred
    ? [preferred]
    : ["base64url", "base64", /^[a-f0-9]{64}$/i.test(value) ? "hex" : null].filter(Boolean);
  for (const encoding of candidates) {
    try {
      const key = Buffer.from(value, encoding);
      if (key.length === 32) return key;
    } catch {}
  }
  fail(`${name}_must_be_32_bytes`);
}
function jsonObject(name) {
  let value;
  try {
    value = JSON.parse(required(name));
  } catch {
    fail(`${name}_invalid_json`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${name}_must_be_object`);
  }
  return value;
}
function fail(code) {
  throw new Error(`[deployment-env] ${code}`);
}
