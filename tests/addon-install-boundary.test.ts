import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { reconcileAddonInstall } from "@/lib/addon-runtime/install-state";
import {
  canonicalReleaseManifestPayload,
  validateAddonReleaseManifest,
  verifyAddonReleaseManifestSignature,
} from "@/lib/addon-runtime/release-manifest";
import { loadLicenseServerAddon } from "@/lib/license-server-addon/loader";
import { loadWebshopAddon } from "@/lib/webshop-addon/loader";

const manifest = { addonKey: "webshop", artifact: { files: [{ path: "server.js", sha256: "a".repeat(64), size: 1 }], sha256: "a".repeat(64), size: 1 }, capabilities: ["routes.webshop"], cmsVersionRange: "^0.1.0", entrypoints: { server: "./server.js" }, manifestVersion: 1, migrations: [], packageName: "@nr-cms/webshop", packageVersion: "1.0.0", releasedAt: "2026-07-12T00:00:00.000Z", runtimeContractVersion: "1", schemaVersion: 1, signature: "a".repeat(86), signingKid: "fixture" } as const;

test("public registry is empty and CMS loaders remain controlled", async () => {
  assert.equal((await loadWebshopAddon()).status, "not_installed");
  assert.equal((await loadLicenseServerAddon()).status, "not_installed");
});

test("registry generator creates its output directory in a clean public checkout", () => {
  const cleanRoot = mkdtempSync(join(tmpdir(), "nr-addon-registry-"));
  try {
    writeFileSync(
      join(cleanRoot, "addons.registry.json"),
      JSON.stringify({ addons: [] }),
      "utf8",
    );
    execFileSync(
      process.execPath,
      [resolve(process.cwd(), "scripts/generate-addon-registry.mjs")],
      { cwd: cleanRoot, stdio: "pipe" },
    );
    assert.match(
      readFileSync(join(cleanRoot, ".generated", "addon-registry.ts"), "utf8"),
      /export const addonLoaders/,
    );
  } finally {
    rmSync(cleanRoot, { force: true, recursive: true });
  }
});

test("registry generator verifies signed package identity and artifact bytes", () => {
  const cleanRoot = mkdtempSync(join(tmpdir(), "nr-addon-registry-signed-"));
  const packageRoot = join(cleanRoot, "node_modules", "@nr-cms", "webshop");
  try {
    mkdirSync(join(packageRoot, "dist"), { recursive: true });
    writeFileSync(join(cleanRoot, "package.json"), JSON.stringify({ version: "0.1.0" }), "utf8");
    writeFileSync(
      join(packageRoot, "package.json"),
      JSON.stringify({ name: "@nr-cms/webshop", version: "0.5.0" }),
      "utf8",
    );
    const server = "export const webshopAddon = {};\n";
    writeFileSync(join(packageRoot, "dist", "server.js"), server, "utf8");
    const files = [
      {
        path: "dist/server.js",
        sha256: createHash("sha256").update(server).digest("hex"),
        size: Buffer.byteLength(server),
      },
    ];
    const subject = createHash("sha256")
      .update(stablePretty(files))
      .digest("hex");
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const unsigned = {
      addonKey: "webshop" as const,
      artifact: { files, sha256: subject, size: Buffer.byteLength(stablePretty(files)) },
      capabilities: ["routes.webshop"],
      cmsVersionRange: "^0.1.0",
      entrypoints: { server: "./dist/server.js" },
      manifestVersion: 1 as const,
      migrations: [],
      packageName: "@nr-cms/webshop" as const,
      packageVersion: "0.5.0",
      releasedAt: "2026-07-13T00:00:00.000Z",
      runtimeContractVersion: "1" as const,
      schemaVersion: 1,
      signingKid: "local-test-authority",
    };
    const signature = sign(
      null,
      Buffer.from(canonicalReleaseManifestPayload(unsigned), "utf8"),
      privateKey,
    ).toString("base64url");
    writeFileSync(
      join(packageRoot, "release-manifest.json"),
      JSON.stringify({ ...unsigned, signature }),
      "utf8",
    );
    writeFileSync(
      join(packageRoot, "provenance.json"),
      JSON.stringify({ subject: { sha256: subject } }),
      "utf8",
    );
    writeFileSync(
      join(cleanRoot, "addons.registry.json"),
      JSON.stringify({
        addons: [
          {
            addonKey: "webshop",
            artifactSha256: subject,
            packageName: "@nr-cms/webshop",
            packageVersion: "0.5.0",
            signingKid: "local-test-authority",
          },
        ],
      }),
      "utf8",
    );
    const publicKeysPath = join(cleanRoot, "addon-release-public-keys.json");
    writeFileSync(
      publicKeysPath,
      JSON.stringify({
        "local-test-authority": publicKey
          .export({ type: "spki", format: "pem" })
          .toString(),
      }),
      "utf8",
    );
    const command = [process.execPath, [resolve(process.cwd(), "scripts/generate-addon-registry.mjs")]] as const;
    execFileSync(command[0], command[1], {
      cwd: cleanRoot,
      env: { ...process.env, NR_ADDON_RELEASE_PUBLIC_KEYS_FILE: publicKeysPath },
      stdio: "pipe",
    });

    writeFileSync(join(packageRoot, "dist", "server.js"), `${server}// tampered\n`, "utf8");
    assert.throws(
      () =>
        execFileSync(command[0], command[1], {
          cwd: cleanRoot,
          env: { ...process.env, NR_ADDON_RELEASE_PUBLIC_KEYS_FILE: publicKeysPath },
          stdio: "pipe",
        }),
      /Command failed/,
    );
  } finally {
    rmSync(cleanRoot, { force: true, recursive: true });
  }
});

