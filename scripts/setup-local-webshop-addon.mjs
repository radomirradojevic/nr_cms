import { createHash, generateKeyPairSync, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const webshopRoot = resolve(root, ".private", "webshop");
const licenseServerAddonRoot = resolve(
  root,
  ".private",
  "license-server-addon",
);
const masterLicenseServerRoot = resolve(root, ".private", "license-server");
const authorityRoot = resolve(root, ".tmp", "local-addon-release-authority");
const privateKeyFile = join(authorityRoot, "authority.pk8.pem");
const publicKeysFile = join(authorityRoot, "public-keys.json");
const metadataFile = join(authorityRoot, "metadata.json");
const localRegistryFile = resolve(root, ".tmp", "addons.registry.local.json");
const localBuildInputsFile = resolve(root, ".tmp", "addon-build-inputs.json");

const privateRootsPresent = [
  webshopRoot,
  licenseServerAddonRoot,
  masterLicenseServerRoot,
].map((path) => existsSync(path));
if (privateRootsPresent.every((present) => !present)) {
  console.log(
    "No private addon workspace found; local addon setup was skipped.",
  );
  process.exit(0);
}
if (privateRootsPresent.some((present) => !present)) {
  throw new Error(
    "Local addon parity requires .private/webshop, .private/license-server-addon, and .private/license-server.",
  );
}

const authority = await ensureLocalReleaseAuthority();
await ensureMasterLicenseServerEnv();
const manifests = [];
for (const addonRoot of [webshopRoot, licenseServerAddonRoot]) {
  await run("node", ["scripts/build-release.mjs"], {
    cwd: addonRoot,
    env: authority.env,
  });
  manifests.push(
    await readLocalReleaseManifest(join(addonRoot, "release-manifest.json")),
  );
}
await writeLocalAddonRegistry(manifests);
await writeLocalAddonBuildInputs();
await ensureRootEnv();
await removeLegacyLocalAddonPackage("@nr-cms/webshop");
await installLocalAddonPackage(webshopRoot, "@radomirradojevic/webshop");
await installLocalAddonPackage(
  licenseServerAddonRoot,
  "@nr-cms/license-server",
);
await run("node", ["scripts/generate-addon-registry.mjs"], {
  cwd: root,
  env: {},
});

console.log("Local private addons are installed and registered.");
console.log(`Local registry: ${relativeForLog(localRegistryFile)}`);
console.log(`Release public keys: ${relativeForLog(publicKeysFile)}`);
for (const manifest of manifests) {
  console.log(`${manifest.addonKey} artifact: ${manifest.artifact.sha256}`);
}

async function ensureLocalReleaseAuthority() {
  await mkdir(authorityRoot, { recursive: true });

  if (
    existsSync(privateKeyFile) &&
    existsSync(publicKeysFile) &&
    existsSync(metadataFile)
  ) {
    const metadata = JSON.parse(await readFile(metadataFile, "utf8"));
    if (typeof metadata.kid !== "string" || !metadata.kid) {
      throw new Error("Local release authority metadata is invalid.");
    }
    const storedKeyset = JSON.parse(await readFile(publicKeysFile, "utf8"));
    const legacyPublicKeyPem = storedKeyset[metadata.kid];
    const keyset =
      Object.keys(storedKeyset).length === 1 &&
      typeof legacyPublicKeyPem === "string" &&
      legacyPublicKeyPem
        ? makeLocalReleaseKeyset({
            kid: metadata.kid,
            publicKeyPem: legacyPublicKeyPem,
            generatedAt: metadata.createdAt,
          })
        : storedKeyset;
    if (!isExpectedLocalReleaseKeyset(keyset, metadata.kid)) {
      throw new Error("Local release authority public keyset is invalid.");
    }
    await writeFile(publicKeysFile, canonicalJson(keyset), {
      encoding: "utf8",
      mode: 0o600,
    });
    return {
      kid: metadata.kid,
      env: authorityEnv(metadata.kid),
    };
  }

  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const privateKeyMaterial = Buffer.from(
    privateKey.export({ format: "pem", type: "pkcs8" }),
  );
  const publicKeyPem = publicKey
    .export({ format: "pem", type: "spki" })
    .toString();
  const kid = `local-dev:${createHash("sha256")
    .update(publicKeyPem)
    .digest("hex")
    .slice(0, 16)}`;

  await writeFile(privateKeyFile, privateKeyMaterial, { mode: 0o600 });
  privateKeyMaterial.fill(0);
  await writeFile(
    publicKeysFile,
    canonicalJson(
      makeLocalReleaseKeyset({
        kid,
        publicKeyPem,
        generatedAt: new Date().toISOString(),
      }),
    ),
    { encoding: "utf8", mode: 0o600 },
  );
  await writeFile(
    metadataFile,
    `${JSON.stringify({ createdAt: new Date().toISOString(), kid }, null, 2)}\n`,
    "utf8",
  );
  return {
    kid,
    env: authorityEnv(kid),
  };
}

function authorityEnv(kid) {
  return {
    NR_ADDON_RELEASE_AUTHORITY_MODE: "ephemeral-local-acceptance",
    NR_ADDON_RELEASE_PUBLIC_KEYS_FILE: publicKeysFile,
    NR_ADDON_RELEASE_SIGNING_KEY_FILE: privateKeyFile,
    NR_ADDON_RELEASE_SIGNING_KID: kid,
  };
}

function makeLocalReleaseKeyset({ kid, publicKeyPem, generatedAt }) {
  if (
    typeof generatedAt !== "string" ||
    !Number.isFinite(Date.parse(generatedAt))
  ) {
    throw new Error("Local release authority metadata timestamp is invalid.");
  }
  return {
    contractVersion: 1,
    generatedAt: new Date(generatedAt).toISOString(),
    issuer: "https://github.com/radomirradojevic/webshop",
    keys: [
      {
        alg: "EdDSA",
        kid,
        notAfter: null,
        notBefore: "2020-01-01T00:00:00.000Z",
        publicKeyPem,
        status: "active",
      },
    ],
    previousKeysetSha256: null,
    purpose: "addon_release",
    sequence: 1,
  };
}

function isExpectedLocalReleaseKeyset(keyset, kid) {
  return (
    keyset &&
    keyset.contractVersion === 1 &&
    keyset.issuer === "https://github.com/radomirradojevic/webshop" &&
    keyset.purpose === "addon_release" &&
    keyset.sequence === 1 &&
    keyset.previousKeysetSha256 === null &&
    Array.isArray(keyset.keys) &&
    keyset.keys.length === 1 &&
    keyset.keys[0]?.alg === "EdDSA" &&
    keyset.keys[0]?.kid === kid &&
    keyset.keys[0]?.notAfter === null &&
    keyset.keys[0]?.notBefore === "2020-01-01T00:00:00.000Z" &&
    typeof keyset.keys[0]?.publicKeyPem === "string" &&
    keyset.keys[0]?.publicKeyPem.length > 0 &&
    keyset.keys[0]?.status === "active"
  );
}

function canonicalJson(value) {
  if (Array.isArray(value)) return JSON.stringify(value.map(canonicalize));
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

async function writeLocalAddonRegistry(manifests) {
  const expectedPackages = new Map([
    ["webshop", "@radomirradojevic/webshop"],
    ["license-server", "@nr-cms/license-server"],
  ]);
  const entries = manifests.map((manifest) => {
    if (
      expectedPackages.get(manifest.addonKey) !== manifest.packageName ||
      typeof manifest.packageVersion !== "string" ||
      !/^[a-f0-9]{64}$/.test(manifest.artifact?.sha256 ?? "") ||
      typeof manifest.signingKid !== "string"
    ) {
      throw new Error(
        `Built ${String(manifest.addonKey)} release manifest is not valid.`,
      );
    }
    return {
      addonKey: manifest.addonKey,
      artifactSha256: manifest.artifact.sha256,
      ...(manifest.embeddedManifestSha256
        ? { embeddedManifestSha256: manifest.embeddedManifestSha256 }
        : {}),
      packageName: manifest.packageName,
      packageVersion: manifest.packageVersion,
      signingKid: manifest.signingKid,
    };
  });
  if (entries.length !== expectedPackages.size) {
    throw new Error("Both local private addon manifests are required.");
  }
  await writeFile(
    localRegistryFile,
    `${JSON.stringify({ addons: entries }, null, 2)}\n`,
    "utf8",
  );
}

async function readLocalReleaseManifest(manifestPath) {
  const manifestBytes = await readFile(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (
    manifest &&
    typeof manifest === "object" &&
    typeof manifest.protected === "string" &&
    typeof manifest.payload === "string" &&
    typeof manifest.signature === "string"
  ) {
    let payload;
    try {
      payload = JSON.parse(
        Buffer.from(manifest.payload, "base64url").toString("utf8"),
      );
    } catch {
      throw new Error("Local V2 add-on release manifest payload is invalid.");
    }
    if (
      !payload ||
      typeof payload !== "object" ||
      typeof payload.addonKey !== "string" ||
      typeof payload.packageName !== "string" ||
      typeof payload.packageVersion !== "string" ||
      !/^[a-f0-9]{64}$/.test(payload.artifactSha256 ?? "") ||
      typeof payload.releaseSigningKid !== "string"
    ) {
      throw new Error("Local V2 add-on release manifest identity is invalid.");
    }
    return {
      addonKey: payload.addonKey,
      artifact: { sha256: payload.artifactSha256 },
      embeddedManifestSha256: createHash("sha256")
        .update(manifestBytes)
        .digest("hex"),
      packageName: payload.packageName,
      packageVersion: payload.packageVersion,
      signingKid: payload.releaseSigningKid,
    };
  }
  return manifest;
}

async function writeLocalAddonBuildInputs() {
  await writeFile(
    localBuildInputsFile,
    `${JSON.stringify(
      {
        registryFile: relative(root, localRegistryFile).replaceAll("\\", "/"),
        releasePublicKeysFile: relative(root, publicKeysFile).replaceAll(
          "\\",
          "/",
        ),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function ensureMasterLicenseServerEnv() {
  const envPath = resolve(masterLicenseServerRoot, ".env");
  if (!existsSync(envPath)) {
    throw new Error(".private/license-server/.env was not found.");
  }
  const current = await readFile(envPath, "utf8");
  let next = current.replace(
    /^VENDOR_SIGNED_ENTITLEMENTS_V1=.*(?:\r?\n|$)/gm,
    "",
  );
  const additions = [];
  const replaceKnown = (key, from, to) => {
    const line = `${key}=${from}`;
    if (next.includes(line)) next = next.replace(line, `${key}=${to}`);
  };
  const ensure = (key, value) => {
    const configured = new RegExp(`^${escapeRegExp(key)}=[ \\t]*\\S.*$`, "m");
    const empty = new RegExp(`^${escapeRegExp(key)}=[ \\t]*$`, "m");
    if (configured.test(next)) return;
    if (empty.test(next)) next = next.replace(empty, `${key}=${value}`);
    else additions.push(`${key}=${value}`);
  };

  ensure("NR_MIGRATION_TARGET", "development");
  ensure("NR_MIGRATION_SERVICE", "central");
  ensure("NR_MIGRATION_EXPECTED_HOST", "localhost");
  ensure("NR_MIGRATION_EXPECTED_DATABASE", "nr_cms_license_server");
  ensure("NR_MIGRATION_EXPECTED_PROVIDER_RESOURCE_ID", "local-postgres");
  ensure("NR_MIGRATION_PROVIDER_RESOURCE_ID", "local-postgres");
  ensure("NRLS_ENVIRONMENT", "development");
  replaceKnown(
    "NRLS_PUBLIC_URL",
    "http://localhost:3001",
    "https://license.nr.test",
  );
  ensure("NRLS_PUBLIC_URL", "https://license.nr.test");
  ensure("NRLS_RATE_LIMIT_STORE", "postgres");

  if (additions.length === 0 && next === current) return;
  const prefix = next.endsWith("\n") || next.length === 0 ? "" : "\n";
  await writeFile(
    envPath,
    `${next}${prefix}${additions.length > 0 ? `\n# Shared runtime/deployment env contract\n${additions.join("\n")}\n` : ""}`,
    "utf8",
  );
  console.log("Updated local master License Server environment contract.");
}

async function ensureRootEnv() {
  const envPath = resolve(root, ".env");
  const current = existsSync(envPath) ? await readFile(envPath, "utf8") : "";
  const additions = [];
  const replaceKnown = (key, from, to) => {
    const line = `${key}=${from}`;
    if (next.includes(line)) next = next.replace(line, `${key}=${to}`);
  };
  let next = current.replace(
    /^(?:ADDON_INSTALL_RECONCILIATION_V1|ADDON_SDK_V1|APP_URL|LICENSE_SERVER_ALLOW_LOCAL_DEV_INSTALL|LICENSE_SERVER_ENTITLEMENT_CRON_SECRET|LICENSE_SERVER_LICENSE_API_URL|LICENSE_SERVER_LICENSE_KEY|LICENSE_SERVER_PACKAGE_TOKEN|LICENSE_SERVER_SELF_HOSTED_SITE_ID|NR_ADDON_RELEASE_PUBLIC_KEYS_FILE|NR_ADDONS_REGISTRY_FILE|NR_VENDOR_ENTITLEMENT_PUBLIC_KEYS_JSON|VENDOR_SIGNED_ENTITLEMENTS_V1|WEBSHOP_ALLOW_LOCAL_DEV_INSTALL|WEBSHOP_BUY_LINK_SECRET|WEBSHOP_ENTITLEMENT_CRON_SECRET|WEBSHOP_LICENSE_API_URL|WEBSHOP_LICENSE_ISSUE_CRON_SECRET|WEBSHOP_LICENSE_KEY|WEBSHOP_LICENSE_PUBLIC_KEY|WEBSHOP_PACKAGE_TOKEN|WEBSHOP_SELF_HOSTED_SITE_ID)=.*(?:\r?\n|$)/gm,
    "",
  );
  const ensure = (key, value) => {
    const configured = new RegExp(`^${escapeRegExp(key)}=[ \\t]*\\S.*$`, "m");
    const empty = new RegExp(`^${escapeRegExp(key)}=[ \\t]*$`, "m");

    if (configured.test(next)) return;
    if (empty.test(next)) {
      next = next.replace(empty, `${key}=${value}`);
    } else {
      additions.push(`${key}=${value}`);
    }
  };

  replaceKnown(
    "NEXT_PUBLIC_APP_URL",
    "http://localhost:3000",
    "https://vendor.nr.test",
  );
  replaceKnown(
    "NR_MASTER_LICENSE_URL",
    "http://localhost:3001",
    "https://license.nr.test",
  );
  replaceKnown("NR_ALLOW_INSECURE_LOOPBACK_HTTP", "true", "false");
  replaceKnown(
    "NRLS_ALLOWED_OUTBOUND_HOSTS",
    "ls.nrcms.com",
    "license.nr.test",
  );
  replaceKnown("NRLS_ALLOW_SELF_HOSTED_OUTBOUND", "false", "true");
  replaceKnown(
    "WEBSHOP_BUY_URL",
    "https://www.nrcms.com/webshop",
    "https://vendor.nr.test/licenses/purchase-intents/accept",
  );
  ensure("NR_CMS_DEPLOYMENT_PROFILE", "development");
  ensure("NR_LICENSE_ENVIRONMENT", "development");
  ensure("NR_ADDON_SOURCE_MODE", "private_workspace");
  ensure("NEXT_PUBLIC_APP_URL", "https://vendor.nr.test");
  ensure("NR_MASTER_LICENSE_URL", "https://license.nr.test");
  ensure("WEBSHOP_ENABLED", "true");
  ensure("WEBSHOP_STOREFRONT_ENABLED", "true");
  ensure("WEBSHOP_CHECKOUT_ENABLED", "true");
  ensure("WEBSHOP_INSTALL_MODE", "managed_redeploy");
  ensure("WEBSHOP_DEPLOYMENT_MODE", "self_hosted");
  ensure("LICENSE_SERVER_ENABLED", "true");
  ensure("LICENSE_SERVER_INSTALL_MODE", "managed_redeploy");
  ensure("LICENSE_SERVER_DEPLOYMENT_MODE", "self_hosted");
  ensure("LICENSE_SERVER_CUSTOMER_ENVIRONMENT", "development");
  ensure("NR_ALLOW_INSECURE_LOOPBACK_HTTP", "false");
  ensure("NRLS_ALLOWED_OUTBOUND_HOSTS", "license.nr.test");
  ensure("NRLS_ALLOW_SELF_HOSTED_OUTBOUND", "true");
  ensure(
    "NR_ADDON_INSTALLATION_ENCRYPTION_KEY",
    randomBytes(32).toString("base64url"),
  );
  ensure("WEBSHOP_CART_TOKEN_SALT", randomBytes(32).toString("base64url"));
  ensure(
    "WEBSHOP_DOWNLOAD_TOKEN_SECRET",
    randomBytes(32).toString("base64url"),
  );
  ensure(
    "WEBSHOP_DOWNLOAD_EVENT_HASH_SECRET",
    randomBytes(32).toString("base64url"),
  );
  ensure(
    "WEBSHOP_LICENSE_SERVER_SECRET_KEY",
    randomBytes(32).toString("base64url"),
  );
  ensure(
    "WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KEY",
    randomBytes(32).toString("base64url"),
  );
  ensure(
    "WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KID",
    "webshop-issued-license-kek-local-v1",
  );
  ensure("WEBSHOP_ISSUED_LICENSE_KEY_DECRYPTION_KEYS_JSON", "{}");
  ensure(
    "WEBSHOP_DELIVERY_WORKER_SECRET",
    randomBytes(32).toString("base64url"),
  );
  ensure(
    "WEBSHOP_ENTITLEMENT_REVALIDATION_WORKER_SECRET",
    randomBytes(32).toString("base64url"),
  );
  ensure(
    "NR_ADDON_TRANSFER_APPROVAL_SECRET",
    randomBytes(32).toString("base64url"),
  );
  ensure("NR_ADDON_TRANSFER_APPROVAL_KID", "local-transfer-approval-v1");
  ensure("WEBSHOP_POST_ISSUE_LICENSE_STATUS_MAX_AGE_SECONDS", "60");
  ensure("WEBSHOP_DELIVERY_EMAIL_PROVIDER", "fixture");
  ensure("LICENSE_SERVER_SECRET_KEY", randomBytes(32).toString("base64url"));
  ensure(
    "LICENSE_SERVER_RUNTIME_HASH_SECRET",
    randomBytes(32).toString("base64url"),
  );
  ensure("LICENSE_SERVER_TRUSTED_PROXY_HOPS", "1");
  ensure("WEBSHOP_PAYMENTS_MODE", "test");
  ensure("WEBSHOP_COOKIE_SECURE", "false");
  ensure("STORAGE_PROVIDER", "local");
  ensure("UPLOADS_DIR", "./storage/uploads");
  ensure(
    "WEBSHOP_BUY_URL",
    "https://vendor.nr.test/licenses/purchase-intents/accept",
  );
  ensure("WEBSHOP_BUY_OFFER_KEY", "nr-cms-webshop-license");
  ensure(
    "NR_PURCHASE_INTENT_PUBLIC_KEYS_URL",
    "https://license.nr.test/.well-known/nr-purchase-intent-keys.json",
  );
  ensure(
    "WEBSHOP_PURCHASE_INTENT_SESSION_SECRET",
    randomBytes(32).toString("base64url"),
  );
  ensure("LICENSE_SERVER_BUY_URL", "https://www.nrcms.com/license-server");
  ensure(
    "LICENSE_SERVER_BUY_LINK_SECRET",
    randomBytes(32).toString("base64url"),
  );
  ensure(
    "WEBSHOP_BANK_REDIRECT_WEBHOOK_SECRET",
    randomBytes(32).toString("base64url"),
  );

  if (additions.length === 0 && next === current) return;
  const prefix = next.endsWith("\n") || next.length === 0 ? "" : "\n";
  await writeFile(
    envPath,
    `${next}${prefix}${additions.length > 0 ? `\n# Local private addon runtime parity\n${additions.join("\n")}\n` : ""}`,
    "utf8",
  );
  console.log("Updated local private addon environment settings.");
}

async function installLocalAddonPackage(addonRoot, packageName) {
  const nodeModulesRoot = resolve(root, "node_modules");
  const targetRoot = resolve(nodeModulesRoot, ...packageName.split("/"));
  const targetRelative = relative(nodeModulesRoot, targetRoot);
  if (
    !targetRelative ||
    targetRelative === ".." ||
    targetRelative.startsWith(`..${sep}`) ||
    isAbsolute(targetRelative)
  ) {
    throw new Error(`Refusing unsafe local package target: ${packageName}`);
  }

  await rm(targetRoot, { force: true, recursive: true });
  const optionalEntries = new Set([
    "migrations",
    "release-dependency-lock.json",
    "release-parity.json",
  ]);
  for (const entry of [
    "dist",
    "migrations",
    "migrations.json",
    "package.json",
    "provenance.json",
    "release-dependency-lock.json",
    "release-parity.json",
    "release-manifest.json",
    "sbom.json",
    join("tests", "README.md"),
  ]) {
    const source = resolve(addonRoot, entry);
    if (!existsSync(source)) {
      if (optionalEntries.has(entry)) continue;
      throw new Error(`${packageName} release is missing ${entry}.`);
    }
    const target = resolve(targetRoot, entry);
    await mkdir(dirname(target), { recursive: true });
    await cp(source, target, { recursive: true });
  }
}

async function removeLegacyLocalAddonPackage(packageName) {
  const nodeModulesRoot = resolve(root, "node_modules");
  const targetRoot = resolve(nodeModulesRoot, ...packageName.split("/"));
  const targetRelative = relative(nodeModulesRoot, targetRoot);
  if (
    !targetRelative ||
    targetRelative === ".." ||
    targetRelative.startsWith(`..${sep}`) ||
    isAbsolute(targetRelative)
  ) {
    throw new Error(`Refusing unsafe legacy package target: ${packageName}`);
  }
  await rm(targetRoot, { force: true, recursive: true });
}

function run(command, args, { cwd, env = {} }) {
  return new Promise((resolveRun, reject) => {
    const executable =
      process.platform === "win32" && command === "npm" ? "cmd.exe" : command;
    const executableArgs =
      process.platform === "win32" && command === "npm"
        ? ["/c", "npm", ...args]
        : args;
    const child = spawn(executable, executableArgs, {
      cwd,
      env: { ...process.env, ...env },
      shell: false,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} ended from signal ${signal}.`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${command} failed with exit code ${code}.`));
        return;
      }
      resolveRun();
    });
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function relativeForLog(value) {
  return value.replace(root, ".").replaceAll("\\", "/");
}
