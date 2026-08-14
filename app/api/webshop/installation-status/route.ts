import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { readWebshopServingStateV1 } from "@/data/webshop-addon-serving-state";
import { dispatchOneAddonDeploymentOutbox } from "@/lib/addon-runtime/deployment-outbox";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { getWebshopRuntimeConfig } from "@/lib/webshop-addon/config";
import {
  resolveWebshopInstallProgressStage,
  type WebshopInstallProgressResponse,
} from "@/lib/webshop-addon/install-progress";

export const dynamic = "force-dynamic";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json",
} as const;

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { headers: RESPONSE_HEADERS, status: 401 },
    );
  }

  const user = await getOptionalCurrentUser();
  if (!hasRole(getRoles(user?.publicMetadata), "admin")) {
    return NextResponse.json(
      { error: "Forbidden" },
      { headers: RESPONSE_HEADERS, status: 403 },
    );
  }

  if (getWebshopRuntimeConfig().installMode !== "managed_redeploy") {
    return NextResponse.json(
      { error: "Managed Webshop deployment is not enabled." },
      { headers: RESPONSE_HEADERS, status: 409 },
    );
  }

  let serving = await readWebshopServingStateV1();
  const initialStage = resolveWebshopInstallProgressStage({
    activeServingFenceCount: serving.activeServingFenceCount,
    installation: serving.installation
      ? {
          deploymentJobId: serving.installation.deploymentJobId,
          runtimeStatus: serving.installation.runtimeStatus,
          status: serving.installation.status,
        }
      : null,
  });
  if (initialStage === "queued" || initialStage === "installing") {
    try {
      await dispatchOneAddonDeploymentOutbox();
    } catch {
      // Durable state remains pollable. A later request may reclaim the lease
      // and retry without asking the administrator to activate again.
    }
    serving = await readWebshopServingStateV1();
  }
  const response: WebshopInstallProgressResponse = {
    pollAfterMs: 2_500,
    stage: resolveWebshopInstallProgressStage({
      activeServingFenceCount: serving.activeServingFenceCount,
      installation: serving.installation
        ? {
            deploymentJobId: serving.installation.deploymentJobId,
            runtimeStatus: serving.installation.runtimeStatus,
            status: serving.installation.status,
          }
        : null,
    }),
  };

  return NextResponse.json(response, { headers: RESPONSE_HEADERS });
}