test("install reconciliation reaches ready only after every independent proof", () => {
  const validated = validateAddonReleaseManifest(manifest, { addonKey: "webshop", packageName: "@nr-cms/webshop" });
  assert.equal(validated.ok, true);
  if (!validated.ok) throw new Error("fixture manifest");
  const desired = { addonKey: "webshop", packageName: "@nr-cms/webshop", packageVersion: "1.0.0", artifactSha256: "a".repeat(64) };
  assert.equal(reconcileAddonInstall({ desired, entitlementValid: true, manifest: validated.manifest, migrationsApplied: true, runtimeLoaded: true }).status, "ready");
  assert.equal(reconcileAddonInstall({ desired, entitlementValid: true, manifest: validated.manifest, migrationsApplied: false, runtimeLoaded: true }).status, "migration_pending");
  assert.equal(reconcileAddonInstall({ desired, entitlementValid: true, manifest: null, migrationsApplied: true, runtimeLoaded: false }).status, "install_pending");
  assert.equal(reconcileAddonInstall({ desired: { ...desired, artifactSha256: "b".repeat(64) }, entitlementValid: true, manifest: validated.manifest, migrationsApplied: true, runtimeLoaded: true }).status, "failed");
});

test("release signature covers nested artifact and migration fields", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const unsigned = {
    ...manifest,
    capabilities: ["routes.webshop"],
    artifact: {
      files: [{ path: "dist/server.js", sha256: "a".repeat(64), size: 1 }],
      sha256: "a".repeat(64),
      size: 1,
      registryIntegrity: "sha256-fixture",
    },
    migrations: [{ id: "0001.sql", checksum: "b".repeat(64) }],
    signingKid: "test-release-authority",
  };
  const signature = sign(
    null,
    Buffer.from(canonicalReleaseManifestPayload(unsigned), "utf8"),
    privateKey,
  ).toString("base64url");
  const signed = { ...unsigned, signature };
  const validated = validateAddonReleaseManifest(signed, {
    addonKey: "webshop",
    packageName: "@nr-cms/webshop",
  });
  assert.equal(validated.ok, true);
  if (!validated.ok) throw new Error("manifest validation failed");
  assert.deepEqual(validated.manifest.artifact.files, unsigned.artifact.files);

  assert.equal(
    verifyAddonReleaseManifestSignature(signed, publicKey.export({ type: "spki", format: "pem" }).toString()),
    true,
  );
  assert.equal(
    verifyAddonReleaseManifestSignature(
      { ...signed, artifact: { ...signed.artifact, sha256: "c".repeat(64) } },
      publicKey.export({ type: "spki", format: "pem" }).toString(),
    ),
    false,
  );
  assert.equal(
    verifyAddonReleaseManifestSignature(
      { ...signed, migrations: [{ ...signed.migrations[0], checksum: "d".repeat(64) }] },
      publicKey.export({ type: "spki", format: "pem" }).toString(),
    ),
    false,
  );
});

test("public tracked sources contain no private source import or Tailwind scan", () => {
  const files = ["app/globals.css", "lib/webshop-addon/loader.ts", "lib/license-server-addon/loader.ts", "lib/webshop-addon/fulfillment-cron-adapter.ts"];
  for (const file of files) assert.equal(readFileSync(resolve(process.cwd(), file), "utf8").includes(".private"), false, file);
});

function stablePretty(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value.map(sortValue), null, 2);
  return JSON.stringify(sortValue(value), null, 2);
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortValue(entry)]),
  );
}
