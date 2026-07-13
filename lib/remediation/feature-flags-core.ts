export const NIGHT_RAVEN_REMEDIATION_FLAGS = [
  "WEBSHOP_PAYMENT_STATE_V2",
  "WEBSHOP_LICENSE_OUTBOX_V2",
  "VENDOR_LICENSE_API_V2",
  "VENDOR_SIGNED_ENTITLEMENTS_V1",
  "ADDON_INSTALL_RECONCILIATION_V1",
  "ADDON_SDK_V1",
] as const;

export type NightRavenRemediationFlag =
  (typeof NIGHT_RAVEN_REMEDIATION_FLAGS)[number];

export type NightRavenRemediationFlags = Readonly<
  Record<NightRavenRemediationFlag, boolean>
>;

function isEnabled(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes(value?.trim().toLowerCase() ?? "");
}

/** Pure parser used only by the server-only registry and its unit tests. */
export function parseNightRavenRemediationFlags(
  env: Record<string, string | undefined>,
): NightRavenRemediationFlags {
  return Object.fromEntries(
    NIGHT_RAVEN_REMEDIATION_FLAGS.map((flag) => [flag, isEnabled(env[flag])]),
  ) as NightRavenRemediationFlags;
}
