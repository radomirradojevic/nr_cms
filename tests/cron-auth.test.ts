import assert from "node:assert/strict";
import test from "node:test";

import { isCronRequestAuthorized } from "@/lib/cron-auth";

function request(headers: HeadersInit = {}) {
  return new Request("https://cms.example.com/api/cron/test", { headers });
}

test("all CMS cron routes share one fail-closed CRON_SECRET contract", () => {
  assert.equal(isCronRequestAuthorized(request(), {}), false);
  assert.equal(
    isCronRequestAuthorized(
      request({ authorization: "Bearer shared-secret" }),
      { CRON_SECRET: "shared-secret" },
    ),
    true,
  );
  assert.equal(
    isCronRequestAuthorized(request({ "x-cron-secret": "shared-secret" }), {
      CRON_SECRET: "shared-secret",
    }),
    true,
  );
  assert.equal(
    isCronRequestAuthorized(request({ authorization: "Bearer wrong-secret" }), {
      CRON_SECRET: "shared-secret",
    }),
    false,
  );
});
