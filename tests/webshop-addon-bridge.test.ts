import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAddonI18nContext,
  type AddonI18nContext,
} from "@/lib/i18n/addon-contract";
import {
  isWebshopAddon,
  type WebshopAddon,
} from "@/lib/webshop-addon/contract";
import {
  canAttemptWebshopInstall,
  getWebshopRuntimeConfig,
  parseWebshopBoolean,
} from "@/lib/webshop-addon/config";
import {
  checkInMemoryRateLimit,
  resetInMemoryRateLimits,
} from "@/lib/in-memory-rate-limit";
import {
  resolveInstalledWebshopLicenseModeFromEntitlement,
  resolveWebshopAddonStateFromInputs,
} from "@/lib/webshop-addon/license";
import { loadWebshopAddon } from "@/lib/webshop-addon/loader";
import {
  getSelfHostedDeploymentPlatform,
  getUnsupportedPlatformFromHint,
  getWebshopDeploymentHint,
  verifyWebshopDeploymentPlatform,
} from "@/lib/webshop-addon/platform";

const fakeAddon: WebshopAddon = {
  version: "0.0.1",
  async renderDashboard() {
    return null;
  },
  async renderDashboardPath() {
    return null;
  },
  async renderStorefrontRoot() {
    return null;
  },
  async renderStorefrontPath() {
    return null;
  },
};

function createTestAddonI18nContext() {
  return buildAddonI18nContext({
    languages: {
      frontendLanguage: "sr-Latn",
      backendLanguage: "de",
    },
    regional: {
      timezone: "Europe/Belgrade",
    },
  });
}

test("empty build-time registry returns not_installed", async () => {
  const result = await loadWebshopAddon();
  assert.equal(result.status, "not_installed");
});

test("arbitrary runtime module paths are rejected", async () => {
  const result = await loadWebshopAddon("C:/untrusted/addon.js");
  assert.equal(result.status, "invalid");
  assert.match(result.reason, /allowlisted/);
});

test("webshop rollout config parses explicit feature flags", () => {
  const config = getWebshopRuntimeConfig({
    WEBSHOP_CHECKOUT_ENABLED: "off",
    WEBSHOP_ENABLED: "true",
    WEBSHOP_INSTALL_MODE: "disabled",
    WEBSHOP_PAYMENTS_MODE: "live",
    WEBSHOP_SELF_HOSTED_SITE_ID: " nr-cms.example.com ",
    WEBSHOP_STOREFRONT_ENABLED: "0",
  });

  assert.equal(parseWebshopBoolean("yes", false), true);
  assert.equal(config.checkoutEnabled, false);
  assert.equal(config.enabled, true);
  assert.equal(config.installMode, "disabled");
  assert.equal(config.paymentsMode, "live");
  assert.equal(config.selfHostedSiteId, "nr-cms.example.com");
  assert.equal(config.storefrontEnabled, false);
});

test("Webshop production defaults are disabled until explicitly enabled", () => {
  const config = getWebshopRuntimeConfig({ NODE_ENV: "production" });
  assert.equal(config.enabled, false);
  assert.equal(config.checkoutEnabled, false);
  assert.equal(config.storefrontEnabled, false);
  assert.equal(config.installMode, "disabled");
  assert.equal(config.paymentsMode, "test");
});

test("webshop install gate blocks disabled rollout states", () => {
  assert.deepEqual(
    canAttemptWebshopInstall({
      enabled: false,
      installMode: "managed_redeploy",
    }),
    {
      ok: false,
      message:
        "Webshop is disabled by WEBSHOP_ENABLED. Enable it before activation.",
    },
  );

  assert.equal(
    canAttemptWebshopInstall({ enabled: true, installMode: "managed_redeploy" })
      .ok,
    true,
  );
});

