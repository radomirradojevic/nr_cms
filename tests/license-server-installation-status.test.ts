import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routeSource = readFileSync(
  "app/api/license-server/installation-status/route.ts",
  "utf8",
);
const servingStateSource = readFileSync(
  "data/addon-serving-state.ts",
  "utf8",
);
const licenseActionSource = readFileSync(
  "app/dashboard/license-server/actions.ts",
  "utf8",
);
const webshopActionSource = readFileSync(
  "app/dashboard/webshop/actions.ts",
  "utf8",
);
const progressSource = readFileSync(
  "components/webshop-install-progress.tsx",
  "utf8",
);
const licenseStateSource = readFileSync(
  "components/license-server-addon-required.tsx",
  "utf8",
);
const webshopStateSource = readFileSync(
  "components/webshop-addon-required.tsx",
  "utf8",
);

test("License Server install status is admin-authorized before durable state access", () => {
  const authIndex = routeSource.indexOf("await auth()");
  const roleIndex = routeSource.indexOf('hasRole(getRoles(user?.publicMetadata), "admin")');
  const stateIndex = routeSource.indexOf(
    'readAddonServingStateV1("license-server")',
  );
  assert.ok(authIndex >= 0);
  assert.ok(roleIndex > authIndex);
  assert.ok(stateIndex > roleIndex);
  assert.match(routeSource, /export async function POST\(\)/);
  assert.doesNotMatch(routeSource, /export async function GET\(/);
  assert.match(routeSource, /"Cache-Control": "no-store, max-age=0"/);
  assert.match(routeSource, /"Referrer-Policy": "no-referrer"/);
  assert.match(routeSource, /"X-Correlation-Id": correlationId/);
});

test("packed browser polling exposes stable add-on lifecycle identifiers", () => {
  assert.match(
    progressSource,
    /fetch\(`\/api\/\$\{addonKey\}\/installation-status`/,
  );
  assert.match(progressSource, /data-nr-addon-stage=\{stage\}/);
  assert.match(
    licenseStateSource,
    /data-nr-addon-state=\{state\.status\}/,
  );
  assert.match(
    webshopStateSource,
    /data-nr-addon-state=\{state\.status\}/,
  );
});

test("manual activation and polling claim only their own add-on outbox", () => {
  assert.match(
    routeSource,
    /dispatchOneAddonDeploymentOutbox\(\{ addonKey: "license-server" \}\)/,
  );
  assert.match(
    licenseActionSource,
    /dispatchOneAddonDeploymentOutbox\(\{ addonKey: "license-server" \}\)/,
  );
  assert.match(
    webshopActionSource,
    /dispatchOneAddonDeploymentOutbox\(\{ addonKey: "webshop" \}\)/,
  );
});

test("serving receipt lookup joins through the add-on-scoped operation", () => {
  assert.match(servingStateSource, /\.innerJoin\(\s*cmsAddonOperations,/);
  assert.match(
    servingStateSource,
    /\.where\(eq\(cmsAddonOperations\.addonKey, addonKey\)\)/,
  );
  assert.match(
    servingStateSource,
    /eq\(cmsAddonServingFences\.addonKey, addonKey\)/,
  );
});
