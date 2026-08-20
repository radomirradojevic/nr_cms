"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { persistVerifiedLicenseServerActivation } from "@/data/webshop-addon-control-plane";
import { getGlobalSettings } from "@/data/global-settings";
import { dispatchOneAddonDeploymentOutbox } from "@/lib/addon-runtime/deployment-outbox";
import { getTranslations } from "@/lib/i18n/server";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import {
  canAttemptLicenseServerInstall,
  getLicenseServerRuntimeConfig,
} from "@/lib/license-server-addon/config";
import { requestLicenseServerLicenseActivation } from "@/lib/license-server-addon/license";
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
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    "unknown";
  const deploymentPlatform = await verifyLicenseServerDeploymentPlatform({
    selfHostedSiteId: siteDomain,
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

  let persisted: Awaited<
    ReturnType<typeof persistVerifiedLicenseServerActivation>
  >;
  try {
    persisted = await persistVerifiedLicenseServerActivation({
      claim: activation.entitlement.verifiedClaims,
      signedEntitlement: activation.entitlement.signedEntitlement,
      updatedBy: userId,
    });
  } catch {
    return {
      status: "error",
      message:
        "License Server license was verified, but durable installation state could not be committed.",
    };
  }

  revalidatePath("/dashboard/license-server");
  if (persisted.status === "operator_schema_cutover_required") {
    return {
      status: "error",
      message:
        "License Server schema requires the approved operator cutover before installation can continue.",
    };
  }
  if (persisted.status === "ready") {
    return {
      status: "success",
      message: t("addons.licenseServer.activationSuccessReady"),
    };
  }
  try {
    await dispatchOneAddonDeploymentOutbox();
  } catch {
    // The durable outbox row remains retryable by the progress endpoint.
  }
  return {
    status: "success",
    message: `${t("addons.licenseServer.activationSuccessPending")} (${persisted.operationId})`,
  };
}