test("in-memory rate limiter blocks fixed-window overflow", () => {
  resetInMemoryRateLimits();

  assert.equal(
    checkInMemoryRateLimit({
      key: "visitor",
      limit: 2,
      namespace: "webshop:test",
      now: 1_000,
      reason: "slow down",
      windowMs: 60_000,
    }).allowed,
    true,
  );
  assert.equal(
    checkInMemoryRateLimit({
      key: "visitor",
      limit: 2,
      namespace: "webshop:test",
      now: 2_000,
      reason: "slow down",
      windowMs: 60_000,
    }).allowed,
    true,
  );
  const blocked = checkInMemoryRateLimit({
    key: "visitor",
    limit: 2,
    namespace: "webshop:test",
    now: 3_000,
    reason: "slow down",
    windowMs: 60_000,
  });

  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "slow down");

  assert.equal(
    checkInMemoryRateLimit({
      key: "visitor",
      limit: 2,
      namespace: "webshop:test",
      now: 62_000,
      reason: "slow down",
      windowMs: 60_000,
    }).allowed,
    true,
  );
});

test("webshop add-on contract guard rejects incomplete modules", () => {
  assert.equal(isWebshopAddon({ version: "0.0.1" }), false);
});

test("webshop add-on contract carries i18n to dashboard hooks", async () => {
  const i18n = createTestAddonI18nContext();
  const received: Array<AddonI18nContext | undefined> = [];
  const addon: WebshopAddon = {
    ...fakeAddon,
    async renderDashboard(input) {
      received.push(input.i18n);
      return null;
    },
    async renderDashboardPath(input) {
      received.push(input.i18n);
      return null;
    },
  };

  await addon.renderDashboard({
    i18n,
    licenseMode: "ready",
    path: [],
    userId: "user_1",
  });
  await addon.renderDashboardPath({
    i18n,
    licenseMode: "edit_existing_only",
    path: ["products"],
    searchParams: { q: "boots" },
    userId: "user_1",
  });

  assert.equal(received[0], i18n);
  assert.equal(received[1], i18n);
  assert.equal(received[0]?.backendLanguage, "de");
});

test("webshop add-on contract carries i18n to storefront, API, and bridge hooks", async () => {
  const i18n = createTestAddonI18nContext();
  const received: Array<[string, AddonI18nContext | undefined]> = [];
  const addon: WebshopAddon = {
    ...fakeAddon,
    async renderStorefrontRoot(input) {
      received.push(["storefrontRoot", input.i18n]);
      return null;
    },
    async renderStorefrontPath(input) {
      received.push(["storefrontPath", input.i18n]);
      return null;
    },
    async generateStorefrontMetadata(input) {
      received.push(["storefrontMetadata", input.i18n]);
      return { title: "Shop" };
    },
    async handleApiRoute(input) {
      received.push(["api", input.i18n]);
      return Response.json({ ok: true });
    },
    async renderContentCategoriesBridge(input) {
      received.push(["categoryBridge", input.i18n]);
      return null;
    },
  };

  await addon.renderStorefrontRoot({
    contentId: "content_1",
    i18n,
    licenseMode: "ready",
    path: [],
    searchParams: { view: "grid" },
    slug: "shop",
  });
  await addon.renderStorefrontPath({
    contentId: "content_1",
    i18n,
    licenseMode: "ready",
    path: ["products", "boots"],
    searchParams: { color: "black" },
    slug: "shop",
  });
  await addon.generateStorefrontMetadata?.({
    contentId: "content_1",
    i18n,
    licenseMode: "ready",
    path: [],
    searchParams: { view: "grid" },
    slug: "shop",
  });
  const response = await addon.handleApiRoute?.({
    i18n,
    licenseMode: "ready",
    method: "GET",
    path: ["cart"],
    request: new Request("https://cms.example.test/api/webshop/cart"),
    userId: null,
  });
  await addon.renderContentCategoriesBridge?.({
    i18n,
    licenseMode: "edit_existing_only",
    userId: "user_1",
  });

  assert.equal(response?.status, 200);
  assert.deepEqual(
    received.map(([hook]) => hook),
    [
      "storefrontRoot",
      "storefrontPath",
      "storefrontMetadata",
      "api",
      "categoryBridge",
    ],
  );
  for (const [, context] of received) {
    assert.equal(context, i18n);
  }
  assert.equal(i18n.frontendLanguage, "sr-Latn");
  assert.equal(i18n.backendLanguage, "de");
});

test("platform hint treats vercel env without OIDC as self-hosted capable", () => {
  const hint = getWebshopDeploymentHint({
    VERCEL: "1",
    VERCEL_ENV: "production",
  });
  const result = getUnsupportedPlatformFromHint(hint);

  assert.equal(hint.providerHint, "vercel");
  assert.equal(hint.attestationToken, null);
  assert.equal(result, null);
});

