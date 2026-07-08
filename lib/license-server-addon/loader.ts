import {
  isLicenseServerAddon,
  type LicenseServerAddon,
  type LicenseServerAddonModule,
} from "@/lib/license-server-addon/contract";
import { getLicenseServerRuntimeConfig } from "@/lib/license-server-addon/config";

export const LOCAL_PRIVATE_LICENSE_SERVER_MODULE =
  "local-private-license-server";

type EnvLike = Record<string, string | undefined>;

export type LicenseServerAddonLoadResult =
  | { status: "loaded"; addon: LicenseServerAddon }
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

function assertLocalPrivateLicenseServerAliasAllowed(
  env: EnvLike = process.env,
) {
  const runtimeConfig = getLicenseServerRuntimeConfig(env);
  if (!runtimeConfig.allowLocalDevInstall) {
    throw new Error(
      "The local-private-license-server alias is available only in local development when LICENSE_SERVER_ALLOW_LOCAL_DEV_INSTALL=true.",
    );
  }

  if (env.NODE_ENV !== "development") {
    throw new Error(
      "The local-private-license-server alias is available only when NODE_ENV=development.",
    );
  }

  const declaredAppUrl = getDeclaredAppUrl(env);
  if (declaredAppUrl && !isLocalhostUrl(declaredAppUrl)) {
    throw new Error(
      "The local-private-license-server alias requires APP_URL or NEXT_PUBLIC_APP_URL to point at localhost when either value is set.",
    );
  }
}

async function resolveAddonFromModule(
  moduleValue: LicenseServerAddonModule,
): Promise<LicenseServerAddon | null> {
  if (isLicenseServerAddon(moduleValue)) return moduleValue;

  if ("default" in moduleValue && isLicenseServerAddon(moduleValue.default)) {
    return moduleValue.default;
  }

  if (
    "licenseServerAddon" in moduleValue &&
    isLicenseServerAddon(moduleValue.licenseServerAddon)
  ) {
    return moduleValue.licenseServerAddon;
  }

  if (
    "createLicenseServerAddon" in moduleValue &&
    typeof moduleValue.createLicenseServerAddon === "function"
  ) {
    const addon = await moduleValue.createLicenseServerAddon();
    return isLicenseServerAddon(addon) ? addon : null;
  }

  return null;
}

async function importLicenseServerAddonModule(
  moduleSpecifier: string,
): Promise<LicenseServerAddonModule> {
  if (moduleSpecifier === LOCAL_PRIVATE_LICENSE_SERVER_MODULE) {
    assertLocalPrivateLicenseServerAliasAllowed();
    return import(
      /* turbopackOptional: true */ "@/.private/license-server-addon/src/addon"
    ) as Promise<LicenseServerAddonModule>;
  }

  return import(moduleSpecifier) as Promise<LicenseServerAddonModule>;
}

export async function loadLicenseServerAddon(
  moduleSpecifier = getLicenseServerRuntimeConfig().addonModule,
): Promise<LicenseServerAddonLoadResult> {
  if (!moduleSpecifier) return { status: "not_installed" };

  try {
    const moduleValue = await importLicenseServerAddonModule(moduleSpecifier);
    const addon = await resolveAddonFromModule(moduleValue);
    if (!addon) {
      return {
        status: "invalid",
        reason:
          "The configured License Server add-on module does not export a valid add-on contract.",
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
