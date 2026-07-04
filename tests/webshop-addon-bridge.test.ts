import assert from "node:assert/strict";
import test from "node:test";

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
import {
  LOCAL_PRIVATE_WEBSHOP_MODULE,
  loadWebshopAddon,
} from "@/lib/webshop-addon/loader";
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

test("optional webshop add-on loader returns not_installed without module config", async () => {
  const result = await loadWebshopAddon("");
  assert.equal(result.status, "not_installed");
});

test("local private webshop alias requires explicit dev opt-in", async () => {
  const originalValue = process.env.WEBSHOP_ALLOW_LOCAL_DEV_INSTALL;
  delete process.env.WEBSHOP_ALLOW_LOCAL_DEV_INSTALL;
  const result = await loadWebshopAddon(LOCAL_PRIVATE_WEBSHOP_MODULE);
  if (originalValue === undefined) {
    delete process.env.WEBSHOP_ALLOW_LOCAL_DEV_INSTALL;
  } else {
    process.env.WEBSHOP_ALLOW_LOCAL_DEV_INSTALL = originalValue;
  }

  assert.equal(result.status, "invalid");
  assert.match(result.reason, /WEBSHOP_ALLOW_LOCAL_DEV_INSTALL=true/);
});

test("local private webshop alias is restricted to localhost development", async () => {
  const env = process.env as Record<string, string | undefined>;
  const originalAllow = env.WEBSHOP_ALLOW_LOCAL_DEV_INSTALL;
  const originalNodeEnv = env.NODE_ENV;
  const originalAppUrl = env.APP_URL;

  try {
    env.WEBSHOP_ALLOW_LOCAL_DEV_INSTALL = "true";
    env.NODE_ENV = "production";
    delete env.APP_URL;

    const productionResult = await loadWebshopAddon(
      LOCAL_PRIVATE_WEBSHOP_MODULE,
    );
    assert.equal(productionResult.status, "invalid");
    assert.match(productionResult.reason, /NODE_ENV=development/);

    env.NODE_ENV = "development";
    env.APP_URL = "https://cms.example.com";

    const publicUrlResult = await loadWebshopAddon(
      LOCAL_PRIVATE_WEBSHOP_MODULE,
    );
    assert.equal(publicUrlResult.status, "invalid");
    assert.match(publicUrlResult.reason, /localhost/);
  } finally {
    if (originalAllow === undefined) {
      delete env.WEBSHOP_ALLOW_LOCAL_DEV_INSTALL;
    } else {
      env.WEBSHOP_ALLOW_LOCAL_DEV_INSTALL = originalAllow;
    }
    if (originalNodeEnv === undefined) {
      delete env.NODE_ENV;
    } else {
      env.NODE_ENV = originalNodeEnv;
    }
    if (originalAppUrl === undefined) {
      delete env.APP_URL;
    } else {
      env.APP_URL = originalAppUrl;
    }
  }
});

test("webshop rollout config parses explicit feature flags", () => {
  const config = getWebshopRuntimeConfig({
    WEBSHOP_ADDON_MODULE: " @nr-cms/webshop ",
    WEBSHOP_CHECKOUT_ENABLED: "off",
    WEBSHOP_ENABLED: "true",
    WEBSHOP_INSTALL_MODE: "disabled",
    WEBSHOP_PAYMENTS_MODE: "live",
    WEBSHOP_SELF_HOSTED_SITE_ID: " nr-cms.example.com ",
    WEBSHOP_STOREFRONT_ENABLED: "0",
  });

  assert.equal(parseWebshopBoolean("yes", false), true);
  assert.equal(config.addonModule, "@nr-cms/webshop");
  assert.equal(config.checkoutEnabled, false);
  assert.equal(config.enabled, true);
  assert.equal(config.installMode, "disabled");
  assert.equal(config.paymentsMode, "live");
  assert.equal(config.selfHostedSiteId, "nr-cms.example.com");
  assert.equal(config.storefrontEnabled, false);
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

test("platform verification allows local deployment before package token flow", async () => {
  const result = await verifyWebshopDeploymentPlatform({ env: {} });

  assert.deepEqual(result, {
    deploymentEnvironment: "self_hosted",
    mode: "standalone",
    ownerId: "self_hosted",
    projectId: "self_hosted",
    provider: "self_hosted",
    status: "supported",
  });
});

test("platform verification treats non-vercel managed providers as self-hosted installs", async () => {
  const result = await verifyWebshopDeploymentPlatform({
    env: { NETLIFY: "true", WEBSHOP_SELF_HOSTED_SITE_ID: "netlify-site" },
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

test("platform verification falls back to self-hosted when OIDC is rejected", async () => {
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

  assert.deepEqual(result, {
    deploymentEnvironment: "self_hosted",
    mode: "standalone",
    ownerId: "self_hosted",
    projectId: "vercel-fallback",
    provider: "self_hosted",
    status: "supported",
  });
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
