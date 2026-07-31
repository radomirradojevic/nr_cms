import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";

import { validateRuntimeEnv } from "../scripts/validate-runtime-env.mjs";

const baseEnvironment = {
  CLERK_SECRET_KEY: "sk_test_fixture",
  CRON_SECRET: "c".repeat(32),
  DATABASE_URL: "postgresql://user:password@db.example.test/cms",
  EMAIL_FROM: "CMS <noreply@example.test>",
  EMAIL_PROVIDER: "resend",
  IP_HASH_SALT: "i".repeat(32),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_fixture",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "turnstile-site-key",
  TURNSTILE_SECRET_KEY: "turnstile-secret-key",
};

const addonEncryptionKey = Buffer.alloc(32, 7).toString("base64url");

function enabledWebshopEnvironment() {
  return {
    NEXT_PUBLIC_APP_URL: "https://cms.example.test",
    NR_ADDON_INSTALLATION_ENCRYPTION_KEY: addonEncryptionKey,
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
    LICENSE_SERVER_CUSTOMER_ENVIRONMENT: "production",
    LICENSE_SERVER_DEPLOYMENT_MODE: "vercel",
    LICENSE_SERVER_ENABLED: "true",
    LICENSE_SERVER_INSTALL_MODE: "disabled",
    LICENSE_SERVER_SECRET_KEY: "s".repeat(32),
    NEXT_PUBLIC_APP_URL: "https://cms.example.test",
    NR_ADDON_INSTALLATION_ENCRYPTION_KEY: addonEncryptionKey,
  };
}

test("base CMS accepts omitted add-on environment and fails closed", () => {
  assert.deepEqual(validateRuntimeEnv(baseEnvironment), {
    allowInsecureLoopbackHttp: false,
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

test("enabled add-ons require their own settings and the shared encryption key", () => {
  assert.throws(
    () =>
      validateRuntimeEnv({
        ...baseEnvironment,
        WEBSHOP_ENABLED: "true",
      }),
    /WEBSHOP_CART_TOKEN_SALT.*NEXT_PUBLIC_APP_URL.*NR_ADDON_INSTALLATION_ENCRYPTION_KEY/,
  );
  assert.throws(
    () =>
      validateRuntimeEnv({
        ...baseEnvironment,
        LICENSE_SERVER_ENABLED: "true",
      }),
    /LICENSE_SERVER_CUSTOMER_ENVIRONMENT.*LICENSE_SERVER_SECRET_KEY.*NR_ADDON_INSTALLATION_ENCRYPTION_KEY/,
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
});
