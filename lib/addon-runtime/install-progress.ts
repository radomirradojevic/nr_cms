export const ADDON_INSTALL_PROGRESS_STAGES = [
  "queued",
  "installing",
  "finalizing",
  "ready",
  "failed",
] as const;

export type AddonInstallProgressStage =
  (typeof ADDON_INSTALL_PROGRESS_STAGES)[number];

export type AddonInstallProgressResponse = {
  pollAfterMs: number;
  stage: AddonInstallProgressStage;
};

export function resolveAddonInstallProgressStage(input: {
  activeServingFenceCount: number;
  installation: {
    deploymentJobId: string | null;
    runtimeStatus: string;
    status: string;
  } | null;
}): AddonInstallProgressStage {
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

export function isAddonInstallProgressResponse(
  value: unknown,
): value is AddonInstallProgressResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AddonInstallProgressResponse>;
  return (
    typeof candidate.pollAfterMs === "number" &&
    Number.isInteger(candidate.pollAfterMs) &&
    candidate.pollAfterMs >= 1_000 &&
    candidate.pollAfterMs <= 15_000 &&
    typeof candidate.stage === "string" &&
    (ADDON_INSTALL_PROGRESS_STAGES as readonly string[]).includes(
      candidate.stage,
    )
  );
}
