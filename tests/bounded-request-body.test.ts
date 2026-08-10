import assert from "node:assert/strict";
import test from "node:test";

import { readBoundedRequestBody, RequestBodyTooLargeError } from "../lib/addon-runtime/bounded-request-body";

test("internal HMAC routes bound raw request bytes before parsing", async () => {
  const exact = new Request("https://vendor.nr.test/api/internal", { method: "POST", body: Buffer.alloc(32, 7) });
  assert.equal((await readBoundedRequestBody(exact, 32)).length, 32);
  const oversized = new Request("https://vendor.nr.test/api/internal", { method: "POST", body: Buffer.alloc(33, 7) });
  await assert.rejects(() => readBoundedRequestBody(oversized, 32), RequestBodyTooLargeError);
  const declared = new Request("https://vendor.nr.test/api/internal", { method: "POST", headers: { "Content-Length": "1000" }, body: Buffer.alloc(1) });
  await assert.rejects(() => readBoundedRequestBody(declared, 32), RequestBodyTooLargeError);
});
