import {
  WEBSHOP_SUPPORTED_PROVIDERS,
  type WebshopDeploymentPlatform,
} from "@/lib/webshop-addon/contract";

type EnvLike = Record<string, string | undefined>;

export type WebshopDeploymentHint = {
  attestationToken: string | null;
  providerHint: "vercel" | "netlify" | "cloudflare" | "render" | "unknown";
  vercelEnv: string | null;
};

export type PlatformVerifyResponse = WebshopDeploymentPlatform;

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
  if (hint.providerHint === "vercel" && hint.attestationToken) return null;

  if (hint.providerHint === "vercel") {
    return {
      status: "unsupported",
      reason: "env_only_claimed_vercel",
      message:
        "Webshop add-on install requires a verified Vercel production OIDC token. Environment variables alone are not accepted.",
    };
  }

  if (hint.providerHint !== "unknown") {
    return {
      status: "unsupported",
      reason: "unsupported_provider",
      message:
        "This deployment provider is not yet supported for paid Webshop install. Move this site to a verified Vercel production deployment to continue.",
    };
  }

  return {
    status: "unsupported",
    reason: "local",
    message:
      "Webshop add-on install is available only on supported managed deployments. Move this site to Vercel to continue.",
  };
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export async function verifyWebshopDeploymentPlatform({
  env = process.env,
  fetcher = fetch,
}: {
  env?: EnvLike;
  fetcher?: typeof fetch;
} = {}): Promise<WebshopDeploymentPlatform> {
  const hint = getWebshopDeploymentHint(env);
  const localUnsupported = getUnsupportedPlatformFromHint(hint);
  if (localUnsupported) return localUnsupported;

  const licenseServerUrl = env.WEBSHOP_LICENSE_API_URL?.trim();
  if (!licenseServerUrl) {
    return {
      status: "unsupported",
      reason: "missing_attestation",
      message:
        "Webshop add-on install requires license-server platform verification before package installation can continue.",
    };
  }

  const response = await fetcher(
    joinUrl(licenseServerUrl, "/api/webshop/platform/verify"),
    {
      body: JSON.stringify({
        providerHint: hint.providerHint,
        supportedProviders: WEBSHOP_SUPPORTED_PROVIDERS,
        token: hint.attestationToken,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );

  if (!response.ok) {
    return {
      status: "unsupported",
      reason: response.status === 401 ? "invalid_attestation" : "unknown",
      message:
        "The license server could not verify this deployment as a supported managed platform.",
    };
  }

  const payload = (await response.json()) as PlatformVerifyResponse;
  if (payload.status === "supported") return payload;
  return payload;
}
