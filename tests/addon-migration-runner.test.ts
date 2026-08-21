import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";

import {
  applyVerifiedAddonMigrations,
  assertAdditiveMigrationSql,
  verifyAddonMigrationBundle,
  type AddonMigrationLedgerEntry,
  type AddonMigrationStore,
  type AddonMigrationTransaction,
} from "@/lib/addon-runtime/migration-runner";
import { canonicalReleaseManifestPayload } from "@/lib/addon-runtime/release-manifest";

const SQL_1 = 'CREATE TABLE "license_server_fixture" ("id" uuid PRIMARY KEY);';
const SQL_2 =
  'ALTER TABLE "license_server_fixture" ADD COLUMN "revision" integer;';

test("verified migration bundle binds signature, inventory, SQL checksums and non-empty manifest", () => {
  const fixture = releaseFixture();
  const verified = verifyAddonMigrationBundle(fixture.input);
  assert.equal(verified.descriptors.length, 2);
  assert.deepEqual(
    [...verified.sqlById.keys()],
    [
      "0001_license_server_fixture.sql",
      "0002_license_server_fixture_revision.sql",
    ],
  );
});

test("V2 License Server JWS migrations normalize compatibility from the signed release", () => {
  const fixture = releaseFixtureV2();
  const verified = verifyAddonMigrationBundle(fixture.input);
  assert.equal(verified.releaseId, "77782a45-86a8-53c6-9cf9-8ef05bb23324");
  assert.equal(verified.packageVersion, "0.2.0");
  assert.equal(
    verified.descriptors[0]?.compatibility.cmsVersionRange,
    "^0.1.0",
  );
  assert.equal(
    verified.descriptors[0]?.compatibility.addonVersionRange,
    "0.2.0",
  );

  const envelope = fixture.input.releaseManifest as {
    payload: string;
    protected: string;
    signature: string;
  };
  const replacement = envelope.signature.endsWith("A") ? "B" : "A";
  assert.throws(
    () =>
      verifyAddonMigrationBundle({
        ...fixture.input,
        releaseManifest: {
          ...envelope,
          signature: `${envelope.signature.slice(0, -1)}${replacement}`,
        },
      }),
    /migration_release_signature_invalid/,
  );
});

test("migration descriptors cannot smuggle a script command or destructive SQL", () => {
  const fixture = releaseFixture();
  const raw = JSON.parse(
    fixture.files.get("migrations.json")!.toString("utf8"),
  );
  raw[0].script = "node arbitrary.js";
  const migrationsJson = Buffer.from(JSON.stringify(raw), "utf8");
  fixture.files.set("migrations.json", migrationsJson);
  assert.throws(
    () => verifyAddonMigrationBundle(fixture.input),
    /unrecognized_keys|migration_artifact_inventory_mismatch/,
  );
  assert.throws(
    () => assertAdditiveMigrationSql('DROP TABLE "license_server_fixture";'),
    /migration_sql_not_additive/,
  );
});

test("empty install applies once and rerun is a no-op", async () => {
  const fixture = releaseFixture();
  const bundle = verifyAddonMigrationBundle(fixture.input);
  const store = new MemoryMigrationStore();
  const first = await applyVerifiedAddonMigrations({
    bundle,
    cmsVersion: "0.1.0",
    store,
  });
  const second = await applyVerifiedAddonMigrations({
    bundle,
    cmsVersion: "0.1.0",
    store,
  });
  assert.deepEqual(first.applied, [
    "0001_license_server_fixture.sql",
    "0002_license_server_fixture_revision.sql",
  ]);
  assert.deepEqual(second.applied, []);
  assert.deepEqual(second.skipped, [
    "0001_license_server_fixture.sql",
    "0002_license_server_fixture_revision.sql",
  ]);
  assert.equal(store.executed.length, 2);
});

test("existing schema baseline is adopted before the additive upgrade", async () => {
  const fixture = releaseFixture();
  const bundle = verifyAddonMigrationBundle(fixture.input);
  const store = new MemoryMigrationStore();
  const result = await applyVerifiedAddonMigrations({
    bundle,
    cmsVersion: "0.1.0",
    store,
    verifyLegacyBaseline: async (descriptor) =>
      descriptor.id === "0001_license_server_fixture.sql",
  });
  assert.deepEqual(result.adopted, ["0001_license_server_fixture.sql"]);
  assert.deepEqual(result.applied, [
    "0002_license_server_fixture_revision.sql",
  ]);
  assert.deepEqual(store.executed, [SQL_2]);
  assert.equal(result.ledger[0]?.status, "legacy_applied");
});

test("advisory lock serializes concurrent installers", async () => {
  const fixture = releaseFixture();
  const bundle = verifyAddonMigrationBundle(fixture.input);
  const store = new MemoryMigrationStore();
  const [left, right] = await Promise.all([
    applyVerifiedAddonMigrations({ bundle, cmsVersion: "0.1.0", store }),
    applyVerifiedAddonMigrations({ bundle, cmsVersion: "0.1.0", store }),
  ]);
  assert.equal(left.applied.length + right.applied.length, 2);
  assert.equal(store.maxConcurrentLocks, 1);
  assert.equal(store.executed.length, 2);
});

