import assert from "node:assert/strict";
import test from "node:test";

import {
  NIGHT_RAVEN_REMEDIATION_FLAGS,
  parseNightRavenRemediationFlags,
} from "@/lib/remediation/feature-flags-core";

test("Night Raven remediation flags default to false and parse only server env values", () => {
  const defaults = parseNightRavenRemediationFlags({});
  for (const flag of NIGHT_RAVEN_REMEDIATION_FLAGS) {
    assert.equal(defaults[flag], false);
  }

  const flags = parseNightRavenRemediationFlags({
    ADDON_SDK_V1: "on",
    VENDOR_LICENSE_API_V2: "true",
    WEBSHOP_PAYMENT_STATE_V2: "invalid",
  });

  assert.equal(flags.ADDON_SDK_V1, true);
  assert.equal(flags.VENDOR_LICENSE_API_V2, true);
  assert.equal(flags.WEBSHOP_PAYMENT_STATE_V2, false);
});
