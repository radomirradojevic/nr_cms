export const LICENSE_SERVER_INSTALL_MODES = [
  "disabled",
  "preinstalled",
  "managed_redeploy",
] as const;

export type LicenseServerInstallMode =
  (typeof LICENSE_SERVER_INSTALL_MODES)[number];

export type LicenseServerRuntimeConfig = {
  enabled: boolean;
  installMode: LicenseServerInstallMode;
  redeployAuthKid: string | null;
  redeployAuthSecret: string | null;
  redeployWebhookUrl: string | null;
  runtimeArtifactSha256: string | null;
  runtimeBuildId: string | null;
  runtimeReleaseId: string | null;
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
  defaultValue: LicenseServerInstallMode = "disabled",
): LicenseServerInstallMode {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === "disabled" ||
    normalized === "preinstalled" ||
    normalized === "managed_redeploy"
  )
    return normalized;
  return defaultValue;
}

export function getLicenseServerRuntimeConfig(
  env: EnvLike = process.env,
): LicenseServerRuntimeConfig {
  return {
    enabled: parseLicenseServerBoolean(env.LICENSE_SERVER_ENABLED, false),
    installMode: parseLicenseServerInstallMode(
      env.LICENSE_SERVER_INSTALL_MODE,
      "disabled",
    ),
    redeployAuthKid: readOptionalEnv(env, "LICENSE_SERVER_REDEPLOY_AUTH_KID"),
    redeployAuthSecret: readOptionalEnv(
      env,
      "LICENSE_SERVER_REDEPLOY_AUTH_SECRET",
    ),
    redeployWebhookUrl: readOptionalEnv(
      env,
      "LICENSE_SERVER_REDEPLOY_WEBHOOK_URL",
    ),
    runtimeArtifactSha256: readOptionalEnv(
      env,
      "LICENSE_SERVER_RUNTIME_ARTIFACT_SHA256",
    ),
    runtimeBuildId: readOptionalEnv(env, "LICENSE_SERVER_RUNTIME_BUILD_ID"),
    runtimeReleaseId: readOptionalEnv(
      env,
      "LICENSE_SERVER_RUNTIME_RELEASE_ID",
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
