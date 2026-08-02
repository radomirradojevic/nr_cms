import assert from "node:assert/strict";
import test from "node:test";

import {
  configuredWebshopVendorAudience,
  parseWebshopBuyUrl,
} from "@/lib/webshop-addon/buy-url-contract";

const valid = "https://vendor.nr.test/licenses/purchase-intents/accept";

test("WEBSHOP_BUY_URL derives its single normalized vendor audience", () => {
  assert.equal(
    parseWebshopBuyUrl(valid).vendorAudience,
    "https://vendor.nr.test",
  );
  assert.equal(
    parseWebshopBuyUrl(
      "https://VENDOR.NR.TEST:443/licenses/purchase-intents/accept",
    ).vendorAudience,
    "https://vendor.nr.test",
  );
  assert.equal(
    configuredWebshopVendorAudience({ WEBSHOP_BUY_URL: valid }),
    "https://vendor.nr.test",
  );
});

test("WEBSHOP_BUY_URL rejects ambiguous trusted configuration", () => {
  for (const value of [
    "http://vendor.nr.test/licenses/purchase-intents/accept",
    "https://user:pass@vendor.nr.test/licenses/purchase-intents/accept",
    "https://vendor.nr.test/licenses/purchase-intents/accept?x=1",
    "https://vendor.nr.test/licenses/purchase-intents/accept#fragment",
    "https://vendor.nr.test/licenses/purchase-intents/accept/",
    "https://vendor.nr.test:444/licenses/purchase-intents/accept",
  ]) {
    assert.throws(() => parseWebshopBuyUrl(value), /WEBSHOP_BUY_URL/);
  }
});
