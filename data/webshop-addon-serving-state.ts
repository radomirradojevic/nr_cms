import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { cmsAddonDeploymentTerminalReceipts, cmsAddonInstallations, cmsAddonServingFences } from "@/db/schema";

export async function readWebshopServingStateV1() {
  const installation = (await db.select().from(cmsAddonInstallations).where(eq(cmsAddonInstallations.addonKey, "webshop")).limit(1))[0] ?? null;
  if (!installation) return { installation: null, activeServingFenceCount: 0, terminalReceipt: null };
  const [fences, receipt] = await Promise.all([
    db.select({ id: cmsAddonServingFences.id }).from(cmsAddonServingFences).where(and(eq(cmsAddonServingFences.addonKey, "webshop"), eq(cmsAddonServingFences.state, "active"))),
    db.select({ kind: cmsAddonDeploymentTerminalReceipts.kind, finalTuple: cmsAddonDeploymentTerminalReceipts.finalTuple }).from(cmsAddonDeploymentTerminalReceipts).orderBy(desc(cmsAddonDeploymentTerminalReceipts.createdAt)).limit(1),
  ]);
  return { installation, activeServingFenceCount: fences.length, terminalReceipt: receipt[0] ?? null };
}
