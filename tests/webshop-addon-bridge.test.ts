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
  shouldForceWebshopInstallReconciliation,
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
  hostRouteBindings: [
    "webshop.api.v1",
    "webshop.dashboard.v1",
    "webshop.download.v1",
    "webshop.file-authorization.v1",
    "webshop.form-submission-visibility.v1",
    "webshop.fulfillment-job.v1",
    "webshop.license-delivery.v1",
    "webshop.paddle-webhook.v1",
    "webshop.post-issue-delivery-job.v1",
    "webshop.purchase-intent-accept.v1",
    "webshop.storefront.v1",
  ],
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
  async provisionStorefrontContent() {},
};

const enabledWebshopRuntimeConfig = getWebshopRuntimeConfig({
  WEBSHOP_CHECKOUT_ENABLED: "true",
  WEBSHOP_ENABLED: "true",
  WEBSHOP_INSTALL_MODE: "managed_redeploy",
  WEBSHOP_STOREFRONT_ENABLED: "true",
});

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
  const result = await loadWebshopAddon("webshop", () => null);
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
    WEBSHOP_STOREFRONT_ENABLED: "0",
  });

  assert.equal(parseWebshopBoolean("yes", false), true);
  assert.equal(config.checkoutEnabled, false);
  assert.equal(config.enabled, true);
  assert.equal(config.installMode, "disabled");
  assert.equal(config.paymentsMode, "live");
  assert.equal(config.storefrontEnabled, false);
});

test("Webshop defaults fail closed identically in development and production", () => {
  const development = getWebshopRuntimeConfig({ NODE_ENV: "development" });
  const production = getWebshopRuntimeConfig({ NODE_ENV: "production" });
  assert.deepEqual(development, production);
  assert.equal(production.enabled, false);
  assert.equal(production.checkoutEnabled, false);
  assert.equal(production.storefrontEnabled, false);
  assert.equal(production.installMode, "disabled");
  assert.equal(production.paymentsMode, "test");
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
  const withoutProvisioning: Partial<WebshopAddon> = { ...fakeAddon };
  delete withoutProvisioning.provisionStorefrontContent;
  assert.equal(isWebshopAddon(withoutProvisioning), false);
  assert.equal(
    isWebshopAddon({
      ...fakeAddon,
      hostRouteBindings: ["webshop.api.v1"],
    }),
    true,
  );
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
        NEXT_PUBLIC_APP_URL: "https://nr-cms.example.com",
      },
    }),
    {
      deploymentEnvironment: "self_hosted",
      mode: "standalone",
      ownerId: "self_hosted",
      projectId: "https://nr-cms.example.com",
      provider: "self_hosted",
      status: "supported",
    },
  );

  assert.equal(
    getSelfHostedDeploymentPlatform({
      env: { NEXT_PUBLIC_APP_URL: "https://cms.example.com" },
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
    message:
      "Self-hosted activation requires explicit WEBSHOP_DEPLOYMENT_MODE=self_hosted.",
  });
});

test("platform verification treats non-vercel managed providers as self-hosted installs", async () => {
  const result = await verifyWebshopDeploymentPlatform({
    env: {
      NETLIFY: "true",
      WEBSHOP_DEPLOYMENT_MODE: "self_hosted",
    },
    selfHostedSiteId: "netlify-site",
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

test("platform verification rejects Vercel without a stable project identity", async () => {
  const result = await verifyWebshopDeploymentPlatform({
    env: {
      VERCEL: "1",
      VERCEL_ENV: "production",
    },
  });

  assert.deepEqual(result, {
    status: "unsupported",
    reason: "missing_project_identity",
    message:
      "Vercel activation requires NR_VERCEL_PROJECT_ID or VERCEL_PROJECT_ID.",
  });
});

test("platform verification accepts Vercel production with project and HTTPS domain proof binding", async () => {
  const result = await verifyWebshopDeploymentPlatform({
    env: {
      NR_VERCEL_PROJECT_ID: "prj_123",
      VERCEL: "1",
      VERCEL_ENV: "production",
    },
  });

  assert.deepEqual(result, {
    deploymentEnvironment: "production",
    mode: "project_domain_proof",
    ownerId: "vercel-project:prj_123",
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
    runtimeConfig: enabledWebshopRuntimeConfig,
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
    runtimeConfig: enabledWebshopRuntimeConfig,
  });

  assert.equal(state.status, "install_pending");
});

test("loaded webshop package forces pending entitlement reconciliation", () => {
  assert.equal(
    shouldForceWebshopInstallReconciliation(
      { status: "install_pending" },
      { status: "loaded", addon: fakeAddon },
    ),
    true,
  );
  assert.equal(
    shouldForceWebshopInstallReconciliation(
      { status: "install_pending" },
      { status: "not_installed" },
    ),
    false,
  );
  assert.equal(
    shouldForceWebshopInstallReconciliation(
      { status: "ready" },
      { status: "loaded", addon: fakeAddon },
    ),
    false,
  );
});

test("license state maps loaded add-on entitlement cases", () => {
  const now = new Date("2026-06-07T00:00:00.000Z");

  assert.equal(
    resolveWebshopAddonStateFromInputs({
      entitlement: null,
      loadResult: { status: "loaded", addon: fakeAddon },
      now,
      runtimeConfig: enabledWebshopRuntimeConfig,
    }).status,
    "license_required",
  );

  assert.equal(
    resolveWebshopAddonStateFromInputs({
      entitlement: { status: "invalid" },
      loadResult: { status: "loaded", addon: fakeAddon },
      now,
      runtimeConfig: enabledWebshopRuntimeConfig,
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
      runtimeConfig: enabledWebshopRuntimeConfig,
      verifySignedEntitlement: false,
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
      runtimeConfig: enabledWebshopRuntimeConfig,
      verifySignedEntitlement: false,
    }).status,
    "ready",
  );
});

test("every runtime mode rejects an unsigned Webshop entitlement", () => {
  const state = resolveWebshopAddonStateFromInputs({
    entitlement: {
      status: "ready",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    },
    loadResult: { status: "loaded", addon: fakeAddon },
    runtimeConfig: getWebshopRuntimeConfig({
      NODE_ENV: "development",
      WEBSHOP_ENABLED: "true",
      WEBSHOP_CHECKOUT_ENABLED: "true",
      WEBSHOP_STOREFRONT_ENABLED: "true",
      WEBSHOP_INSTALL_MODE: "managed_redeploy",
    }),
  });
  assert.equal(state.status, "license_invalid");
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
      enabledWebshopRuntimeConfig,
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
      enabledWebshopRuntimeConfig,
    ),
    { status: "license_expired", mode: "edit_existing_only" },
  );

  assert.equal(
    resolveInstalledWebshopLicenseModeFromEntitlement(
      { status: "invalid" },
      now,
      enabledWebshopRuntimeConfig,
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
