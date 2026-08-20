import {
  createHash,
  createPublicKey,
  verify as verifySignature,
} from "node:crypto";

import { z } from "zod";

import type { AddonMigrationDescriptorV2 } from "@nr-cms/addon-sdk/migrations-v2";
import {
  signedAddonReleaseManifestV1Schema,
  verifyAddonReleaseManifestSignature,
} from "@/lib/addon-runtime/release-manifest";

const SHA256 = /^[a-f0-9]{64}$/;
const MIGRATION_ID = /^\d{4}_[a-z0-9_]+\.sql$/;

export const addonMigrationDescriptorV2Schema = z
  .object({
    checksum: z.string().regex(SHA256),
    compatibility: z
      .object({
        addonVersionRange: z.string().min(1).max(100),
        cmsVersionRange: z.string().min(1).max(100),
      })
      .strict(),
    destructive: z.literal(false),
    id: z.string().regex(MIGRATION_ID),
    path: z.string().regex(/^migrations\/\d{4}_[a-z0-9_]+\.sql$/),
    requiresBackup: z.boolean(),
    rollbackPolicy: z.literal("expand_compatible"),
    schemaVersion: z.number().int().positive(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.path !== `migrations/${value.id}`) {
      context.addIssue({
        code: "custom",
        message: "migration_path_id_mismatch",
      });
    }
  });

const releaseMigrationDescriptorV2Schema = z
  .object({
    checksum: z.string().regex(SHA256),
    destructive: z.literal(false),
    id: z.string().regex(MIGRATION_ID),
    path: z.string().regex(/^migrations\/\d{4}_[a-z0-9_]+\.sql$/),
    postconditionSchemaFingerprintSha256: z.string().regex(SHA256),
    requiresBackup: z.literal(true),
    rollbackPolicy: z.literal("expand_compatible"),
    schemaVersion: z.number().int().positive(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.path !== `migrations/${value.id}`) {
      context.addIssue({
        code: "custom",
        message: "migration_path_id_mismatch",
      });
    }
  });

const artifactInventoryEntrySchema = z
  .object({
    path: z.string().min(1),
    sha256: z.string().regex(SHA256),
    size: z.number().int().nonnegative(),
  })
  .strict();

const releaseManifestV2PayloadSchema = z
  .object({
    addonKey: z.enum(["webshop", "license-server"]),
    artifactInventory: z
      .object({
        contractVersion: z.literal(1),
        digestPurpose: z.literal("addon_runtime_payload"),
        entries: z.array(artifactInventoryEntrySchema).min(1),
      })
      .strict(),
    artifactSha256: z.string().regex(SHA256),
    capabilities: z.array(z.string().min(1)),
    channel: z.literal("stable"),
    cmsGitSha: z.string().regex(/^[a-f0-9]{40}$/),
    cmsVersionRange: z.string().min(1).max(100),
    dependencyLockSha256: z.string().regex(SHA256),
    entrypoints: z.object({ server: z.literal("./dist/server.js") }).strict(),
    manifestVersion: z.literal(2),
    migrationBundleHash: z.string().regex(SHA256),
    migrations: z.array(releaseMigrationDescriptorV2Schema),
    minimumCoreSchemaVersion: z.number().int().positive(),
    nextVersionRange: z.string().min(1).max(100),
    nodeVersionRange: z.string().min(1).max(100),
    packageName: z.enum([
      "@radomirradojevic/webshop",
      "@nr-cms/license-server",
    ]),
    packageVersion: z
      .string()
      .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/),
    purpose: z.literal("addon_release_manifest"),
    releaseId: z.string().uuid(),
    releaseSigningKid: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/),
    releasedAt: z.string().min(1),
    runtimeContractVersion: z.literal("1"),
    schemaVersion: z.number().int().positive(),
    sourceGitSha: z
      .string()
      .regex(/^[a-f0-9]{40}$/)
      .optional(),
    supportedAddonSchemaVersionMax: z.number().int().positive(),
    supportedAddonSchemaVersionMin: z.number().int().positive(),
    supportedLicenseEditions: z.tuple([z.literal("standard")]),
    webshopTagGitSha: z
      .string()
      .regex(/^[a-f0-9]{40}$/)
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const identityMatches =
      (value.addonKey === "webshop" &&
        value.packageName === "@radomirradojevic/webshop" &&
        value.webshopTagGitSha &&
        !value.sourceGitSha) ||
      (value.addonKey === "license-server" &&
        value.packageName === "@nr-cms/license-server" &&
        value.sourceGitSha &&
        !value.webshopTagGitSha);
    if (!identityMatches) {
      context.addIssue({
        code: "custom",
        message: "release_identity_mismatch",
      });
    }
  });

