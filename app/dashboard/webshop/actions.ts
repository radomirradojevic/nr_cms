"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { saveWebshopAddonEntitlement } from "@/data/webshop-addon-entitlement";
import { getGlobalSettings } from "@/data/global-settings";
import { buildRedeployCallbackRequest } from "@/lib/addon-runtime/redeploy-callback";
import { safeFetch } from "@/lib/security/outbound-url";
import { getTranslations } from "@/lib/i18n/server";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import {
  canAttemptWebshopInstall,
  getWebshopRuntimeConfig,
} from "@/lib/webshop-addon/config";
import { requestWebshopLicenseActivation } from "@/lib/webshop-addon/license";
import { loadWebshopAddon } from "@/lib/webshop-addon/loader";
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
    process.env.APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    "unknown";
  const deploymentPlatform = await verifyWebshopDeploymentPlatform({
    selfHostedSiteId: runtimeConfig.selfHostedSiteId ?? siteDomain,
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

  const loadResult = await loadWebshopAddon();
  if (
    runtimeConfig.redeployWebhookUrl &&
    runtimeConfig.redeployAuthKid &&
    runtimeConfig.redeployAuthSecret
  ) {
    const callback = buildRedeployCallbackRequest({
      auth: {
        kid: runtimeConfig.redeployAuthKid,
        secret: runtimeConfig.redeployAuthSecret,
      },
      packageName: activation.entitlement.packageName ?? null,
      packageVersion: activation.entitlement.packageVersion ?? null,
      url: runtimeConfig.redeployWebhookUrl,
    });
    await safeFetch(callback.url, {
      allowFirstParty: true,
      body: callback.body,
      headers: callback.headers,
      method: "POST",
      purpose: "Webshop redeploy callback",
      timeoutMs: 10_000,
    }).catch(() => null);
  }
  const entitlementStatus =
    loadResult.status === "loaded" ? "ready" : "install_pending";

  await saveWebshopAddonEntitlement({
    deploymentEnvironment: deploymentPlatform.deploymentEnvironment,
    entitlementToken: activation.entitlement.entitlementToken,
    expiresAt: new Date(activation.entitlement.expiresAt),
    features: activation.entitlement.features,
    installationId: activation.entitlement.installationId ?? null,
    installationKeyFingerprint: activation.entitlement.installationKeyFingerprint ?? null,
    licenseKeyRef: activation.entitlement.licenseKeyRef,
    metadata: {
      activationId: activation.entitlement.activationId,
      lastRevalidationSuccessAt: new Date().toISOString(),
    },
    packageName: activation.entitlement.packageName ?? null,
    packageVersion: activation.entitlement.packageVersion ?? null,
    provider: deploymentPlatform.provider,
    providerMode: deploymentPlatform.mode,
    providerOwnerId: deploymentPlatform.ownerId,
    providerProjectId: deploymentPlatform.projectId,
    status: entitlementStatus,
    updatedBy: userId,
  });

  revalidatePath("/dashboard/webshop");
  return {
    status: "success",
    message:
      entitlementStatus === "ready"
        ? t("addons.webshop.activationSuccessReady")
        : deploymentPlatform.provider === "self_hosted"
          ? t("addons.webshop.activationSuccessSelfHosted")
          : t("addons.webshop.activationSuccessPending"),
  };
}
