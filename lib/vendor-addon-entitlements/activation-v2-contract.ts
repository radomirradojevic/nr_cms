import { createHash, createPublicKey } from "node:crypto";

import { z } from "zod";

export const ACTIVATION_V2_CONTRACT_VERSION = 2 as const;
export const ED25519_SPKI_FINGERPRINT_SCHEME =
  "ed25519_spki_der_sha256_v1" as const;

const semver = z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
const sha256 = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const iso = z.string().datetime({ offset: true });

export const hostCapabilitiesV1Schema = z.object({
  descriptorVersion: z.literal(1),
  cmsVersion: semver,
  cmsCommitSha: z.string().regex(/^[a-f0-9]{40}$/),
  nodeVersion: semver,
  nextVersion: z.literal("16.2.6"),
  runtimeContractVersion: z.literal("1"),
  coreSchemaVersion: z.number().int().positive(),
  installedAddonSchemaVersion: z.number().int().nonnegative(),
}).strict();

export type HostCapabilitiesV1 = z.infer<typeof hostCapabilitiesV1Schema>;

const releaseSchema = z.object({
  releaseId: z.string().uuid(), addonKey: z.literal("webshop"),
  packageName: z.literal("@radomirradojevic/webshop"), packageVersion: semver,
  artifactSha256: z.string().regex(/^[a-f0-9]{64}$/),
  dependencyLockSha256: z.string().regex(/^[a-f0-9]{64}$/),
  npmTarballSha256: z.string().regex(/^[a-f0-9]{64}$/),
  npmTarballIntegrity: z.string().regex(/^sha512-[A-Za-z0-9+/]+={0,2}$/),
  embeddedManifestSha256: z.string().regex(/^[a-f0-9]{64}$/),
  provenanceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  sbomSha256: z.string().regex(/^[a-f0-9]{64}$/),
  publicationAttestationHash: z.string().regex(/^[a-f0-9]{64}$/),
  registryPackageVersionId: z.string().regex(/^[1-9][0-9]*$/),
  sourceReleasedAt: iso, publishedAt: iso, releaseSigningKid: z.string().min(1).max(120),
  runtimeContractVersion: z.literal("1"), cmsVersionRange: z.string().min(1),
  nodeVersionRange: z.string().min(1), nextVersionRange: z.string().min(1),
  minimumCoreSchemaVersion: z.number().int().positive(), schemaVersion: z.number().int().positive(),
  supportedAddonSchemaVersionMin: z.number().int().positive(),
  supportedAddonSchemaVersionMax: z.number().int().positive(),
  migrationBundleHash: z.string().regex(/^[a-f0-9]{64}$/),
  supportedLicenseEditions: z.array(z.literal("standard")).min(1), channel: z.literal("stable"),
}).strict();

export const entitlementClaimsV2Schema = z.object({
  contractVersion: z.literal(2), tokenUse: z.literal("addon_entitlement"),
  iss: z.literal("https://license-server.nrcms.com"), aud: z.literal("nr-cms-addon-runtime"),
  jti: z.string().uuid(), iat: z.number().int().nonnegative(), nbf: z.number().int().nonnegative(), exp: z.number().int().positive(),
  entitlementId: z.string().uuid(), activationId: z.string().uuid(), addonKey: z.literal("webshop"),
  environment: z.enum(["development", "staging", "production"]),
  deploymentMode: z.enum(["self_hosted", "vercel", "other"]), canonicalDomain: z.string().min(1).max(253),
  installationId: z.string().uuid(), installationKeyFingerprint: sha256,
  licenseStatus: z.enum(["active", "suspended", "expired", "revoked", "canceled"]),
  activationStatus: z.enum(["active", "deactivated", "transferred", "revoked"]),
  lifecycleVersion: z.number().int().nonnegative(), activationLimit: z.number().int().positive(),
  edition: z.literal("standard"), features: z.array(z.string().min(1)).max(100),
  existingLicensePolicy: z.enum(["allow_existing", "disabled"]),
  licenseValidUntil: iso.nullable(), updatesUntil: iso.nullable(), nextRevalidationAt: iso,
  graceEndsAt: iso.nullable(),
  domainVerificationMethod: z.enum(["https_well_known", "development_allowlist_exemption"]),
  domainVerifiedAt: iso, domainVerificationChallengeId: z.string().uuid(),
  hostCapabilityDescriptorHash: sha256, release: releaseSchema,
}).strict();

export type AddonEntitlementClaimsV2 = z.infer<typeof entitlementClaimsV2Schema>;

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (!value || typeof value !== "object") throw new Error("Activation contract must be JSON data.");
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

export function canonicalHostCapabilitiesV1(value: unknown) {
  const descriptor = hostCapabilitiesV1Schema.parse(value);
  const bytes = Buffer.from(canonicalJson(descriptor), "utf8");
  return { descriptor, hash: `sha256:${createHash("sha256").update(bytes).digest("hex")}` };
}

export function fingerprintEd25519SpkiDer(publicKeyPem: string) {
  const trimmed = publicKeyPem.trim();
  const blocks = trimmed.match(/-----BEGIN PUBLIC KEY-----[\s\S]+?-----END PUBLIC KEY-----/g) ?? [];
  if (blocks.length !== 1 || blocks[0] !== trimmed) throw new Error("Installation public key must contain exactly one PEM SubjectPublicKeyInfo block.");
  const key = createPublicKey(trimmed);
  if (key.asymmetricKeyType !== "ed25519") throw new Error("Installation public key must be Ed25519.");
  return `sha256:${createHash("sha256").update(key.export({ format: "der", type: "spki" })).digest("hex")}`;
}

export function buildHostCapabilitiesV1(input: {
  cmsCommitSha: string; cmsVersion: string; coreSchemaVersion: number; installedAddonSchemaVersion: number;
  nodeVersion?: string;
}): HostCapabilitiesV1 {
  return hostCapabilitiesV1Schema.parse({
    descriptorVersion: 1, cmsVersion: input.cmsVersion, cmsCommitSha: input.cmsCommitSha,
    nodeVersion: input.nodeVersion ?? process.versions.node, nextVersion: "16.2.6",
    runtimeContractVersion: "1", coreSchemaVersion: input.coreSchemaVersion,
    installedAddonSchemaVersion: input.installedAddonSchemaVersion,
  });
}
