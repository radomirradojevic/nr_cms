export const LICENSE_SERVER_INSTALL_MODES = [
  "disabled",
  "managed_redeploy",
] as const;

export type LicenseServerInstallMode =
  (typeof LICENSE_SERVER_INSTALL_MODES)[number];

export type LicenseServerRuntimeConfig = {
  allowLocalDevInstall: boolean;
  enabled: boolean;
  installMode: LicenseServerInstallMode;
  licenseApiUrl: string | null;
  licenseKey: string | null;
  packageToken: string | null;
  redeployAuthKid: string | null;
  redeployAuthSecret: string | null;
  redeployWebhookUrl: string | null;
  selfHostedSiteId: string | null;
};

type EnvLike = Record<string, string | undefined>;

const TRUE_VALUES = new Set(["1", "enabled", "on", "true", "yes"]);
const FALSE_VALUES = new Set(["0", "disabled", "false", "no", "off"]);

function readOptionalEnv(env: EnvLike, key: string): string | null {
  const value = env[key]?.trim();
  return value ? value : null;
}

export function parseLicenseServerBoolean(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return defaultValue;
}

export function parseLicenseServerInstallMode(
  value: string | undefined,
  defaultValue: LicenseServerInstallMode = "managed_redeploy",
): LicenseServerInstallMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "disabled" || normalized === "managed_redeploy")
    return normalized;
  return defaultValue;
}

export function getLicenseServerRuntimeConfig(
  env: EnvLike = process.env,
): LicenseServerRuntimeConfig {
  const production = env.NODE_ENV === "production";
  return {
    allowLocalDevInstall: parseLicenseServerBoolean(
      env.LICENSE_SERVER_ALLOW_LOCAL_DEV_INSTALL,
      false,
    ),
    enabled: parseLicenseServerBoolean(
      env.LICENSE_SERVER_ENABLED,
      !production,
    ),
    installMode: parseLicenseServerInstallMode(
      env.LICENSE_SERVER_INSTALL_MODE,
      production ? "disabled" : "managed_redeploy",
    ),
    licenseApiUrl: readOptionalEnv(env, "LICENSE_SERVER_LICENSE_API_URL"),
    licenseKey: readOptionalEnv(env, "LICENSE_SERVER_LICENSE_KEY"),
    packageToken: readOptionalEnv(env, "LICENSE_SERVER_PACKAGE_TOKEN"),
    redeployAuthKid: readOptionalEnv(env, "LICENSE_SERVER_REDEPLOY_AUTH_KID"),
    redeployAuthSecret: readOptionalEnv(env, "LICENSE_SERVER_REDEPLOY_AUTH_SECRET"),
    redeployWebhookUrl: readOptionalEnv(
      env,
      "LICENSE_SERVER_REDEPLOY_WEBHOOK_URL",
    ),
    selfHostedSiteId: readOptionalEnv(
      env,
      "LICENSE_SERVER_SELF_HOSTED_SITE_ID",
    ),
  };
}

export function getLicenseServerDisabledMessage(
  config: Pick<LicenseServerRuntimeConfig, "enabled">,
): string | null {
  if (config.enabled) return null;
  return "License Server is disabled by LICENSE_SERVER_ENABLED. Dashboard activation and API routes are unavailable.";
}

export function canAttemptLicenseServerInstall(
  config: Pick<LicenseServerRuntimeConfig, "enabled" | "installMode">,
): { ok: true } | { ok: false; message: string } {
  if (!config.enabled) {
    return {
      ok: false,
      message:
        "License Server is disabled by LICENSE_SERVER_ENABLED. Enable it before activation.",
    };
  }
  if (config.installMode === "disabled") {
    return {
      ok: false,
      message:
        "License Server installation is disabled by LICENSE_SERVER_INSTALL_MODE. Enable install mode before activation.",
    };
  }
  return { ok: true };
}
