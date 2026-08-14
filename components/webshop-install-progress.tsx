"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Progress } from "@/components/ui/progress";
import {
  isWebshopInstallProgressResponse,
  type WebshopInstallProgressStage,
} from "@/lib/webshop-addon/install-progress";

type ProgressLabels = Record<WebshopInstallProgressStage, string> & {
  reconnecting: string;
  takingLonger: string;
};

const PROGRESS_VALUE: Record<WebshopInstallProgressStage, number> = {
  queued: 12,
  installing: 45,
  finalizing: 78,
  ready: 100,
  failed: 100,
};

const SLOW_INSTALL_THRESHOLD_MS = 10 * 60 * 1_000;

export function WebshopInstallProgress({ labels }: { labels: ProgressLabels }) {
  const router = useRouter();
  const [stage, setStage] = useState<WebshopInstallProgressStage>("queued");
  const [reconnecting, setReconnecting] = useState(false);
  const [takingLonger, setTakingLonger] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    let active = true;
    let controller: AbortController | null = null;
    let timer: number | null = null;

    const clearTimer = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    };

    const schedule = (callback: () => void, delay: number) => {
      clearTimer();
      timer = window.setTimeout(callback, delay);
    };

    const poll = async () => {
      if (!active) return;
      if (document.visibilityState === "hidden") {
        schedule(poll, 2_500);
        return;
      }

      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch("/api/webshop/installation-status", {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`status_${response.status}`);
        const payload: unknown = await response.json();
        if (!isWebshopInstallProgressResponse(payload)) {
          throw new Error("invalid_install_progress_response");
        }

        if (!active) return;
        setReconnecting(false);
        setStage(payload.stage);
        setTakingLonger(Date.now() - startedAt >= SLOW_INSTALL_THRESHOLD_MS);

        if (payload.stage === "ready") {
          router.refresh();
          return;
        }

        schedule(
          poll,
          payload.stage === "failed" ? 10_000 : payload.pollAfterMs,
        );
      } catch (error) {
        if (
          !active ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          return;
        }
        setReconnecting(true);
        setTakingLonger(Date.now() - startedAt >= SLOW_INSTALL_THRESHOLD_MS);
        // A managed deployment restarts the CMS. Transient network failures are
        // expected during the atomic switch, so keep polling with backoff.
        schedule(poll, 5_000);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") schedule(poll, 0);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    schedule(poll, 0);

    return () => {
      active = false;
      clearTimer();
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  const statusText = reconnecting ? labels.reconnecting : labels[stage];

  return (
    <div className="max-w-3xl space-y-2" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{statusText}</span>
        {takingLonger && stage !== "ready" ? (
          <span>{labels.takingLonger}</span>
        ) : null}
      </div>
      <Progress
        aria-label={statusText}
        aria-valuetext={statusText}
        value={PROGRESS_VALUE[stage]}
      />
    </div>
  );
}
