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
    JSON.parse(
      await readFile(join(addonRoot, "release-manifest.json"), "utf8"),
    ),
  );
}
await writeLocalAddonRegistry(manifests);
await writeLocalAddonBuildInputs();
await ensureRootEnv();
await installLocalAddonPackage(webshopRoot, "@nr-cms/webshop");
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
    `${JSON.stringify({ [kid]: publicKeyPem }, null, 2)}\n`,
    { mode: 0o600 },
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
    NR_ADDON_RELEASE_AUTHORITY_MODE: "local-dev",
    NR_ADDON_RELEASE_PUBLIC_KEYS_FILE: publicKeysFile,
    NR_ADDON_RELEASE_SIGNING_KEY_FILE: privateKeyFile,
    NR_ADDON_RELEASE_SIGNING_KID: kid,
  };
}

async function writeLocalAddonRegistry(manifests) {
  const expectedPackages = new Map([
    ["webshop", "@nr-cms/webshop"],
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
  ensure("NRLS_PUBLIC_URL", "http://localhost:3001");
  ensure("VENDOR_LICENSE_API_V2", "false");
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
  let next = current.replace(
    /^(?:ADDON_INSTALL_RECONCILIATION_V1|ADDON_SDK_V1|APP_URL|LICENSE_SERVER_ALLOW_LOCAL_DEV_INSTALL|LICENSE_SERVER_ENTITLEMENT_CRON_SECRET|LICENSE_SERVER_LICENSE_API_URL|LICENSE_SERVER_LICENSE_KEY|LICENSE_SERVER_PACKAGE_TOKEN|LICENSE_SERVER_SELF_HOSTED_SITE_ID|NR_ADDON_RELEASE_PUBLIC_KEYS_FILE|NR_ADDONS_REGISTRY_FILE|NR_VENDOR_ENTITLEMENT_PUBLIC_KEYS_JSON|VENDOR_SIGNED_ENTITLEMENTS_V1|WEBSHOP_ALLOW_LOCAL_DEV_INSTALL|WEBSHOP_ENTITLEMENT_CRON_SECRET|WEBSHOP_LICENSE_API_URL|WEBSHOP_LICENSE_ISSUE_CRON_SECRET|WEBSHOP_LICENSE_KEY|WEBSHOP_LICENSE_PUBLIC_KEY|WEBSHOP_PACKAGE_TOKEN|WEBSHOP_SELF_HOSTED_SITE_ID)=.*(?:\r?\n|$)/gm,
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

  ensure("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  ensure("NR_MASTER_LICENSE_URL", "http://localhost:3001");
  ensure("WEBSHOP_ENABLED", "true");
  ensure("WEBSHOP_STOREFRONT_ENABLED", "true");
  ensure("WEBSHOP_CHECKOUT_ENABLED", "true");
  ensure("WEBSHOP_INSTALL_MODE", "managed_redeploy");
  ensure("WEBSHOP_DEPLOYMENT_MODE", "self_hosted");
  ensure("LICENSE_SERVER_ENABLED", "true");
  ensure("LICENSE_SERVER_INSTALL_MODE", "managed_redeploy");
  ensure("LICENSE_SERVER_DEPLOYMENT_MODE", "self_hosted");
  ensure("LICENSE_SERVER_CUSTOMER_ENVIRONMENT", "development");
  ensure("NR_ALLOW_INSECURE_LOOPBACK_HTTP", "true");
  ensure(
    "NRLS_ALLOWED_OUTBOUND_HOSTS",
    "ls.nrcms.com",
  );
  ensure("NRLS_ALLOW_SELF_HOSTED_OUTBOUND", "false");
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
  ensure("LICENSE_SERVER_SECRET_KEY", randomBytes(32).toString("base64url"));
  ensure("WEBSHOP_PAYMENTS_MODE", "test");
  ensure("WEBSHOP_COOKIE_SECURE", "false");
  ensure("WEBSHOP_PAYMENT_STATE_V2", "false");
  ensure("WEBSHOP_LICENSE_OUTBOX_V2", "false");
  ensure("VENDOR_LICENSE_API_V2", "false");
  ensure("STORAGE_PROVIDER", "local");
  ensure("UPLOADS_DIR", "./storage/uploads");
  ensure("WEBSHOP_BUY_URL", "https://www.nrcms.com/webshop");
  ensure("LICENSE_SERVER_BUY_URL", "https://www.nrcms.com/license-server");
  ensure("WEBSHOP_BUY_LINK_SECRET", randomBytes(32).toString("base64url"));
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
  for (const entry of [
    "dist",
    "migrations.json",
    "package.json",
    "provenance.json",
    "release-manifest.json",
    "sbom.json",
    join("tests", "README.md"),
  ]) {
    const source = resolve(addonRoot, entry);
    if (!existsSync(source)) {
      throw new Error(`${packageName} release is missing ${entry}.`);
    }
    const target = resolve(targetRoot, entry);
    await mkdir(dirname(target), { recursive: true });
    await cp(source, target, { recursive: true });
  }
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
