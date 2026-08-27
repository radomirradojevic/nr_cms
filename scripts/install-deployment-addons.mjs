import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const npmCli = process.env.npm_execpath
  ? resolve(process.env.npm_execpath)
  : resolve(
      process.execPath,
      "..",
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    );
const profile = process.env.NR_CMS_DEPLOYMENT_PROFILE?.trim();
const sourceMode = process.env.NR_ADDON_SOURCE_MODE?.trim() ?? "empty";
const strict = process.env.NR_CMS_PREINSTALL_POLICY?.trim() === "strict";
const versions = {
  webshop: exactVersion(
    process.env.NR_CMS_PREINSTALL_WEBSHOP_VERSION,
    "NR_CMS_PREINSTALL_WEBSHOP_VERSION",
  ),
  "license-server": exactVersion(
    process.env.NR_CMS_PREINSTALL_LICENSE_SERVER_VERSION,
    "NR_CMS_PREINSTALL_LICENSE_SERVER_VERSION",
  ),
};

await runNpm(["ci", "--ignore-scripts", "--no-audit", "--fund=false"]);

if (strict) {
  if (profile === "vendor" && !versions.webshop)
    fail("vendor_preinstall_requires_webshop");
  if (
    profile === "client" &&
    (!versions.webshop || !versions["license-server"])
  )
    fail("client_preinstall_requires_both_addons");
  if (!profile || !["vendor", "client", "paypal"].includes(profile))
    fail("deployment_profile_invalid");
}

const specs = [
  versions.webshop
    ? `@radomirradojevic/webshop@${versions.webshop}`
    : null,
  versions["license-server"]
    ? `@radomirradojevic/license-server-addon@${versions["license-server"]}`
    : null,
].filter(Boolean);
if ((specs.length > 0) !== (sourceMode === "registry"))
  fail("addon_source_mode_preinstall_mismatch");
if (specs.length > 0) {
  if (!process.env.NR_GITHUB_PACKAGES_READ_TOKEN?.trim())
    fail("github_packages_read_token_missing");
  await runNpm([
    "install",
    "--no-save",
    "--package-lock=false",
    "--ignore-scripts",
    "--legacy-peer-deps",
    "--no-audit",
    "--fund=false",
    ...specs,
  ]);
}

const tmp = resolve(root, ".tmp");
await mkdir(tmp, { recursive: true });
const registry = { addons: [] };
for (const [addonKey, packageName] of [
  ["webshop", "@radomirradojevic/webshop"],
  ["license-server", "@radomirradojevic/license-server-addon"],
]) {
  const expectedVersion = versions[addonKey];
  if (!expectedVersion) continue;
  const packageRoot = resolve(
    root,
    "node_modules",
    ...packageName.split("/"),
  );
  const packageJson = JSON.parse(
    await readFile(resolve(packageRoot, "package.json"), "utf8"),
  );
  const manifestBytes = await readFile(
    resolve(packageRoot, "release-manifest.json"),
  );
  const envelope = JSON.parse(manifestBytes.toString("utf8"));
  const payload = JSON.parse(
    Buffer.from(envelope.payload, "base64url").toString("utf8"),
  );
  if (
    packageJson.name !== packageName ||
    packageJson.version !== expectedVersion ||
    payload.addonKey !== addonKey ||
    payload.packageName !== packageName ||
    payload.packageVersion !== expectedVersion ||
    payload.manifestVersion !== 2 ||
    !/^[a-f0-9]{64}$/.test(payload.artifactSha256 ?? "") ||
    !/^[a-f0-9]{64}$/.test(payload.migrationBundleHash ?? "") ||
    !Number.isInteger(payload.schemaVersion) ||
    payload.schemaVersion < 1 ||
    payload.runtimeContractVersion !== "1" ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{2,119}$/.test(
      payload.releaseSigningKid ?? "",
    ) ||
    !/^[0-9a-f-]{36}$/.test(payload.releaseId ?? "")
  )
    fail("installed_addon_release_identity_invalid");
  registry.addons.push({
    addonKey,
    artifactSha256: payload.artifactSha256,
    embeddedManifestSha256: sha256(manifestBytes),
    packageName,
    packageVersion: expectedVersion,
    releaseId: payload.releaseId,
    migrationBundleHash: payload.migrationBundleHash,
    runtimeContractVersion: payload.runtimeContractVersion,
    schemaVersion: payload.schemaVersion,
    signingKid: payload.releaseSigningKid,
  });
}

const registryFile = resolve(tmp, "addon-registry.json");
const keysetFile = resolve(tmp, "addon-release-public-keys.json");
await writeFile(
  registryFile,
  `${JSON.stringify(registry, null, 2)}\n`,
  "utf8",
);
if (registry.addons.length > 0) {
  await writeFile(keysetFile, await fetchPinnedReleaseKeyset(), { mode: 0o644 });
} else {
  await writeFile(keysetFile, "{}\n", "utf8");
}
await writeFile(
  resolve(tmp, "addon-build-inputs.json"),
  `${JSON.stringify(
    {
      registryFile: ".tmp/addon-registry.json",
      releasePublicKeysFile: ".tmp/addon-release-public-keys.json",
    },
    null,
    2,
  )}\n`,
  "utf8",
);

async function fetchPinnedReleaseKeyset() {
  const value = process.env.NR_ADDON_RELEASE_PUBLIC_KEYS_BASE64?.trim();
  let bytes;
  if (value) {
    bytes = Buffer.from(value, "base64");
    if (bytes.toString("base64") !== value)
      fail("addon_release_keyset_base64_invalid");
  } else {
    const configured = process.env.NR_ADDON_RELEASE_PUBLIC_KEYS_URL?.trim();
    if (!configured) fail("addon_release_keyset_url_missing");
    const url = new URL(configured);
    if (
      url.protocol !== "https:" ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/.well-known/nr-addon-release-keys.json"
    )
      fail("addon_release_keyset_url_invalid");
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status !== 200) fail("addon_release_keyset_fetch_failed");
    bytes = Buffer.from(await response.arrayBuffer());
  }
  const expectedHash =
    process.env.NR_ADDON_RELEASE_PUBLIC_KEYS_SHA256?.trim();
  if (
    !/^[a-f0-9]{64}$/.test(expectedHash ?? "") ||
    sha256(bytes) !== expectedHash
  )
    fail("addon_release_keyset_hash_mismatch");
  const parsed = JSON.parse(bytes.toString("utf8"));
  if (
    parsed.contractVersion !== 1 ||
    parsed.purpose !== "addon_release" ||
    !Array.isArray(parsed.keys) ||
    parsed.keys.length < 1
  )
    fail("addon_release_keyset_contract_invalid");
  const kids = new Set(
    parsed.keys
      .filter((key) => key?.status !== "revoked")
      .map((key) => key?.kid),
  );
  if (registry.addons.some((addon) => !kids.has(addon.signingKid)))
    fail("addon_release_keyset_kid_missing");
  return bytes;
}

function exactVersion(value, name) {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (
    !/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(
      normalized,
    )
  )
    fail(`${name.toLowerCase()}_invalid`);
  return normalized;
}
function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function fail(code) {
  throw new Error(code);
}
function runNpm(args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [npmCli, ...args], {
      cwd: root,
      env: process.env,
      shell: false,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolveRun()
        : reject(new Error(`deployment_npm_failed:${code}`)),
    );
  });
}
