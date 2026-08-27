import type { WebshopDeploymentPlatform } from "@/lib/webshop-addon/contract";

type EnvLike = Record<string, string | undefined>;

export type WebshopDeploymentHint = {
  attestationToken: string | null;
  providerHint: "vercel" | "netlify" | "cloudflare" | "render" | "unknown";
  vercelEnv: string | null;
};

type SelfHostedWebshopDeploymentPlatform = Extract<
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

function readVercelProjectId(env: EnvLike): string | null {
  const value =
    readOptionalEnv(env, "NR_VERCEL_PROJECT_ID") ??
    readOptionalEnv(env, "VERCEL_PROJECT_ID");
  return value && /^[A-Za-z0-9_-]{3,160}$/.test(value) ? value : null;
}

export function getWebshopDeploymentHint(
  env: EnvLike = process.env,
): WebshopDeploymentHint {
  const attestationToken =
    env.WEBSHOP_PLATFORM_ATTESTATION_TOKEN ??
    env.WEBSHOP_VERCEL_OIDC_TOKEN ??
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

export function getUnsupportedPlatformFromHint(
  hint: WebshopDeploymentHint,
): WebshopDeploymentPlatform | null {
  void hint;
  return null;
}

export function getSelfHostedDeploymentPlatform({
  env = process.env,
  siteId,
}: {
  env?: EnvLike;
  siteId?: string | null;
} = {}): SelfHostedWebshopDeploymentPlatform {
  const projectId =
    normalizeSiteId(siteId) ??
    readOptionalEnv(env, "NEXT_PUBLIC_APP_URL") ??
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

export async function verifyWebshopDeploymentPlatform({
  env = process.env,
  fetcher = fetch,
  selfHostedSiteId,
}: {
  env?: EnvLike;
  fetcher?: typeof fetch;
  selfHostedSiteId?: string | null;
} = {}): Promise<WebshopDeploymentPlatform> {
  const hint = getWebshopDeploymentHint(env);
  void fetcher;

  if (hint.providerHint === "vercel") {
    if (hint.vercelEnv !== "production") {
      return {
        status: "unsupported",
        reason: "non_production_vercel",
        message:
          "Paid add-on activation is restricted to the Vercel production environment.",
      };
    }
    const projectId = readVercelProjectId(env);
    if (!projectId) {
      return {
        status: "unsupported",
        reason: "missing_project_identity",
        message:
          "Vercel activation requires NR_VERCEL_PROJECT_ID or VERCEL_PROJECT_ID.",
      };
    }
    return {
      deploymentEnvironment: "production",
      mode: "project_domain_proof",
      ownerId: `vercel-project:${projectId}`,
      projectId,
      provider: "vercel",
      status: "supported",
    };
  }
  if (env.WEBSHOP_DEPLOYMENT_MODE !== "self_hosted")
    return {
      status: "unsupported",
      reason: "self_hosted",
      message:
        "Self-hosted activation requires explicit WEBSHOP_DEPLOYMENT_MODE=self_hosted.",
    };
  return getSelfHostedDeploymentPlatform({ env, siteId: selfHostedSiteId });
}
