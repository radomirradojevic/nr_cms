import { randomUUID } from "node:crypto";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { readAddonServingStateV1 } from "@/data/addon-serving-state";
import { dispatchOneAddonDeploymentOutbox } from "@/lib/addon-runtime/deployment-outbox";
import {
  resolveAddonInstallProgressStage,
  type AddonInstallProgressResponse,
} from "@/lib/addon-runtime/install-progress";
import { getLicenseServerRuntimeConfig } from "@/lib/license-server-addon/config";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

function responseHeaders(correlationId: string) {
  return {
    "Cache-Control": "no-store, max-age=0",
    "Content-Type": "application/json",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Correlation-Id": correlationId,
  } as const;
}

export async function POST() {
  const headers = responseHeaders(randomUUID());
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized" },
      { headers, status: 401 },
    );
  }

  const user = await getOptionalCurrentUser();
  if (!hasRole(getRoles(user?.publicMetadata), "admin")) {
    return NextResponse.json(
      { error: "forbidden" },
      { headers, status: 403 },
    );
  }

  if (getLicenseServerRuntimeConfig().installMode !== "managed_redeploy") {
    return NextResponse.json(
      { error: "managed_install_disabled" },
      { headers, status: 409 },
    );
  }

  let serving = await readAddonServingStateV1("license-server");
  const initialStage = resolveAddonInstallProgressStage({
    activeServingFenceCount: serving.activeServingFenceCount,
    installation: serving.installation,
  });
  if (initialStage === "queued" || initialStage === "installing") {
    try {
      await dispatchOneAddonDeploymentOutbox({ addonKey: "license-server" });
    } catch {
      // The durable outbox remains retryable and the response exposes no
      // transport, SQL, token, installation, or customer detail.
    }
    serving = await readAddonServingStateV1("license-server");
  }

  const response: AddonInstallProgressResponse = {
    pollAfterMs: 2_500,
    stage: resolveAddonInstallProgressStage({
      activeServingFenceCount: serving.activeServingFenceCount,
      installation: serving.installation,
    }),
  };
  return NextResponse.json(response, { headers });
}
