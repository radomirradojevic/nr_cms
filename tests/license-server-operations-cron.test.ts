import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("License Server operation scheduler is deployed and authenticated on GET and POST", () => {
  const root = resolve(import.meta.dirname, "..");
  const vercel = JSON.parse(
    readFileSync(resolve(root, "vercel.json"), "utf8"),
  ) as { crons?: Array<{ path: string; schedule: string }> };
  assert.deepEqual(
    vercel.crons?.find(
      (entry) => entry.path === "/api/cron/license-server-operations",
    ),
    {
      path: "/api/cron/license-server-operations",
      schedule: "* * * * *",
    },
  );
  const route = readFileSync(
    resolve(root, "app/api/cron/license-server-operations/route.ts"),
    "utf8",
  );
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.match(route, /isCronRequestAuthorized\(request\)/);
  assert.match(route, /runLicenseServerOperationScheduler\(\)/);
});