export type AddonMigrationLedgerEntry = {
  addonKey: "webshop" | "license-server";
  checksum: string;
  errorCode: string | null;
  migrationId: string;
  packageVersion: string;
  releaseId: string | null;
  schemaVersion: number;
  status: "pending" | "applying" | "applied" | "failed" | "legacy_applied";
};

export type AddonMigrationTransaction = {
  executeSql(sql: string): Promise<void>;
  writeLedger(entry: AddonMigrationLedgerEntry): Promise<void>;
};

export type AddonMigrationStore = {
  readLedger(
    addonKey: AddonMigrationLedgerEntry["addonKey"],
  ): Promise<readonly AddonMigrationLedgerEntry[]>;
  runInTransaction<T>(
    work: (transaction: AddonMigrationTransaction) => Promise<T>,
  ): Promise<T>;
  withAdvisoryLock<T>(key: string, work: () => Promise<T>): Promise<T>;
  writeFailure(entry: AddonMigrationLedgerEntry): Promise<void>;
};

export type VerifiedAddonMigrationBundle = {
  addonKey: AddonMigrationLedgerEntry["addonKey"];
  descriptors: readonly AddonMigrationDescriptorV2[];
  packageVersion: string;
  releaseId: string | null;
  sqlById: ReadonlyMap<string, string>;
};

export function verifyAddonMigrationBundle(input: {
  addonKey: AddonMigrationLedgerEntry["addonKey"];
  files: ReadonlyMap<string, Buffer | string>;
  packageName: "@radomirradojevic/webshop" | "@nr-cms/license-server";
  publicKeyPem: string;
  releaseManifest: unknown;
}): VerifiedAddonMigrationBundle {
  const release = readMigrationRelease(
    input.releaseManifest,
    input.publicKeyPem,
  );
  const manifest = release.manifest;
  if (
    manifest.addonKey !== input.addonKey ||
    manifest.packageName !== input.packageName
  ) {
    throw new Error("migration_package_identity_mismatch");
  }
  if (!release.signatureValid) {
    throw new Error("migration_release_signature_invalid");
  }
  const migrationManifestBytes = requireFile(input.files, "migrations.json");
  assertArtifactFile(
    release.artifactFiles,
    "migrations.json",
    migrationManifestBytes,
  );
  let rawDescriptors: unknown;
  try {
    rawDescriptors = JSON.parse(migrationManifestBytes.toString("utf8"));
  } catch {
    throw new Error("migration_manifest_json_invalid");
  }
  if (canonicalJson(rawDescriptors) !== canonicalJson(release.migrations)) {
    throw new Error("migration_manifest_release_mismatch");
  }
  const descriptors = release.isV2
    ? releaseMigrationDescriptorV2Schema
        .array()
        .parse(rawDescriptors)
        .map(
          (descriptor): AddonMigrationDescriptorV2 => ({
            checksum: descriptor.checksum,
            compatibility: {
              addonVersionRange: manifest.packageVersion,
              cmsVersionRange: release.cmsVersionRange,
            },
            destructive: false,
            id: descriptor.id,
            path: descriptor.path as `migrations/${string}.sql`,
            requiresBackup: true,
            rollbackPolicy: "expand_compatible",
            schemaVersion: descriptor.schemaVersion,
          }),
        )
    : (z
        .array(addonMigrationDescriptorV2Schema)
        .parse(rawDescriptors) as AddonMigrationDescriptorV2[]);
  assertMonotonicMigrations(descriptors);
  if (descriptors.length > 0 && !release.migrationBundleHash) {
    throw new Error("migration_bundle_hash_missing");
  }
  if (
    release.migrationBundleHash &&
    sha256(Buffer.from(canonicalJson(rawDescriptors), "utf8")) !==
      release.migrationBundleHash
  ) {
    throw new Error("migration_bundle_hash_mismatch");
  }
  const sqlById = new Map<string, string>();
  for (const descriptor of descriptors) {
    const bytes = requireFile(input.files, descriptor.path);
    assertArtifactFile(release.artifactFiles, descriptor.path, bytes);
    if (sha256(bytes) !== descriptor.checksum) {
      throw new Error("migration_checksum_mismatch");
    }
    const sql = bytes.toString("utf8");
    assertAdditiveMigrationSql(sql);
    sqlById.set(descriptor.id, sql);
  }
  return {
    addonKey: input.addonKey,
    descriptors,
    packageVersion: manifest.packageVersion,
    releaseId: release.releaseId,
    sqlById,
  };
}

