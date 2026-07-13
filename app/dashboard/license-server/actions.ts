"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { saveLicenseServerAddonEntitlement } from "@/data/license-server-addon-entitlement";
import { getGlobalSettings } from "@/data/global-settings";
import { buildRedeployCallbackRequest } from "@/lib/addon-runtime/redeploy-callback";
import { safeFetch } from "@/lib/security/outbound-url";
import { getTranslations } from "@/lib/i18n/server";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import {
  canAttemptLicenseServerInstall,
  getLicenseServerRuntimeConfig,
} from "@/lib/license-server-addon/config";
import { requestLicenseServerLicenseActivation } from "@/lib/license-server-addon/license";
import { loadLicenseServerAddon } from "@/lib/license-server-addon/loader";
import { verifyLicenseServerDeploymentPlatform } from "@/lib/license-server-addon/platform";

const ActivationSchema = z.object({
  licenseKey: z.string().trim().min(12),
});

export type LicenseServerActivationFormState = {
  message?: string;
  status: "idle" | "success" | "error";
};

export async function activateLicenseServerAddonAction(
  _prevState: LicenseServerActivationFormState,
  formData: FormData,
): Promise<LicenseServerActivationFormState> {
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

  const runtimeConfig = getLicenseServerRuntimeConfig();
  const installGate = canAttemptLicenseServerInstall(runtimeConfig);
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
  const deploymentPlatform = await verifyLicenseServerDeploymentPlatform({
    selfHostedSiteId: runtimeConfig.selfHostedSiteId ?? siteDomain,
  });
  if (deploymentPlatform.status !== "supported") {
    return { status: "error", message: deploymentPlatform.message };
  }

  const activation = await requestLicenseServerLicenseActivation({
    deploymentPlatform,
    licenseKey: parsed.data.licenseKey,
    siteDomain,
    siteId: deploymentPlatform.projectId,
  });

  if (!activation.ok) {
    return { status: "error", message: activation.error };
  }

  const loadResult = await loadLicenseServerAddon();
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
      purpose: "License Server redeploy callback",
      timeoutMs: 10_000,
    }).catch(() => null);
  }
  const entitlementStatus =
    loadResult.status === "loaded" ? "ready" : "install_pending";
  const checkedAt = new Date().toISOString();

  await saveLicenseServerAddonEntitlement({
    deploymentEnvironment: deploymentPlatform.deploymentEnvironment,
    entitlementToken: activation.entitlement.entitlementToken,
    expiresAt: new Date(activation.entitlement.expiresAt),
    features: activation.entitlement.features,
    installationId: activation.entitlement.installationId ?? null,
    installationKeyFingerprint: activation.entitlement.installationKeyFingerprint ?? null,
    licenseKeyRef: activation.entitlement.licenseKeyRef,
    metadata: {
      activationId: activation.entitlement.activationId,
      existingLicenseValidationPolicy: "allow_existing",
      lastRevalidatedAt: checkedAt,
      lastRevalidationMessage: "Add-on entitlement was activated.",
      lastRevalidationReason: "activation",
      lastRevalidationStatus: entitlementStatus,
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

  revalidatePath("/dashboard/license-server");
  return {
    status: "success",
    message:
      entitlementStatus === "ready"
        ? t("addons.licenseServer.activationSuccessReady")
        : deploymentPlatform.provider === "self_hosted"
          ? t("addons.licenseServer.activationSuccessSelfHosted")
          : t("addons.licenseServer.activationSuccessPending"),
  };
}
