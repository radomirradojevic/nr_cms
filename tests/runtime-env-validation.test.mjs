import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";

import { validateRuntimeEnv } from "../scripts/validate-runtime-env.mjs";

const baseEnvironment = {
  CLERK_SECRET_KEY: "sk_test_fixture",
  CRON_SECRET: "c".repeat(32),
  DATABASE_URL:
    "postgresql://nr_cms_client_runtime:password@127.0.0.1:5432/nr_cms_client_test",
  EMAIL_FROM: "CMS <noreply@example.test>",
  EMAIL_PROVIDER: "resend",
  IP_HASH_SALT: "i".repeat(32),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_fixture",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "turnstile-site-key",
  TURNSTILE_SECRET_KEY: "turnstile-secret-key",
  NR_CMS_DEPLOYMENT_PROFILE: "client",
  NR_CMS_RELEASE_SHA: "a".repeat(40),
  NR_LICENSE_ENVIRONMENT: "development",
  NR_ADDON_SOURCE_MODE: "empty",
};

const addonEncryptionKey = Buffer.alloc(32, 7).toString("base64url");
const licenseServerEncryptionKey = Buffer.alloc(32, 9).toString("base64url");

function enabledWebshopEnvironment() {
  return {
    NR_ADDON_SOURCE_MODE: "registry",
    NEXT_PUBLIC_APP_URL: "https://cms.example.test",
    NR_ADDON_INSTALLATION_ENCRYPTION_KEY: addonEncryptionKey,
    WEBSHOP_BUY_URL: "https://vendor.nr.test/licenses/purchase-intents/accept",
    WEBSHOP_CART_TOKEN_SALT: "w".repeat(32),
    WEBSHOP_CHECKOUT_ENABLED: "false",
    WEBSHOP_DEPLOYMENT_MODE: "vercel",
    WEBSHOP_DOWNLOAD_EVENT_HASH_SECRET: "h".repeat(32),
    WEBSHOP_DOWNLOAD_TOKEN_SECRET: "t".repeat(32),
    WEBSHOP_ENABLED: "true",
    WEBSHOP_INSTALL_MODE: "disabled",
    WEBSHOP_LICENSE_SERVER_SECRET_KEY: "l".repeat(32),
    WEBSHOP_PAYMENTS_MODE: "test",
    WEBSHOP_STOREFRONT_ENABLED: "false",
  };
}

function enabledLicenseServerEnvironment() {
  return {
    NR_ADDON_SOURCE_MODE: "registry",
    LICENSE_SERVER_CUSTOMER_ENVIRONMENT: "production",
    LICENSE_SERVER_DEPLOYMENT_MODE: "vercel",
    LICENSE_SERVER_ENABLED: "true",
    LICENSE_SERVER_INSTALL_MODE: "disabled",
    LICENSE_SERVER_RUNTIME_HASH_SECRET: "r".repeat(32),
    LICENSE_SERVER_SECRET_KEY: licenseServerEncryptionKey,
    LICENSE_SERVER_TRUSTED_PROXY_HOPS: "1",
    NEXT_PUBLIC_APP_URL: "https://cms.example.test",
    NR_ADDON_INSTALLATION_ENCRYPTION_KEY: addonEncryptionKey,
  };
}

test("base CMS accepts omitted add-on environment and fails closed", () => {
  assert.deepEqual(validateRuntimeEnv(baseEnvironment), {
    addonSourceMode: "empty",
    allowInsecureLoopbackHttp: false,
    deploymentProfile: "client",
    licenseEnvironment: "development",
    licenseServerEnabled: false,
    webshopEnabled: false,
  });
  assert.doesNotThrow(() =>
    validateRuntimeEnv({
      ...baseEnvironment,
      LICENSE_SERVER_ENABLED: "false",
      WEBSHOP_ENABLED: "false",
    }),
  );
});

