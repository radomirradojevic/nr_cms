import { eq } from "drizzle-orm";

import { db } from "@/db";
import { licenseServerAddonEntitlements } from "@/db/schema";

const SINGLETON_ID = 1;

export type LicenseServerAddonEntitlementRow =
  typeof licenseServerAddonEntitlements.$inferSelect;

export type SaveLicenseServerAddonEntitlementInput = {
  deploymentEnvironment?: string | null;
  entitlementToken: string;
  expiresAt: Date;
  features?: unknown;
  licenseKeyRef: string;
  metadata?: unknown;
  packageName?: string | null;
  packageVersion?: string | null;
  provider?: string | null;
  providerMode?: string | null;
  providerOwnerId?: string | null;
  providerProjectId?: string | null;
  status: "ready" | "expired" | "invalid" | "install_pending";
  updatedBy: string;
};

export async function getLicenseServerAddonEntitlement(): Promise<LicenseServerAddonEntitlementRow | null> {
  const rows = await db
    .select()
    .from(licenseServerAddonEntitlements)
    .where(eq(licenseServerAddonEntitlements.id, SINGLETON_ID))
    .limit(1);
  return rows[0] ?? null;
}

export async function saveLicenseServerAddonEntitlement(
  input: SaveLicenseServerAddonEntitlementInput,
): Promise<void> {
  const values = {
    deploymentEnvironment: input.deploymentEnvironment ?? null,
    entitlementToken: input.entitlementToken,
    expiresAt: input.expiresAt,
    features: input.features ?? [],
    licenseKeyRef: input.licenseKeyRef,
    metadata: input.metadata ?? {},
    packageName: input.packageName ?? null,
    packageVersion: input.packageVersion ?? null,
    provider: input.provider ?? null,
    providerMode: input.providerMode ?? null,
    providerOwnerId: input.providerOwnerId ?? null,
    providerProjectId: input.providerProjectId ?? null,
    status: input.status,
    updatedBy: input.updatedBy,
  };

  await db
    .insert(licenseServerAddonEntitlements)
    .values({ id: SINGLETON_ID, ...values })
    .onConflictDoUpdate({
      target: licenseServerAddonEntitlements.id,
      set: values,
    });
}