test("checksum drift is terminal before SQL execution", async () => {
  const fixture = releaseFixture();
  const bundle = verifyAddonMigrationBundle(fixture.input);
  const store = new MemoryMigrationStore();
  store.ledger.set("0001_license_server_fixture.sql", {
    addonKey: "license-server",
    checksum: "f".repeat(64),
    errorCode: null,
    migrationId: "0001_license_server_fixture.sql",
    packageVersion: "0.1.0",
    releaseId: null,
    schemaVersion: 1,
    status: "applied",
  });
  await assert.rejects(
    applyVerifiedAddonMigrations({ bundle, cmsVersion: "0.1.0", store }),
    /migration_checksum_drift/,
  );
  assert.equal(store.executed.length, 0);
});

test("failed migration records sanitized evidence and can recover with the same checksum", async () => {
  const fixture = releaseFixture();
  const bundle = verifyAddonMigrationBundle(fixture.input);
  const store = new MemoryMigrationStore();
  store.failSqlOnce = SQL_2;
  await assert.rejects(
    applyVerifiedAddonMigrations({ bundle, cmsVersion: "0.1.0", store }),
    /fixture_apply_failed/,
  );
  assert.equal(
    store.ledger.get("0002_license_server_fixture_revision.sql")?.status,
    "failed",
  );
  const recovered = await applyVerifiedAddonMigrations({
    bundle,
    cmsVersion: "0.1.0",
    store,
  });
  assert.deepEqual(recovered.applied, [
    "0002_license_server_fixture_revision.sql",
  ]);
  assert.equal(
    store.ledger.get("0002_license_server_fixture_revision.sql")?.status,
    "applied",
  );
});

test("expand-compatible migrations preserve application rollback compatibility", () => {
  for (const sql of [SQL_1, SQL_2]) {
    assert.doesNotMatch(sql, /\b(?:DROP|TRUNCATE|DELETE\s+FROM)\b/i);
    assert.doesNotThrow(() => assertAdditiveMigrationSql(sql));
  }
});

class MemoryMigrationStore implements AddonMigrationStore {
  readonly executed: string[] = [];
  readonly ledger = new Map<string, AddonMigrationLedgerEntry>();
  failSqlOnce: string | null = null;
  maxConcurrentLocks = 0;
  #activeLocks = 0;
  #lockTail: Promise<void> = Promise.resolve();

  async readLedger() {
    return [...this.ledger.values()].sort((left, right) =>
      left.migrationId.localeCompare(right.migrationId),
    );
  }

  async runInTransaction<T>(
    work: (transaction: AddonMigrationTransaction) => Promise<T>,
  ) {
    const ledgerSnapshot = new Map(this.ledger);
    const executedLength = this.executed.length;
    try {
      return await work({
        executeSql: async (sql) => {
          if (this.failSqlOnce === sql) {
            this.failSqlOnce = null;
            throw new Error("fixture_apply_failed");
          }
          this.executed.push(sql);
        },
        writeLedger: async (entry) => {
          this.ledger.set(entry.migrationId, entry);
        },
      });
    } catch (error) {
      this.ledger.clear();
      for (const [key, value] of ledgerSnapshot) this.ledger.set(key, value);
      this.executed.length = executedLength;
      throw error;
    }
  }

  async withAdvisoryLock<T>(_key: string, work: () => Promise<T>) {
    const previous = this.#lockTail;
    let release!: () => void;
    this.#lockTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    this.#activeLocks += 1;
    this.maxConcurrentLocks = Math.max(
      this.maxConcurrentLocks,
      this.#activeLocks,
    );
    try {
      return await work();
    } finally {
      this.#activeLocks -= 1;
      release();
    }
  }

  async writeFailure(entry: AddonMigrationLedgerEntry) {
    this.ledger.set(entry.migrationId, entry);
  }
}

function releaseFixture() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const descriptors = [
    descriptor("0001_license_server_fixture.sql", 1, SQL_1),
    descriptor("0002_license_server_fixture_revision.sql", 2, SQL_2),
  ];
  const files = new Map<string, Buffer>([
    ["migrations.json", Buffer.from(JSON.stringify(descriptors), "utf8")],
    [descriptors[0].path, Buffer.from(SQL_1, "utf8")],
    [descriptors[1].path, Buffer.from(SQL_2, "utf8")],
  ]);
  const unsigned = {
    addonKey: "license-server" as const,
    artifact: {
      files: [...files].map(([path, value]) => ({
        path,
        sha256: hash(value),
        size: value.length,
      })),
      sha256: "a".repeat(64),
      size: [...files.values()].reduce((sum, value) => sum + value.length, 0),
    },
    capabilities: ["customerLicenseIssuer.v1"],
    cmsVersionRange: "^0.1.0",
    entrypoints: { server: "./dist/server.js" },
    manifestVersion: 1 as const,
    migrationBundleHash: hash(Buffer.from(canonicalJson(descriptors), "utf8")),
    migrations: descriptors,
    packageName: "@radomirradojevic/license-server-addon" as const,
    packageVersion: "0.1.0",
    releasedAt: "2026-08-15T00:00:00.000Z",
    runtimeContractVersion: "1" as const,
    schemaVersion: 2,
    signingKid: "fixture-kid",
  };
  const signature = sign(
    null,
    Buffer.from(canonicalReleaseManifestPayload(unsigned), "utf8"),
    privateKey,
  ).toString("base64url");
  const releaseManifest = { ...unsigned, signature };
  return {
    files,
    input: {
      addonKey: "license-server" as const,
      files,
      packageName: "@radomirradojevic/license-server-addon" as const,
      publicKeyPem: publicKey
        .export({ format: "pem", type: "spki" })
        .toString(),
      releaseManifest,
    },
  };
}

