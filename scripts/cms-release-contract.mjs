import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const packagePath = fileURLToPath(new URL("../package.json", import.meta.url));
const packageLockPath = fileURLToPath(
  new URL("../package-lock.json", import.meta.url),
);
const packageMetadata = readJson(packagePath, "package.json");
const packageLockMetadata = readJson(packageLockPath, "package-lock.json");

const supportedCmsVersionPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-rc\.(0|[1-9]\d*))?$/;

export const CMS_ADDON_RUNTIME_CONTRACT_VERSION = "1";
export const CMS_CORE_SCHEMA_VERSION = 1;
export const CMS_PACKAGE_VERSION = assertSupportedCmsVersion(
  packageMetadata.version,
  "package.json version",
);
export const CMS_PACKAGE_LOCK_VERSION = assertPackageLockVersion(
  packageLockMetadata,
  CMS_PACKAGE_VERSION,
);

export function assertConfiguredCmsVersion(
  configuredVersion,
  packageVersion = CMS_PACKAGE_VERSION,
) {
  const canonicalVersion = assertSupportedCmsVersion(
    packageVersion,
    "package.json version",
  );
  const configured =
    typeof configuredVersion === "string" ? configuredVersion.trim() : "";
  if (configured && configured !== canonicalVersion) {
    throw new Error(
      `NR_CMS_VERSION must exactly match package.json version ${canonicalVersion}`,
    );
  }
  return canonicalVersion;
}

export function assertCmsVersionUpgrade(nextVersion, currentVersion) {
  const next = parseCmsVersion(nextVersion, "next CMS version");
  const current = parseCmsVersion(currentVersion, "current CMS version");
  const numericComparison = ["major", "minor", "patch"]
    .map((part) => next[part] - current[part])
    .find((difference) => difference !== 0);
  let comparison = numericComparison ?? 0;
  if (comparison === 0) {
    if (next.rc === null && current.rc !== null) comparison = 1;
    else if (next.rc !== null && current.rc === null) comparison = -1;
    else if (next.rc !== null && current.rc !== null)
      comparison = next.rc - current.rc;
  }
  if (comparison <= 0) {
    throw new Error(
      `next CMS version ${nextVersion} must be greater than current CMS version ${currentVersion}`,
    );
  }
  return nextVersion;
}

export function createCmsReleaseManifest({
  commitSha,
  packageLockVersion,
  packageVersion,
  tag,
}) {
  const cmsVersion = assertSupportedCmsVersion(
    packageVersion,
    "CMS package version",
  );
  if (packageLockVersion !== cmsVersion) {
    throw new Error(
      "package-lock.json version must match package.json version",
    );
  }
  if (tag !== `v${cmsVersion}`) {
    throw new Error("CMS release tag must exactly match package version");
  }
  if (!/^[a-f0-9]{40}$/.test(commitSha ?? "")) {
    throw new Error(
      "CMS release commit SHA must be 40 lowercase hexadecimal characters",
    );
  }
  return {
    addonRuntimeContractVersion: CMS_ADDON_RUNTIME_CONTRACT_VERSION,
    cmsVersion,
    commitSha,
    contractVersion: 1,
    coreSchemaVersion: CMS_CORE_SCHEMA_VERSION,
    product: "night-raven-cms",
    purpose: "cms_release",
    releaseChannel: releaseChannelForVersion(cmsVersion),
    tag,
  };
}

export function releaseChannelForVersion(version = CMS_PACKAGE_VERSION) {
  const supportedVersion = assertSupportedCmsVersion(version, "CMS version");
  return supportedVersion.includes("-rc.") ? "rc" : "stable";
}

export function assertSupportedCmsVersion(value, label = "CMS version") {
  if (typeof value !== "string" || !supportedCmsVersionPattern.test(value)) {
    throw new Error(
      `${label} must be stable SemVer or an rc prerelease (for example 1.2.3 or 1.2.3-rc.1)`,
    );
  }
  return value;
}

function parseCmsVersion(value, label) {
  const version = assertSupportedCmsVersion(value, label);
  const match = version.match(supportedCmsVersionPattern);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    rc: match[4] === undefined ? null : Number(match[4]),
  };
}

function assertPackageLockVersion(lock, packageVersion) {
  const rootVersion = lock?.packages?.[""]?.version;
  if (lock?.version !== packageVersion || rootVersion !== packageVersion) {
    throw new Error(
      "package-lock.json version must match package.json version",
    );
  }
  return packageVersion;
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(`${label} must contain valid JSON release metadata`);
  }
}
