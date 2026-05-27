import fs from "node:fs";

type PackageJson = {
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
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
  "esbuild@0.25.12",
  "esbuild@0.27.7",
  "fsevents@2.3.3",
  "msw@2.14.6",
  "sharp@0.34.5",
  "unrs-resolver@1.11.1",
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
  ];
}

function flattenOverrideSpecs(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).flatMap((item) => {
    if (typeof item === "string") return [item];
    return flattenOverrideSpecs(item);
  });
}

const packageJson = readJson<PackageJson>("package.json");
const lock = readJson<PackageLock>("package-lock.json");
const packages = Object.entries(lock.packages ?? {}).filter(([path]) => path);

const failures: string[] = [];
const warnings: string[] = [];

if (!packageJson.packageManager?.startsWith("npm@")) {
  failures.push("package.json must pin packageManager to npm.");
}

if (lock.lockfileVersion !== 3) {
  failures.push(`Expected package-lock lockfileVersion 3, got ${lock.lockfileVersion}.`);
}

for (const dep of collectDirectSpecs(packageJson)) {
  if (!exactVersionRe.test(dep.spec)) {
    failures.push(`${dep.section}.${dep.name} is not exact: ${dep.spec}`);
  }
}

const rangedOverrides = flattenOverrideSpecs(packageJson.overrides).filter(
  (spec) => spec && !exactVersionRe.test(spec),
);
if (rangedOverrides.length) {
  warnings.push(
    `overrides contains non-exact spec(s): ${rangedOverrides.join(", ")}`,
  );
}

const nonRegistry = packages.filter(([, pkg]) => {
  return pkg.resolved && !pkg.resolved.startsWith(REGISTRY_URL);
});
for (const [path, pkg] of nonRegistry) {
  failures.push(`${packageId(path, pkg)} resolves outside npm registry: ${pkg.resolved}`);
}

const missingIntegrity = packages.filter(([, pkg]) => {
  return pkg.resolved && !pkg.integrity;
});
for (const [path, pkg] of missingIntegrity) {
  failures.push(`${packageId(path, pkg)} has a resolved tarball without integrity.`);
}

const missingLockMetadata = packages.filter(([, pkg]) => {
  return !pkg.link && !pkg.resolved && !pkg.integrity;
});
if (missingLockMetadata.length) {
  warnings.push(
    `${missingLockMetadata.length} lockfile package entries omit resolved/integrity metadata.`,
  );
}

const installScripts = packages.filter(([, pkg]) => pkg.hasInstallScript);
for (const [path, pkg] of installScripts) {
  const id = packageId(path, pkg);
  if (!ALLOWED_INSTALL_SCRIPTS.has(id)) {
    failures.push(`${id} has an unapproved install lifecycle script at ${path}.`);
  }
}

for (const [path, pkg] of packages) {
  const blocked = BLOCKED_PACKAGE_VERSIONS.get(packageName(path, pkg));
  if (pkg.version && blocked?.has(pkg.version)) {
    failures.push(`${packageId(path, pkg)} matches a known malicious npm release.`);
  }
}

const prodInstallScripts = installScripts
  .filter(([, pkg]) => !pkg.dev)
  .map(([path, pkg]) => packageId(path, pkg));

console.log("npm supply-chain audit");
console.log(`- packages: ${packages.length}`);
console.log(`- install scripts: ${installScripts.length}`);
console.log(`- production install scripts: ${prodInstallScripts.join(", ") || "none"}`);
console.log(`- non-registry tarballs: ${nonRegistry.length}`);
console.log(`- resolved tarballs missing integrity: ${missingIntegrity.length}`);

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
