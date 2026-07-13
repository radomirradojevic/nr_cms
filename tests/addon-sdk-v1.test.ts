import assert from "node:assert/strict";
import test from "node:test";

import { fixtureManifest } from "@nr-cms/addon-sdk/testing";
import { dispatchSdkRoute, registerSdkAddon } from "@/lib/addon-runtime/sdk-host";

const host = { auth: { async requireAdmin() { return { id: "admin", permissions: ["fixture.write"] }; }, async requirePermission(permission: string) { if (permission !== "fixture.write") throw new Error("denied"); return { id: "admin", permissions: [permission] }; }, async requireUser() { return { id: "user", permissions: [] }; } }, audit: { async write() {} }, cms: { environment: "test" as const, version: "0.1.0" }, database: { async transaction<T>(fn: () => Promise<T>) { return fn(); } }, files: { async read() { return new Uint8Array(); } }, jobs: { async enqueue() {} }, logger: { error() {}, info() {} }, mail: { async send() {} }, settings: { async get() { return null; }, async set() {} }, urls: { absolute(path: string) { return `https://cms.test${path}`; } } };

test("SDK rejects undeclared runtime capability and host enforces permission/license policy", async () => {
  const manifest = fixtureManifest({ capabilities: { apiRoutes: [{ auth: "admin", id: "fixture.write", licensePolicy: "ready_only", methods: ["POST"], path: "/fixture", permission: "fixture.write" }] } });
  const undeclared = await registerSdkAddon({ manifest, async register() { return { apiRouter: { hidden: async () => new Response() } }; } }, host);
  assert.deepEqual(undeclared, { ok: false, reason: "undeclared_runtime_route" });
  const response = await dispatchSdkRoute({ descriptor: manifest.capabilities.apiRoutes![0]!, handler: async () => new Response("ok"), host, licenseMode: "existing_operations", request: new Request("https://cms.test/fixture", { method: "POST" }) });
  assert.equal(response.status, 403);
});
