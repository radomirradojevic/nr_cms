import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

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
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline' https://rsms.me https://fonts.googleapis.com",
      "img-src 'self' blob: data: https:",
      "font-src 'self' https://rsms.me https://fonts.gstatic.com",
      "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk-telemetry.com https://challenges.cloudflare.com",
      "frame-src 'self' https://*.clerk.accounts.dev https://www.youtube.com https://www.youtube-nocookie.com https://challenges.cloudflare.com",
      "media-src 'self' blob: data: https://*.public.blob.vercel-storage.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      ...(isDev ? [] : ["upgrade-insecure-requests"]),
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.18.208.1"],
  productionBrowserSourceMaps: false,
  experimental: {
    // Allow large multipart uploads through proxy.ts (default is 10MB).
    // MAX_FILE_SIZE is 300MB and uploads can include multiple files.
    proxyClientMaxBodySize: "2gb",
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
