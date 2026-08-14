export const WEBSHOP_INSTALL_PROGRESS_STAGES = [
  "queued",
  "installing",
  "finalizing",
  "ready",
  "failed",
] as const;

export type WebshopInstallProgressStage =
  (typeof WEBSHOP_INSTALL_PROGRESS_STAGES)[number];

export type WebshopInstallProgressResponse = {
  pollAfterMs: number;
  stage: WebshopInstallProgressStage;
};

export function resolveWebshopInstallProgressStage(input: {
  activeServingFenceCount: number;
  installation: {
    deploymentJobId: string | null;
    runtimeStatus: string;
    status: string;
  } | null;
}): WebshopInstallProgressStage {
  const { installation } = input;
  if (!installation) return "queued";

  if (
    installation.status === "ready" &&
    installation.runtimeStatus === "ready" &&
    input.activeServingFenceCount === 0
  ) {
    return "ready";
  }

  if (installation.status === "failed") return "failed";

  if (
    input.activeServingFenceCount > 0 ||
    installation.status === "installed" ||
    installation.status === "migration_pending"
  ) {
    return "finalizing";
  }

  if (
    installation.deploymentJobId ||
    installation.status === "install_pending" ||
    installation.status === "update_pending"
  ) {
    return "installing";
  }

  return "queued";
}

export function isWebshopInstallProgressResponse(
  value: unknown,
): value is WebshopInstallProgressResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<WebshopInstallProgressResponse>;
  return (
    typeof candidate.pollAfterMs === "number" &&
    Number.isInteger(candidate.pollAfterMs) &&
    candidate.pollAfterMs >= 1_000 &&
    candidate.pollAfterMs <= 15_000 &&
    typeof candidate.stage === "string" &&
    (WEBSHOP_INSTALL_PROGRESS_STAGES as readonly string[]).includes(
      candidate.stage,
    )
  );
}
