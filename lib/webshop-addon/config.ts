export const WEBSHOP_INSTALL_MODES = ["disabled", "managed_redeploy"] as const;

export type WebshopInstallMode = (typeof WEBSHOP_INSTALL_MODES)[number];

export type WebshopPaymentsMode = "live" | "test";

export type WebshopRuntimeConfig = {
  addonModule: string | null;
  allowLocalDevInstall: boolean;
  checkoutEnabled: boolean;
  enabled: boolean;
  installMode: WebshopInstallMode;
  licenseApiUrl: string | null;
  licenseKey: string | null;
  licensePublicKey: string | null;
  packageToken: string | null;
  paymentsMode: WebshopPaymentsMode;
  redeployWebhookUrl: string | null;
  storefrontEnabled: boolean;
};

type EnvLike = Record<string, string | undefined>;

const TRUE_VALUES = new Set(["1", "enabled", "on", "true", "yes"]);
const FALSE_VALUES = new Set(["0", "disabled", "false", "no", "off"]);

function readOptionalEnv(env: EnvLike, key: string): string | null {
  const value = env[key]?.trim();
  return value ? value : null;
}

export function parseWebshopBoolean(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return defaultValue;
}

export function parseWebshopInstallMode(
  value: string | undefined,
): WebshopInstallMode {
  const normalized = value?.trim().toLowerCase();
  return normalized === "disabled" ? "disabled" : "managed_redeploy";
}

export function parseWebshopPaymentsMode(
  value: string | undefined,
): WebshopPaymentsMode {
  return value?.trim().toLowerCase() === "live" ? "live" : "test";
}

export function getWebshopRuntimeConfig(
  env: EnvLike = process.env,
): WebshopRuntimeConfig {
  return {
    addonModule: readOptionalEnv(env, "WEBSHOP_ADDON_MODULE"),
    allowLocalDevInstall: parseWebshopBoolean(
      env.WEBSHOP_ALLOW_LOCAL_DEV_INSTALL,
      false,
    ),
    checkoutEnabled: parseWebshopBoolean(env.WEBSHOP_CHECKOUT_ENABLED, true),
    enabled: parseWebshopBoolean(env.WEBSHOP_ENABLED, true),
    installMode: parseWebshopInstallMode(env.WEBSHOP_INSTALL_MODE),
    licenseApiUrl: readOptionalEnv(env, "WEBSHOP_LICENSE_API_URL"),
    licenseKey: readOptionalEnv(env, "WEBSHOP_LICENSE_KEY"),
    licensePublicKey: readOptionalEnv(env, "WEBSHOP_LICENSE_PUBLIC_KEY"),
    packageToken: readOptionalEnv(env, "WEBSHOP_PACKAGE_TOKEN"),
    paymentsMode: parseWebshopPaymentsMode(env.WEBSHOP_PAYMENTS_MODE),
    redeployWebhookUrl: readOptionalEnv(env, "WEBSHOP_REDEPLOY_WEBHOOK_URL"),
    storefrontEnabled: parseWebshopBoolean(
      env.WEBSHOP_STOREFRONT_ENABLED,
      true,
    ),
  };
}

export function getWebshopDisabledMessage(
  config: Pick<WebshopRuntimeConfig, "enabled">,
): string | null {
  if (config.enabled) return null;
  return "Webshop is disabled by WEBSHOP_ENABLED. Public storefront routes, checkout, and add-on activation are unavailable.";
}

export function canAttemptWebshopInstall(
  config: Pick<WebshopRuntimeConfig, "enabled" | "installMode">,
): { ok: true } | { ok: false; message: string } {
  if (!config.enabled) {
    return {
      ok: false,
      message:
        "Webshop is disabled by WEBSHOP_ENABLED. Enable it before activation.",
    };
  }
  if (config.installMode === "disabled") {
    return {
      ok: false,
      message:
        "Webshop installation is disabled by WEBSHOP_INSTALL_MODE. Use managed_redeploy to enable activation.",
    };
  }
  return { ok: true };
}