test("self-hosted platform identity uses stable install id fallbacks", () => {
  assert.deepEqual(
    getSelfHostedDeploymentPlatform({
      env: {
        APP_URL: "https://ignored.example.com",
        WEBSHOP_SELF_HOSTED_SITE_ID: " nr-cms.example.com ",
      },
    }),
    {
      deploymentEnvironment: "self_hosted",
      mode: "standalone",
      ownerId: "self_hosted",
      projectId: "nr-cms.example.com",
      provider: "self_hosted",
      status: "supported",
    },
  );

  assert.equal(
    getSelfHostedDeploymentPlatform({
      env: { APP_URL: "https://cms.example.com" },
      siteId: "site-from-settings",
    }).projectId,
    "site-from-settings",
  );
});

test("platform verification requires an explicit self-hosted deployment mode", async () => {
  const result = await verifyWebshopDeploymentPlatform({ env: {} });

  assert.deepEqual(result, {
    status: "unsupported",
    reason: "self_hosted",
    message: "Self-hosted activation requires explicit WEBSHOP_DEPLOYMENT_MODE=self_hosted.",
  });
});

test("platform verification treats non-vercel managed providers as self-hosted installs", async () => {
  const result = await verifyWebshopDeploymentPlatform({
    env: { NETLIFY: "true", WEBSHOP_DEPLOYMENT_MODE: "self_hosted", WEBSHOP_SELF_HOSTED_SITE_ID: "netlify-site" },
  });

  assert.deepEqual(result, {
    deploymentEnvironment: "self_hosted",
    mode: "standalone",
    ownerId: "self_hosted",
    projectId: "netlify-site",
    provider: "self_hosted",
    status: "supported",
  });
});

test("platform verification rejects failed Vercel attestation without self-hosted fallback", async () => {
  const result = await verifyWebshopDeploymentPlatform({
    env: {
      VERCEL: "1",
      VERCEL_ENV: "production",
      VERCEL_OIDC_TOKEN: "bad-token",
      WEBSHOP_LICENSE_API_URL: "https://licenses.example.test",
      WEBSHOP_SELF_HOSTED_SITE_ID: "vercel-fallback",
    },
    fetcher: async () => new Response(null, { status: 401 }),
  });

  assert.deepEqual(result, { status: "unsupported", reason: "invalid_attestation", message: "Vercel deployment attestation could not be verified; self-hosted fallback is forbidden." });
});

test("platform verification accepts license-server verified vercel production OIDC", async () => {
  const result = await verifyWebshopDeploymentPlatform({
    env: {
      VERCEL: "1",
      VERCEL_ENV: "production",
      VERCEL_OIDC_TOKEN: "signed-token",
      WEBSHOP_LICENSE_API_URL: "https://licenses.example.test",
    },
    fetcher: async () =>
      new Response(
        JSON.stringify({
          deploymentEnvironment: "production",
          mode: "production_oidc",
          ownerId: "team_123",
          projectId: "prj_123",
          provider: "vercel",
          status: "supported",
        }),
        { status: 200 },
      ),
  });

  assert.deepEqual(result, {
    deploymentEnvironment: "production",
    mode: "production_oidc",
    ownerId: "team_123",
    projectId: "prj_123",
    provider: "vercel",
    status: "supported",
  });
});

test("license state maps missing module and supported self-hosted platform", () => {
  const state = resolveWebshopAddonStateFromInputs({
    entitlement: null,
    loadResult: { status: "not_installed" },
    platform: {
      deploymentEnvironment: "self_hosted",
      mode: "standalone",
      ownerId: "self_hosted",
      projectId: "self-hosted-site",
      provider: "self_hosted",
      status: "supported",
    },
  });

  assert.equal(state.status, "not_installed");
});

test("license state fails closed when webshop is globally disabled", () => {
  const state = resolveWebshopAddonStateFromInputs({
    entitlement: {
      status: "ready",
      expiresAt: new Date("2026-06-08T00:00:00.000Z"),
    },
    loadResult: { status: "loaded", addon: fakeAddon },
    runtimeConfig: getWebshopRuntimeConfig({ WEBSHOP_ENABLED: "false" }),
  });

  assert.equal(state.status, "disabled");
});

