"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { persistVerifiedWebshopActivation } from "@/data/webshop-addon-control-plane";
import { getGlobalSettings } from "@/data/global-settings";
import { getTranslations } from "@/lib/i18n/server";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import {
  canAttemptWebshopInstall,
  getWebshopRuntimeConfig,
} from "@/lib/webshop-addon/config";
import { requestWebshopLicenseActivation } from "@/lib/webshop-addon/license";
import { verifyWebshopDeploymentPlatform } from "@/lib/webshop-addon/platform";

const ActivationSchema = z.object({
  licenseKey: z.string().trim().min(12),
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
  const t = await getTranslations("backend");
  if (!userId) {
    return { status: "error", message: t("common.states.forbidden") };
  }

  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) {
    return { status: "error", message: t("common.states.forbidden") };
  }

  const runtimeConfig = getWebshopRuntimeConfig();
  const installGate = canAttemptWebshopInstall(runtimeConfig);
  if (!installGate.ok) {
    return { status: "error", message: installGate.message };
  }

  const parsed = ActivationSchema.safeParse({
    licenseKey: formData.get("licenseKey"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.code === "too_small"
          ? t("addons.common.licenseKeyRequired")
          : t("addons.common.invalidActivationInput"),
    };
  }

  const settings = await getGlobalSettings();
  const siteDomain =
    settings.publicSiteUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    "unknown";
  const deploymentPlatform = await verifyWebshopDeploymentPlatform({
    selfHostedSiteId: siteDomain,
  });
  if (deploymentPlatform.status !== "supported") {
    return { status: "error", message: deploymentPlatform.message };
  }

  const activation = await requestWebshopLicenseActivation({
    deploymentPlatform,
    licenseKey: parsed.data.licenseKey,
    siteDomain,
    siteId: deploymentPlatform.projectId,
  });

  if (!activation.ok) {
    return { status: "error", message: activation.error };
  }

  let persisted: Awaited<ReturnType<typeof persistVerifiedWebshopActivation>>;
  try {
    persisted = await persistVerifiedWebshopActivation({
      claim: activation.entitlement.verifiedClaims,
      signedEntitlement: activation.entitlement.signedEntitlement,
      updatedBy: userId,
    });
  } catch {
    return {
      status: "error",
      message:
        "Webshop license was verified, but durable installation state could not be committed.",
    };
  }

  revalidatePath("/dashboard/webshop");
  if (persisted.status === "operator_schema_cutover_required") {
    return {
      status: "error",
      message: "Webshop schema requires the approved operator cutover before a fresh host-capability revalidation can create a new deployment.",
    };
  }
  if (persisted.status === "ready") {
    return {
      status: "success",
      message: "Webshop license refreshed. The installed release remains ready.",
    };
  }
  return {
    status: "success",
    message: `Webshop license accepted. Installation is pending (operation ${persisted.operationId}).`,
  };
}