function readMigrationRelease(releaseManifest: unknown, publicKeyPem: string) {
  if (isFlattenedJws(releaseManifest)) {
    const envelope = z
      .object({
        payload: z.string().regex(/^[A-Za-z0-9_-]+$/),
        protected: z.string().regex(/^[A-Za-z0-9_-]+$/),
        signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/),
      })
      .strict()
      .parse(releaseManifest);
    const header = z
      .object({
        alg: z.literal("EdDSA"),
        kid: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/),
        typ: z.literal("NRV-ADDON-RELEASE-MANIFEST-V2+JWS"),
      })
      .strict()
      .parse(decodeCanonicalBase64urlJson(envelope.protected));
    const payload = releaseManifestV2PayloadSchema.parse(
      decodeCanonicalBase64urlJson(envelope.payload),
    );
    if (header.kid !== payload.releaseSigningKid) {
      throw new Error("migration_release_signature_invalid");
    }
    const signature = Buffer.from(envelope.signature, "base64url");
    if (signature.toString("base64url") !== envelope.signature) {
      throw new Error("migration_release_signature_invalid");
    }
    let signatureValid = false;
    try {
      signatureValid = verifySignature(
        null,
        Buffer.from(`${envelope.protected}.${envelope.payload}`, "ascii"),
        createPublicKey(publicKeyPem),
        signature,
      );
    } catch {
      signatureValid = false;
    }
    const artifactFiles = payload.artifactInventory.entries;
    if (
      sha256(
        Buffer.from(
          canonicalJson({
            contractVersion: 1,
            digestPurpose: "addon_runtime_payload",
            entries: artifactFiles,
          }),
          "utf8",
        ),
      ) !== payload.artifactSha256
    ) {
      throw new Error("migration_artifact_inventory_mismatch");
    }
    return {
      artifactFiles,
      cmsVersionRange: payload.cmsVersionRange,
      isV2: true as const,
      manifest: {
        addonKey: payload.addonKey,
        packageName: payload.packageName,
        packageVersion: payload.packageVersion,
      },
      migrationBundleHash: payload.migrationBundleHash,
      migrations: payload.migrations,
      releaseId: payload.releaseId,
      signatureValid,
    };
  }

  const manifest = signedAddonReleaseManifestV1Schema.parse(releaseManifest);
  return {
    artifactFiles: manifest.artifact.files,
    cmsVersionRange: manifest.cmsVersionRange,
    isV2: false as const,
    manifest,
    migrationBundleHash: manifest.migrationBundleHash,
    migrations: manifest.migrations,
    releaseId: readReleaseId(manifest),
    signatureValid: verifyAddonReleaseManifestSignature(manifest, publicKeyPem),
  };
}

function isFlattenedJws(
  value: unknown,
): value is { payload: string; protected: string; signature: string } {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "payload" in value &&
    "protected" in value &&
    "signature" in value,
  );
}

