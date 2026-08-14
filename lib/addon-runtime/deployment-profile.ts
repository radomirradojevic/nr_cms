export type ManagedAddonDeploymentProfile = "vendor" | "client" | "paypal";

export function parseAddonDeploymentProfile(
  value: string | undefined,
): ManagedAddonDeploymentProfile {
  const normalized = value?.trim();
  if (
    normalized !== "vendor" &&
    normalized !== "client" &&
    normalized !== "paypal"
  ) {
    throw new Error(
      "NR_CMS_DEPLOYMENT_PROFILE is required for deployment control-plane state.",
    );
  }
  return normalized;
}
