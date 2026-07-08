import {
  WEBSHOP_SUPPORTED_PROVIDERS,
  type WebshopDeploymentPlatform,
} from "@/lib/webshop-addon/contract";

type EnvLike = Record<string, string | undefined>;

export type LicenseServerDeploymentHint = {
  attestationToken: string | null;
  providerHint: "vercel" | "netlify" | "cloudflare" | "render" | "unknown";
  vercelEnv: string | null;
};

type SupportedLicenseServerDeploymentPlatform = Extract<
  WebshopDeploymentPlatform,
  { status: "supported" }
>;

type SelfHostedLicenseServerDeploymentPlatform = Extract<
  WebshopDeploymentPlatform,
  { provider: "self_hosted" }
>;

const SELF_HOSTED_OWNER_ID = "self_hosted";
const SELF_HOSTED_SITE_ID_FALLBACK = "self_hosted";

function readOptionalEnv(env: EnvLike, key: string): string | null {
  const value = env[key]?.trim();
  return value ? value : null;
}

function normalizeSiteId(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function getLicenseServerDeploymentHint(
  env: EnvLike = process.env,
): LicenseServerDeploymentHint {
  const attestationToken =
    env.LICENSE_SERVER_PLATFORM_ATTESTATION_TOKEN ??
    env.LICENSE_SERVER_VERCEL_OIDC_TOKEN ??
    env.VERCEL_OIDC_TOKEN ??
    null;

  if (env.VERCEL || env.VERCEL_ENV || env.VERCEL_URL) {
    return {
      attestationToken,
      providerHint: "vercel",
      vercelEnv: env.VERCEL_ENV ?? null,
    };
  }

  if (env.NETLIFY) {
    return { attestationToken, providerHint: "netlify", vercelEnv: null };
  }

  if (env.CF_PAGES || env.CLOUDFLARE_ACCOUNT_ID) {
    return { attestationToken, providerHint: "cloudflare", vercelEnv: null };
  }

  if (env.RENDER || env.RENDER_SERVICE_ID) {
    return { attestationToken, providerHint: "render", vercelEnv: null };
  }

  return { attestationToken, providerHint: "unknown", vercelEnv: null };
}

export function getSelfHostedLicenseServerDeploymentPlatform({
  env = process.env,
  siteId,
}: {
  env?: EnvLike;
  siteId?: string | null;
} = {}): SelfHostedLicenseServerDeploymentPlatform {
  const projectId =
    normalizeSiteId(siteId) ??
    readOptionalEnv(env, "LICENSE_SERVER_SELF_HOSTED_SITE_ID") ??
    readOptionalEnv(env, "NEXT_PUBLIC_APP_URL") ??
    readOptionalEnv(env, "APP_URL") ??
    readOptionalEnv(env, "VERCEL_PROJECT_PRODUCTION_URL") ??
    readOptionalEnv(env, "VERCEL_URL") ??
    SELF_HOSTED_SITE_ID_FALLBACK;

  return {
    status: "supported",
    provider: "self_hosted",
    mode: "standalone",
    ownerId: SELF_HOSTED_OWNER_ID,
    projectId,
    deploymentEnvironment: "self_hosted",
  };
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export async function verifyLicenseServerDeploymentPlatform({
  env = process.env,
  fetcher = fetch,
  selfHostedSiteId,
}: {
  env?: EnvLike;
  fetcher?: typeof fetch;
  selfHostedSiteId?: string | null;
} = {}): Promise<SupportedLicenseServerDeploymentPlatform> {
  const hint = getLicenseServerDeploymentHint(env);
  const licenseServerUrl = env.LICENSE_SERVER_LICENSE_API_URL?.trim();

  if (
    hint.providerHint === "vercel" &&
    hint.attestationToken &&
    licenseServerUrl
  ) {
    try {
      const response = await fetcher(
        joinUrl(licenseServerUrl, "/api/addons/platform/verify"),
        {
          body: JSON.stringify({
            addonKey: "license-server",
            providerHint: hint.providerHint,
            supportedProviders: WEBSHOP_SUPPORTED_PROVIDERS,
            token: hint.attestationToken,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );

      if (response.ok) {
        const payload =
          (await response.json()) as SupportedLicenseServerDeploymentPlatform;
        if (payload.status === "supported") return payload;
      }
    } catch {
      // Platform attestation is best-effort now; license activation still runs.
    }
  }

  return getSelfHostedLicenseServerDeploymentPlatform({
    env,
    siteId: selfHostedSiteId,
  });
}
