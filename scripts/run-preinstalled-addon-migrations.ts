import "dotenv/config";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Pool, type PoolClient } from "pg";

import {
  applyVerifiedAddonMigrations,
  type AddonMigrationLedgerEntry,
  type AddonMigrationStore,
  verifyAddonMigrationBundle,
} from "@/lib/addon-runtime/migration-runner";

type AddonKey = "webshop" | "license-server";
type RegistryEntry = {
  addonKey: AddonKey;
  packageName:
    | "@radomirradojevic/webshop"
    | "@radomirradojevic/license-server-addon";
  signingKid: string;
};

const root = process.cwd();
const registry = await readJson(resolve(root, ".tmp", "addon-registry.json"));
const entries = Array.isArray(registry?.addons)
  ? (registry.addons as RegistryEntry[])
  : [];

if (entries.length === 0) {
  console.log("[addon-migrations] no preinstalled add-ons; nothing to apply");
  process.exit(0);
}

if (process.env.NR_ADDON_MIGRATION_BACKUP_CONFIRMED?.trim() !== "true") {
  throw new Error("addon_migration_backup_confirmation_required");
}
const backupReference =
  process.env.NR_ADDON_MIGRATION_BACKUP_REFERENCE?.trim();
if (!backupReference || backupReference.length < 8 || backupReference.length > 500) {
  throw new Error("addon_migration_backup_reference_invalid");
}
const connectionString =
  process.env.NR_ADDON_MIGRATOR_DATABASE_URL?.trim();
if (!connectionString) {
  throw new Error("NR_ADDON_MIGRATOR_DATABASE_URL is required");
}

const packageJson = await readJson(resolve(root, "package.json"));
const cmsVersion = String(packageJson.version ?? "");
const publicKeyset = await readJson(
  resolve(root, ".tmp", "addon-release-public-keys.json"),
);
const publicKeys = new Map<string, string>(
  Array.isArray(publicKeyset?.keys)
    ? publicKeyset.keys
        .filter(
          (entry: unknown) =>
            isRecord(entry) &&
            entry.status !== "revoked" &&
            typeof entry.kid === "string" &&
            typeof entry.publicKeyPem === "string",
        )
        .map((entry: Record<string, unknown>) => [
          String(entry.kid),
          String(entry.publicKeyPem),
        ])
    : [],
);
const pool = new Pool({ connectionString, max: 2 });

try {
  for (const entry of entries) {
    assertRegistryEntry(entry);
    const publicKeyPem = publicKeys.get(entry.signingKid);
    if (!publicKeyPem) throw new Error("addon_release_signing_key_missing");
    const packageRoot = resolve(
      root,
      "node_modules",
      ...entry.packageName.split("/"),
    );
    const releaseManifest = await readJson(
      resolve(packageRoot, "release-manifest.json"),
    );
    const migrationsBytes = await readFile(
      resolve(packageRoot, "migrations.json"),
    );
    const descriptors = JSON.parse(migrationsBytes.toString("utf8"));
    if (!Array.isArray(descriptors)) {
      throw new Error("migration_manifest_json_invalid");
    }
    const files = new Map<string, Buffer>([["migrations.json", migrationsBytes]]);
    for (const descriptor of descriptors) {
      if (
        !isRecord(descriptor) ||
        typeof descriptor.path !== "string" ||
        !/^migrations\/\d{4}_[a-z0-9_]+\.sql$/.test(descriptor.path)
      ) {
        throw new Error("migration_descriptor_path_invalid");
      }
      files.set(
        descriptor.path,
        await readFile(resolve(packageRoot, descriptor.path)),
      );
    }
    const bundle = verifyAddonMigrationBundle({
      addonKey: entry.addonKey,
      files,
      packageName: entry.packageName,
      publicKeyPem,
      releaseManifest,
    });
    const result = await applyVerifiedAddonMigrations({
      bundle,
      cmsVersion,
      store: postgresMigrationStore(pool),
    });
    console.log(
      `[addon-migrations] ${entry.addonKey}: applied=${result.applied.length} skipped=${result.skipped.length} backup=${backupReference}`,
    );
  }
} finally {
  await pool.end();
}

