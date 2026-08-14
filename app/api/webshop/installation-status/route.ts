import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { readWebshopServingStateV1 } from "@/data/webshop-addon-serving-state";
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

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { headers: RESPONSE_HEADERS, status: 401 },
    );
  }

  if (getWebshopRuntimeConfig().installMode !== "managed_redeploy") {
    return NextResponse.json(
      { error: "Managed Webshop deployment is not enabled." },
      { headers: RESPONSE_HEADERS, status: 409 },
    );
  }

  const serving = await readWebshopServingStateV1();
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
