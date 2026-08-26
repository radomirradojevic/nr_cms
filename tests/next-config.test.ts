import assert from "node:assert/strict";
import test from "node:test";

import nextConfig from "../next.config";

test("Next development resources allow only the three CMS Caddy hostnames", () => {
  const origins = [...(nextConfig.allowedDevOrigins ?? [])].sort();
  assert.deepEqual(origins, [
    "client.nr.test",
    "paypal.nr.test",
    "vendor.nr.test",
  ]);
  assert.equal(
    origins.some((origin) => origin.includes("://")),
    false,
  );
  assert.equal(
    origins.some((origin) => origin.includes(":")),
    false,
  );
});

test("PDFKit stays external so its standard font assets remain runtime-addressable", () => {
  assert.equal(nextConfig.serverExternalPackages?.includes("pdfkit"), true);
});

test("license delivery routes override the global referrer policy", async () => {
  const routes = await nextConfig.headers?.();
  assert.ok(routes);
  const typedRoutes = routes as Array<{
    headers: Array<{ key: string; value: string }>;
    source: string;
  }>;
  for (const source of [
    "/api/webshop/licenses/:path*",
    "/licenses/delivery/:path*",
  ]) {
    const route = typedRoutes.find((candidate) => candidate.source === source);
    assert.deepEqual(route?.headers, [
      { key: "Referrer-Policy", value: "no-referrer" },
    ]);
  }
});
