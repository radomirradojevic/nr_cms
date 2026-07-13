import { eq } from "drizzle-orm";

import { db } from "@/db";
import { webshopAddonEntitlements } from "@/db/schema";

const SINGLETON_ID = 1;

export type WebshopAddonEntitlementRow =
  typeof webshopAddonEntitlements.$inferSelect;

export type SaveWebshopAddonEntitlementInput = {
  deploymentEnvironment?: string | null;
  entitlementToken: string;
  expiresAt: Date;
  features?: unknown;
  installationId?: string | null;
  installationKeyFingerprint?: string | null;
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

export async function getWebshopAddonEntitlement(): Promise<WebshopAddonEntitlementRow | null> {
  const rows = await db
    .select()
    .from(webshopAddonEntitlements)
    .where(eq(webshopAddonEntitlements.id, SINGLETON_ID))
    .limit(1);
  return rows[0] ?? null;
}

export async function saveWebshopAddonEntitlement(
  input: SaveWebshopAddonEntitlementInput,
): Promise<void> {
  const values = {
    deploymentEnvironment: input.deploymentEnvironment ?? null,
    entitlementToken: input.entitlementToken,
    expiresAt: input.expiresAt,
    features: input.features ?? [],
    installationId: input.installationId ?? null,
    installationKeyFingerprint: input.installationKeyFingerprint ?? null,
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
    .insert(webshopAddonEntitlements)
    .values({ id: SINGLETON_ID, ...values })
    .onConflictDoUpdate({
      target: webshopAddonEntitlements.id,
      set: values,
    });
}
