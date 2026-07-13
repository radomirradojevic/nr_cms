import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("LSA pre-auth uses the distributed limiter with an IP-only bounded hash", {
  skip: !existsSync(resolve(process.cwd(), ".private/license-server-addon/src/lib/api-auth.ts")),
}, () => {
  const value = source(".private/license-server-addon/src/lib/api-auth.ts");
  assert.doesNotMatch(value, /checkInMemoryRateLimit/);
  assert.match(value, /checkDistributedRateLimit/);
  assert.match(value, /preAuthBucketKey/);
  assert.doesNotMatch(value, /key:\s*clientId/);
});

test("LSA and central API bodies use a bounded raw-byte reader", {
  skip: !existsSync(resolve(process.cwd(), ".private/license-server-addon/src/api/routes.ts")),
}, () => {
  const lsa = source(".private/license-server-addon/src/api/routes.ts");
  const central = source(".private/license-server/src/lib/vendor-license-api.ts");
  assert.match(lsa, /readLimitedText/);
  assert.doesNotMatch(lsa, /await input\.request\.text\(\)/);
  assert.match(central, /readLimitedText/);
  assert.doesNotMatch(central, /await request\.text\(\)/);
});

test("network-sensitive addon calls use the guarded fetch helper", () => {
  const paths = [
    "lib/webshop-addon/license.ts",
    "lib/license-server-addon/license.ts",
    "app/dashboard/webshop/actions.ts",
    "app/dashboard/license-server/actions.ts",
  ];
  const value = paths.map(source).join("\n");
  assert.match(value, /safeFetch/);
  assert.doesNotMatch(value, /await fetch\(/);
});

test("outbound guard resolves hosts before connect and rejects redirects", () => {
  const value = source("lib/security/outbound-url.ts");
  assert.match(value, /lookup/);
  assert.match(value, /assertResolvedOutboundHost/);
  assert.match(value, /redirect:\s*"manual"/);
  assert.match(value, /maxResponseBytes/);
});