function decodeCanonicalBase64urlJson(value: string) {
  const bytes = Buffer.from(value, "base64url");
  if (bytes.toString("base64url") !== value) {
    throw new Error("migration_release_encoding_invalid");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("migration_release_encoding_invalid");
  }
  if (Buffer.from(canonicalJson(parsed), "utf8").compare(bytes) !== 0) {
    throw new Error("migration_release_encoding_invalid");
  }
  return parsed;
}

export async function applyVerifiedAddonMigrations(input: {
  bundle: VerifiedAddonMigrationBundle;
  cmsVersion: string;
  store: AddonMigrationStore;
  verifyLegacyBaseline?: (
    descriptor: AddonMigrationDescriptorV2,
  ) => Promise<boolean>;
}) {
  const lockKey = `nr-cms:addon-migrations:${input.bundle.addonKey}`;
  return input.store.withAdvisoryLock(lockKey, async () => {
    const initial = await input.store.readLedger(input.bundle.addonKey);
    assertLedgerIntegrity(input.bundle, initial);
    const applied: string[] = [];
    const adopted: string[] = [];
    const skipped: string[] = [];
    for (const descriptor of input.bundle.descriptors) {
      assertCompatible(
        descriptor,
        input.cmsVersion,
        input.bundle.packageVersion,
      );
      const current = (
        await input.store.readLedger(input.bundle.addonKey)
      ).find((entry) => entry.migrationId === descriptor.id);
      if (current && current.checksum !== descriptor.checksum) {
        throw new Error("migration_checksum_drift");
      }
      if (
        current?.status === "applied" ||
        current?.status === "legacy_applied"
      ) {
        skipped.push(descriptor.id);
        continue;
      }
      if (
        !current &&
        input.verifyLegacyBaseline &&
        (await input.verifyLegacyBaseline(descriptor))
      ) {
        await input.store.runInTransaction((transaction) =>
          transaction.writeLedger(
            ledgerEntry(input.bundle, descriptor, "legacy_applied", null),
          ),
        );
        adopted.push(descriptor.id);
        continue;
      }
      const sql = input.bundle.sqlById.get(descriptor.id);
      if (!sql) throw new Error("migration_payload_missing");
      try {
        await input.store.runInTransaction(async (transaction) => {
          await transaction.writeLedger(
            ledgerEntry(input.bundle, descriptor, "applying", null),
          );
          await transaction.executeSql(sql);
          await transaction.writeLedger(
            ledgerEntry(input.bundle, descriptor, "applied", null),
          );
        });
        applied.push(descriptor.id);
      } catch (error) {
        await input.store.writeFailure(
          ledgerEntry(
            input.bundle,
            descriptor,
            "failed",
            sanitizeMigrationError(error),
          ),
        );
        throw error;
      }
    }
    const ledger = await input.store.readLedger(input.bundle.addonKey);
    assertLedgerIntegrity(input.bundle, ledger);
    return { adopted, applied, ledger, skipped };
  });
}

export function assertAdditiveMigrationSql(sql: string) {
  const normalized = sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, " ")
    .replace(/'(?:''|[^'])*'/g, "''")
    .replace(/\s+/g, " ")
    .toLowerCase();
  if (
    /\b(?:drop|truncate|grant|revoke|create\s+role|alter\s+role|set\s+role|copy)\b/.test(
      normalized,
    ) ||
    /\bdelete\s+from\b/.test(normalized) ||
    /\bdo\s+\$/.test(normalized) ||
    /\b(?:execute|program)\b/.test(normalized)
  ) {
    throw new Error("migration_sql_not_additive");
  }
  if (
    !/\b(?:create\s+(?:table|index|unique\s+index)|alter\s+table)\b/.test(
      normalized,
    )
  ) {
    throw new Error("migration_sql_has_no_schema_change");
  }
}

function assertMonotonicMigrations(
  descriptors: readonly AddonMigrationDescriptorV2[],
) {
  let previousId = "";
  let previousSchemaVersion = 0;
  for (const descriptor of descriptors) {
    if (
      descriptor.id <= previousId ||
      descriptor.schemaVersion <= previousSchemaVersion
    ) {
      throw new Error("migration_order_not_monotonic");
    }
    previousId = descriptor.id;
    previousSchemaVersion = descriptor.schemaVersion;
  }
}

