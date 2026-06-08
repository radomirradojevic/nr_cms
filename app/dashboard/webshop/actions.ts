"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { saveWebshopAddonEntitlement } from "@/data/webshop-addon-entitlement";
import { getGlobalSettings } from "@/data/global-settings";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import {
  canAttemptWebshopInstall,
  getWebshopRuntimeConfig,
} from "@/lib/webshop-addon/config";
import { requestWebshopLicenseActivation } from "@/lib/webshop-addon/license";
import { verifyWebshopDeploymentPlatform } from "@/lib/webshop-addon/platform";

const ActivationSchema = z.object({
  licenseKey: z.string().trim().min(12, "License key is required."),
  packageToken: z.string().trim().min(12, "Package token is required."),
});

export type WebshopActivationFormState = {
  message?: string;
  status: "idle" | "success" | "error";
};

export async function activateWebshopAddonAction(
  _prevState: WebshopActivationFormState,
  formData: FormData,
): Promise<WebshopActivationFormState> {
  const { userId } = await auth();
  if (!userId) return { status: "error", message: "Forbidden." };

  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) {
    return { status: "error", message: "Forbidden." };
  }

  const installGate = canAttemptWebshopInstall(getWebshopRuntimeConfig());
  if (!installGate.ok) {
    return { status: "error", message: installGate.message };
  }

  const parsed = ActivationSchema.safeParse({
    licenseKey: formData.get("licenseKey"),
    packageToken: formData.get("packageToken"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid activation input.",
    };
  }

  const deploymentPlatform = await verifyWebshopDeploymentPlatform();
  if (deploymentPlatform.status === "unsupported") {
    return { status: "error", message: deploymentPlatform.message };
  }

  const settings = await getGlobalSettings();
  const siteDomain =
    settings.publicSiteUrl ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    "unknown";

  const activation = await requestWebshopLicenseActivation({
    deploymentPlatform,
    licenseKey: parsed.data.licenseKey,
    packageToken: parsed.data.packageToken,
    siteDomain,
    siteId: deploymentPlatform.projectId,
  });

  if (!activation.ok) {
    return { status: "error", message: activation.error };
  }

  await saveWebshopAddonEntitlement({
    deploymentEnvironment: deploymentPlatform.deploymentEnvironment,
    entitlementToken: activation.entitlement.entitlementToken,
    expiresAt: new Date(activation.entitlement.expiresAt),
    features: activation.entitlement.features,
    licenseKeyRef: activation.entitlement.licenseKeyRef,
    packageName: activation.entitlement.packageName ?? null,
    packageVersion: activation.entitlement.packageVersion ?? null,
    provider: deploymentPlatform.provider,
    providerMode: deploymentPlatform.mode,
    providerOwnerId: deploymentPlatform.ownerId,
    providerProjectId: deploymentPlatform.projectId,
    status: "install_pending",
    updatedBy: userId,
  });

  revalidatePath("/dashboard/webshop");
  return {
    status: "success",
    message:
      "License accepted. Webshop add-on install is pending the managed deployment pipeline.",
  };
}
