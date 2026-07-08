export const LICENSE_SERVER_INSTALL_MODES = [
  "disabled",
  "managed_redeploy",
] as const;

export type LicenseServerInstallMode =
  (typeof LICENSE_SERVER_INSTALL_MODES)[number];

export type LicenseServerRuntimeConfig = {
  addonModule: string | null;
  allowLocalDevInstall: boolean;
  enabled: boolean;
  installMode: LicenseServerInstallMode;
  licenseApiUrl: string | null;
  licenseKey: string | null;
  packageToken: string | null;
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
): LicenseServerInstallMode {
  const normalized = value?.trim().toLowerCase();
  return normalized === "disabled" ? "disabled" : "managed_redeploy";
}

export function getLicenseServerRuntimeConfig(
  env: EnvLike = process.env,
): LicenseServerRuntimeConfig {
  return {
    addonModule: readOptionalEnv(env, "LICENSE_SERVER_ADDON_MODULE"),
    allowLocalDevInstall: parseLicenseServerBoolean(
      env.LICENSE_SERVER_ALLOW_LOCAL_DEV_INSTALL,
      false,
    ),
    enabled: parseLicenseServerBoolean(env.LICENSE_SERVER_ENABLED, true),
    installMode: parseLicenseServerInstallMode(env.LICENSE_SERVER_INSTALL_MODE),
    licenseApiUrl: readOptionalEnv(env, "LICENSE_SERVER_LICENSE_API_URL"),
    licenseKey: readOptionalEnv(env, "LICENSE_SERVER_LICENSE_KEY"),
    packageToken: readOptionalEnv(env, "LICENSE_SERVER_PACKAGE_TOKEN"),
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
