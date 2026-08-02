import assert from "node:assert/strict";
import test from "node:test";

import {
  HOST_WEBSHOP_ROUTE_BINDING_IDS,
  validateWebshopHostBindings,
} from "@/lib/webshop-addon/host-route-contract";

test("HostAddonRouteBindingsV1 requires every declared binding exactly once", () => {
  assert.deepEqual(validateWebshopHostBindings(HOST_WEBSHOP_ROUTE_BINDING_IDS), {
    ok: true,
  });
  assert.equal(
    validateWebshopHostBindings(HOST_WEBSHOP_ROUTE_BINDING_IDS.slice(1)).ok,
    false,
  );
  assert.equal(
    validateWebshopHostBindings([
      ...HOST_WEBSHOP_ROUTE_BINDING_IDS,
      HOST_WEBSHOP_ROUTE_BINDING_IDS[0],
    ]).ok,
    false,
  );
  assert.equal(
    validateWebshopHostBindings([
      ...HOST_WEBSHOP_ROUTE_BINDING_IDS,
      "webshop.unknown.v1",
    ]).ok,
    false,
  );
});
