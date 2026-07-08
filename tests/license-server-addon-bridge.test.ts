import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAddonI18nContext,
  type AddonI18nContext,
} from "@/lib/i18n/addon-contract";
import type { LicenseServerAddon } from "@/lib/license-server-addon/contract";
import { getLicenseServerRuntimeConfig } from "@/lib/license-server-addon/config";
import {
  LICENSE_SERVER_ENTITLEMENT_REVALIDATION_INTERVAL_MS,
  mapLicenseServerRevalidationStatusToEntitlementStatus,
  resolveInstalledLicenseServerLicenseModeFromEntitlement,
  resolveLicenseServerAddonStateFromInputs,
  shouldRevalidateLicenseServerEntitlement,
} from "@/lib/license-server-addon/license";

const fakeAddon: LicenseServerAddon = {
  version: "0.0.1",
  async renderDashboard() {
    return null;
  },
  async renderDashboardPath() {
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

test("license server add-on state maps loaded entitlement cases", () => {
  const now = new Date("2026-06-07T00:00:00.000Z");

  assert.equal(
    resolveLicenseServerAddonStateFromInputs({
      entitlement: null,
      loadResult: { status: "loaded", addon: fakeAddon },
      now,
    }).status,
    "license_required",
  );

  assert.deepEqual(
    resolveLicenseServerAddonStateFromInputs({
      entitlement: {
        metadata: {
          lastRevalidationMessage: "Add-on entitlement was revoked.",
        },
        status: "invalid",
      },
      loadResult: { status: "loaded", addon: fakeAddon },
      now,
    }),
    {
      reason: "Add-on entitlement was revoked.",
      status: "license_invalid",
    },
  );

  assert.deepEqual(
    resolveLicenseServerAddonStateFromInputs({
      entitlement: {
        expiresAt: new Date("2026-06-06T23:59:59.000Z"),
        status: "ready",
      },
      loadResult: { status: "loaded", addon: fakeAddon },
      now,
    }),
    {
      addon: fakeAddon,
      expiresAt: "2026-06-06T23:59:59.000Z",
      mode: "edit_existing_only",
      status: "license_expired",
    },
  );
});

test("installed license server mode blocks new issue after expiry or revocation", () => {
  const now = new Date("2026-06-07T00:00:00.000Z");

  assert.deepEqual(
    resolveInstalledLicenseServerLicenseModeFromEntitlement(
      {
        expiresAt: new Date("2026-06-08T00:00:00.000Z"),
        status: "ready",
      },
      now,
    ),
    { status: "ready", mode: "ready" },
  );

  assert.deepEqual(
    resolveInstalledLicenseServerLicenseModeFromEntitlement(
      {
        expiresAt: new Date("2026-06-06T23:59:59.000Z"),
        status: "ready",
      },
      now,
    ),
    { status: "license_expired", mode: "edit_existing_only" },
  );

  assert.equal(
    resolveInstalledLicenseServerLicenseModeFromEntitlement(
      { status: "invalid" },
      now,
    ).status,
    "forbidden",
  );

  assert.equal(
    resolveInstalledLicenseServerLicenseModeFromEntitlement(
      {
        expiresAt: new Date("2026-06-08T00:00:00.000Z"),
        status: "ready",
      },
      now,
      getLicenseServerRuntimeConfig({ LICENSE_SERVER_ENABLED: "false" }),
    ).status,
    "forbidden",
  );
});

test("paid license server add-on contract can receive host i18n context", async () => {
  const i18n = createTestAddonI18nContext();
  const received: Array<AddonI18nContext | undefined> = [];
  const addon: LicenseServerAddon = {
    ...fakeAddon,
    async renderDashboard(input) {
      received.push(input.i18n);
      return null;
    },
    async renderDashboardPath(input) {
      received.push(input.i18n);
      return null;
    },
    async handleApiRoute(input) {
      received.push(input.i18n);
      return Response.json({ ok: true });
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
    path: ["licenses"],
    searchParams: { status: "active" },
    userId: "user_1",
  });
  const response = await addon.handleApiRoute?.({
    i18n,
    licenseMode: "ready",
    method: "GET",
    path: ["licenses"],
    request: new Request(
      "https://cms.example.test/api/license-server/licenses",
    ),
    userId: "user_1",
  });

  assert.equal(response?.status, 200);
  assert.equal(received[0], i18n);
  assert.equal(received[1], i18n);
  assert.equal(received[2], i18n);
  assert.equal(i18n.backendLanguage, "de");
  assert.equal(i18n.frontendLanguage, "sr-Latn");
});

test("license server entitlement revalidation uses a 24 hour stale window", () => {
  const now = new Date("2026-06-07T12:00:00.000Z");

  assert.equal(shouldRevalidateLicenseServerEntitlement(null, now), false);
  assert.equal(
    shouldRevalidateLicenseServerEntitlement(
      { entitlementToken: "token", status: "install_pending" },
      now,
    ),
    false,
  );
  assert.equal(
    shouldRevalidateLicenseServerEntitlement(
      { entitlementToken: "token", status: "invalid" },
      now,
    ),
    false,
  );
  assert.equal(
    shouldRevalidateLicenseServerEntitlement(
      { entitlementToken: "token", status: "ready" },
      now,
    ),
    true,
  );
  assert.equal(
    shouldRevalidateLicenseServerEntitlement(
      {
        entitlementToken: "token",
        metadata: { lastRevalidatedAt: "2026-06-07T11:00:00.000Z" },
        status: "ready",
      },
      now,
    ),
    false,
  );
  assert.equal(
    shouldRevalidateLicenseServerEntitlement(
      {
        entitlementToken: "token",
        metadata: {
          lastRevalidatedAt: new Date(
            now.getTime() -
              LICENSE_SERVER_ENTITLEMENT_REVALIDATION_INTERVAL_MS -
              1,
          ).toISOString(),
        },
        status: "ready",
      },
      now,
    ),
    true,
  );
});

test("master revalidation statuses map to local entitlement states", () => {
  assert.equal(
    mapLicenseServerRevalidationStatusToEntitlementStatus("ready"),
    "ready",
  );
  assert.equal(
    mapLicenseServerRevalidationStatusToEntitlementStatus("expired"),
    "expired",
  );
  assert.equal(
    mapLicenseServerRevalidationStatusToEntitlementStatus("revoked"),
    "invalid",
  );
  assert.equal(
    mapLicenseServerRevalidationStatusToEntitlementStatus("invalid"),
    "invalid",
  );
});
