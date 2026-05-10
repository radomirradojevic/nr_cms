import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev",
      "style-src 'self' 'unsafe-inline' https://rsms.me",
      "img-src 'self' blob: data: https: http:",
      "font-src 'self' https://rsms.me",
      "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk-telemetry.com",
      "frame-src 'self' https://*.clerk.accounts.dev https://www.youtube.com https://www.youtube-nocookie.com",
      "media-src 'self' blob: data:",
      "worker-src 'self' blob:",
      "object-src 'none'",
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