test("license state hides activation when install mode is disabled", () => {
  const state = resolveWebshopAddonStateFromInputs({
    entitlement: null,
    loadResult: { status: "not_installed" },
    runtimeConfig: getWebshopRuntimeConfig({
      WEBSHOP_ENABLED: "true",
      WEBSHOP_INSTALL_MODE: "disabled",
    }),
  });

  assert.equal(state.status, "install_disabled");
});

test("license state maps install pending without requiring installed module", () => {
  const state = resolveWebshopAddonStateFromInputs({
    entitlement: { status: "install_pending" },
    loadResult: { status: "not_installed" },
  });

  assert.equal(state.status, "install_pending");
});

test("license state maps loaded add-on entitlement cases", () => {
  const now = new Date("2026-06-07T00:00:00.000Z");

  assert.equal(
    resolveWebshopAddonStateFromInputs({
      entitlement: null,
      loadResult: { status: "loaded", addon: fakeAddon },
      now,
    }).status,
    "license_required",
  );

  assert.equal(
    resolveWebshopAddonStateFromInputs({
      entitlement: { status: "invalid" },
      loadResult: { status: "loaded", addon: fakeAddon },
      now,
    }).status,
    "license_invalid",
  );

  assert.equal(
    resolveWebshopAddonStateFromInputs({
      entitlement: {
        status: "ready",
        expiresAt: new Date("2026-06-06T23:59:59.000Z"),
      },
      loadResult: { status: "loaded", addon: fakeAddon },
      now,
    }).status,
    "license_expired",
  );

  assert.equal(
    resolveWebshopAddonStateFromInputs({
      entitlement: {
        status: "ready",
        expiresAt: new Date("2026-06-08T00:00:00.000Z"),
      },
      loadResult: { status: "loaded", addon: fakeAddon },
      now,
    }).status,
    "ready",
  );
});

test("production Webshop state always rejects an unsigned entitlement", () => {
  const env = process.env as Record<string, string | undefined>;
  const previousNodeEnv = env.NODE_ENV;
  const previousFlag = env.VENDOR_SIGNED_ENTITLEMENTS_V1;
  env.NODE_ENV = "production";
  env.VENDOR_SIGNED_ENTITLEMENTS_V1 = "false";
  try {
    const state = resolveWebshopAddonStateFromInputs({
      entitlement: {
        status: "ready",
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      },
      loadResult: { status: "loaded", addon: fakeAddon },
      runtimeConfig: getWebshopRuntimeConfig({
        NODE_ENV: "production",
        WEBSHOP_ENABLED: "true",
        WEBSHOP_CHECKOUT_ENABLED: "true",
        WEBSHOP_STOREFRONT_ENABLED: "true",
        WEBSHOP_INSTALL_MODE: "managed_redeploy",
      }),
    });
    assert.equal(state.status, "license_invalid");
  } finally {
    if (previousNodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = previousNodeEnv;
    if (previousFlag === undefined)
      delete env.VENDOR_SIGNED_ENTITLEMENTS_V1;
    else env.VENDOR_SIGNED_ENTITLEMENTS_V1 = previousFlag;
  }
});

test("installed webshop license mode gates create versus edit modes", () => {
  const now = new Date("2026-06-07T00:00:00.000Z");

  assert.deepEqual(
    resolveInstalledWebshopLicenseModeFromEntitlement(
      {
        status: "ready",
        expiresAt: new Date("2026-06-08T00:00:00.000Z"),
      },
      now,
    ),
    { status: "ready", mode: "ready" },
  );

  assert.deepEqual(
    resolveInstalledWebshopLicenseModeFromEntitlement(
      {
        status: "ready",
        expiresAt: new Date("2026-06-06T23:59:59.000Z"),
      },
      now,
    ),
    { status: "license_expired", mode: "edit_existing_only" },
  );

  assert.equal(
    resolveInstalledWebshopLicenseModeFromEntitlement(
      { status: "invalid" },
      now,
    ).status,
    "forbidden",
  );

  assert.equal(
    resolveInstalledWebshopLicenseModeFromEntitlement(
      {
        status: "ready",
        expiresAt: new Date("2026-06-08T00:00:00.000Z"),
      },
      now,
      getWebshopRuntimeConfig({ WEBSHOP_ENABLED: "false" }),
    ).status,
    "forbidden",
  );
});
