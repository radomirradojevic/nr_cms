export const WEBSHOP_INSTALL_MODES = ["disabled", "managed_redeploy"] as const;

export type WebshopInstallMode = (typeof WEBSHOP_INSTALL_MODES)[number];

export type WebshopPaymentsMode = "live" | "test";

export type WebshopRuntimeConfig = {
  checkoutEnabled: boolean;
  enabled: boolean;
  installMode: WebshopInstallMode;
  paymentsMode: WebshopPaymentsMode;
  redeployAuthKid: string | null;
  redeployAuthSecret: string | null;
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
  defaultValue: WebshopInstallMode = "disabled",
): WebshopInstallMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "disabled" || normalized === "managed_redeploy")
    return normalized;
  return defaultValue;
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
    checkoutEnabled: parseWebshopBoolean(env.WEBSHOP_CHECKOUT_ENABLED, false),
    enabled: parseWebshopBoolean(env.WEBSHOP_ENABLED, false),
    installMode: parseWebshopInstallMode(env.WEBSHOP_INSTALL_MODE, "disabled"),
    paymentsMode: parseWebshopPaymentsMode(env.WEBSHOP_PAYMENTS_MODE),
    redeployAuthKid: readOptionalEnv(env, "WEBSHOP_REDEPLOY_AUTH_KID"),
    redeployAuthSecret: readOptionalEnv(env, "WEBSHOP_REDEPLOY_AUTH_SECRET"),
    redeployWebhookUrl: readOptionalEnv(env, "WEBSHOP_REDEPLOY_WEBHOOK_URL"),
    storefrontEnabled: parseWebshopBoolean(
      env.WEBSHOP_STOREFRONT_ENABLED,
      false,
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
        "Webshop installation is disabled by WEBSHOP_INSTALL_MODE. Enable install mode before activation.",
    };
  }
  return { ok: true };
}
