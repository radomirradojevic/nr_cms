import assert from "node:assert/strict";
import test from "node:test";

import {
  isWebshopInstallProgressResponse,
  resolveWebshopInstallProgressStage,
} from "@/lib/webshop-addon/install-progress";

function installation(
  status: string,
  runtimeStatus = "not_installed",
  deploymentJobId: string | null = "job-1",
) {
  return { deploymentJobId, runtimeStatus, status };
}

test("managed Webshop install progress maps durable worker phases", () => {
  assert.equal(
    resolveWebshopInstallProgressStage({
      activeServingFenceCount: 0,
      installation: null,
    }),
    "queued",
  );
  assert.equal(
    resolveWebshopInstallProgressStage({
      activeServingFenceCount: 0,
      installation: installation("install_pending"),
    }),
    "installing",
  );
  assert.equal(
    resolveWebshopInstallProgressStage({
      activeServingFenceCount: 1,
      installation: installation("migration_pending"),
    }),
    "finalizing",
  );
  assert.equal(
    resolveWebshopInstallProgressStage({
      activeServingFenceCount: 0,
      installation: installation("ready", "ready"),
    }),
    "ready",
  );
  assert.equal(
    resolveWebshopInstallProgressStage({
      activeServingFenceCount: 0,
      installation: installation("failed", "unavailable"),
    }),
    "failed",
  );
});

test("ready is withheld while an active serving fence exists", () => {
  assert.equal(
    resolveWebshopInstallProgressStage({
      activeServingFenceCount: 1,
      installation: installation("ready", "ready"),
    }),
    "finalizing",
  );
});

test("install progress response accepts only bounded polling contracts", () => {
  assert.equal(
    isWebshopInstallProgressResponse({
      pollAfterMs: 2_500,
      stage: "installing",
    }),
    true,
  );
  assert.equal(
    isWebshopInstallProgressResponse({ pollAfterMs: 50, stage: "ready" }),
    false,
  );
  assert.equal(
    isWebshopInstallProgressResponse({
      pollAfterMs: 2_500,
      stage: "unknown",
    }),
    false,
  );
});
