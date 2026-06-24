import {
  isWebshopAddon,
  type WebshopAddon,
  type WebshopAddonModule,
} from "@/lib/webshop-addon/contract";
import { getWebshopRuntimeConfig } from "@/lib/webshop-addon/config";

export const LOCAL_PRIVATE_WEBSHOP_MODULE = "local-private-webshop";

type EnvLike = Record<string, string | undefined>;

export type WebshopAddonLoadResult =
  | { status: "loaded"; addon: WebshopAddon }
  | { status: "not_installed" }
  | { status: "invalid"; reason: string };

function readOptionalEnv(env: EnvLike, key: string): string | null {
  const value = env[key]?.trim();
  return value ? value : null;
}

function isLocalhostUrl(value: string): boolean {
  try {
    const url = new URL(value.includes("://") ? value : `http://${value}`);
    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1" ||
      url.hostname === "[::1]" ||
      url.hostname.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}

function getDeclaredAppUrl(env: EnvLike): string | null {
  return (
    readOptionalEnv(env, "NEXT_PUBLIC_APP_URL") ??
    readOptionalEnv(env, "APP_URL")
  );
}

function assertLocalPrivateWebshopAliasAllowed(env: EnvLike = process.env) {
  const runtimeConfig = getWebshopRuntimeConfig(env);
  if (!runtimeConfig.allowLocalDevInstall) {
    throw new Error(
      "The local-private-webshop alias is available only in local development when WEBSHOP_ALLOW_LOCAL_DEV_INSTALL=true.",
    );
  }

  if (env.NODE_ENV !== "development") {
    throw new Error(
      "The local-private-webshop alias is available only when NODE_ENV=development.",
    );
  }

  const declaredAppUrl = getDeclaredAppUrl(env);
  if (declaredAppUrl && !isLocalhostUrl(declaredAppUrl)) {
    throw new Error(
      "The local-private-webshop alias requires APP_URL or NEXT_PUBLIC_APP_URL to point at localhost when either value is set.",
    );
  }
}

async function resolveAddonFromModule(
  moduleValue: WebshopAddonModule,
): Promise<WebshopAddon | null> {
  if (isWebshopAddon(moduleValue)) return moduleValue;

  if ("default" in moduleValue && isWebshopAddon(moduleValue.default)) {
    return moduleValue.default;
  }

  if (
    "webshopAddon" in moduleValue &&
    isWebshopAddon(moduleValue.webshopAddon)
  ) {
    return moduleValue.webshopAddon;
  }

  if (
    "createWebshopAddon" in moduleValue &&
    typeof moduleValue.createWebshopAddon === "function"
  ) {
    const addon = await moduleValue.createWebshopAddon();
    return isWebshopAddon(addon) ? addon : null;
  }

  return null;
}

async function importWebshopAddonModule(
  moduleSpecifier: string,
): Promise<WebshopAddonModule> {
  if (moduleSpecifier === LOCAL_PRIVATE_WEBSHOP_MODULE) {
    assertLocalPrivateWebshopAliasAllowed();
    return import("@/.private/webshop/src/addon") as Promise<WebshopAddonModule>;
  }

  return import(moduleSpecifier) as Promise<WebshopAddonModule>;
}

export async function loadWebshopAddon(
  moduleSpecifier = getWebshopRuntimeConfig().addonModule,
): Promise<WebshopAddonLoadResult> {
  if (!moduleSpecifier) return { status: "not_installed" };

  try {
    const moduleValue = await importWebshopAddonModule(moduleSpecifier);
    const addon = await resolveAddonFromModule(moduleValue);
    if (!addon) {
      return {
        status: "invalid",
        reason:
          "The configured Webshop add-on module does not export a valid add-on contract.",
      };
    }
    return { status: "loaded", addon };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("Cannot find module") ||
      message.includes("Module not found") ||
      message.includes("ERR_MODULE_NOT_FOUND")
    ) {
      return { status: "not_installed" };
    }
    return { status: "invalid", reason: message };
  }
}