test("managed target runtime requires an exact CMS release commit outside build phase", () => {
  assert.throws(
    () => validateRuntimeEnv({ ...baseEnvironment, NR_CMS_RELEASE_SHA: "" }),
    /NR_CMS_RELEASE_SHA must identify the exact lowercase CMS commit/,
  );
  assert.throws(
    () =>
      validateRuntimeEnv({
        ...baseEnvironment,
        NR_CMS_RELEASE_SHA: "A".repeat(40),
      }),
    /NR_CMS_RELEASE_SHA must identify the exact lowercase CMS commit/,
  );
  assert.doesNotThrow(() =>
    validateRuntimeEnv({
      ...baseEnvironment,
      NR_CMS_ENV_PHASE: "build",
      NR_CMS_RELEASE_SHA: "",
    }),
  );
});

test("enabled add-ons require their own settings and the shared encryption key", () => {
  assert.throws(
    () =>
      validateRuntimeEnv({
        ...baseEnvironment,
        NR_ADDON_SOURCE_MODE: "registry",
        WEBSHOP_ENABLED: "true",
      }),
    /WEBSHOP_CART_TOKEN_SALT.*NEXT_PUBLIC_APP_URL.*NR_ADDON_INSTALLATION_ENCRYPTION_KEY/,
  );
  assert.throws(
    () =>
      validateRuntimeEnv({
        ...baseEnvironment,
        NR_ADDON_SOURCE_MODE: "registry",
        LICENSE_SERVER_ENABLED: "true",
      }),
    /LICENSE_SERVER_CUSTOMER_ENVIRONMENT.*LICENSE_SERVER_RUNTIME_HASH_SECRET.*LICENSE_SERVER_TRUSTED_PROXY_HOPS.*NR_ADDON_INSTALLATION_ENCRYPTION_KEY/,
  );
});

test("deployment profiles allow only explicit add-on source modes", () => {
  assert.doesNotThrow(() =>
    validateRuntimeEnv({
      ...baseEnvironment,
      NR_CMS_DEPLOYMENT_PROFILE: "development",
      NR_ADDON_SOURCE_MODE: "private_workspace",
    }),
  );
  assert.doesNotThrow(() =>
    validateRuntimeEnv({
      ...baseEnvironment,
      NR_CMS_DEPLOYMENT_PROFILE: "vendor",
      NR_ADDON_SOURCE_MODE: "empty",
      DATABASE_URL:
        "postgresql://nr_cms_vendor_runtime:password@127.0.0.1:5432/nr_cms_vendor_test",
    }),
  );
  assert.throws(
    () =>
      validateRuntimeEnv({
        ...baseEnvironment,
        NR_CMS_DEPLOYMENT_PROFILE: "vendor",
        NR_ADDON_SOURCE_MODE: "private_workspace",
      }),
    /not allowed/,
  );
  assert.throws(
    () =>
      validateRuntimeEnv({
        ...baseEnvironment,
        DATABASE_URL:
          "postgresql://nr_cms_vendor_runtime:password@127.0.0.1:5432/nr_cms_vendor_test",
      }),
    /static client/,
  );
  assert.throws(
    () =>
      validateRuntimeEnv({
        ...baseEnvironment,
        NR_LICENSE_ENVIRONMENT: "test",
      }),
    /NR_LICENSE_ENVIRONMENT/,
  );
});

test("local Caddy transport requires normal Node CA trust and forbids TLS bypass", () => {
  const local = {
    ...baseEnvironment,
    NR_CMS_DEPLOYMENT_PROFILE: "development",
    NR_ADDON_SOURCE_MODE: "private_workspace",
    NR_MASTER_LICENSE_URL: "https://license.nr.test",
  };
  assert.throws(() => validateRuntimeEnv(local), /NODE_USE_SYSTEM_CA/);
  assert.doesNotThrow(() =>
    validateRuntimeEnv({ ...local, NODE_USE_SYSTEM_CA: "1" }),
  );
  assert.throws(
    () =>
      validateRuntimeEnv({
        ...local,
        NODE_USE_SYSTEM_CA: "1",
        NODE_TLS_REJECT_UNAUTHORIZED: "0",
      }),
    /never permitted/,
  );
});