function assertLedgerIntegrity(
  bundle: VerifiedAddonMigrationBundle,
  entries: readonly AddonMigrationLedgerEntry[],
) {
  const descriptors = new Map(
    bundle.descriptors.map((item) => [item.id, item]),
  );
  for (const entry of entries) {
    if (entry.addonKey !== bundle.addonKey)
      throw new Error("migration_ledger_addon_mismatch");
    const descriptor = descriptors.get(entry.migrationId);
    if (descriptor && descriptor.checksum !== entry.checksum) {
      throw new Error("migration_checksum_drift");
    }
  }
}

function assertCompatible(
  descriptor: AddonMigrationDescriptorV2,
  cmsVersion: string,
  addonVersion: string,
) {
  if (
    !semverSatisfies(cmsVersion, descriptor.compatibility.cmsVersionRange) ||
    !semverSatisfies(addonVersion, descriptor.compatibility.addonVersionRange)
  ) {
    throw new Error("migration_compatibility_mismatch");
  }
}

function semverSatisfies(version: string, range: string) {
  const current = parseSemver(version);
  if (range.startsWith("^")) {
    const floor = parseSemver(range.slice(1));
    const ceiling =
      floor[0] > 0
        ? ([floor[0] + 1, 0, 0] as const)
        : floor[1] > 0
          ? ([0, floor[1] + 1, 0] as const)
          : ([0, 0, floor[2] + 1] as const);
    return (
      compareSemver(current, floor) >= 0 && compareSemver(current, ceiling) < 0
    );
  }
  if (range.startsWith(">=")) {
    const [lower, upper] = range.split(/\s+/);
    return Boolean(
      lower &&
      upper?.startsWith("<") &&
      compareSemver(current, parseSemver(lower.slice(2))) >= 0 &&
      compareSemver(current, parseSemver(upper.slice(1))) < 0,
    );
  }
  return compareSemver(current, parseSemver(range)) === 0;
}

function parseSemver(value: string): readonly [number, number, number] {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
  if (!match) throw new Error("migration_semver_invalid");
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareSemver(
  left: readonly [number, number, number],
  right: readonly [number, number, number],
) {
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}

function ledgerEntry(
  bundle: VerifiedAddonMigrationBundle,
  descriptor: AddonMigrationDescriptorV2,
  status: AddonMigrationLedgerEntry["status"],
  errorCode: string | null,
): AddonMigrationLedgerEntry {
  return {
    addonKey: bundle.addonKey,
    checksum: descriptor.checksum,
    errorCode,
    migrationId: descriptor.id,
    packageVersion: bundle.packageVersion,
    releaseId: bundle.releaseId,
    schemaVersion: descriptor.schemaVersion,
    status,
  };
}

function assertArtifactFile(
  artifactFiles: ReadonlyArray<{ path: string; sha256: string; size: number }>,
  path: string,
  bytes: Buffer,
) {
  const artifact = artifactFiles.find((item) => item.path === path);
  if (!artifact) throw new Error("migration_artifact_inventory_missing");
  if (artifact.size !== bytes.length || artifact.sha256 !== sha256(bytes)) {
    throw new Error("migration_artifact_inventory_mismatch");
  }
}

function requireFile(
  files: ReadonlyMap<string, Buffer | string>,
  path: string,
) {
  const value = files.get(path);
  if (value === undefined) throw new Error("migration_package_file_missing");
  return Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
}

function readReleaseId(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const releaseId = (value as Record<string, unknown>).releaseId;
  return typeof releaseId === "string" && /^[0-9a-f-]{36}$/.test(releaseId)
    ? releaseId
    : null;
}

function sanitizeMigrationError(error: unknown) {
  const value =
    error instanceof Error ? error.message : "migration_apply_failed";
  return /^[a-z0-9_]+$/.test(value) ? value : "migration_apply_failed";
}

function sha256(value: Buffer) {
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
  if (!value || typeof value !== "object")
    throw new Error("migration_manifest_not_json");
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}
