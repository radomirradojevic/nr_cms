import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  cmsAddonDeploymentTerminalReceipts,
  cmsAddonInstallations,
  cmsAddonOperations,
  cmsAddonServingFences,
} from "@/db/schema";
import type { ManagedAddonKey } from "@/lib/addon-runtime/addon-descriptors";

export async function readAddonServingStateV1(addonKey: ManagedAddonKey) {
  const installation =
    (
      await db
        .select()
        .from(cmsAddonInstallations)
        .where(eq(cmsAddonInstallations.addonKey, addonKey))
        .limit(1)
    )[0] ?? null;
  if (!installation) {
    return {
      installation: null,
      activeServingFenceCount: 0,
      terminalReceipt: null,
    };
  }
  const [fences, receipt] = await Promise.all([
    db
      .select({ id: cmsAddonServingFences.id })
      .from(cmsAddonServingFences)
      .where(
        and(
          eq(cmsAddonServingFences.addonKey, addonKey),
          eq(cmsAddonServingFences.state, "active"),
        ),
      ),
    db
      .select({
        kind: cmsAddonDeploymentTerminalReceipts.kind,
        finalTuple: cmsAddonDeploymentTerminalReceipts.finalTuple,
      })
      .from(cmsAddonDeploymentTerminalReceipts)
      .innerJoin(
        cmsAddonOperations,
        eq(
          cmsAddonOperations.id,
          cmsAddonDeploymentTerminalReceipts.operationId,
        ),
      )
      .where(eq(cmsAddonOperations.addonKey, addonKey))
      .orderBy(desc(cmsAddonDeploymentTerminalReceipts.createdAt))
      .limit(1),
  ]);
  return {
    installation,
    activeServingFenceCount: fences.length,
    terminalReceipt: receipt[0] ?? null,
  };
}
