import fs from "node:fs";
import path from "node:path";

type PackageJson = {
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  overrides?: unknown;
};

type LockPackage = {
  name?: string;
  version?: string;
  resolved?: string;
  integrity?: string;
  hasInstallScript?: boolean;
  dev?: boolean;
  optional?: boolean;
  link?: boolean;
};

type PackageLock = {
  lockfileVersion?: number;
  packages?: Record<string, LockPackage>;
};

const REGISTRY_URL = "https://registry.npmjs.org/";

const ALLOWED_INSTALL_SCRIPTS = new Set([
  "@clerk/shared@3.47.6",
  "@clerk/shared@4.13.1",
  "argon2@0.44.0",
  "esbuild@0.18.20",
  "esbuild@0.25.12",
  "esbuild@0.27.7",
  "fsevents@2.3.3",
  "msw@2.14.6",
  "sharp@0.34.5",
  "unrs-resolver@1.11.1",
  "unrs-resolver@1.12.2",
]);

const BLOCKED_PACKAGE_VERSIONS = new Map<string, Set<string>>([
  ["ansi-regex", new Set(["6.2.1"])],
  ["ansi-styles", new Set(["6.2.2"])],
  ["axios", new Set(["0.30.4", "1.14.1"])],
  ["backslash", new Set(["0.2.1"])],
  ["chalk", new Set(["5.6.1"])],
  ["chalk-template", new Set(["1.1.1"])],
  ["color-convert", new Set(["3.1.1"])],
  ["color-name", new Set(["2.0.1"])],
  ["color-string", new Set(["2.1.1"])],
  ["debug", new Set(["4.4.2"])],
  ["error-ex", new Set(["1.3.3"])],
  ["has-ansi", new Set(["6.0.1"])],
  ["is-arrayish", new Set(["0.3.3"])],
  ["plain-crypto-js", new Set(["4.2.1"])],
  ["simple-swizzle", new Set(["0.2.3"])],
  ["slice-ansi", new Set(["7.1.1"])],
  ["strip-ansi", new Set(["7.1.1"])],
  ["supports-color", new Set(["10.2.1"])],
  ["supports-hyperlinks", new Set(["4.1.1"])],
  ["wrap-ansi", new Set(["9.0.1"])],
]);

const exactVersionRe =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function packageName(path: string, pkg: LockPackage): string {
  if (pkg.name) return pkg.name;
  return path.split("node_modules/").pop() ?? path;
}

function packageId(path: string, pkg: LockPackage): string {
  return `${packageName(path, pkg)}@${pkg.version ?? "unknown"}`;
}

function collectDirectSpecs(pkg: PackageJson) {
  return [
    ...Object.entries(pkg.dependencies ?? {}).map(([name, spec]) => ({
      section: "dependencies",
      name,
      spec,
    })),
    ...Object.entries(pkg.devDependencies ?? {}).map(([name, spec]) => ({
      section: "devDependencies",
      name,
      spec,
    })),
    ...Object.entries(pkg.optionalDependencies ?? {}).map(([name, spec]) => ({
      section: "optionalDependencies",
      name,
      spec,
    })),
    ...Object.entries(pkg.peerDependencies ?? {}).map(([name, spec]) => ({
      section: "peerDependencies",
      name,
      spec,
    })),
  ];
}

function flattenOverrideSpecs(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).flatMap((item) => {
    if (typeof item === "string") return [item];
    return flattenOverrideSpecs(item);
  });
}

const failures: string[] = [];
const warnings: string[] = [];
const EXPECTED_NPM_VERSION = "npm@11.12.1";
const REQUIRED_NPMRC = new Map([
  ["package-lock", "true"],
  ["save-exact", "true"],
  ["save-prefix", ""],
  ["strict-peer-deps", "true"],
  ["engine-strict", "true"],
  ["registry", REGISTRY_URL],
]);
const PROJECTS = [
  { label: "CMS", root: "." },
  { label: "Webshop addon", root: ".private/webshop" },
  { label: "License Server addon", root: ".private/license-server-addon" },
  { label: "Central License Server", root: ".private/license-server" },
];

