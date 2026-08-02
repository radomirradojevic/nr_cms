import assert from "node:assert/strict";
import test from "node:test";

import nextConfig from "../next.config";

test("Next development resources allow only the two CMS Caddy hostnames", () => {
  const origins = [...(nextConfig.allowedDevOrigins ?? [])].sort();
  assert.deepEqual(origins, ["client.nr.test", "vendor.nr.test"]);
  assert.equal(
    origins.some((origin) => origin.includes("://")),
    false,
  );
  assert.equal(
    origins.some((origin) => origin.includes(":")),
    false,
  );
});