function postgresMigrationStore(pool: Pool): AddonMigrationStore {
  return {
    async readLedger(addonKey) {
      const result = await pool.query<{
        addon_key: AddonKey;
        checksum: string;
        error_code: string | null;
        migration_id: string;
        package_version: string;
        release_id: string | null;
        schema_version: number;
        status: AddonMigrationLedgerEntry["status"];
      }>(
        `SELECT addon_key, migration_id, release_id, checksum, package_version,
                schema_version, status, error_code
           FROM cms_addon_migrations
          WHERE addon_key = $1
          ORDER BY migration_id ASC`,
        [addonKey],
      );
      return result.rows.map((row) => ({
        addonKey: row.addon_key,
        checksum: row.checksum,
        errorCode: row.error_code,
        migrationId: row.migration_id,
        packageVersion: row.package_version,
        releaseId: row.release_id,
        schemaVersion: row.schema_version,
        status: row.status,
      }));
    },
    async runInTransaction(work) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const value = await work({
          executeSql: (sql) => client.query(sql).then(() => undefined),
          writeLedger: (entry) => writeLedger(client, entry),
        });
        await client.query("COMMIT");
        return value;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async withAdvisoryLock(key, work) {
      const client = await pool.connect();
      try {
        await client.query("SELECT pg_advisory_lock(hashtextextended($1, 0))", [
          key,
        ]);
        return await work();
      } finally {
        await client
          .query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [key])
          .catch(() => undefined);
        client.release();
      }
    },
    async writeFailure(entry) {
      const client = await pool.connect();
      try {
        await writeLedger(client, entry);
      } finally {
        client.release();
      }
    },
  };
}

async function writeLedger(
  client: PoolClient,
  entry: AddonMigrationLedgerEntry,
) {
  await client.query(
    `INSERT INTO cms_addon_migrations
       (addon_key, migration_id, release_id, checksum, package_version,
        schema_version, status, started_at, applied_at, error_code, error_message)
     VALUES
       ($1, $2, $3, $4, $5, $6, $7,
        CASE WHEN $7 = 'applying' THEN now() ELSE NULL END,
        CASE WHEN $7 IN ('applied', 'legacy_applied') THEN now() ELSE NULL END,
        $8, $8)
     ON CONFLICT (addon_key, migration_id) DO UPDATE SET
       release_id = EXCLUDED.release_id,
       checksum = EXCLUDED.checksum,
       package_version = EXCLUDED.package_version,
       schema_version = EXCLUDED.schema_version,
       status = EXCLUDED.status,
       started_at = CASE
         WHEN EXCLUDED.status = 'applying' THEN now()
         ELSE cms_addon_migrations.started_at
       END,
       applied_at = CASE
         WHEN EXCLUDED.status IN ('applied', 'legacy_applied') THEN now()
         ELSE cms_addon_migrations.applied_at
       END,
       error_code = EXCLUDED.error_code,
       error_message = EXCLUDED.error_message`,
    [
      entry.addonKey,
      entry.migrationId,
      entry.releaseId,
      entry.checksum,
      entry.packageVersion,
      entry.schemaVersion,
      entry.status,
      entry.errorCode,
    ],
  );
}

function assertRegistryEntry(value: RegistryEntry) {
  if (
    !value ||
    !["webshop", "license-server"].includes(value.addonKey) ||
    ![
      "@radomirradojevic/webshop",
      "@radomirradojevic/license-server-addon",
    ].includes(value.packageName) ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{2,119}$/.test(value.signingKid)
  ) {
    throw new Error("addon_registry_entry_invalid");
  }
}

async function readJson(path: string) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    throw new Error(`invalid_json_file:${path}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
