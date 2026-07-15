import { createHash, generateKeyPairSync, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const webshopRoot = resolve(root, ".private", "webshop");
const authorityRoot = resolve(root, ".tmp", "local-addon-release-authority");
const privateKeyFile = join(authorityRoot, "authority.pk8.pem");
const publicKeysFile = join(authorityRoot, "public-keys.json");
const metadataFile = join(authorityRoot, "metadata.json");
const localRegistryFile = resolve(root, ".tmp", "addons.registry.local.json");

if (!existsSync(webshopRoot)) {
  throw new Error(".private/webshop was not found.");
}

const authority = await ensureLocalReleaseAuthority();
await run("node", ["scripts/build-release.mjs"], {
  cwd: webshopRoot,
  env: authority.env,
});
const manifest = JSON.parse(
  await readFile(join(webshopRoot, "release-manifest.json"), "utf8"),
);
await writeLocalWebshopRegistryEntry(manifest);
await ensureRootEnv();
await run("npm", ["install", "./.private/webshop", "--ignore-scripts", "--no-save", "--no-package-lock"], {
  cwd: root,
});
await run("node", ["scripts/generate-addon-registry.mjs"], {
  cwd: root,
  env: {
    NR_ADDON_RELEASE_PUBLIC_KEYS_FILE: publicKeysFile,
    NR_ADDONS_REGISTRY_FILE: localRegistryFile,
  },
});

console.log("Local Webshop addon is installed and registered.");
console.log(`Local registry: ${relativeForLog(localRegistryFile)}`);
console.log(`Release public keys: ${relativeForLog(publicKeysFile)}`);
console.log(`Artifact: ${manifest.artifact.sha256}`);

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

async function writeLocalWebshopRegistryEntry(manifest) {
  if (
    manifest.addonKey !== "webshop" ||
    manifest.packageName !== "@nr-cms/webshop" ||
    typeof manifest.packageVersion !== "string" ||
    !/^[a-f0-9]{64}$/.test(manifest.artifact?.sha256 ?? "") ||
    typeof manifest.signingKid !== "string"
  ) {
    throw new Error("Built Webshop release manifest is not valid.");
  }

  const nextEntry = {
    addonKey: "webshop",
    artifactSha256: manifest.artifact.sha256,
    packageName: "@nr-cms/webshop",
    packageVersion: manifest.packageVersion,
    signingKid: manifest.signingKid,
  };
  await writeFile(
    localRegistryFile,
    `${JSON.stringify({ addons: [nextEntry] }, null, 2)}\n`,
    "utf8",
  );
}

async function ensureRootEnv() {
  const envPath = resolve(root, ".env");
  const current = existsSync(envPath) ? await readFile(envPath, "utf8") : "";
  const additions = [];
  let next = current;
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
  ensure("APP_URL", "http://localhost:3000");
  ensure(
    "NR_ADDONS_REGISTRY_FILE",
    ".tmp/addons.registry.local.json",
  );
  ensure(
    "NR_ADDON_RELEASE_PUBLIC_KEYS_FILE",
    ".tmp/local-addon-release-authority/public-keys.json",
  );
  ensure("WEBSHOP_LICENSE_API_URL", "http://localhost:3001");
  ensure("WEBSHOP_SELF_HOSTED_SITE_ID", "local-nr-cms");
  ensure(
    "NR_ADDON_INSTALLATION_ENCRYPTION_KEY",
    randomBytes(32).toString("base64url"),
  );
  ensure("WEBSHOP_CART_TOKEN_SALT", randomBytes(32).toString("base64url"));
  ensure("WEBSHOP_DOWNLOAD_TOKEN_SECRET", randomBytes(32).toString("base64url"));
  ensure("WEBSHOP_DOWNLOAD_EVENT_HASH_SECRET", randomBytes(32).toString("base64url"));

  if (additions.length === 0 && next === current) return;
  const prefix = next.endsWith("\n") || next.length === 0 ? "" : "\n";
  await writeFile(
    envPath,
    `${next}${prefix}${additions.length > 0 ? `\n# Local Webshop addon activation\n${additions.join("\n")}\n` : ""}`,
    "utf8",
  );
  console.log("Updated local Webshop environment settings.");
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
