import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const retiredFlags = [
  "WEBSHOP_PAYMENT_STATE_V2",
  "WEBSHOP_LICENSE_OUTBOX_V2",
  "VENDOR_LICENSE_API_V2",
] as const;

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("completed Prompt 18 rollout flags are retired from runtime configuration", () => {
  const runtimeSources = [
    ".env.example",
    ".env.example.vendor",
    "scripts/setup-local-webshop-addon.mjs",
  ]
    .filter((path) => existsSync(resolve(process.cwd(), path)))
    .map(source)
    .join("\n");
  const cleaner = source("scripts/clean-local-runtime-env.mjs");

  for (const flag of retiredFlags) {
    assert.equal(runtimeSources.includes(flag), false, flag);
    assert.match(cleaner, new RegExp(`\\"${flag}\\"`), flag);
  }
});

test("Prompt 18 rollout flag retirement preserves unrelated environment values", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "nr-retired-rollout-flags-"));
  const envPath = join(tempRoot, ".env");
  const sentinel = "unrelated-secret-value-must-be-preserved";
  try {
    writeFileSync(
      envPath,
      [
        'NR_CMS_DEPLOYMENT_PROFILE="vendor"',
        `CRON_SECRET=${sentinel}`,
        "WEBSHOP_PAYMENT_STATE_V2=true",
        "WEBSHOP_LICENSE_OUTBOX_V2=true",
        "VENDOR_LICENSE_API_V2=true",
        "",
      ].join("\r\n"),
      "utf8",
    );

    execFileSync(
      process.execPath,
      [resolve(process.cwd(), "scripts/retire-completed-rollout-flags.mjs"), envPath],
      { stdio: "pipe" },
    );

    const cleaned = readFileSync(envPath, "utf8");
    assert.match(cleaned, new RegExp(`CRON_SECRET=${sentinel}`));
    for (const flag of retiredFlags) assert.equal(cleaned.includes(flag), false, flag);
  } finally {
    rmSync(tempRoot, { force: true, recursive: true });
  }
});
