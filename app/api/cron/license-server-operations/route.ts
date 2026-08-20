import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { runLicenseServerOperationScheduler } from "@/lib/license-server-addon/operations-cron-adapter";

export async function POST(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const result = await runLicenseServerOperationScheduler();
  return NextResponse.json(
    { ok: !result.unavailable, ...result },
    { status: result.unavailable ? 503 : 200 },
  );
}

export const dynamic = "force-dynamic";