test("managed redeploy binds the worker URL to complete HMAC and local outbound policy", () => {
  const managed = {
    ...baseEnvironment,
    ...enabledWebshopEnvironment(),
    WEBSHOP_DEPLOYMENT_MODE: "self_hosted",
    WEBSHOP_INSTALL_MODE: "managed_redeploy",
  };
  assert.throws(
    () => validateRuntimeEnv(managed),
    /NR_ADDON_DEPLOYMENT_WORKER_AUTH_KID.*NR_ADDON_DEPLOYMENT_WORKER_AUTH_SECRET.*NR_ADDON_DEPLOYMENT_WORKER_URL.*WEBSHOP_DEPLOYMENT_RESULT_AUTH_KID.*WEBSHOP_DEPLOYMENT_RESULT_AUTH_SECRET/,
  );
  const transport = {
    ...managed,
    NODE_USE_SYSTEM_CA: "1",
    NR_ADDON_DEPLOYMENT_WORKER_AUTH_KID: "cms-client-deploy-v1",
    NR_ADDON_DEPLOYMENT_WORKER_AUTH_SECRET: "d".repeat(32),
    NR_ADDON_DEPLOYMENT_WORKER_URL: "https://deploy.nr.test",
    WEBSHOP_DEPLOYMENT_RESULT_AUTH_KID: "worker-client-result-v1",
    WEBSHOP_DEPLOYMENT_RESULT_AUTH_SECRET: "r".repeat(32),
  };
  assert.throws(
    () => validateRuntimeEnv(transport),
    /NRLS_ALLOW_SELF_HOSTED_OUTBOUND=true/,
  );
  assert.throws(
    () =>
      validateRuntimeEnv({
        ...transport,
        NRLS_ALLOW_SELF_HOSTED_OUTBOUND: "true",
        NRLS_ALLOWED_OUTBOUND_HOSTS: "license.nr.test",
      }),
    /must include the deployment worker host/,
  );
  assert.doesNotThrow(() =>
    validateRuntimeEnv({
      ...transport,
      NRLS_ALLOW_SELF_HOSTED_OUTBOUND: "true",
      NRLS_ALLOWED_OUTBOUND_HOSTS: "license.nr.test,deploy.nr.test",
    }),
  );
});

test("fully configured add-ons validate while malformed feature configuration fails", () => {
  assert.doesNotThrow(() =>
    validateRuntimeEnv({
      ...baseEnvironment,
      ...enabledWebshopEnvironment(),
      ...enabledLicenseServerEnvironment(),
    }),
  );
  assert.throws(
    () =>
      validateRuntimeEnv({
        ...baseEnvironment,
        WEBSHOP_ENABLED: "enabled",
      }),
    /WEBSHOP_ENABLED must be explicitly true or false/,
  );
  assert.throws(
    () =>
      validateRuntimeEnv({
        ...baseEnvironment,
        ...enabledWebshopEnvironment(),
        NR_ADDON_INSTALLATION_ENCRYPTION_KEY: "x".repeat(32),
      }),
    /NR_ADDON_INSTALLATION_ENCRYPTION_KEY must be a 32-byte base64url value/,
  );
  const keyringEnvironment = {
    ...baseEnvironment,
    ...enabledLicenseServerEnvironment(),
    LICENSE_SERVER_ACTIVE_ENCRYPTION_KEY_ID: "wrap-2026-08",
    LICENSE_SERVER_ENCRYPTION_KEYS_JSON: JSON.stringify({
      "wrap-2026-01": licenseServerEncryptionKey,
      "wrap-2026-08": Buffer.alloc(32, 10).toString("base64url"),
    }),
    LICENSE_SERVER_SECRET_KEY: undefined,
  };
  assert.doesNotThrow(() => validateRuntimeEnv(keyringEnvironment));
  assert.throws(
    () =>
      validateRuntimeEnv({
        ...keyringEnvironment,
        LICENSE_SERVER_ACTIVE_ENCRYPTION_KEY_ID: "missing",
      }),
    /must reference the keyring/,
  );
  assert.throws(
    () =>
      validateRuntimeEnv({
        ...keyringEnvironment,
        LICENSE_SERVER_ENCRYPTION_KEYS_JSON: JSON.stringify({
          "wrap-2026-08": `${licenseServerEncryptionKey}***`,
        }),
      }),
    /contains an invalid key/,
  );
});
