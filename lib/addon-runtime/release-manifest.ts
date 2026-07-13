import { createHash, verify } from "node:crypto";

import { z } from "zod";

export const addonKeySchema = z.enum(["webshop", "license-server"]);
const artifactPathSchema = z
  .string()
  .min(1)
  .max(240)
  .regex(/^[A-Za-z0-9._/-]+$/)
  .refine(
    (path) =>
      !path.startsWith("/") &&
      path.split("/").every((segment) => segment !== "" && segment !== ".."),
    "Artifact path must stay inside the package.",
  );
const artifactFileSchema = z.object({
  path: artifactPathSchema,
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  size: z.number().int().nonnegative(),
});
export const signedAddonReleaseManifestV1Schema = z.object({
  manifestVersion: z.literal(1),
  addonKey: addonKeySchema,
  packageName: z.enum(["@nr-cms/webshop", "@nr-cms/license-server"]),
  packageVersion: z.string().min(1),
  runtimeContractVersion: z.literal("1"),
  cmsVersionRange: z.string().min(1),
  schemaVersion: z.number().int().nonnegative(),
  entrypoints: z.object({ server: z.string().min(1), client: z.string().min(1).optional(), styles: z.string().min(1).optional() }),
  capabilities: z.array(z.string().min(1)).max(100),
  migrations: z.array(z.object({ id: z.string().min(1), checksum: z.string().regex(/^[a-f0-9]{64}$/) })),
  artifact: z.object({ files: z.array(artifactFileSchema).min(1).max(1000), sha256: z.string().regex(/^[a-f0-9]{64}$/), size: z.number().int().nonnegative(), registryIntegrity: z.string().optional() }),
  releasedAt: z.string().datetime(),
  signingKid: z.string().min(1),
  signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/),
});

export type SignedAddonReleaseManifestV1 = z.infer<typeof signedAddonReleaseManifestV1Schema>;

export function validateAddonReleaseManifest(manifest: unknown, expected: { addonKey: string; packageName: string; packageVersion?: string; artifactSha256?: string }) {
  const parsed = signedAddonReleaseManifestV1Schema.safeParse(manifest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_manifest" };
  const value = parsed.data;
  if (value.addonKey !== expected.addonKey || value.packageName !== expected.packageName) return { ok: false as const, reason: "package_identity_mismatch" };
  if (expected.packageVersion && value.packageVersion !== expected.packageVersion) return { ok: false as const, reason: "package_version_mismatch" };
  if (expected.artifactSha256 && value.artifact.sha256 !== expected.artifactSha256) return { ok: false as const, reason: "artifact_checksum_mismatch" };
  return { ok: true as const, manifest: value };
}

export function canonicalReleaseManifestPayload(manifest: Omit<SignedAddonReleaseManifestV1, "signature">) {
  const { signature: _signature, ...payload } = manifest as SignedAddonReleaseManifestV1;
  return JSON.stringify(sortCanonicalValue(payload));
}

export function verifyAddonReleaseManifestSignature(manifest: SignedAddonReleaseManifestV1, publicKeyPem: string) {
  const { signature, ...unsigned } = manifest;
  return verify(null, Buffer.from(canonicalReleaseManifestPayload(unsigned), "utf8"), publicKeyPem, Buffer.from(signature, "base64url"));
}

export function sha256Artifact(contents: Buffer) { return createHash("sha256").update(contents).digest("hex"); }

function sortCanonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortCanonicalValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortCanonicalValue(entry)]),
  );
}
