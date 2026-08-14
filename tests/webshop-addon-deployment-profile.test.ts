import assert from "node:assert/strict";
import test from "node:test";

import { parseAddonDeploymentProfile } from "@/lib/addon-runtime/deployment-profile";

test("Webshop activation accepts every managed deployment target", () => {
  assert.equal(parseAddonDeploymentProfile("vendor"), "vendor");
  assert.equal(parseAddonDeploymentProfile("client"), "client");
  assert.equal(parseAddonDeploymentProfile("paypal"), "paypal");
});

test("Webshop activation rejects non-managed deployment targets", () => {
  assert.throws(() => parseAddonDeploymentProfile("development"));
  assert.throws(() => parseAddonDeploymentProfile(undefined));
});