console.log("npm supply-chain audit");
for (const project of PROJECTS) {
  auditProject(project.label, project.root);
}

function auditProject(label: string, projectRoot: string) {
  const packageJson = readJson<PackageJson>(path.join(projectRoot, "package.json"));
  const lock = readJson<PackageLock>(path.join(projectRoot, "package-lock.json"));
  const packages = Object.entries(lock.packages ?? {}).filter(([packagePath]) => packagePath);
  const prefix = `${label}:`;

  if (packageJson.packageManager !== EXPECTED_NPM_VERSION) {
    failures.push(`${prefix} package.json must pin packageManager to ${EXPECTED_NPM_VERSION}.`);
  }

  if (lock.lockfileVersion !== 3) {
    failures.push(`${prefix} expected package-lock lockfileVersion 3, got ${lock.lockfileVersion}.`);
  }

  const npmrc = parseNpmrc(path.join(projectRoot, ".npmrc"));
  for (const [key, expected] of REQUIRED_NPMRC) {
    if (npmrc.get(key) !== expected) {
      failures.push(`${prefix} .npmrc must set ${key}=${expected}.`);
    }
  }

  for (const dep of collectDirectSpecs(packageJson)) {
    if (!exactVersionRe.test(dep.spec)) {
      failures.push(`${prefix} ${dep.section}.${dep.name} is not exact: ${dep.spec}`);
    }
  }

  const rangedOverrides = flattenOverrideSpecs(packageJson.overrides).filter(
    (spec) => spec && !exactVersionRe.test(spec),
  );
  for (const spec of rangedOverrides) {
    failures.push(`${prefix} overrides contains non-exact spec: ${spec}`);
  }

  const nonRegistry = packages.filter(([, pkg]) => {
    return pkg.resolved && !pkg.resolved.startsWith(REGISTRY_URL);
  });
  for (const [packagePath, pkg] of nonRegistry) {
    failures.push(`${prefix} ${packageId(packagePath, pkg)} resolves outside npm registry: ${pkg.resolved}`);
  }

  const missingIntegrity = packages.filter(([, pkg]) => {
    return pkg.resolved && !pkg.integrity;
  });
  for (const [packagePath, pkg] of missingIntegrity) {
    failures.push(`${prefix} ${packageId(packagePath, pkg)} has a resolved tarball without integrity.`);
  }

  const missingLockMetadata = packages.filter(([, pkg]) => {
    return !pkg.link && !pkg.resolved && !pkg.integrity;
  });
  if (missingLockMetadata.length) {
    warnings.push(`${prefix} ${missingLockMetadata.length} lockfile package entries omit resolved/integrity metadata.`);
  }

  const installScripts = packages.filter(([, pkg]) => pkg.hasInstallScript);
  for (const [packagePath, pkg] of installScripts) {
    const id = packageId(packagePath, pkg);
    if (!ALLOWED_INSTALL_SCRIPTS.has(id)) {
      failures.push(`${prefix} ${id} has an unapproved install lifecycle script at ${packagePath}.`);
    }
  }

  for (const [packagePath, pkg] of packages) {
    const blocked = BLOCKED_PACKAGE_VERSIONS.get(packageName(packagePath, pkg));
    if (pkg.version && blocked?.has(pkg.version)) {
      failures.push(`${prefix} ${packageId(packagePath, pkg)} matches a known malicious npm release.`);
    }
  }

  const prodInstallScripts = installScripts
    .filter(([, pkg]) => !pkg.dev)
    .map(([packagePath, pkg]) => packageId(packagePath, pkg));

  console.log(`- ${label}: ${packages.length} packages; ${installScripts.length} install scripts; production scripts: ${prodInstallScripts.join(", ") || "none"}`);
  console.log(`  non-registry tarballs: ${nonRegistry.length}; resolved tarballs missing integrity: ${missingIntegrity.length}`);
}

function parseNpmrc(file: string) {
  const entries = new Map<string, string>();
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    entries.set(trimmed.slice(0, separator).trim(), trimmed.slice(separator + 1).trim());
  }
  return entries;
}

for (const warning of warnings) {
  console.warn(`warning: ${warning}`);
}

if (failures.length) {
  console.error("\nFailures:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
}
