import type { SignedAddonReleaseManifestV1 } from "./release-manifest";

export type AddonInstallStatus = "license_accepted" | "install_pending" | "installed" | "migration_pending" | "ready" | "failed" | "disabled" | "update_pending";

export function reconcileAddonInstall(input: {
  entitlementValid: boolean;
  manifest: SignedAddonReleaseManifestV1 | null;
  desired: { addonKey: string; packageName: string; packageVersion: string; artifactSha256: string };
  migrationsApplied: boolean;
  runtimeLoaded: boolean;
}) {
  if (!input.entitlementValid) return { status: "disabled" as const, reason: "entitlement_invalid" };
  if (!input.runtimeLoaded || !input.manifest) return { status: "install_pending" as const, reason: "package_missing" };
  const manifest = input.manifest;
  if (manifest.addonKey !== input.desired.addonKey || manifest.packageName !== input.desired.packageName) return { status: "failed" as const, reason: "package_identity_mismatch" };
  if (manifest.packageVersion !== input.desired.packageVersion) return { status: "failed" as const, reason: "package_version_mismatch" };
  if (manifest.artifact.sha256 !== input.desired.artifactSha256) return { status: "failed" as const, reason: "artifact_checksum_mismatch" };
  if (manifest.runtimeContractVersion !== "1") return { status: "failed" as const, reason: "runtime_contract_incompatible" };
  if (!input.migrationsApplied) return { status: "migration_pending" as const, reason: "migrations_pending" };
  if (!manifest.capabilities.length) return { status: "failed" as const, reason: "capabilities_missing" };
  return { status: "ready" as const, reason: null };
}
