import type { NextConfig } from "next";

// Next's development compiler requires unsafe-eval. This is a framework
// compiler exception only; application policy must not branch on NODE_ENV.
const isDevelopmentCompiler = process.env.NODE_ENV !== "production";
const secureTransport = usesSecurePublicOrigin();
const allowedDevOrigins = ["vendor.nr.test", "client.nr.test"];

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDevelopmentCompiler ? " 'unsafe-eval'" : ""} https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://cdn.paddle.com https://*.paddle.com https://js.stripe.com`,
      "style-src 'self' 'unsafe-inline' https://rsms.me https://fonts.googleapis.com",
      "img-src 'self' blob: data: https:",
      "font-src 'self' https://rsms.me https://fonts.gstatic.com",
      "connect-src 'self' https://vercel.com https://*.vercel-storage.com https://*.public.blob.vercel-storage.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk-telemetry.com https://challenges.cloudflare.com https://*.paddle.com https://*.stripe.com https://*.paypal.com",
      "frame-src 'self' https://*.clerk.accounts.dev https://www.youtube.com https://www.youtube-nocookie.com https://challenges.cloudflare.com https://*.paddle.com https://js.stripe.com https://*.stripe.com https://*.paypal.com",
      "media-src 'self' blob: data: https://*.public.blob.vercel-storage.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://*.paddle.com https://*.paypal.com https://*.stripe.com",
      "frame-ancestors 'none'",
      ...(secureTransport ? ["upgrade-insecure-requests"] : []),
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: [...new Set(allowedDevOrigins)],
  productionBrowserSourceMaps: false,
  serverExternalPackages: ["pdfkit"],
  experimental: {
    // Allow large multipart uploads through proxy.ts (default is 10MB).
    // MAX_FILE_SIZE is 300MB and uploads can include multiple files.
    proxyClientMaxBodySize: "2gb",
    // Fulfillment document uploads use Server Actions and are capped in code.
    serverActions: { bodySizeLimit: "25mb" },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

function usesSecurePublicOrigin() {
  const value =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;
  if (!value) return Boolean(process.env.VERCEL);
  try {
    const normalized = value.includes("://") ? value : `https://${value}`;
    return new URL(normalized).protocol === "https:";
  } catch {
    return false;
  }
}
