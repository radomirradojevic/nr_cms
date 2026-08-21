import assert from "node:assert/strict";
import test from "node:test";

import {
  isAddonInstallProgressResponse,
  resolveAddonInstallProgressStage,
} from "@/lib/addon-runtime/install-progress";
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

test("License Server and Webshop share one fail-closed progress contract", () => {
  const input = {
    activeServingFenceCount: 0,
    installation: installation("install_pending"),
  };
  assert.equal(resolveAddonInstallProgressStage(input), "installing");
  assert.equal(
    resolveWebshopInstallProgressStage(input),
    resolveAddonInstallProgressStage(input),
  );
  const response = { pollAfterMs: 2_500, stage: "installing" };
  assert.equal(isAddonInstallProgressResponse(response), true);
  assert.equal(isWebshopInstallProgressResponse(response), true);
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
