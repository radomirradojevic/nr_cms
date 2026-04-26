import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['172.18.208.1'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data: https://*.clerk.com https://img.clerk.com",
              "font-src 'self'",
              "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk-telemetry.com",
              "frame-src 'self' https://*.clerk.accounts.dev",
              "worker-src 'self' blob:",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