function releaseFixtureV2() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const descriptors = [
    releaseDescriptorV2("0001_license_server_fixture.sql", 1, SQL_1),
    releaseDescriptorV2("0002_license_server_fixture_revision.sql", 2, SQL_2),
  ];
  const migrationsBytes = Buffer.from(canonicalJson(descriptors), "utf8");
  const files = new Map<string, Buffer>([
    ["migrations.json", migrationsBytes],
    [descriptors[0].path, Buffer.from(SQL_1, "utf8")],
    [descriptors[1].path, Buffer.from(SQL_2, "utf8")],
  ]);
  const entries = [...files]
    .map(([path, value]) => ({
      path,
      sha256: hash(value),
      size: value.length,
    }))
    .sort((left, right) =>
      Buffer.compare(Buffer.from(left.path), Buffer.from(right.path)),
    );
  const artifactInventory = {
    contractVersion: 1 as const,
    digestPurpose: "addon_runtime_payload" as const,
    entries,
  };
  const payload = {
    addonKey: "license-server" as const,
    artifactInventory,
    artifactSha256: hash(Buffer.from(canonicalJson(artifactInventory), "utf8")),
    capabilities: [
      "customerLicenseIssuer.jobs.v1",
      "customerLicenseIssuer.v1",
      "customerLicenseIssuer.v2",
      "routes.licenseServer",
    ],
    channel: "stable" as const,
    cmsGitSha: "a".repeat(40),
    cmsVersionRange: "^0.1.0",
    dependencyLockSha256: "b".repeat(64),
    entrypoints: { server: "./dist/server.js" as const },
    manifestVersion: 2 as const,
    migrationBundleHash: hash(migrationsBytes),
    migrations: descriptors,
    minimumCoreSchemaVersion: 1,
    nextVersionRange: "16.3.0",
    nodeVersionRange: ">=20.9.0 <25.0.0",
    packageName: "@radomirradojevic/license-server-addon" as const,
    packageVersion: "0.2.0",
    purpose: "addon_release_manifest" as const,
    releaseId: "77782a45-86a8-53c6-9cf9-8ef05bb23324",
    releaseSigningKid: "fixture-v2-kid",
    releasedAt: "2026-08-20T00:00:00.000Z",
    runtimeContractVersion: "1" as const,
    schemaVersion: 2,
    sourceGitSha: "c".repeat(40),
    supportedAddonSchemaVersionMax: 2,
    supportedAddonSchemaVersionMin: 1,
    supportedLicenseEditions: ["standard" as const],
  };
  const protectedValue = Buffer.from(
    canonicalJson({
      alg: "EdDSA",
      kid: payload.releaseSigningKid,
      typ: "NRV-ADDON-RELEASE-MANIFEST-V2+JWS",
    }),
    "utf8",
  ).toString("base64url");
  const payloadValue = Buffer.from(canonicalJson(payload), "utf8").toString(
    "base64url",
  );
  const signature = sign(
    null,
    Buffer.from(`${protectedValue}.${payloadValue}`, "ascii"),
    privateKey,
  ).toString("base64url");
  return {
    files,
    input: {
      addonKey: "license-server" as const,
      files,
      packageName: "@radomirradojevic/license-server-addon" as const,
      publicKeyPem: publicKey
        .export({ format: "pem", type: "spki" })
        .toString(),
      releaseManifest: {
        payload: payloadValue,
        protected: protectedValue,
        signature,
      },
    },
  };
}

function releaseDescriptorV2(id: string, schemaVersion: number, sql: string) {
  return {
    checksum: hash(Buffer.from(sql, "utf8")),
    destructive: false as const,
    id,
    path: `migrations/${id}` as const,
    postconditionSchemaFingerprintSha256: "d".repeat(64),
    requiresBackup: true as const,
    rollbackPolicy: "expand_compatible" as const,
    schemaVersion,
  };
}

function descriptor(id: string, schemaVersion: number, sql: string) {
  return {
    checksum: hash(Buffer.from(sql, "utf8")),
    compatibility: {
      addonVersionRange: "^0.1.0",
      cmsVersionRange: "^0.1.0",
    },
    destructive: false as const,
    id,
    path: `migrations/${id}` as const,
    requiresBackup: true,
    rollbackPolicy: "expand_compatible" as const,
    schemaVersion,
  };
}

function hash(value: Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}
