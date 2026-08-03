import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { revalidateLicenseServerAddonEntitlement } from "@/lib/license-server-addon/license";

export async function POST(request: Request) {
  if (!isCronRequestAuthorized(request))
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const result = await revalidateLicenseServerAddonEntitlement({
    force: true,
    reason: "cron",
    updatedBy: "system",
  });
  return NextResponse.json(
    {
      ok: result.ok,
      status: result.entitlement?.status ?? "missing",
      ...(result.ok ? {} : { error: result.error }),
    },
    { status: result.ok ? 200 : 502 },
  );
}
export const dynamic = "force-dynamic";
