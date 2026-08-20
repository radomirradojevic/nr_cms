import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("License Server activation uses the same signed purchase-intent handoff as Webshop", () => {
  const handoff = read("lib/webshop-addon/purchase-intent.ts");
  const page = read("app/dashboard/license-server/page.tsx");

  assert.match(handoff, /"license-server": \{/);
  assert.match(handoff, /defaultOfferKey: "nr-cms-license-server-license"/);
  assert.match(handoff, /createLicenseServerPurchaseIntentHandoff/);
  assert.match(handoff, /addonKey,/);
  assert.match(page, /createLicenseServerPurchaseIntentHandoff\(\)/);
  assert.match(page, /purchaseIntentHandoff=\{purchaseIntentHandoff\}/);
  assert.doesNotMatch(page, /buildLicenseServerLicenseBuyUrl/);
});

test("vendor offer and paid Master issue pin license-server without customer issuer substitution", () => {
  const offer = read(
    ".private/webshop/src/data/webshop-license-offer.ts",
  );
  const fulfillment = read(
    ".private/webshop/src/data/webshop-license-fulfillment-outbox.ts",
  );
  const masterIntent = read(
    ".private/license-server/src/lib/purchase-intent-contract.ts",
  );
  const masterIssue = read(
    ".private/license-server/src/data/vendor-entitlements.ts",
  );

  assert.match(offer, /LICENSE_SERVER_LICENSE_OFFER_KEY/);
  assert.match(offer, /nr-cms-license-server-license/);
  assert.match(offer, /priceMinor <= 0/);
  assert.match(fulfillment, /addonKey,/);
  const frozenIssueStart = fulfillment.indexOf("function frozenIssueRequest");
  assert.notEqual(frozenIssueStart, -1);
  assert.doesNotMatch(
    fulfillment.slice(frozenIssueStart),
    /addonKey: "webshop"/,
  );
  assert.match(masterIntent, /MANAGED_ADDON_KEYS = \["webshop", "license-server"\]/);
  assert.match(masterIssue, /addonKey: intent\.addonKey/);
  assert.match(masterIssue, /generateVendorLicenseKey\(\)/);
});
