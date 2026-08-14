import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const MANIFEST_PATH = path.join(
  SOURCE_ROOT,
  "contracts",
  "cms-core-privilege-manifest-v1.json",
);
const TARGET_NAMES = new Set(["vendor", "client", "paypal"]);
const POSTGRES_IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/;
const SAFE_PASSWORD_FILE_MAX_BYTES = 16 * 1024;

function fail(message) {
  throw new Error(`[cms-core-db] ${message}`);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function quoteIdentifier(value) {
  if (!POSTGRES_IDENTIFIER.test(value)) {
    fail(
      `invalid PostgreSQL identifier in static contract: ${JSON.stringify(value)}`,
    );
  }
  return `"${value}"`;
}

export function loadCmsCorePrivilegeManifest() {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  } catch {
    fail("CmsCorePrivilegeManifestV1 is missing or invalid JSON.");
  }

  if (
    manifest?.manifestType !== "CmsCorePrivilegeManifestV1" ||
    manifest?.contractVersion !== 1 ||
    !manifest.targets ||
    typeof manifest.targets !== "object"
  ) {
    fail("CmsCorePrivilegeManifestV1 has an unsupported contract version.");
  }

  for (const target of TARGET_NAMES) {
    const value = manifest.targets[target];
    if (!value) fail(`CmsCorePrivilegeManifestV1 is missing ${target}.`);
    for (const role of Object.values(value.roles ?? {})) quoteIdentifier(role);
    quoteIdentifier(value.databaseName);
    if (!value.databaseResourceId?.trim()) {
      fail(`CmsCorePrivilegeManifestV1 ${target} has no database resource ID.`);
    }
    if (
      !value.migratorSecretRef?.startsWith(
        `dpapi-machine://nr-cms-core/${target}/migrator/v1`,
      )
    ) {
      fail(
        `CmsCorePrivilegeManifestV1 ${target} has an invalid migrator secret ref.`,
      );
    }
  }

  return Object.freeze({
    ...manifest,
    manifestHash: sha256(canonicalJson(manifest)),
  });
}

export function resolveCmsCoreTarget(
  targetName,
  manifest = loadCmsCorePrivilegeManifest(),
) {
  if (!TARGET_NAMES.has(targetName)) {
    fail("--target must be exactly vendor, client, or paypal.");
  }
  const target = manifest.targets[targetName];
  return Object.freeze({
    ...target,
    manifestHash: manifest.manifestHash,
    manifestType: manifest.manifestType,
    contractVersion: manifest.contractVersion,
    targetName,
    migrationLedger: manifest.migrationLedger,
    runtimeGrantPolicy: manifest.runtimeGrantPolicy,
  });
}

export function parseStrictArguments(
  argv,
  allowedValueOptions,
  allowedFlags = [],
) {
  const values = new Map();
  const flags = new Set();
  const allowedValues = new Set(allowedValueOptions);
  const allowedFlagSet = new Set(allowedFlags);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (allowedFlagSet.has(argument)) {
      if (flags.has(argument)) fail(`duplicate option ${argument}.`);
      flags.add(argument);
      continue;
    }
    if (!allowedValues.has(argument)) fail(`unexpected option ${argument}.`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(`${argument} requires a value.`);
    if (values.has(argument)) fail(`duplicate option ${argument}.`);
    values.set(argument, value);
    index += 1;
  }

  return { flags, values };
}

export function assertExactTargetDatabaseUrl(value, target, expectedLogin) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("database connection value must be a valid PostgreSQL URL.");
  }
  if (!new Set(["postgres:", "postgresql:"]).has(url.protocol)) {
    fail("database connection value must use postgres or postgresql.");
  }
  const databaseName = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (
    url.hostname !== target.localPostgres.host ||
    Number(url.port || 5432) !== target.localPostgres.port ||
    databaseName !== target.databaseName ||
    decodeURIComponent(url.username) !== expectedLogin
  ) {
    fail(
      `connection target must be the static ${target.targetName} ${expectedLogin} database resource.`,
    );
  }
  return url;
}

export function redactedDatabaseTarget(target, login) {
  return `postgresql://${login}:***@${target.localPostgres.host}:${target.localPostgres.port}/${target.databaseName}`;
}

export function buildLocalDatabaseUrl(
  target,
  login,
  password,
  databaseName = target.databaseName,
) {
  if (typeof password !== "string" || !password)
    fail("password material is empty.");
  return `postgresql://${encodeURIComponent(login)}:${encodeURIComponent(password)}@${target.localPostgres.host}:${target.localPostgres.port}/${databaseName}`;
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

export function assertProtectedPasswordFile(filePath) {
  if (!path.isAbsolute(filePath)) {
    fail("password file must be an absolute path.");
  }

  const normalized = path.resolve(filePath);
  if (isInside(SOURCE_ROOT, normalized)) {
    fail("password file must be outside the source checkout.");
  }

  let stat;
  try {
    stat = fs.lstatSync(normalized);
  } catch {
    fail("password file does not exist.");
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail("password file must be a regular non-symlink file.");
  }
  if (stat.size < 1 || stat.size > SAFE_PASSWORD_FILE_MAX_BYTES) {
    fail("password file size is outside the protected-input limit.");
  }

  const resolved = fs.realpathSync.native(normalized);
  if (resolved !== normalized) {
    fail("password file must not traverse a symlink or reparse point.");
  }
  return normalized;
}

export function readProtectedPasswordFile(filePath) {
  const protectedPath = assertProtectedPasswordFile(filePath);
  const password = fs.readFileSync(protectedPath, "utf8").replace(/\r?\n$/, "");
  if (!password || /[\r\n\0]/.test(password)) {
    fail("password file must contain exactly one non-empty line.");
  }
  return { password, protectedPath };
}

export function migrationSetHash(migrations) {
  return sha256(
    canonicalJson(
      migrations.map(({ hash, tag, when }) => ({ hash, tag, when })),
    ),
  );
}

export function assertRuntimeProfileTarget(env, target) {
  const profile = env.NR_CMS_DEPLOYMENT_PROFILE?.trim();
  if (profile !== target.targetName) {
    fail(
      `NR_CMS_DEPLOYMENT_PROFILE must be ${target.targetName} for this target.`,
    );
  }
}

export const __coreDbContractTesting = {
  MANIFEST_PATH,
  SOURCE_ROOT,
  isInside,
};
